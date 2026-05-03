# Changelog

All notable changes to this project will be documented in this file.

## [1.5.0] - 2026-05-03

### 🐛 Bug Fixes
- **Fix image upload in comment modal** — The "Add Image" click zone in the comment modal now uses `vscode.window.showOpenDialog` via Extension Host instead of relying on `<input type="file">` which may not work in certain VS Code webview environments (Cursor, CodeBuddy, etc.). Drag-and-drop and Ctrl+V paste remain as alternative upload methods. Falls back to native file input if `showOpenDialog` fails.
- **Fix image rendering in Rich Mode (edit mode)** — Images with relative paths (e.g. `./images/foo.png`) now render correctly in Rich Mode by resolving paths through the Renderer's image URI cache (`webview.asWebviewUri`). Previously, ProseMirror's `image` node `toDOM` used raw relative paths which are inaccessible in the webview sandbox.
- **Fix Rich Mode save failure** — Saving in Rich Mode (including after deleting images) now works correctly. The `handleSaveMd` function was calling `Exporter.saveViaHost()` which is not exported from the Exporter module, causing `TypeError: Exporter.saveViaHost is not a function`. Fixed by using `callHost('saveFile', { filePath, content })` to properly save the source file via Extension Host.

### 💥 Breaking Changes
- **Remove Source Mode editor** — The CodeMirror 6 Source Mode (`</>` toolbar button) has been completely removed. Users who need raw Markdown editing can open the `.md` file directly in VS Code / Cursor's native editor (same window, adjacent tab)
- **Remove `#btnToggleSource` button** — The Source Mode toggle button no longer exists in the toolbar
- **Remove `EditMode.enterSource()` / `exitSource()` / `isSourceActive()` API** — The state machine in `edit-mode.js` is now two-state (`INACTIVE` / `RICH`) instead of three-state

### ✨ Changes
- **Rich Mode icon updated** — The Rich Mode toolbar button icon changed from a paragraph mark (`¶`) to a pencil (`✎`), reflecting its new status as the sole editor
- **Rich Mode pencil icon refined** — Replaced the minimal two-stroke pencil SVG with a more detailed and recognizable pencil icon (closed path with tip, body, and edit-line indicator)
- **Rich Mode is now the only editor** — Click the pencil button to enter structured rich-text editing. All Rich Mode features (PM schema, diagram NodeView, annotation decorations, smart paste) remain unchanged

### 🗑️ Removed
- `webview/src/entries/cm6.entry.js` — CodeMirror 6 entry point (deleted)
- `webview/dist/cm6.bundle.js` — ~1 MB CodeMirror 6 bundle output (no longer built)
- 7 production dependencies removed: `@codemirror/commands`, `@codemirror/lang-markdown`, `@codemirror/language`, `@codemirror/search`, `@codemirror/state`, `@codemirror/view`, `@lezer/markdown`
- Source Mode CSS rules (`body.source-mode-active`, `#sourceModeContainer`, `#btnToggleSource.active`) removed from `markdown.css`
- Source Mode i18n keys (`edit_mode.source_toggle_tooltip`, `edit_mode.source`, `edit_mode.source_hint`, `edit_mode.source_exit_hint`) removed from both zh and en locales
- `test/suite/dual-mode-editor-phase-a.test.ts` — 42 Source Mode test assertions (deleted)
- `cm6.bundle` esbuild entry removed from `webview/build.config.mjs`
- `cm6BundleUri` variable and placeholder replacement removed from `src/reviewPanel.ts`

### 📝 Migration
- Users who previously used Source Mode for raw Markdown editing can open the `.md` file in VS Code / Cursor's built-in editor — the file is already open in a tab adjacent to the review panel
- No data migration required — both engines always read/wrote the same `Store.rawMarkdown`

### 🐛 Fixes
- Fix Rich Mode crash on documents containing block-level HTML (e.g. `<div>`, `<details>`, `<table>` as raw HTML): the `html_block` and `html_inline` ignore mappings in `MarkdownParser` were missing `noCloseToken: true`, causing the parser to register handlers for `html_block_open`/`html_block_close` instead of `html_block` — but markdown-it emits `html_block` as a standalone token without `_open`/`_close` variants

## [1.4.0] - 2026-05-03

