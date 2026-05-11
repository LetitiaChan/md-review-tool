# Changelog

All notable changes to this project will be documented in this file.

## [1.5.1] - 2026-05-10

### 🔧 UI Improvements
- **Distinct annotation list icon** — Replace the annotation list toggle icon from generic hamburger (three lines) to a "list + ×" combo icon, visually distinguishing it from the TOC button

### 🐛 Bug Fixes
- **Fix zen mode not hiding VS Code sidebars** — Add `zenModeChanged` message handler in extension host to close/restore VS Code sidebar, auxiliary bar, and bottom panel when toggling zen mode
- **Restore light theme button in settings** — The "Light" theme option was missing from the settings panel theme mode selector; restored the `☀️ Light` button alongside Dark and Auto
- **Fix settings.js DEFAULTS mismatch** — `theme` default was `dark` in settings.js but `light` in package.json; "Reset Settings" now correctly restores package.json defaults
- **Fix webviewHelper.ts fallback defaults** — Align `fontSize` (18→16), `lineHeight` (1.8→1.6), `contentMaxWidth` (1200→1100) fallbacks with package.json declared defaults
- **Guard content search in Rich Mode** — `performContentSearch()` now skips DOM manipulation when ProseMirror editor is active, preventing editor state corruption
- **Fix auto-save without dirty check** — `scheduleAutoSave()` now checks `editorDirty` flag before invoking save, preventing unnecessary disk writes
- **Fix OutputChannel resource leak** — Reuse a single `OutputChannel` instance instead of creating a new one on every webview error or AI chat dispatch
- **Fix _suppressFileChanged timer race** — Cancel previous timer with `clearTimeout` before setting a new one, preventing premature flag reset on rapid saves
- **Unify callHost timeout** — Align annotations.js `_callHost` timeout from 10s to 15s to match app.js, preventing premature timeout on slow operations

### 📦 Package Size Optimization
- **Exclude webview source files from .vsix** — Added `webview/js/**`, `webview/src/**`, `webview/build.config.mjs`, `.review/**` to `.vscodeignore`; reduced package from 68→53 files (2.5→2.3 MB)

### 🔧 Configuration Changes
- **Panel mode default changed to "embedded"** — New installations default to embedded panel mode instead of floating
- **Code theme default changed to "Default Dark Modern"** — New installations default to dark modern code highlighting theme

### ✨ New Features
- **Editable YAML Front Matter in Rich Mode** — Double-click to edit frontmatter with textarea, Ctrl+Enter to confirm
- **Link bubble menu in Rich Mode** — Click hyperlink to show floating menu (preview, edit, open, copy, unlink)
- **Table grid selector** — Table button opens 6×6 grid popover for custom row/column selection
- **Pick local images** — Image popover adds "📁 Pick Local Image" button with native file picker
- **Re-edit hyperlinks** — Double-click existing link to edit URL, title, and display text
- **Custom Editor Provider** — Register as `CustomTextEditorProvider` for `.md/.mdc/.markdown` with native dirty-state and Ctrl+S save
- **Shared webview architecture** — Extracted `src/webviewHelper.ts` for shared rendering between panel and editor modes
- **Alert block type selector** — 5 alert types (Note/Tip/Important/Warning/Caution) via popover
- **Code block language selector** — 12 common languages + custom input via popover
- **Restore context menus** — Right-click context menus restored with `mdReview.openWithReview` command
- **Restored toolbar refresh button** — Three strategies: Visual Refresh, Disk Reload, Editor Reload
- Extend Rich Mode editor toolbar — 13 new buttons (Inline Code, Text Color, Highlight, Task List, Hyperlink, Image, Alert Block, Code Block, Table, Mermaid, PlantUML, Graphviz, Emoji)
- Add Rich Mode editor toolbar (Bold, Italic, Strikethrough, H1-H3, Lists, Blockquote, HR, Undo, Redo)
- Hide TOC and annotations panels in Rich Mode for distraction-free editing

### 💥 Breaking Changes
- Remove Source Mode editor (CodeMirror 6) — use VS Code native editor for raw Markdown
- Rich Mode is now the only editor (icon changed to pencil ✎)

### 🔧 Refactor
- Remove obsolete UI test cases: `diagnostic.spec.ts` (debug-only skipped tests), contenteditable-based tests in `edit-mode.spec.ts` and `checkbox.spec.ts` (replaced by ProseMirror)

