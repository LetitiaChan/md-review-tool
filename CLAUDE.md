# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概述

MD Human Review 是一个 Markdown 批阅与批注扩展，发布于 **VS Code Marketplace** 与 **Open VSX Registry**，支持 VS Code 及所有基于 VS Code 开源版本构建的 AI 编辑器（如 Cursor、Windsurf、CodeBuddy IDE、Trae 等）。用户可以在渲染后的文档上添加评论、标记删除、插入内容、所见即所得编辑，并一键生成 AI 修改指令。

- **发布者**: `letitia.md-human-review`
- **仓库**: https://github.com/LetitiaChan/md-review-tool
- **支持格式**: `.md`, `.markdown`, `.mdc`
- **兼容编辑器**: VS Code / Cursor / Windsurf / CodeBuddy IDE / Trae 等（所有基于 VS Code 开源版本的编辑器）
- **双市场发布**: VS Code Marketplace + Open VSX（Cursor / Windsurf 等从 Open VSX 拉取）

## 常用命令

```bash
npm install                # 安装依赖
npm run compile            # TypeScript 编译到 out/
npm run watch              # 监听模式（开发推荐）
npm test                   # Mocha 单元测试（需要编译，自动执行 pretest）
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

**打包**:
```bash
npx vsce package --no-dependencies
```

## 架构

项目采用经典的 VS Code WebView 扩展架构，后端 TypeScript 和前端纯 JavaScript 之间通过 `postMessage` 消息桥通信。

### 后端 (src/) — TypeScript

| 文件 | 职责 |
|------|------|
| `extension.ts` | 扩展入口，注册 `mdReview.openPanel` 和 `mdReview.exportReview` 命令 |
| `reviewPanel.ts` | WebView 面板管理（创建/复用/多窗口）、消息处理、AI 聊天集成、文件监听 |
| `fileService.ts` | 文件读写、`.review/` 目录下的批注存储与版本管理、AI 指令文件生成 |
| `stateService.ts` | 基于 `workspaceState` 的 UI 状态持久化 |

编译输出到 `out/`，入口为 `out/extension.js`。

### 前端 (webview/) — 纯 JavaScript（无构建步骤）

| 文件 | 职责 |
|------|------|
| `app.js` | 主控模块：初始化、事件绑定、预览/编辑模式切换、禅模式、快捷键 |
| `renderer.js` | Markdown 渲染引擎：marked 解析、Mermaid/KaTeX/PlantUML/Graphviz 集成、WYSIWYG 编辑、图片灯箱 |
| `annotations.js` | 批注系统：高亮渲染、评论/删除/插入卡片、浮层工具条交互 |
| `export.js` | 导出模块：生成 AI 修改指令、自动保存到 `.review/` |
| `store.js` | 内存数据存储：批注数据管理、版本对比 |
| `settings.js` | 设置面板：读取/应用/同步 VS Code 配置项 |
| `i18n.js` | 国际化模块：中文/英文界面文本映射 |

`webview/index.html` 是主页面，CSS 分为 `style.css`（布局）、`markdown.css`（渲染样式）、`annotations.css`（批注样式）、`settings.css`（设置面板）、`highlight-themes.css`（15 种代码主题）。

### 消息协议（Host <-> WebView）

**Host -> WebView**: `fileContent`, `fileList`, `settingsData`, `ideType`, `fileChanged`, `triggerExport`

**WebView -> Host**: `saveFile`, `saveReview`, `getSettings`, `saveSettings`, `openCodeBuddyChat`, `ready`

通信使用 `requestId` 机制支持请求-响应模式（`callHost()` 函数，15 秒超时）。

## 测试体系

### Mocha 单元测试 (test/suite/)
- 框架: Mocha + `@vscode/test-electron`，TDD UI（`suite`/`test`）
- 运行器: `test/runTest.ts` 启动无头 VS Code 实例
- 测试配置: `test/tsconfig.json`（编译到 `out/test/`）
- 测试夹具: `test/fixtures/` 下的 `.md` 文件

### Playwright UI 测试 (test/ui/)
- 配置: `test/ui/playwright.config.ts`
- 测试文件: `test/ui/specs/*.spec.ts`
- 使用 `file://` 协议加载 `test-container.html`（模拟 WebView 环境）
- 辅助工具: `test/ui/helpers/test-utils.ts`, `test/ui/mock-vscode.js`

### 测试分层模型
- **Tier 1**: 存在性断言（API 暴露、DOM 元素检查）
- **Tier 2**: 行为级断言（模拟用户操作，验证 DOM 状态变化）
- **Tier 3**: 场景特定断言（命名 `BT-<模块>.<序号> <描述>`）

## 关键约束

- **WebView 沙箱**: 前端 JS 无法使用 `fs`/`path` 等 Node API，所有文件操作必须通过消息桥请求 Host 端执行
- **前端无构建步骤**: `webview/` 下的 JS/CSS 直接加载，不经过 bundler/transpiler
- **前端 JS 兼容性**: 保持 ES5/ES6 兼容，不使用 ES2020+ 特性
- **国际化**: 所有用户可见文本必须通过 `i18n.js`（前端）或 `package.nls.json` / `package.nls.zh-cn.json`（后端命令/配置描述）进行本地化
- **打包体积**: `.vsix` 包 < 50MB（使用 `--no-dependencies` 打包，依赖内联）
- **批注存储**: 自动保存到工作区 `.review/` 目录，JSON 格式，历史版本永久保留（仅用户显式清除时删除）

## 开发工作流

本项目采用 **OpenSpec spec-driven 工作流**（详见 `.codebuddy/rules/project-continuity.mdc`）：

- **新功能/重大修改**: 必须通过 OpenSpec 流程（`openspec/changes/`），先 propose 再 apply
- **Hotfix 例外**: 源码文件 <=3 个且改动 <=30 行可直接修改，但必须执行 Hotfix Mini-Pipeline（构建 -> 影响分析 -> 回归测试 -> 测试补全 -> 打包 -> commit -> push）
- **Doc-Only 变更**: 仅修改文档可跳过构建/测试，直接 commit + push

## Git 规范

- **Commit message 格式**: `<type>: <中文描述>`
- **类型前缀**: `feat:` / `fix:` / `refactor:` / `chore:` / `docs:`
- 功能增删改后必须同步更新 README.md 相关章节

## 发布流程

```bash
# 1. 打包
npx vsce package --no-dependencies

# 2. 发布到 VS Code Marketplace
npx vsce publish --no-dependencies

# 3. 发布到 Open VSX (Cursor 市场)
npx ovsx publish <file.vsix> -p <OVSX_TOKEN>
```

两个市场都发布成功才算完成。