### ✨ Dual-Mode Editor (Phase A + B + C)
- **New: Source Mode** — CodeMirror 6 engine for direct Markdown source editing. Toggle via the `</>` toolbar button. Features: syntax highlighting, line numbers, search (Ctrl+F), VS Code theme integration, keyboard shortcut passthrough (Ctrl+E/Alt+Z/F5 forwarded to host)
- **New: Rich Mode** — ProseMirror engine for structured rich-text editing. Toggle via the `¶` toolbar button. Features: full PM schema (20 nodes + 11 marks covering all Markdown features), Markdown↔PM bidirectional bridge (5 custom markdown-it plugins, completely bypasses turndown), diagram NodeView (preview + double-click to edit), annotation decorations (visible and drift-aware in Rich Mode), smart paste (HTML→Markdown→PM doc normalization)
- **Three-state machine** — `edit-mode.js` manages `inactive` / `source` / `rich` states with mutual exclusion. Only one editor mode can be active at a time
- **Markdown as single source of truth** — Both modes read from and write back to `Store.getData().rawMarkdown`. Source Mode uses CM6 `onChange` callback; Rich Mode uses PM serializer. No intermediate HTML→Markdown conversion needed

### 🗑️ Removed (BREAKING)
- **Remove legacy contenteditable WYSIWYG editing** — The old editing path that set `contenteditable="true"` on `#documentContent` and used turndown for HTML→Markdown conversion has been completely removed. This eliminates ~1,200 lines of dead code including: `createTurndownService()`, `blockHtmlToMarkdown()`, `extractTextFromNode()`, block-level snapshot/diff system, `convertDiagramsToEditable()`, `protectFrontmatterInEditMode()`, `showEditModeTips()`, and the WYSIWYG toolbar
- **Remove `#btnModeToggle` button** — The old pencil/eye toggle button is replaced by dedicated Source (`</>`) and Rich (`¶`) buttons
- **Remove `#wysiwygToolbar`** — The old formatting toolbar (Bold/Italic/Heading/List/Quote/Undo/Redo) is removed. Rich Mode provides its own PM-native editing commands
- **Remove `turndown.js` vendored library** — No code path references turndown anymore. PM serializer handles Rich→Markdown; Source Mode works with raw text directly
- **Remove turndown-safety spec** — The `edit-mode-turndown-safety` capability spec (escape identity, kbd keep, table br/align, diag log) is archived as the entire turndown pipeline no longer exists

### 🐛 Fixes
- Fix Rich Mode (ProseMirror) having no UI entry button after Phase C cleanup: the `#btnModeToggle` button was incorrectly removed as legacy code, but Phase B had repurposed it as the Rich Mode toggle. Added a dedicated `#btnToggleRich` button with proper click handler calling `EditMode.enterRich()`/`EditMode.exitRich()`, matching the existing `#btnToggleSource` pattern. Added `rich_toggle_tooltip` i18n key (zh/en). Updated `source-mode-exit` and `rich-mode-exit` event handlers to clear button active states
- Fix Rich Mode crash on documents containing tables: `MarkdownParser` token mapping was missing `table`, `thead`, `tbody`, `tr`, `th`, `td` entries, causing `Token type 'table_open' not supported` error. Added all 6 table token mappings (`table`→`table`, `tr`→`table_row`, `th`→`table_header`, `td`→`table_cell`, `thead`/`tbody`→`ignore`) with `align` attribute extraction from `text-align` style
- Fix Rich Mode crash on documents containing inline HTML tags: `MarkdownParser` had no handler for `html_inline` / `html_block` tokens (emitted by markdown-it when `html: true`), causing `Token type 'html_inline' not supported` error on any document containing `<br>`, `<kbd>`, `<mark>`, `<sub>`, `<sup>`, `<ins>`, `<u>`, or other HTML tags. Added a new `htmlTagConverterPlugin` core rule that rewrites `html_inline` tokens into PM-compatible tokens: `<br>`→`hardbreak`, `<kbd>`/`<mark>`/`<sub>`/`<sup>`/`<ins>`/`<u>` (and their closing counterparts) → corresponding PM mark open/close tokens. Unknown HTML tags degrade to plain text tokens (safe fallback). Added parser mappings for `kbd`/`mark`/`subscript`/`superscript`/`underline` marks plus `html_inline`/`html_block` ignore safety net
- Fix Zen Mode not restoring VS Code Auxiliary Bar and Bottom Panel on exit: the `zenModeChanged` handler in `reviewPanel.ts` only called `toggleSidebarVisibility` when leaving Zen Mode, completely missing the right-side Auxiliary Bar and Bottom Panel that were closed on entry. Added `_zenClosedBars` instance field to track which IDE areas were closed, and symmetrically call `toggleAuxiliaryBar` + `togglePanel` alongside `toggleSidebarVisibility` on exit