### 🐛 Bug Fixes
- Fix Mermaid ER diagram and Git graph failing on first render (added retry-after-layout mechanism using `requestAnimationFrame`)
- Fix task list items separated by blank lines after Enter in Rich Mode (added `tight` attribute)
- Fix excessive spacing between task list items (changed contentDOM from `<span>` to `<div>`)
- Render task list checkboxes in Rich Mode (added interactive checkbox NodeView)
- Fix task list `- [ ]` becoming escaped characters (added `taskListPlugin` for markdown-it)
- Prevent hyperlink navigation in Rich Mode (use `data-href` instead of `href`)
- Fix table context menu and hover overlay invisible (set `currentMode = 'rich'`)
- Fix pasted images not rendering (return `webviewUri` in `imageSaved` response)
- Fix "File Updated" badge flashing after edit (added `_suppressFileChanged` flag)
- Fix "cannot open file" TypeError after file-list removal (removed dead code)
- Fix custom color button not opening OS color picker
- Fix task list round-trip (assign `{ checked: false }` to new list items)
- Fix link popover not pre-filling existing link attributes
- Fix Rich Mode background in light theme
- Add "Delete entire table" context-menu entry
- Add hover "+" overlay for adding rows/columns to tables
- Raise table context menu viewport clamp to 360px
- Fix toolbar popover breaking page rendering (moved popovers outside `<button>`)
- Fix image upload in comment modal (use `showOpenDialog` via Extension Host)
- Fix image rendering in Rich Mode (resolve relative paths via URI cache)
- Fix Rich Mode save failure (`saveViaHost` → `callHost('saveFile')`)
- Fix annotation changes not auto-saved to disk
- Fix document not refreshing after exiting Rich Mode
- Fix disk record not updated after deleting all annotations in v1
- Fix Rich Mode crash on block-level HTML (`noCloseToken: true`)

### 🔧 Improvements
- Move Undo/Redo buttons to first position in Rich Mode toolbar
- Use VS Code default editor background in Rich Mode

### 🗑️ Removed
- Removed `MD Human Review: Open Review Panel` command — use context menu or "Open With..." instead
- Removed internal file list — use VS Code native file Explorer
- CodeMirror 6 entry/bundle, 7 `@codemirror/*` dependencies, Source Mode CSS/i18n/tests

### ✅ Tests
- 1001 passing, 0 failing
- Added regression assertions for: frontmatter edit, task list checkbox, link bubble, task list parse, link edit text, pick local image, image URI cache, file change badge, custom editor provider, rich mode bugfixes

## [1.4.0] - 2026-04-30

### ✨ New Features
- **Dual-Mode Editor (Phase A + B + C)** — Source Mode (CodeMirror 6) + Rich Mode (ProseMirror), three-state machine, Markdown as single source of truth

### 🗑️ Removed (BREAKING)
- Remove legacy contenteditable WYSIWYG editing (~1,200 lines dead code)
- Remove `turndown.js` vendored library and turndown-safety spec

### 🐛 Fixes
- Fix Rich Mode missing UI entry button after Phase C cleanup
- Fix Rich Mode crash on tables (added 6 table token mappings)
- Fix Rich Mode crash on inline HTML tags (added `htmlTagConverterPlugin`)
- Fix Zen Mode not restoring Auxiliary Bar and Bottom Panel on exit

### 🏗️ Build
- `app.bundle.js` 370KB→329KB; `pm.bundle.js` 1.1MB; 12 new ProseMirror deps
- 710 tests passing, 0 failing

## [1.3.12] - 2026-04-29

### 🏗️ Build
- Introduce `esbuild` webview bundler, migrate 7 modules to ESM
- Simplify HTML script loading (7 tags → 1 bundle)
- 739 tests passing, 0 failing

### 🐛 Fixes
- Fix turndown escape breaking Windows paths and snake_case identifiers
- Fix `<kbd>` tag dropped to plain text during save
- Fix table cell `<br>` producing 3 spaces instead of 2
- Fix table column alignment lost during save

## [1.3.11] - 2026-04-23

### 🔧 Improvements
- Compact toolbar layout (height 56→44→36px, icon-only buttons)
- Compact settings panel and document content area spacing
- Enhance dark theme table readability
- Change default code highlight theme to `default-light-modern`

### 🐛 Fixes
- Fix Mermaid gitGraph rendering failure
- Fix YAML front matter corrupted after WYSIWYG editing
- Fix code blocks incorrectly rendering underscored variable names
- Fix highlight.js runaway emphasis corrupting markdown code blocks

### ✨ Features
- Add visual regression testing (Playwright screenshot comparison)

## [1.3.10] - 2026-04-23

### 🔨 Refactor
- Remove all `[DIAG]` diagnostic console.log statements

## [1.3.9] - 2026-04-22

### 🐛 Fixes
- Fix code font setting not applying to various elements
- Fix YAML Front Matter card truncating long text
- Fix settings panel flashing on document open

### 🔧 Improvements
- Optimize renderMermaid() DOM cleanup O(n²)→O(n)
- Change Front Matter card icon from 📄 to ⚙️

## [1.3.8] - 2026-04-22

### 🐛 Fixes
- Fix fenced code block nesting and line number misalignment
- Fix document content area missing scrollbar
- Fix "Reset to Defaults" button using stale values

### 🔧 Improvements
- Adjust defaults: font 16px, line-height 1.6, max-width 1100px

## [1.3.7] - 2026-04-21

### 🐛 Fixes
- Fix mermaid diagram text contrast with custom fill colors
- Fix edit toolbar overlapping panel close buttons

