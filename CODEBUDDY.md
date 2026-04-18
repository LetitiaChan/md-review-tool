# CODEBUDDY.md

This file provides guidance to CodeBuddy Code when working with code in this repository.

## 项目概述

**MD Human Review** 是一个 Markdown 批阅与批注扩展，发布于 **VS Code Marketplace** 与 **Open VSX Registry**，支持 VS Code 及所有基于 VS Code 开源版本构建的 AI 编辑器（如 Cursor、Windsurf、CodeBuddy IDE、Trae 等）。用户在渲染后的文档上添加评论、标记删除、插入内容、所见即所得编辑，并一键生成 AI 修改指令。

- **发布者**: `letitia.md-human-review`
- **支持格式**: `.md`, `.markdown`, `.mdc`
- **兼容编辑器**: VS Code / Cursor / Windsurf / CodeBuddy IDE / Trae 等（所有基于 VS Code 开源版本的编辑器）
- **双市场发布**: VS Code Marketplace + Open VSX（Cursor / Windsurf 等从 Open VSX 拉取）

## 常用命令

```bash
npm install                # 安装依赖
npm run compile            # TypeScript 编译到 out/
npm run watch              # 监听模式（开发推荐）
npm test                   # Mocha 单元测试（pretest 自动编译 src 与 test）
npm run test:ui            # Playwright UI 测试
npm run test:ui:headed     # Playwright 有头模式（可观察）
npm run test:ui:debug      # Playwright 调试模式
npm run test:all           # 运行全部测试（Mocha + Playwright）
```

**运行单个 Mocha 测试**（按测试名过滤）:
```bash
npm run compile && npm run compile:test && node ./out/test/runTest.js -- --grep "测试名关键字"
```

**运行单个 Playwright 测试文件**:
```bash
npx playwright test --config test/ui/playwright.config.ts test/ui/specs/某个.spec.ts
```

**调试扩展**: 在 VS Code 中按 `F5` 启动 Extension Development Host，`Ctrl+Shift+I` 打开 WebView DevTools。

**打包**: `npx vsce package --no-dependencies`

## 架构

本扩展采用经典的 VS Code WebView 架构：后端 TypeScript 与前端纯 JavaScript 之间通过 `postMessage` 消息桥通信。前端**无构建步骤**——`webview/` 下的 JS/CSS 由 WebView 直接加载。

### 后端 (src/) — TypeScript，编译输出到 `out/`

| 文件 | 职责 |
|------|------|
| `extension.ts` | 扩展入口，注册 `mdReview.openPanel` / `mdReview.exportReview` 命令 |
| `reviewPanel.ts` | WebView 面板管理（创建/复用/多窗口）、消息处理、AI 聊天集成、文件监听 |
| `fileService.ts` | 文件读写、`.review/` 目录下的批注存储与版本管理、AI 指令文件生成 |
| `stateService.ts` | 基于 `workspaceState` 的 UI 状态持久化 |

### 前端 (webview/) — 纯 JavaScript

| 文件 | 职责 |
|------|------|
| `app.js` | 主控模块：初始化、事件绑定、预览/编辑模式切换、禅模式、快捷键 |
| `renderer.js` | Markdown 渲染引擎：marked 解析、Mermaid/KaTeX/PlantUML/Graphviz 集成、WYSIWYG 编辑、图片灯箱 |
| `annotations.js` | 批注系统：高亮渲染、评论/删除/插入卡片、浮层工具条交互 |
| `export.js` | 导出模块：生成 AI 修改指令、自动保存到 `.review/` |
| `store.js` | 内存数据存储：批注数据管理、版本对比 |
| `settings.js` | 设置面板：读取/应用/同步 VS Code 配置项 |
| `i18n.js` | 国际化：中文/英文界面文本映射 |

`webview/index.html` 是主页面；CSS 分为 `style.css`（布局）、`markdown.css`（渲染）、`annotations.css`（批注）、`settings.css`（设置）、`highlight-themes.css`（15 种代码主题）。

### 消息协议（Host ↔ WebView）

- **Host → WebView**: `fileContent`, `fileList`, `settingsData`, `ideType`, `fileChanged`, `triggerExport`
- **WebView → Host**: `saveFile`, `saveReview`, `getSettings`, `saveSettings`, `openCodeBuddyChat`, `ready`
- 使用 `requestId` 支持请求-响应模式（`callHost()` 函数，15 秒超时）

## 测试体系

