# Changelog Archive

Older releases (before 1.4.0). Recent versions are in [CHANGELOG.md](CHANGELOG.md).

---

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