### 🏗️ Build
- `app.bundle.js` reduced from 370KB to 329KB (~11% smaller) after dead code removal
- `cm6.bundle.js` = 1.0MB (CodeMirror 6 + Markdown language support)
- `pm.bundle.js` = 1.1MB (ProseMirror + schema + serializer + markdown-it plugins)
- 12 new npm dependencies for ProseMirror (`prosemirror-*`), 7 for CodeMirror (`@codemirror/*` + `@lezer/markdown`)

### 📝 Notes
- Version bump: `1.3.12` → `1.4.0` (minor release — significant new capability)
- 710 tests passing, 0 failing (73 legacy turndown/WYSIWYG tests removed, net reduction from 783)
- Published to both VS Code Marketplace and Open VSX Registry

## [1.3.12] - 2026-04-29

### 🏗️ Build (add-webview-bundler-and-esm-modules)
- Introduce `esbuild` as the webview bundler (devDependency `esbuild@^0.24.0`). The new build script `webview/build.config.mjs` produces IIFE bundles targeting ES2020, chained into `npm run compile`. Two additional commands `build:webview` and `build:webview:watch` are available for standalone/hot-reload development
- Migrate `webview/js/*.js` (7 modules: i18n, store, renderer, annotations, export, settings, app) to ESM: each module now ends with `export { ModuleName };`; `app.js` is refactored from an immediately-invoked IIFE to `export function initApp()`, started explicitly by a unified entry `webview/src/entries/main.entry.js`. Function bodies unchanged — only the top-level wrappers and export statements differ
- Reserve bundler entry slots `cm6.entry.js` and `pm.entry.js` (placeholder exports only in this change) for the upcoming dual-mode editor (CodeMirror 6 + ProseMirror) planned in the next change
- Simplify `webview/index.html` script loading: replaces 7 `<script src="${xxxUri}">` tags with a single `<script src="${appBundleUri}"></script>`. `src/reviewPanel.ts` updated accordingly (1 URI instead of 7). Existing CSP stays intact (`script-src 'nonce-${nonce}' ${cspSource}` covers the same-origin bundle)
- Zero user-visible change: all rendering, annotation, export, search, i18n, theme, and diagram (Mermaid/PlantUML/Graphviz/KaTeX) behaviors remain byte-identical to the pre-change baseline
- Test coverage: 726 existing regression tests remain green; +13 new assertions under new suite `webview-build-system.test.ts` (Tier 1: 7 existence checks + Tier 2: 1 structural check + Tier 3: 5 BT-BuildSystem.* behavioral checks). Total: 739 passing, 0 failing

### 🐛 Fixes (fix-edit-mode-turndown-safety)
- Fix edit-mode save path no longer adds backslash escapes to plain prose characters `*`, `_`, and `\`: the default `TurndownService.escape` was backslash-doubling these three characters inside normal prose, breaking Windows paths (`C:\Users\foo` → `C:\\Users\\foo`), snake_case identifiers, and literal asterisks. Override `ts.escape` with an identity function so prose round-trips unchanged. Verified via one-shot jsdom probe: `#`, `|`, `$`, `$$` were NOT actually escaped by default (contrary to common assumption), so the fix targets exactly the three confirmed offenders
- Fix `<kbd>` HTML tag being silently dropped to plain text during edit-mode save: `<p>Press <kbd>Ctrl</kbd></p>` became `Press Ctrl`, losing the semantic tag. Register `<kbd>` in the turndown keep-list so it survives as raw inline HTML (matching how `<u>`/`<sub>`/`<sup>`/`<mark>`/`<ins>` already work via addRule)
- Fix table cell `<br>` producing three spaces instead of GFM-standard two-space line break: pre-normalize `<br>`, `<br/>`, `<br />` in cell innerHTML to two spaces before feeding to turndown
- Fix table column alignment (`<th align="left|center|right">`) being lost during save: always produced `---` separator regardless of alignment. Now reads `align` attribute and emits `:---` / `:---:` / `---:` / `---` accordingly. Wrapped in `window.__TURNDOWN_TABLE_V2__` feature flag (default enabled) for emergency rollback

### ✨ Features
- Add `[DIAG:turndown] unknown-tags` diagnostic log gated by `window.__DEBUG_TURNDOWN__ === true`: when developers need to investigate user-reported "format lost on save" bugs, enabling this flag in DevTools prints the list of HTML tags encountered during save that did not match any turndown rule or the known-tags whitelist, making gaps in rule coverage observable. Default off, zero noise in production

