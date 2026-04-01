# MD Review Tool

> 🖊️ 像导师批改论文一样批阅 Markdown —— 评论、删除、插入、所见即所得编辑，一键生成 AI 修改指令。

## 📺 视频介绍

▶️ [点击观看视频介绍](https://youtu.be/o4W217zlQmY)

---

## ✨ 核心功能

### 📝 批阅模式
| 功能 | 说明 |
|------|------|
| 💬 添加评论 | 选中文字添加评论，支持在评论中插入图片（点击、拖拽、Ctrl+V 粘贴） |
| 🗑️ 标记删除 | 选中文字标记为待删除，以删除线样式展示 |
| ➕ 插入内容 | 选中锚点文字后插入新内容（支持 Markdown），可选择在锚点前/后插入 |
| ✏️ 所见即所得 | 切换编辑模式，直接在渲染文档上修改，支持工具栏（加粗、斜体、标题、列表等） |
| 📊 表格编辑 | 编辑模式下右键表格可插入/删除行列 |

### 🤖 AI 集成
- **一键 AI 修复** — 将所有批注生成结构化修改指令，一键发送到 CodeBuddy 或工蜂 Copilot 执行
- **📋 一键复制指令** — 复制 AI 指令到剪贴板，方便粘贴到任意 AI 工具

### 🎨 Markdown 渲染
- 完整 GFM 语法支持
- **代码高亮** — 15 种主题可选（GitHub、Monokai、Dracula、Nord、Tokyo Night 等）
- **Mermaid 图表** — 流程图、时序图、甘特图等，点击可放大查看
- **数学公式** — KaTeX 行内/块级公式渲染
- 表格、脚注、任务列表、Emoji、折叠内容、GFM 告警块等

### 🖥️ 界面体验
- **目录导航** — 自动生成 TOC，滚动高亮当前章节
- **批注面板** — 侧边批注列表，支持排序、定位、编辑、删除
- **图片灯箱** — 点击图片放大预览，支持缩放与拖拽
- **禅模式** — 隐藏侧栏专注阅读（`Alt+Z`）
- **亮色/暗色主题** — 一键切换或跟随系统
- **排版自定义** — 字体大小、行高、内容宽度、字体风格均可调节

### 📤 导出与存储
- **导出批阅记录** — 生成 AI 可读的结构化修改指令（`Ctrl+E`）
- **自动保存** — 批注自动保存到工作区 `批阅文件/` 目录
- **版本管理** — 源文件变更时自动归档旧版本

---

## 🚀 使用方法

1. 在 VSCode 或 CodeBuddy IDE 中打开任意 `.md` 或 `.mdc` 文件
2. 通过以下方式打开批阅面板：
   - **命令面板**：`Ctrl+Shift+P` → 搜索「MD Review: 打开批阅面板」
   - **右键菜单**：在编辑器或资源管理器中右键选择
   - **编辑器标题栏**：点击标题栏图标按钮
3. 选中文字后使用浮层工具条或右键菜单进行批阅
4. 批阅完成后点击「🤖 一键AI修复」或按 `Ctrl+E` 导出

---

## ⌨️ 快捷键

| 快捷键 | 功能 |
|--------|------|
| `Alt+Z` | 切换禅模式 |
| `Ctrl+E` | 导出批阅记录 |
| `Ctrl+S` | 保存编辑内容到源文件 |
| `Ctrl+Shift+E` | 切换预览/编辑模式 |
| `ESC` | 关闭弹窗 / 退出禅模式 |

---

## ⚙️ 配置项

在 VSCode / CodeBuddy IDE 设置中搜索 `mdReview` 即可配置：

| 配置项 | 默认值 | 说明 |
|--------|--------|------|
| `mdReview.fontSize` | 16 | 文档字体大小（12-24 px） |
| `mdReview.lineHeight` | 1.6 | 文档行高（1.2-2） |
| `mdReview.contentMaxWidth` | 1200 | 内容区最大宽度（600-1400 px） |
| `mdReview.fontFamily` | 系统默认 | 字体风格（默认 / 衬线体 / 等宽） |
| `mdReview.theme` | light | 界面主题（light / dark / auto） |
| `mdReview.showToc` | true | 显示目录导航 |
| `mdReview.showAnnotations` | true | 显示批注面板 |
| `mdReview.sidebarLayout` | toc-left | 侧边栏布局 |
| `mdReview.autoSave` | true | 启用自动保存 |
| `mdReview.autoSaveDelay` | 1500 | 自动保存延迟（ms） |
| `mdReview.enableMermaid` | true | 启用 Mermaid 图表 |
| `mdReview.enableMath` | true | 启用数学公式 |
| `mdReview.showLineNumbers` | false | 代码块显示行号 |
| `mdReview.codeTheme` | default-dark-modern | 代码高亮主题（15 种可选） |

---

## 📄 许可证

[MIT](LICENSE)
