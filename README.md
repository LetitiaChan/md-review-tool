<a id="english"></a>
# MD Human Review

[![CI](https://github.com/LetitiaChan/md-review-tool/actions/workflows/ci.yml/badge.svg)](https://github.com/LetitiaChan/md-review-tool/actions/workflows/ci.yml)
[![Version](https://img.shields.io/visual-studio-marketplace/v/letitia.md-human-review?label=VS%20Code%20Marketplace)](https://marketplace.visualstudio.com/items?itemName=letitia.md-human-review)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

> Markdown review & annotation for VS Code — comment, mark deletions, insert content, edit in Rich Mode, and generate AI fix instructions in one click.
>
> 🖊️ 像导师批改论文一样批阅 Markdown。

**Works with** VS Code, Cursor, Windsurf, CodeBuddy IDE, Trae and any VS Code–based editor.
[中文](#chinese) · [Configuration](https://github.com/LetitiaChan/md-review-tool/blob/main/docs/configuration.md) · [Development](https://github.com/LetitiaChan/md-review-tool/blob/main/docs/development.md)

![intro](https://raw.githubusercontent.com/LetitiaChan/md-review-tool/main/assets/intro.gif)

![Main Page](https://raw.githubusercontent.com/LetitiaChan/md-review-tool/main/assets/main_page_en.png)

## ✨ Features

**Review**
- **Comments** — select text to comment, with image attachments (paste, drag or pick from disk)
- **Deletion marks** — pending deletions shown as strikethrough
- **Insertions** — insert Markdown before or after an anchor
- **Rich Mode** — ProseMirror editor with formatting toolbar, tables, links, diagrams, local images and smart paste
- **Structure-preserving editing** — blockquotes, alerts, code blocks, math and diagrams keep their original Markdown
- Editable YAML front matter, link bubble menu, 6×6 table picker, 5 alert types, 12 code languages
- Three refresh strategies: visual refresh, disk reload and editor reload

**Read & navigate**
- Full GFM rendering with 15 code themes
- Mermaid, KaTeX, PlantUML (online server) and Graphviz (local Viz.js)
- TOC with search, content search (`Ctrl+F`) and annotation search
- Image lightbox, Zen mode, light/dark theme, typography and layout settings

**AI & storage**
- **One-click AI fix** — builds structured instructions and sends them to CodeBuddy / Cursor / Windsurf chats; clipboard fallback for other editors
- **Export** (`Ctrl+E`) — Markdown instructions ordered back-to-front so edits stay safe
- **Auto-save** — annotations live in `.review/`, with a new review version whenever the source changes

## ⌨️ Shortcuts

| Shortcut | Action |
|---|---|
| `Ctrl+F` | Content search |
| `Ctrl+E` | Export review records |
| `Ctrl+S` | Save edits to the source file |
| `Ctrl+Shift+E` | Toggle preview / edit mode |
| `Alt+Z` | Zen mode |
| `Ctrl+Enter` | Open review panel from Explorer |
| `Ctrl+Enter` (in panel) | Comment on the selected text |
| `Ctrl+Shift+D` | Mark the selection for deletion |
| `Ctrl+Shift+A` / `B` | Insert content after / before the selection |
| `Ctrl+Shift+J` / `K` | Next / previous annotation |
| `Ctrl+Shift+T` | Show / hide the table of contents |
| `ESC` | Close modal / exit Zen mode / close search |

> On macOS use `Cmd` instead of `Ctrl`.

## 🚀 Quick Start

**Install (recommended):** open the Extensions panel (`Ctrl+Shift+X`), search **"MD Human Review"** and install. Also available on [Open VSX](https://open-vsx.org/extension/letitia/md-human-review).

**From source:** `git clone` → `npm install` → `npm run compile` → press `F5`. See [Development](https://github.com/LetitiaChan/md-review-tool/blob/main/docs/development.md).

**Use:**
1. Open a `.md`, `.mdc` or `.markdown` file.
2. Right-click → **Open With...** → **MD Human Review** (or use the editor title button).
3. Select text and use the floating toolbar or right-click menu.
4. Click **🤖 AI Fix** or press `Ctrl+E` to export.

## ⚙️ Configuration

| Setting | Default | Purpose |
|---|---|---|
| `mdReview.theme` | `light` | `light` / `dark` / `auto` |
| `mdReview.fontSize` | `16` | Body font size (12–24 px) |
| `mdReview.showToc` | `true` | Show the table of contents |
| `mdReview.showAnnotations` | `true` | Show the annotations panel |
| `mdReview.autoSave` | `true` | Auto-save annotations |
| `mdReview.enablePlantUML` | `true` | PlantUML rendering (needs network) |

All 22 settings → [docs/configuration.md](https://github.com/LetitiaChan/md-review-tool/blob/main/docs/configuration.md).

## 🍴 Fork & Customize

Review styles, interaction logic and AI instruction templates are fully open source. Fork, adjust, run `npm run compile`, press `F5`, and package a `.vsix` for your team.

## ❓ FAQ

**How is it different from the built-in preview?** The built-in preview is read-only. MD Human Review lets you annotate rendered documents and turn the annotations into AI instructions. Hide the review panels and it also works as a rich Markdown reader.

**Which diagram formats are supported?** Mermaid, KaTeX, PlantUML (online) and Graphviz (DOT, local).

**Where are annotations stored?** In the workspace `.review/` directory, versioned by source content.

**Which files are supported?** `.md`, `.markdown` and `.mdc`.

## 🙏 Acknowledgements

Inspired by [MDReviewTool](https://github.com/hexQQ666/MDReviewTool), rebuilt as a VS Code extension with full rendering, AI fix instructions and extensive customization.

## 📄 License

MIT

---

<a id="chinese"></a>
# MD Human Review

> 像导师批改论文一样批阅 Markdown —— 评论、删除、插入、富文本编辑，一键生成 AI 修改指令。

**支持** VS Code、Cursor、Windsurf、CodeBuddy IDE、Trae 等所有基于 VS Code 的编辑器。
[English](#english) · [配置项](https://github.com/LetitiaChan/md-review-tool/blob/main/docs/configuration.md) · [开发文档](https://github.com/LetitiaChan/md-review-tool/blob/main/docs/development.md)

![简介](https://raw.githubusercontent.com/LetitiaChan/md-review-tool/main/assets/intro.gif)

![主界面](https://raw.githubusercontent.com/LetitiaChan/md-review-tool/main/assets/main_page_cn.png)

## ✨ 功能特性

**批阅**
- **评论** —— 选中文字添加评论，支持图片附件（粘贴 / 拖拽 / 选择本地文件）
- **删除标记** —— 待删除内容以删除线展示
- **插入内容** —— 在锚点文字前后插入 Markdown 内容
- **富文本模式** —— 基于 ProseMirror 的编辑器，含格式工具栏、表格、链接、图表、本地图片与智能粘贴
- **结构保护编辑** —— 引用块、告警块、代码块、公式、图表保持原始 Markdown 结构
- 可编辑 YAML Front Matter、链接气泡菜单、6×6 表格选择器、5 种告警类型、12 种代码语言
- 三种刷新策略：视觉刷新、磁盘重载、编辑器重载

**阅读与导航**
- 完整 GFM 渲染，15 种代码高亮主题
- Mermaid、KaTeX、PlantUML（在线）、Graphviz（本地 Viz.js）
- 目录搜索、正文搜索（`Ctrl+F`）、批注搜索
- 图片灯箱、禅模式、亮/暗主题、排版与布局设置

**AI 与存储**
- **一键 AI 修复** —— 生成结构化指令并自动发送到 CodeBuddy / Cursor / Windsurf 对话；其他编辑器回退到剪贴板
- **导出**（`Ctrl+E`）—— 指令按从后往前排序，保证执行安全
- **自动保存** —— 批注保存在 `.review/`，源文件内容变化时自动创建新批阅版本

## ⌨️ 快捷键

| 快捷键 | 功能 |
|---|---|
| `Ctrl+F` | 正文搜索 |
| `Ctrl+E` | 导出批阅记录 |
| `Ctrl+S` | 保存编辑到源文件 |
| `Ctrl+Shift+E` | 切换预览 / 编辑模式 |
| `Alt+Z` | 禅模式 |
| `Ctrl+Enter` | 在资源管理器中打开批阅面板 |
| `Ctrl+Enter`（面板内） | 为选中文本添加评论 |
| `Ctrl+Shift+D` | 标记选中文本为删除 |
| `Ctrl+Shift+A` / `B` | 在选中文本后 / 前插入内容 |
| `Ctrl+Shift+J` / `K` | 下一条 / 上一条批注 |
| `Ctrl+Shift+T` | 显示 / 隐藏目录 |
| `ESC` | 关闭弹窗 / 退出禅模式 / 关闭搜索 |

> macOS 上使用 `Cmd` 代替 `Ctrl`。

## 🚀 快速开始

**安装（推荐）**：扩展面板（`Ctrl+Shift+X`）搜索 **「MD Human Review」** 安装。同时发布于 [Open VSX](https://open-vsx.org/extension/letitia/md-human-review)。

**从源码运行**：`git clone` → `npm install` → `npm run compile` → 按 `F5`。详见[开发文档](https://github.com/LetitiaChan/md-review-tool/blob/main/docs/development.md)。

**使用：**
1. 打开 `.md`、`.mdc` 或 `.markdown` 文件
2. 右键 → **打开方式...** → **MD Human Review**（或点击编辑器标题栏按钮）
3. 选中文字，使用浮层工具条或右键菜单批阅
4. 点击 **🤖 一键 AI 修复**，或按 `Ctrl+E` 导出

## ⚙️ 配置项

| 配置项 | 默认值 | 说明 |
|---|---|---|
| `mdReview.theme` | `light` | `light` / `dark` / `auto` |
| `mdReview.fontSize` | `16` | 正文字体大小（12–24 px） |
| `mdReview.showToc` | `true` | 显示目录 |
| `mdReview.showAnnotations` | `true` | 显示批注面板 |
| `mdReview.autoSave` | `true` | 自动保存批注 |
| `mdReview.enablePlantUML` | `true` | PlantUML 渲染（需要网络） |

全部 22 项配置 → [docs/configuration.md](https://github.com/LetitiaChan/md-review-tool/blob/main/docs/configuration.md)。

## 🍴 Fork 定制

批阅样式、交互逻辑与 AI 指令模板全部开源。Fork 后修改，`npm run compile`，按 `F5` 调试，也可打包 `.vsix` 分享给团队。

## ❓ 常见问题

**和内置 Markdown 预览有什么区别？** 内置预览只读；本插件可在渲染后的文档上批注，并一键生成 AI 修改指令。隐藏批阅面板后，也可当作富文本 Markdown 阅读器。

**支持哪些图表？** Mermaid、KaTeX、PlantUML（在线）、Graphviz（DOT，本地渲染）。

**批注保存在哪里？** 工作区 `.review/` 目录，按源文件内容自动分版本。

**支持哪些文件格式？** `.md`、`.markdown`、`.mdc`。

## 🙏 致谢

原型来自 [MDReviewTool](https://github.com/hexQQ666/MDReviewTool)，在此基础上重构为 VS Code 插件，并补齐完整渲染、AI 修改指令与大量可定制项。

## 📄 许可证

MIT