### 📝 Scope Notes
- Mathematical formulas (`$x=1$`, `$$E=mc^2$$`) were NOT previously broken by escape — the turndown library does not escape `$` by default (verified empirically). No change needed here
- Empty table cells `<td></td>` currently output `|  |` with two spaces, which is GFM-compliant. Unchanged to avoid regression risk
- Block-level diff alignment (`normalizeHtmlForCompare` robustness against `<br>` vs `<br/>` and contenteditable DOM noise) is a known edge that remains scheduled for a separate change (the upcoming dual-mode editor)
- Known limitation: users manually typing literal `*text*` in Rich Mode and expecting it to render as plain text will now see it interpreted as emphasis; Rich Mode UI does not expose such an entry point, so normal paths are unaffected

## [1.3.11] - 2026-04-23

### 🔧 Improvements
- Reduce toolbar height from 44px to 36px for an even more compact header layout
- Reduce file selector max-width from 260px to 195px (75% of original) for a more compact toolbar layout
- Replace Zen Mode button icon from nested rectangles to concentric circles SVG for a cleaner, more intuitive visual metaphor
- Reduce help button circle size from 28px to 22px for better proportion with other toolbar elements
- Reduce toolbar height from 56px to 44px for a more compact header layout
- Remove text labels from toolbar buttons (TOC, Zen Mode, Theme, Preview/Edit mode, Annotations) to show icons only, reducing toolbar clutter; also remove dynamically updated text on theme/zen mode toggle so buttons remain icon-only after state changes
- Rename "一键AI修复" button label to "AI Fix" for shorter display; restore annotation count badge on annotations button (number-only, hidden when zero)
- Compact settings panel layout: reduce header padding (20px→14px top, 16px→10px bottom), title font (22px→20px), body padding/gap, card header/body padding and gap for a denser settings UI
- Reduce document content area vertical spacing: padding top/bottom from 32px to 20px, margin from 16px to 8px for a tighter layout

### ✨ Features
- Add visual regression testing (screenshot comparison) using Playwright `toHaveScreenshot()` API: 10 test cases covering basic rendering, tables, code blocks, alert blocks, Mermaid charts, math formulas, dark/light themes, and toolbar; fixed viewport (1280×720) with 1% pixel diff tolerance; `npm run test:ui:update-snapshots` script for baseline regeneration

### 🐛 Fixes
- Fix Mermaid gitGraph rendering failure ("svg element not in render tree"): pass `container` as the third argument to `mermaid.render()` so the temporary SVG is inserted into a visible DOM element, allowing `getBBox()` to compute text dimensions correctly
- Fix help modal showing double scrollbars by setting `overflow-y: hidden` on `.modal-help` so only the inner `.help-content` scrolls
- Fix `toggleZenMode()` still appending text labels (`+ t('toolbar.exit_zen')` / `+ t('toolbar.zen')`) to button innerHTML after toggle, inconsistent with `updateZenButtonLabel()` which was already fixed to icon-only
- Fix YAML front matter being corrupted after editing in WYSIWYG mode: `%%FRONTMATTER%%` internal marker prefix was written to file on save, and turndown conversion destroyed `---` delimiters when frontmatter card content was modified
- Fix frontmatter card rows disappearing when edited in WYSIWYG mode: set `contentEditable="false"` on the card container and `contentEditable="true"` only on `.fm-value` spans, preventing browser's default editing behavior from destroying the card's DOM structure
- Fix code blocks incorrectly rendering underscored variable names (e.g. `{cos_name}`, `{file_count}`) with wrong color in dark themes: highlight.js wraps `_xxx_` in `<span class="hljs-emphasis">` (not `<em>`), causing text to become nearly invisible; use regex to strip full `hljs-emphasis`/`hljs-strong` tag pairs while preserving inner text
- Fix `hljs-quote` span swallowing subsequent content in markdown code blocks: when a `>` blockquote line contains an unclosed `_` (e.g. `node_modules`), highlight.js emphasis spans across paragraph boundaries, causing the outer `hljs-quote` to also span across blank lines and incorrectly color subsequent headings/text; detect and strip `hljs-quote` spans whose content crosses blank lines (`\n\n`)
- Fix markdown structures (headings / blockquotes / bullet lists) losing syntax highlighting after being swallowed by unclosed-underscore emphasis in code blocks: for `markdown`/`md` language code blocks, after stripping the incorrect `hljs-emphasis`/`hljs-quote` spans, re-tag bare markdown structures line-by-line with the proper `hljs-section` / `hljs-quote` / `hljs-bullet` classes so that e.g. `rules_PT\n\n# 标题` correctly highlights `# 标题` as a section instead of plain text
- Fix mis-colored `hljs-code` regions and missing `hljs-quote` on the last blockquote line when runaway emphasis corrupts inline-code backtick pairing in markdown code blocks: when a quoted line contains `node_modules` + `npm install` backtick spans, the unclosed `_` scrambles highlight.js state so that a chunk of plain text between two backticks gets wrapped as `hljs-code`, and the outer `hljs-quote` on that line is lost; detect runaway emphasis (inner `\n\n`) as a root-cause signal and, when present, strip all `hljs-code` spans in the block and wrap any `&gt; ` line (even those containing residual hljs spans) with `hljs-quote`

