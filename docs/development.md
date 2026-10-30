# Development / 开发文档

Build, test and release notes for MD Human Review.
构建、测试与发布说明。

## Requirements

- Node.js 20 or 22
- VS Code 1.74+ (for the Extension Development Host)

## Commands

```bash
npm install                 # install dependencies

npm run compile             # tsc + esbuild (webview bundles)
npm run compile:test        # compile test suites into out/ for debugging
npm run watch               # tsc watch
npm run build:webview:watch # esbuild watch for webview only

npm test                    # VS Code integration tests (builds first)
npm run test:ui             # Playwright UI tests (builds webview first)
npm run test:ui:update-snapshots  # refresh visual baselines
npm run test:all            # both suites

npm run build:webview:prod  # minified bundles (whitespace/syntax only)
npx @vscode/vsce package --no-dependencies   # build a .vsix
```

`npm run compile` produces `webview/dist/app.bundle.js` and `webview/dist/pm.bundle.js`. `webview/dist/` is not tracked by git — both test scripts build it automatically.

## Project Structure / 项目结构

```
src/                              Extension host (TypeScript)
├── extension.ts                  Entry, command registration
├── customEditorProvider.ts       Custom Editor Provider (dirty state, Ctrl+S)
├── webviewHelper.ts              Shared webview HTML / asset URIs
├── fileService.ts                File IO, review records, AI instructions
├── aiChatAdapters.ts             CodeBuddy / Cursor / Windsurf chat adapters
└── stateService.ts               Workspace state

webview/                          Webview (ESM, bundled by esbuild)
├── index.html                    Toolbar, modals, settings panel
├── js/
│   ├── app.js                    Application orchestration
│   ├── lightbox.js               Image / Mermaid / Graphviz lightboxes, code copy
│   ├── renderer.js               Public Renderer facade
│   ├── renderer/
│   │   ├── context.js            Shared mutable render state
│   │   ├── parser.js             Markdown block splitting
│   │   ├── marked-setup.js       marked renderer, extensions, slug, hljs cache
│   │   ├── block-renderer.js     Full render + incremental annotation update
│   │   ├── highlight.js          Annotation selection matching
│   │   ├── images.js             Image paths, URI cache, load fallback
│   │   ├── math.js               KaTeX
│   │   └── diagrams.js           Mermaid / PlantUML / Graphviz
│   ├── annotations.js            Annotation system
│   ├── edit-mode.js              INACTIVE / RICH state machine
│   ├── asset-loader.js           Lazy loading for large dependencies
│   ├── pm-schema.js              ProseMirror schema
│   ├── pm-markdown-bridge.js     Markdown ↔ ProseMirror bridge
│   ├── export.js / store.js / settings.js / i18n.js
├── src/
│   ├── entries/main.entry.js     → dist/app.bundle.js
│   ├── entries/pm.entry.js       → dist/pm.bundle.js
│   ├── pm/                       input rules, keymap, position map, paste,
│   │                             serializer state, nodeviews
│   └── slash-command/
└── css/

test/
├── suite/                        VS Code integration (mocha + test-electron)
├── ui/                           Playwright (test-container.html / pm-container.html)
└── ui/fixtures/                  Rich-format Markdown fixtures
```

## Repository hygiene / 仓库产物

Generated files stay out of git:

| Path | Tracked | Purpose |
|---|---|---|
| `out/` | no | tsc output (`npm run compile`) |
| `webview/dist/` | no | esbuild bundles (`npm run build:webview`) |
| `test-results/`, `playwright-report/`, `blob-report/` | no | Playwright artifacts |
| `test/ui/specs/__screenshots__/` | yes | Visual baselines (`.png` only; failure `-actual` / `-diff` images are ignored) |
| `*.vsix`, `.vscode-test*/` | no | Local packages and test runner caches |

`.vscode/launch.json` and `.vscode/tasks.json` are tracked so `F5` works right after cloning; other `.vscode/` files stay local. `.vscodeignore` mirrors this list and additionally keeps development-only files (AI workflow configs, `docs/`, `openspec/`, sources) out of the `.vsix`.

## Testing

- **Integration** (`npm test`, ~1,100 cases): service logic, source-level invariants and end-to-end flows inside a real VS Code instance.
- **UI** (`npm run test:ui`, ~155 cases): preview rendering, annotations, rich mode, round-trip fidelity and performance budgets in Chromium.
- Visual regression is excluded from CI because font rendering differs per platform.

Add fixtures under `test/ui/fixtures/` and specs under `test/ui/specs/`. Read fixtures through `readFixture()` so line endings are normalized (the repo forces CRLF on checkout). `full-syntax.md` is the canonical rich-format fixture: YAML Front Matter plus the full GFM syntax (tables, alerts, task lists, footnotes, math, Mermaid / PlantUML / Graphviz), used by preview, Rich Mode and round-trip specs.

## Release

1. Update `CHANGELOG.md` (recent versions only; older entries live in `CHANGELOG.archive.md`).
2. Bump `version` in `package.json`.
3. `npm run test:all`.
4. `npx @vscode/vsce package --no-dependencies` and publish with `vsce publish` / `ovsx publish`.
