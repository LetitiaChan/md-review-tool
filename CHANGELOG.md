# Changelog

All notable changes to this project will be documented in this file.

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
