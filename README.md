# bookmarkit

**Bookmarkit** is a modern, React‑powered application that helps you organize and query your bookmarks using natural language. It can be used both as a **Vite/React web app** and packaged as a **Chrome extension**.

Key capabilities include:

- Natural-language search and AI-driven actions
- Multi-provider LLM integration (Gemini, OpenAI, Grok, Ollama, LM Studio)
- Import/export to JSON or Netscape HTML
- Local or optional Firebase storage backend

The project is built with Vite, styled with Tailwind CSS, and designed for flexibility through runtime configuration and modular architecture.

---

## Features

- Natural language search (AI agent)
  - Examples: “find github”, “find tags: react then sort by rating descending”, “show 3 stars or more”, “remove duplicates”
  - Persist sorted order across all bookmarks (e.g., “reorder descending by title”)
- Import/Export
  - JSON array of bookmarks
  - Netscape Bookmark HTML (compatible with browsers’ export files)
- Bookmark management
  - Add, edit, delete, tag, folder, rating, favicon support
  - Multi‑select (Cmd/Ctrl+Click), open in new tab (Shift+Click)
  - Detect and remove duplicates (by title + URL)
- URL status
  - Lightweight validity check via HEAD request (with a CORS proxy)
  - One‑click “Ignore checking” toggle per bookmark
- LLM integration (runtime‑configurable)
  - Gemini, OpenAI (ChatGPT), Grok (x.ai), Ollama (local), LM Studio (local)
  - Model discovery (where supported), custom base URLs, stored per provider
- Storage backends
  - Local (browser) by default
  - Optional Firebase (Cloud Firestore) backend
- Keyboard shortcuts
  - Click selects; Cmd/Ctrl+Click multi‑selects; Shift+Click opens
  - Double‑click or E to edit
  - Esc clears selection
  - Cmd/Ctrl+A select all, Cmd/Ctrl+D delete selected
  - D deletes (with confirmation), Space opens selected

## Demo (quick tour)

- Top search bar: type natural language queries and hit Enter.
- Options: type “options” in the search bar to open provider settings.
- Import/Export: button in the header for JSON/HTML.
- Remove Duplicates: button in the header or type “remove duplicates”.

## Getting started

### Prerequisites

- Node.js 18+
- npm (or pnpm/yarn)
- Google Chrome (for the extension)
- Optional:
  - API keys for LLMs (Gemini/OpenAI/Grok), or
  - Local LLM runtime (Ollama or LM Studio)

### Install

```bash
git clone https://github.com/your-org/bookmarkit.git
cd bookmarkit
npm install
```

### Run as a regular web app (dev)

```bash
npm run dev
```

Open the printed localhost URL (typically http://localhost:5173).

You can fully use the app in your browser. Configure AI in the in‑app Options dialog.

### Build

```bash
npm run build
```

Prod preview (optional):

```bash
npm run preview
```

## Chrome Extension

This project builds a static site you can load as an extension.

1) Build:

```bash
npm run build
```

2) Create a minimal manifest.json in the dist folder (if not already present) like:

```json
{
  "manifest_version": 3,
  "name": "bookmarkit",
  "version": "1.0.0",
  "description": "AI-assisted bookmarkit.",
  "action": {
    "default_title": "bookmarkit",
    "default_popup": "index.html"
  },
  "icons": {
    "16": "icon-16.png",
    "32": "icon-32.png",
    "48": "icon-48.png",
    "128": "icon-128.png"
  },
  "host_permissions": [
    "https://corsproxy.io/*",
    "https://www.google.com/*"
  ],
  "permissions": []
}
```

3) Load in Chrome:
- Go to chrome://extensions
- Enable “Developer mode”
- Click “Load unpacked”
- Select the dist folder

Open the extension popup or pin it to the toolbar. The app’s UI and features are identical to the web build.

Notes:
- The app uses corsproxy.io for URL checks and Google S2 favicon service; host_permissions above allow those network requests from an extension page.
- You can add more host_permissions if you change providers/base URLs (e.g., custom OpenAI base URL, local LM Studio/Ollama).

## Configure AI providers

You can configure everything at runtime in the Options dialog (type “options” in the search bar). Settings persist per browser in localStorage.

Supported providers:
- Gemini
- OpenAI (ChatGPT)
- Grok (x.ai)
- Ollama (local)
- LM Studio (local)