### 🔧 Improvements
- Enhance dark theme table readability: add explicit `color` on `td` cells, add border and enhanced contrast for inline code inside tables, and add explicit `color` for `strong` text inside tables
- Change default code highlight theme from `default-dark-modern` to `default-light-modern` for better readability in light theme environments
- Add missing `.hljs-code` color definitions for `default-dark-modern`, `default-light-modern`, `atom-one-dark`, `atom-one-light`, `vs2015`, and `one-dark-pro` themes to ensure Markdown inline code (backtick content) is visually distinct in code blocks

## [1.3.10] - 2026-04-23

### 🔨 Refactor
- Remove all `[DIAG]` diagnostic console.log statements from `app.js` and `settings.js` after code font bug was confirmed fixed

### 📖 Docs
- Streamline project-continuity rule file (388 → 333 lines): compress redundant sections, remove `.aikp` references, retain design rationale

## [1.3.9] - 2026-04-22

### 🐛 Fixes
- Fix code font setting not applying to dynamically rendered code blocks by adding `onRenderComplete` callback hook in renderer and re-applying inline `font-family` after each `renderBlocks()` call
- Fix code font setting not taking effect on code blocks by adding direct inline `font-family` style to code elements in `applyToDOM()` (CSS variable alone was insufficient in VS Code webview)
- Fix code font setting not taking effect on frontmatter card, code theme preview, and diagram edit textarea due to hardcoded `font-family` values instead of using `--code-font-family` CSS variable
- Fix YAML Front Matter card truncating long text (e.g. comment lines) due to `white-space: nowrap` on `.fm-prop`; replaced with `word-break: break-word` to allow proper wrapping
- Fix settings panel flashing briefly on every document open by adding inline `display:none` and managing visibility via JS show/hide lifecycle
- Fix 7 failing tests with stale default value expectations (fontSize 18→16, lineHeight 1.8→1.6, contentMaxWidth 1200→1100) across 5 test files

### 🔧 Improvements
- Optimize renderMermaid() DOM cleanup from O(n²) to O(n) for documents with many diagrams
- Change YAML Front Matter card icon from 📄 to ⚙️ to indicate configuration/settings content

### 🔨 Refactor
- Remove all `[DIAG]` diagnostic console.log statements from `app.js` (46 entries) and `settings.js` (2 entries) after code font bug was confirmed fixed

### 📖 Docs
- Add "Use as Markdown Reader" tips to README and help page

## [1.3.8] - 2026-04-22

### 🐛 Fixes
- Fix fenced code block nesting where mismatched backtick counts caused rendering errors
- Fix code block line numbers misaligned due to unclosed hljs cross-line span tags
- Fix help page comment hint color description ("purple highlight" → "green highlight")
- Fix document content area missing scrollbar, preventing users from scrolling to bottom via drag
- Fix "Reset to Defaults" button using stale default values (fontSize/lineHeight/contentMaxWidth) in settings panel
- Fix edit mode warning tips close button not dismissing immediately (replace inline onclick with addEventListener, clear auto-hide timer on manual close)

### 🔧 Improvements
- Adjust default values for font size / line height / max content width to 16px / 1.6 / 1100px
- Remove welcome page 512x512 icon to reduce package size

## [1.3.7] - 2026-04-21

### 🐛 Fixes
- Fix readability issue with mermaid diagrams when custom fill colors cause insufficient text contrast
- Fix embedded mode edit toolbar overlapping panel close button
- Floating mode edit toolbar no longer overlaps left/right panel close buttons

## [1.3.6] - 2026-04-19

### 🔧 Improvements
- `.claude/` directory switched from shim to full copy for better Claude Code declarative loading compatibility
- `sync-aikit-shims.js` script supports skipping subdirectory config (`.claude/rules/` replaced by CLAUDE.md `@import`)
- Expand aikit-shim test coverage for full copy scenarios (added BT-aikitShim.12~15)

### 📝 Documentation
- Fix README badge links, expand package.json keywords/categories to improve Marketplace search visibility
- CLAUDE.md dev workflow section switched to `@.aikp/rules/` import syntax

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

### 🔧 Other
- Add `.aikp` source-of-truth directory with shim bridge mechanism, supporting `.codebuddy` / `.claude` / `.cursor` triple-tool reuse of the same aikit rules

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