### Mocha 单元测试 (`test/suite/`)
- 框架: Mocha + `@vscode/test-electron`，TDD UI（`suite`/`test`）
- 运行器: `test/runTest.ts` 启动无头 VS Code 实例
- 测试配置: `test/tsconfig.json`（编译到 `out/test/`）
- 测试夹具: `test/fixtures/` 下的 `.md` 文件

### Playwright UI 测试 (`test/ui/`)
- 配置: `test/ui/playwright.config.ts`
- 测试文件: `test/ui/specs/*.spec.ts`
- 使用 `file://` 协议加载 `test-container.html`（模拟 WebView 环境）
- 辅助工具: `test/ui/helpers/test-utils.ts`, `test/ui/mock-vscode.js`

### 三层测试模型（apply / hotfix 必须覆盖）
- **Tier 1**: 存在性断言（API 暴露、DOM 元素检查）
- **Tier 2**: 行为级断言（模拟用户真实操作——拖拽/点击/键盘等——验证 DOM 状态实际变化）
- **Tier 3**: 场景特定断言（命名 `BT-<模块>.<序号> <描述>`，针对本次修复的具体场景）

## 关键约束

- **WebView 沙箱**: 前端 JS 无法使用 `fs`/`path` 等 Node API，所有文件操作必须通过消息桥请求 Host 端执行
- **前端无构建步骤**: `webview/` 下的 JS/CSS 直接加载，不经过 bundler/transpiler
- **前端 JS 兼容性**: 保持 ES5/ES6 兼容，不使用 ES2020+ 特性
- **国际化**: 所有用户可见文本必须通过 `i18n.js`（前端）或 `package.nls.json` / `package.nls.zh-cn.json`（后端命令/配置描述）进行本地化
- **打包体积**: `.vsix` 包 < 50MB（使用 `--no-dependencies` 打包，依赖内联）
- **批注存储**: 自动保存到工作区 `.review/` 目录，JSON 格式，历史版本永久保留（仅用户显式清除时删除）

## 工作流与规则真源

> **重要**：本项目的流程规则（OpenSpec 工作流、Hotfix Mini-Pipeline、完成门禁、阶段完成自检、文档同步纪律、发布流程、命令执行策略、Git 规范等）的**真源统一位于 `.aikp/rules/` 目录**。`.codebuddy/rules/`、`.claude/rules/`、`.cursor/rules/` 下的同名文件均为 shim，指向同一真源（由 `npm run sync-aikit` 维护）。
>
> **AI 工具读取指引**：阅读本文件时，请**立即读取**以下真源文件，并将其内容视为本文件内容的一部分：

<!-- AIKP-RULES:START (由 npm run sync-aikit:check 校验，勿手工改动真源清单) -->
- [`.aikp/rules/project-continuity.mdc`](.aikp/rules/project-continuity.mdc) — 跨会话上下文恢复 + 开发纪律（OpenSpec 工作流、Hotfix Mini-Pipeline、完成门禁、阶段完成自检、文档同步、发布流程、Git 规范、命令执行策略）
<!-- AIKP-RULES:END -->

### 摘要（仅为快速导航，详情以真源为准）

- **新功能 / 重大修改 → 强制 OpenSpec**：`propose` → `apply` → `build` → `test` → `verify` → `archive` → `commit` 全管线；禁止跳过 spec 写代码；存在"已实施未归档"的 change 时不得开始新 propose / apply（**完成门禁**）。
- **Hotfix Mini-Pipeline（H0→H7）**：阈值为源码 ≤3 文件且 ≤30 行（测试新增不计）；H0 分流 Doc-Only / Refactor / 普通 bugfix；运行时 Bug 用 H3.5 诊断策略 A/B。
- **阶段完成自检**：每阶段结束回溯用户原始请求边界；不要在管线中途输出会话总结；不要提前把控制权交还用户。
- **文档同步纪律**：用户可感知的功能变更必须同步 `README.md` / `package.json` `contributes` / 相关帮助文档；时机为测试通过后、打包之前；纯内部重构无需更新。
- **发布流程（双市场，缺一不可）**：`vsce package` → `vsce publish` → `ovsx publish`；两个市场都成功才算"发布完成"。
- **命令执行策略**：构建/测试/打包/Git commit/push/安装依赖一律直接执行，仅在失败时刹车报告。
- **Git 规范**：commit message 格式 `<type>: <中文描述>`；同一文件同一轮不得并行 Edit。