Options per provider:
- API key (remote providers)
- Base URL (OpenAI/Grok optional; Ollama/LM Studio required, e.g., http://localhost:11434 or http://localhost:1234)
- Model: auto‑discovery where supported, or type manually

Local providers:
- Ollama: install and run, pull a model (e.g., llama3.1), set base URL: http://localhost:11434
- LM Studio: run the local server, set base URL (default is often http://localhost:1234)

Tip: If an LLM call fails or returns invalid output, the app gracefully falls back to a general search.

## Optional: Build‑time defaults

You can set global defaults with Vite’s define. This is optional; the in‑app Options are usually enough.

vite.config.(js|ts) example:

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// You can also read from process.env or .env files (VITE_* vars)
export default defineConfig({
  plugins: [react()],
  define: {
    __llm_provider__: JSON.stringify('gemini'),
    __llm_options__: JSON.stringify({
      // apiKey: process.env.VITE_GEMINI_API_KEY,
      // model: 'gemini-2.0-flash'
    }),
    __use_firebase__: JSON.stringify(false),
    __firebase_config: JSON.stringify(undefined),
    __app_id: JSON.stringify('bookmarkit'),
    __initial_auth_token: JSON.stringify(undefined)
  }
})
```

If you set __use_firebase__ to true, also provide a valid __firebase_config (see Firebase section).

## Firebase (optional)

The app can use Firebase (Cloud Firestore) instead of local storage.

Steps:
1) Create a Firebase project and enable Firestore
2) Grab your web app config:
   - apiKey, authDomain, projectId, etc.
3) Provide it at build time:
   - Set __use_firebase__: true
   - Set __firebase_config: the JSON stringified Firebase config
4) Rebuild and run

Auth:
- The code exposes an optional __initial_auth_token if you want to inject an auth token at boot.
- If you don’t provide auth, your store module may default to anonymous or local. See your store implementation for details.

Data model:
- Bookmarks are stored with timestamps (createdAt/updatedAt)
- Reorder and live updates are supported via store methods

## Import/Export

- JSON
  - Exports an array of bookmark objects
  - Import expects the same: an array

Bookmark JSON shape (id is optional on import):
```json
[
  {
    "id": "optional",
    "title": "Example",
    "url": "https://example.com",
    "description": "Short description",
    "tags": ["reference", "web"],
    "rating": 4,
    "folderId": "work",
    "faviconUrl": "https://example.com/favicon.ico",
    "createdAt": "2024-01-01T12:00:00.000Z",
    "updatedAt": "2024-01-01T12:00:00.000Z",
    "urlStatus": "valid"
  }
]
```

- HTML (Netscape Bookmark File)
  - Compatible with exports from Chrome/Firefox/etc.
  - You can upload the file or paste its contents
  - Export creates a standard bookmark HTML with fields like ADD_DATE, LAST_MODIFIED, ICON, DESCRIPTION

## Natural language commands (examples)

- find github
- find tags: react then sort by rating descending
- filter rating >= 4 then sort by title asc
- show 3 stars or more
- remove duplicates
- show all
- reorder ascending by title
- limit first 10
- options (opens Options dialog)
- import or export (opens Import/Export)

The agent plans actions (search, filter, sort, limit, persist reorder) and updates the view accordingly.

## Keyboard shortcuts

- Click: select a bookmark
- Cmd/Ctrl+Click: toggle multi‑select
- Shift+Click: open in new tab
- Double‑click or E: edit selected
- Esc: clear selection
- Cmd/Ctrl+A: select all visible
- Cmd/Ctrl+D or D: delete selected (with confirmation)
- Space (on focused tile): select/open depending on context

## URL validation

- The app checks URLs via a HEAD request using https://corsproxy.io
- If a site is blocked/unreachable, status may show “invalid”
- You can toggle “Ignore checking” per bookmark
- Note: Using a third‑party CORS proxy means the checked URL is sent to that proxy

## Privacy and storage

- Local mode: data stays in your browser (local storage/IndexedDB per store implementation)
- Firebase mode: data is stored in your Firebase project
- API keys you enter in Options are saved to localStorage in your browser
- LLM calls are made from your browser to providers you select

## Troubleshooting

- LLM errors/failures:
  - Ensure API key and base URL (if applicable) are set in Options
  - Try the “Refresh” button next to Model
  - Use a smaller model or local provider for testing
- Extension shows blank page:
  - Confirm manifest.json exists in dist
  - Load unpacked pointing to the dist folder after a build
  - Check Chrome console for CSP/network issues and adjust host_permissions
- URL check always invalid:
  - Some sites block HEAD or CORS proxy; toggle “Ignore checking”

## Scripts

- npm run dev — start Vite dev server
- npm run build — production build
- npm run preview — preview production build

## Contributing

Issues and PRs are welcome. Please:
- Keep UI accessible and keyboard‑friendly
- Avoid introducing server dependencies (this is a client‑first tool)
- Add tests or simple repro steps where helpful

## License

Add your project’s license here (e.g., MIT).
