// Chrome Bookmarks API implementation
// Requires "bookmarks" permission in the manifest

const ROOT_FOLDER_TITLE = 'Bookmark Manager';

export function createChromeBookmarksStore() {
  let listeners = new Set();
  let unsubscribeFns = [];

  const notify = async () => {
    const all = await api.list();
    listeners.forEach((cb) => cb(all));
  };

  const ensureRootFolder = async () => {
    const tree = await chrome.bookmarks.getTree();
    const bar = tree[0].children.find((n) => n.id === '1' || n.title === 'Bookmarks bar');
    const existing = (bar.children || []).find((n) => n.title === ROOT_FOLDER_TITLE && n.url === undefined);
    if (existing) return existing.id;
    const created = await chrome.bookmarks.create({ parentId: bar.id, title: ROOT_FOLDER_TITLE });
    return created.id;
  };

  // Ensure a nested folder path exists under the root (e.g., "Work/Project A") and return the deepest folder id
  const ensureFolderPath = async (path) => {
    const rootId = await ensureRootFolder();
    const clean = (path || '').trim();
    if (!clean) return rootId;
    const segments = clean.split('/').map((s) => s.trim()).filter(Boolean);
    let parentId = rootId;
    for (const seg of segments) {
      const children = await chrome.bookmarks.getChildren(parentId);
      let folder = (children || []).find((n) => !n.url && n.title === seg);
      if (!folder) folder = await chrome.bookmarks.create({ parentId, title: seg });
      parentId = folder.id;
    }
    return parentId;
  };

  // Convert a chrome bookmark node to our Bookmark shape. folderPath is the path under ROOT ('' when at root)
  const toBookmark = (n, folderPath = '') => ({
    id: n.id,
    title: n.title || n.url || 'Untitled',
    url: n.url || '',
    description: '',
    tags: [],
    rating: 0,
    folderId: folderPath || '',
    faviconUrl: n.url ? `https://www.google.com/s2/favicons?domain=${new URL(n.url).hostname}&sz=32` : '',
    createdAt: '',
    updatedAt: '',
    urlStatus: 'valid',
  });

  // Recursively list all bookmarks under the root and include their folder path (relative to ROOT)
  const listUnderRoot = async () => {
    const rootId = await ensureRootFolder();
    const results = [];
    const traverse = async (parentId, pathParts) => {
      const children = await chrome.bookmarks.getChildren(parentId);
      for (const child of children) {
        if (child.url) {
          results.push(toBookmark(child, pathParts.join('/')));
        } else {
          await traverse(child.id, [...pathParts, child.title || '']);
        }
      }
    };
    await traverse(rootId, []);
    return results;
  };

  const subscribeChromeEvents = () => {
    const onChange = () => notify();
    chrome.bookmarks.onCreated.addListener(onChange);
    chrome.bookmarks.onRemoved.addListener(onChange);
    chrome.bookmarks.onChanged.addListener(onChange);
    chrome.bookmarks.onMoved.addListener(onChange);
    return () => {
      chrome.bookmarks.onCreated.removeListener(onChange);
      chrome.bookmarks.onRemoved.removeListener(onChange);
      chrome.bookmarks.onChanged.removeListener(onChange);
      chrome.bookmarks.onMoved.removeListener(onChange);
    };
  };

  const api = {
    async init() {
      unsubscribeFns.push(subscribeChromeEvents());
      await notify();
    },
    async list() {
      return listUnderRoot();
    },
    /**
     * Reorder children under the Bookmark Manager root to match the provided orderedIds.
     * Any children not included in orderedIds will be appended after the provided order,
     * preserving their relative order.
     */
    async reorderBookmarks(orderedIds = []) {
      const rootId = await ensureRootFolder();
      const children = await chrome.bookmarks.getChildren(rootId);
      // Only bookmark nodes (exclude folders)
      const bookmarkChildren = children.filter((n) => n.url);
      const existingIds = bookmarkChildren.map((n) => n.id);
      const set = new Set(orderedIds);
      const normalized = [
        // Keep only ids that exist under root
        ...orderedIds.filter((id) => set.has(id) && existingIds.includes(id)),
        // Append the rest (not specified), preserving current order
        ...existingIds.filter((id) => !set.has(id)),
      ];
      // Sequentially move each node to its index
      for (let i = 0; i < normalized.length; i++) {
        const id = normalized[i];
        try {
          await chrome.bookmarks.move(id, { parentId: rootId, index: i });
        } catch (e) {
          // Ignore move errors for individual items to keep best-effort ordering
          console.warn('Failed to move bookmark', id, e);
        }
      }
      await notify();
    },
    /**
     * Persist a sorted order by sortBy and order for all bookmarks under the root folder.
     */
    async persistSortedOrder({ sortBy = 'title', order = 'asc' } = {}) {
      const list = await listUnderRoot();
      const key = sortBy === 'folder' ? 'folderId' : sortBy;
      const sorted = [...list].sort((a, b) => {
        let valA = a[key] ?? '';
        let valB = b[key] ?? '';
        if (key === 'rating') {
          valA = a.rating || 0;
          valB = b.rating || 0;
        } else if (key === 'createdAt' || key === 'updatedAt') {
          valA = a[key] ? new Date(a[key]).getTime() : 0;
          valB = b[key] ? new Date(b[key]).getTime() : 0;
        } else {
          if (typeof valA === 'string') valA = valA.toLowerCase();
          if (typeof valB === 'string') valB = valB.toLowerCase();
        }
        if (order === 'asc') return valA < valB ? -1 : valA > valB ? 1 : 0;
        return valA > valB ? -1 : valA < valB ? 1 : 0;
      });
      const orderedIds = sorted.map((b) => b.id);
      await this.reorderBookmarks(orderedIds);
    },
    subscribe(cb) {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    async create(bookmark) {
  let parentId = await ensureFolderPath(typeof bookmark.folderId === 'string' ? bookmark.folderId : '');
      const node = await chrome.bookmarks.create({ parentId, title: bookmark.title || bookmark.url, url: bookmark.url });
      await notify();
  // Compute path by walking up to root (optional) or reuse provided path for performance
  const folderPath = (typeof bookmark.folderId === 'string' ? bookmark.folderId.trim() : '') || '';
  return toBookmark(node, folderPath);
    },
    async update(id, patch) {
      const changes = {};
      if (patch.title) changes.title = patch.title;
      if (patch.url) changes.url = patch.url;
      if (Object.keys(changes).length > 0) {
        await chrome.bookmarks.update(id, changes);
      }
      // Handle moving to a folder when folderId (treated as a folder path label) is provided
      if (Object.prototype.hasOwnProperty.call(patch, 'folderId')) {
        const folderPath = typeof patch.folderId === 'string' ? patch.folderId.trim() : '';
        try {
          if (folderPath) {
            const parentId = await ensureFolderPath(folderPath);
            await chrome.bookmarks.move(id, { parentId });
          } else {
            // Empty string means move back to root
            const rootId = await ensureRootFolder();
            await chrome.bookmarks.move(id, { parentId: rootId });
          }
        } catch (e) {
          // Ignore move errors to avoid breaking update
          console.warn('Failed to move bookmark to folder path', folderPath, e);
        }
      }
      await notify();
    },
    async remove(id) {
      await chrome.bookmarks.remove(id);
      await notify();
    },
    async removeMany(ids = []) {
      // Delete in parallel; ignore per-item failures, then notify once
      await Promise.all((ids || []).map((id) => chrome.bookmarks.remove(id).catch(() => {})));
      await notify();
    },
    async bulkReplace(bookmarks) {
      const rootId = await ensureRootFolder();
      const children = await chrome.bookmarks.getChildren(rootId);
      for (const child of children) {
        if (child.url) await chrome.bookmarks.remove(child.id);
      }
      for (const b of bookmarks) {
        await chrome.bookmarks.create({ parentId: rootId, title: b.title || b.url, url: b.url });
      }
      await notify();
    },
    async bulkAdd(bookmarks) {
      const rootId = await ensureRootFolder();
      const createdNodes = [];
      for (const b of bookmarks) {
        const node = await chrome.bookmarks.create({ parentId: rootId, title: b.title || b.url, url: b.url });
        createdNodes.push(node);
      }
      await notify();
      return createdNodes.map(n => toBookmark(n));
    }
  };

  return api;
}