## [1.3.6] - 2026-04-19

### 🔧 Improvements
- `.claude/` directory switched to full copy for better compatibility
- Fix README badge links, expand Marketplace keywords

## [1.3.5] - 2026-04-19

### ✨ New Features
- AI Chat dispatch adapter supports Cursor / Windsurf / Trae / Kiro and other VS Code-based AI editors
- AI fix command appends a prompt to refresh panel after completion

### 🐛 Fixes
- Fix annotations being accidentally deleted when opening md files (lost after close and reopen)
- Fix review records being accidentally deleted after refresh (C-1 historical version retention policy)
- Fix Store module missing `getRelPath` export causing TypeError when clearing annotations
- Fix AI fix not persisting new version number placeholder, causing old annotations to restore on reopen
- Fix version number not upgrading when source file is externally modified while panel is closed
- One-click AI fix no longer pops up output window (silently writes to log only)

## [1.3.0] - 2026-04-08

### ✨ New Features
- Content search (Ctrl+F): Press Ctrl+F to open search bar, supports keyword highlighting, match count ("current/total"), up/down navigation (Enter/Shift+Enter), Escape to close
- TOC panel search box: Real-time filtering of TOC items while preserving hierarchy (ancestor headings of matched items also shown), auto-expands collapsed items during search, restores original collapse state when search is cleared
- Annotation panel search box: Multi-field search (selected text, comment content, inserted content), compatible with sort modes, updates annotation count after filtering

## [1.2.0] - 2026-04-07

### ✨ New Features
- Support PlantUML diagram rendering (via online server, requires network connection)
- Support Graphviz (DOT language) diagram rendering (local rendering via Viz.js)
- PlantUML / Graphviz diagrams support click-to-zoom (Lightbox)
- Add `mdReview.enablePlantUML` and `mdReview.enableGraphviz` settings
- Multi-language support (Chinese/English), switchable in settings, defaults to VS Code language
- Add `mdReview.language` setting
- Review panel supports multi-window — different files create independent panels, same file reuses existing panel
- Multi-window same-name file titles auto-append parent directory for disambiguation (e.g. `README.md — docs`)
- Font settings changed to dropdown + custom input, separate settings for body and code fonts
- Add `mdReview.codeFontFamily` setting

### 🎨 UI Enhancements
- Toolbar buttons rearranged for more intuitive operation
- Add floating mode / embedded mode toggle (`mdReview.panelMode`)
- Add document alignment setting (left / center / right, `mdReview.documentAlign`)
- Panel title dynamically displays current filename
- Add hide button within panel
- Help modal content switched to i18n dynamic rendering, fully translated when switching language
- Zen mode maximizes current editor window and closes bottom output panel on enter, restores layout on exit

### 🐛 Fixes
- Fix editing blockquote content in edit mode duplicating the quote
- Fix editing GitHub alert blocks in edit mode breaking styles
- Fix editing code blocks in edit mode breaking code styles
- Fix math formulas showing placeholders instead of raw text in edit mode
- Fix math formulas and diagrams showing source code in edit mode, correctly rendered when switching back to preview
- Fix edit mode save no longer re-renders DOM to avoid breaking diagrams, auto-restores when switching back to preview
- Fix turndown list conversion using 4-space indent to preserve original nested list format
- Fix list block changes preferring line-level text diff replacement to preserve original Markdown format and indentation
- Fix exiting edit mode and one-click AI fix now immediately await save, not waiting for auto-save delay
- Fix file selection dropdown default text not refreshing in real-time when switching languages
- Fix zen mode button text and theme button label refreshing in real-time after language switch
- Fix language switch not responding — code was incorrectly nested inside theme button callback
- Fix i18n applyToDOM using textContent on optgroup clearing code highlight theme options
- Fix code font setting taking effect — CSS hardcoded values changed to CSS variables for unified control
- Fix refresh button also syncs settings, resolving settings inconsistency across multiple windows
- Fix zen mode no longer manipulates editor group layout, fixing file confusion in multi-window scenarios
- Remove task list strikethrough style interference

## [1.1.0] - 2025-04-04

### ✨ New Features
- Initialize OpenSpec Harness Kit development workflow
- Support `.mdc` (Markdown Cursor) file format syntax highlighting

## [1.0.0] - 2025-03-31

### 🎉 Initial Release

- Support visual review of Markdown / MDC files
- Support three annotation types: comment, mark deletion, insert content
- Support CRUD and navigation for annotations
- Support exporting AI-readable structured modification instructions (JSON / plain text)
- Support light / dark / follow system theme
- Support table of contents navigation (TOC)
- Support code highlighting (15+ themes available)
- Support Mermaid diagram rendering
- Support KaTeX math formula rendering
- Support custom font size, line height, content width and other typography settings
- Support auto-save annotations
- Support sidebar layout toggle (swap TOC/annotations left and right)
- Support right-click menu, editor title bar, explorer multi-entry open
- Support keyboard shortcut export (Ctrl+E)
