# CODEBUDDY.md

This file provides guidance to CodeBuddy Code when working with code in this repository.

## Project Overview

**MD Human Review** is a VS Code extension for reviewing and annotating Markdown files — like a professor marking up a student's paper. Users can add comments, mark deletions, insert content, edit WYSIWYG, and generate structured AI fix instructions with one click.

- **Tech stack**: TypeScript + VS Code Extension API + Mocha (unit) + Playwright (UI tests) + marked (rendering)
- **Build output**: `out/` directory
- **Annotations storage**: `.review/` directory in user workspaces
- **Marketplace**: `letitia.md-human-review`

## Commands

```bash
# Install dependencies
npm install

# Compile TypeScript to out/
npm run compile

# Watch mode (recommended during development)
npm run watch

# Run Mocha unit tests (pretest auto-compiles)
npm test

# Run a single Mocha test by name pattern
npm test -- --grep "test name pattern"

# Run Playwright UI tests (headless)
npm run test:ui

# Run Playwright UI tests (headed, for debugging)
npm run test:ui:headed

# Run all tests (Mocha + Playwright)
npm run test:all

# Package .vsix (no dependency bundling)
npx vsce package --no-dependencies

# Publish to VS Code Marketplace
npx vsce publish --no-dependencies

# Publish to Open VSX Registry (Cursor marketplace)
npx ovsx publish <file.vsix> -p <OVSX_TOKEN>
```

Press `F5` in VS Code/CodeBuddy IDE to launch the Extension Development Host for live debugging.

## Architecture

### Backend (TypeScript, `src/`)

The backend is minimal — it manages the VS Code host side and bridges to the webview frontend.

| File | Role |
|------|------|
| `extension.ts` | Entry point. Registers `mdReview.openPanel` and `mdReview.exportReview` commands. Resolves file path from active editor, URI argument, or clipboard trick (for Explorer selection). |
| `reviewPanel.ts` | Manages `vscode.WebviewPanel` instances. Keyed by file path in `ReviewPanel.panels: Map<string, ReviewPanel>`. Handles webview↔host message passing, file system watchers, and AI chat integration (CodeBuddy/Copilot). |
| `fileService.ts` | All file I/O: reads source `.md` files, reads/writes annotation JSON to `.review/`, manages versioning (archives old review files when source content changes). |
| `stateService.ts` | Lightweight state management for the extension host side. |

### Frontend (plain JS/CSS, `webview/`)

The frontend runs inside the VS Code Webview (sandboxed browser context) and communicates with the backend via `vscode.postMessage` / `window.addEventListener('message')`.

| File | Role |
|------|------|
| `js/app.js` | Main orchestrator: initializes all modules, handles mode switching (review ↔ edit), toolbar events, keyboard shortcuts, and message routing with the VS Code host. |
| `js/renderer.js` | Markdown rendering engine: parses with `marked`, applies Mermaid, KaTeX, PlantUML, Graphviz, syntax highlighting. Also handles WYSIWYG edit mode (contenteditable) and diagram source editing. |
| `js/annotations.js` | Annotation system: creates/renders comment, deletion, and insertion highlights in the DOM; manages annotation cards and their interactions. |
| `js/export.js` | Export module: generates structured AI modification instruction Markdown from all annotations (ordered back-to-front); handles auto-save to `.review/` via host messages. |
| `js/store.js` | In-webview data store: holds annotation data, manages version state. |
| `js/settings.js` | Reads VS Code settings (sent from host on init), applies them to DOM (font size, theme, layout, etc.), and syncs configuration changes. |
| `index.html` | Webview shell: contains toolbar markup, modal templates, settings panel, and loads all CSS/JS assets. |

### Message Protocol (Host ↔ Webview)

- **Host → Webview**: `initData` (file content + annotations + settings), `triggerExport`, `fileUpdated`, `settingsUpdated`
- **Webview → Host**: `saveAnnotations`, `openAiChat`, `copyToClipboard`, `webviewReady`

### Test Infrastructure

| Directory | Framework | Scope |
|-----------|-----------|-------|
| `test/suite/` | Mocha + `@vscode/test-electron` | Unit/integration tests run inside a VS Code instance; mock-vscode.js provides stubs for unit tests |
| `test/ui/` | Playwright | UI tests run against `test-container.html` (a standalone HTML harness that loads the webview JS/CSS without VS Code) |

Playwright tests use `test/ui/specs/` for spec files and `test/ui/fixtures/` for test Markdown files.

## OpenSpec Workflow

This project uses **OpenSpec spec-driven development**. Any feature implementation must go through the OpenSpec pipeline — do not write code directly for new features.

- Active and archived changes: `openspec/changes/`
- Capability specs library: `openspec/specs/`
- Cross-session progress: `AGENT-PROGRESS.md`
- Workflow commands: `.codebuddy/commands/opsx/`

**Hotfix exemption**: Changes touching ≤3 source files and ≤30 lines may skip OpenSpec, but must still run the Hotfix Mini-Pipeline (compile → test → package → commit → push).

## Key Constraints

- The Mocha tests require a VS Code electron instance (`@vscode/test-electron`) — they cannot run in a plain Node.js environment.
- Webview JS is **plain ES5/ES6 JavaScript** (not TypeScript, not bundled). No import/export — modules communicate via globals or direct function calls.
- Annotations are stored as JSON in `<workspace>/.review/<filename>.json`. Version archives are created automatically when the source file's content hash changes.
- Both VS Code Marketplace and Open VSX (Cursor) must be published on every release.
- Commit messages must use Chinese descriptions: `feat: 中文描述`, `fix: 中文描述`, etc.
