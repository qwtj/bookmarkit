# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Build with sourcemaps, no minification (NOT a live dev server — outputs to dist/)
npm run build        # Production build to dist/
npm run build:chrome # Production build + copy manifest/background/content/icons to dist/ for Chrome extension
npm run preview      # Serve the dist/ folder locally
npm run lint         # Run ESLint
```

> **Important:** `npm run dev` runs `vite build --mode development`, not `vite`. There is no HMR dev server — the output goes to `dist/`. Preview with `npm run preview` after each build.

There are no tests in this project.

## Architecture

### Dual deployment target

The app ships as both a **Vite/React web app** and a **Chrome MV3 extension**. The UI is identical in both; the difference is storage backend and extension-specific files (`public/manifest.json`, `public/background.js`, `public/content.js`). `npm run build:chrome` copies those into `dist/` after the Vite build.

### Component structure

All bookmark UI state and logic lives in a single large component: `src/components/BookmarkApp.jsx`. This is intentional — it holds the store ref, LLM agent engine, keyboard shortcuts, theme state, and all modal visibility. `src/App.jsx` is a thin wrapper that just renders `BookmarkApp`.

Modal components (`BookmarkForm`, `ImportExportContent`, `DeleteConfirmModal`, `HelpModal`, `OptionsModal`, `MessageModal`) are all rendered inline in `BookmarkApp` with portal-style full-screen overlays.

### Store abstraction (`src/stores/`)

Three implementations share a common interface:

| Store | File | When used |
|---|---|---|
| `LOCAL` (default) | `localCompositeStore.js` | Chrome Bookmarks API for title/URL + `localStorage` (prefix `bm_meta:<id>`) for metadata (tags, rating, description, etc.) |
| `CHROME` | `chromeBookmarksStore.js` | Raw Chrome Bookmarks API only — no metadata persistence |
| `FIREBASE` | `firebaseStore.js` | Firestore under `artifacts/<appId>/users/<uid>/bookmarks` |

Selected at startup in `BookmarkApp.jsx` based on the `__use_firebase__` build-time global. Factory is in `src/stores/index.js`.

**Common store interface:**
`init()`, `list()`, `subscribe(cb)`, `create(b)`, `update(id, patch)`, `remove(id)`, `removeMany(ids)`, `bulkReplace(arr)`, `bulkAdd(arr)`, `reorderBookmarks(ids)`, `persistSortedOrder({ sortBy, order })`

### LLM agent (`src/llm/`)

`src/llm/index.js` is the factory; provider implementations are in `src/llm/providers/`. All expose a single method: `generate(prompt): Promise<string>`.

The agent engine in `BookmarkApp.jsx` (`agentEngine()`) sends a structured prompt to the LLM and parses the JSON response into an array of `{ action, parameters, priority }` steps. These steps are accumulated in `lastAction` state and applied via `applyAgentPlan()` + `useMemo` to produce `displayedBookmarks`. On LLM failure, it falls back to a basic `searchBookmarks` action.

### Theming

Tailwind is configured to use CSS variables (`--bg-primary`, `--bg-secondary`, `--text-primary`, `--text-secondary`, `--border`, `--accent`, `--accent-hover`). Themes are JSON/YAML files with those seven keys. The active theme and custom themes are persisted to `chrome.storage.local` (extension) or `localStorage` (web), under keys `bm_current_theme` and `bm_themes`. The `dark-theme.json` in the repo root is an example importable theme file.

### Build-time globals

These Vite `define` globals can be set in `vite.config.js` or `.env` files:

- `__llm_provider__` — default LLM provider key (e.g. `'gemini'`)
- `__llm_options__` — default provider options object
- `__use_firebase__` — `true` to use Firestore instead of local store
- `__firebase_config` — JSON-stringified Firebase config object
- `__app_id` — Firestore collection namespace
- `__initial_auth_token` — optional custom auth token for Firebase

Runtime overrides (set via the in-app Options dialog) are stored in `localStorage` under `bm_runtime_llm_provider` and `bm_runtime_llm_options` and take precedence over build-time defaults.

### Key localStorage / chrome.storage keys

| Key | Purpose |
|---|---|
| `bm_runtime_llm_provider` | Selected LLM provider |
| `bm_runtime_llm_options` | Per-provider options (API keys, base URLs, models) |
| `bm_current_theme` | Active theme name |
| `bm_themes` | JSON of custom uploaded themes |
| `bm_meta:<id>` | Per-bookmark metadata (localCompositeStore) |
