# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

### 🐛 Bug Fixes
- Opening a Markdown file no longer creates an empty `.review/` record when nothing was annotated (#3)
- Manual save (`Ctrl+S`) in Rich Mode now refreshes the review snapshot, so annotations are no longer archived on the next open (#4)
- Review export now routes every field through i18n; the English UI no longer produces a mixed-language instruction body (#5)

### ✨ Features
- Keyboard shortcuts for annotation actions: `Ctrl+Enter` comment, `Ctrl+Shift+D` delete, `Ctrl+Shift+A/B` insert after/before, `Ctrl+Shift+J/K` navigate annotations, `Ctrl+Shift+T` toggle TOC, and `Ctrl+Enter` submits modals (#6)

## [1.5.7] - 2026-09-09

### ✨ Features
- **Footnote-backed comments** — Optionally write a comment into the source Markdown as a `[^mdhr-N]` footnote reference/definition, and restore it as an annotation when the document is reopened

### 🐛 Bug Fixes
- **Preserve annotations after source changes** — Re-anchor annotations against the updated Markdown instead of clearing them when the source file changes
- **Keep unresolved annotations visible** — Mark annotations as unresolved when their target text is missing or ambiguous, preserving them for manual review
- **Prevent incorrect annotation targeting** — Handle repeated text, cross-block selections, and same-name files in different directories without silently moving annotations
- **Exclude unresolved annotations from AI apply** — Avoid generating executable AI instructions with stale block indexes and offsets
- **Keep the custom editor buffer in sync when writing footnotes** — In Custom Editor mode, footnote comments are now applied through `WorkspaceEdit` and saved, instead of writing to disk behind the open document

### 🧪 Tests
- **Add annotation re-anchoring regression coverage** — Cover source updates, closed-file changes, duplicate anchors, cross-block anchors, same-name files, and unresolved exports

## [1.5.6] - 2026-06-13

### 🐛 Bug Fixes
- **Enable GFM line breaks** — Single newlines in paragraphs now render as `<br>` instead of being merged into one line, matching user expectation that each line break in source produces a visible line break in preview

### 📦 Package Size Optimization
- **Exclude AI workflow files from VSIX** — Keep CodeBuddy/Cursor AI workflow files available for repository collaboration while excluding `.claude/**`, `.codebuddy/**`, `.cursor/**`, `todo.md`, and `.review/**` from packaged extension artifacts

## [1.5.5] - 2026-06-11

### ✨ Features
- **Collapsible YAML Front Matter** — Front matter card now defaults to collapsed state; click the header to expand/collapse with smooth animation and arrow indicator

## [1.5.4] - 2026-05-13

### 🐛 Bug Fixes
- **Mark editor dirty on ProseMirror changes** — Expose `markEditorDirty()` to ProseMirror onChange handler so edits are properly flagged as dirty, enabling auto-save and status bar updates
- **Save immediately on exit edit mode** — When exiting Rich Mode, unsaved changes are now saved immediately instead of relying on the auto-save timer (which could be cancelled during exit)
- **Fix heading serialization escaping digits before dot** — Pass `fromBlockStart=false` to `renderInline()` in heading serializer to prevent ProseMirror from escaping `0.` → `0\.` patterns in headings like `## 0. 编码前验证`

### 🧪 Tests
- **Add Custom Editor integration tests** — 5 new tests (`BT-custom-editor.INT.1~5`) that actually open `.md`/`.mdc` files via `vscode.openWith` and verify Custom Editor creation using `TabInputCustom` type checks

## [1.5.2] - 2026-05-11

### 🐛 Bug Fixes
- **Fix zen mode sidebar toggle** — Add `zenModeChanged` message handler to close/restore VS Code sidebar, auxiliary bar, and bottom panel when toggling zen mode
- **Distinct annotation list icon** — Replace annotation list toggle icon from generic hamburger to a "list + ×" combo icon, visually distinguishing it from the TOC button

### 🧪 Test Fixes
- **Fix BT-TaskListCheckbox.2 CI failure** — Widen substring window from 1500 to 2500 chars to cover `!currentChecked` assertion
- **Relax BT-RemoveSourceMode.4 version assertion** — Use `>= 1.5.0` instead of exact match

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

## Older versions

Releases before 1.4.0 are archived in [CHANGELOG.archive.md](CHANGELOG.archive.md).
