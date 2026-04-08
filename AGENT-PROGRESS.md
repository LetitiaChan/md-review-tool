# Agent Progress — MD Human Review

> 本文件用于跨会话记忆。每次会话结束时更新，下次会话启动时读取。
> 灵感来源：Anthropic "Effective Harnesses for Long-Running Agents"

---

## 最近更新

- **2026-04-08**: 🚀 发布 v1.3.0 到 VS Code Marketplace（含正文搜索 Ctrl+F、目录搜索过滤、批注搜索定位）
- **2026-04-08**: 增加 Ctrl+F 正文检索、目录搜索过滤、批注搜索定位功能（add-search-features）
- **2026-04-07**: 🚀 发布 v1.2.0 到 VS Code Marketplace（含多语言支持、编辑模式增强、PlantUML/Graphviz、多窗口、大量 bugfix）
- **2026-04-07**: 修复编辑模式下修改引用块/告警块/代码块/数学公式时样式被破坏的问题
- **2026-04-06**: 🚀 发布 v1.1.0 到 VS Code Marketplace（含 PlantUML/Graphviz 支持、多窗口、UI 增强、字体设置、截图替换视频等全部更新）
- **2026-04-05**: UI 增强批次1（ui-enhancements-batch-1）：移除任务列表删除线、工具栏按钮重排、面板内隐藏按钮、多窗口支持、面板标题动态化、悬浮/嵌入模式、文档对齐、编辑后公式图表渲染修复
- **2026-04-05**: 实现 PlantUML 和 Graphviz 图表渲染支持（add-plantuml-graphviz-support）
- **2026-04-04**: 初始化 OpenSpec Harness Kit

---

## 项目概要

| 维度 | 信息 |
|------|------|
| **项目名** | md-human-review (MD Human Review) |
| **定位** | Markdown 批阅 & 批注 VS Code 扩展 — 像导师批改论文一样批阅 Markdown，一键生成 AI 修改指令 |
| **技术栈** | TypeScript + VS Code Extension API + Mocha + marked |
| **构建工具** | tsc (TypeScript Compiler)，npm scripts |
| **开发模式** | AI 辅助，使用 OpenSpec 工作流驱动 |
| **仓库地址** | https://github.com/LetitiaChan/md-review-tool |

---

## 已完成的变更 (Archived)

| 变更名 | 描述 | 归档日期 |
|--------|------|---------|
| add-search-features | Ctrl+F 正文检索、目录面板搜索过滤、批注面板搜索定位 | 2026-04-08 |
| add-i18n-support | 多语言支持（中文/英文），i18n 模块、设置面板语言切换、HTML/JS/CSS/TS 全量国际化 | 2026-04-06 |
| ui-enhancements-batch-1 | UI 增强：任务列表删除线移除、工具栏重排、面板隐藏按钮、多窗口、悬浮/嵌入模式、文档对齐、编辑后渲染修复 | 2026-04-05 |
| add-plantuml-graphviz-support | 新增 PlantUML（在线服务器渲染）和 Graphviz（Viz.js 本地渲染）图表支持 | 2026-04-05 |

---

## 待实施的变更 (Active)

<!-- 列出计划中的变更，按优先级排序 -->

| 变更名 | 描述 | 建议优先级 |
|--------|------|-----------|
| add-automated-ui-testing | 引入 Playwright 自动化 UI 测试，覆盖 Webview 图表渲染、Lightbox 交互、Checkbox 行为等（仅有 proposal，待补齐 design + tasks） | 中 |

---

## 已积累的 Specs

| Spec | 来源 | 说明 |
|------|------|------|
| content-search | add-search-features | Ctrl+F 正文检索、TreeWalker 高亮、匹配导航 |
| toc-search | add-search-features | 目录面板搜索过滤、层级保持、折叠状态恢复 |
| annotation-search | add-search-features | 批注面板搜索、多字段匹配、与排序兼容 |
| multi-panel | ui-enhancements-batch-1 | 多窗口支持、面板标题动态化、文件路径 tooltip |
| panel-layout-modes | ui-enhancements-batch-1 | 面板悬浮/嵌入模式切换、文档对齐（靠左/居中/靠右） |
| plantuml-rendering | add-plantuml-graphviz-support | PlantUML 代码块渲染、降级、lightbox、设置项 |
| graphviz-rendering | add-plantuml-graphviz-support | Graphviz DOT 代码块渲染、降级、lightbox、主题适配、延迟加载、设置项 |

---

## 项目目录结构要点

```
md-review-tool/
├── src/                            # 扩展核心代码
│   ├── extension.ts                # 扩展入口（激活、命令注册）
│   ├── reviewPanel.ts              # Webview 面板管理
│   ├── fileService.ts              # 文件读写服务
│   └── stateService.ts             # 状态管理服务
├── webview/                        # Webview 前端资源
│   ├── *.js                        # 前端 JS 模块
│   ├── *.css                       # 样式文件
│   └── *.woff2                     # 字体文件
├── test/                           # Mocha 测试
├── syntaxes/                       # .mdc 语法高亮定义
├── assets/                         # 图标等资源
├── openspec/                       # OpenSpec 工作流
│   ├── changes/                    # 活跃 + 归档的变更
│   │   └── archive/                # 已归档
│   └── specs/                      # 能力规格库
├── .codebuddy/                     # AI 工作流配置
│   ├── commands/opsx/              # 11 个 OpenSpec 命令
│   ├── rules/                      # 全局规则
│   └── skills/                     # 技能定义
├── package.json                    # 扩展清单
└── tsconfig.json                   # TypeScript 配置
```

---

## 已知问题与注意事项

1. 项目是 VS Code 扩展，测试需要通过 `@vscode/test-electron` 启动 VS Code 实例运行
2. 构建输出到 `out/` 目录
3. **⚠️ 工作模式**: 全自动 harness 模式 — 收到"实现功能"指令后一路执行到底（propose → apply → build → impact → test → push），不在中间环节暂停等待确认。只在遇到错误/失败时才刹车报告。

---

## 下次会话建议

- 使用全自动模式：直接说"实现 XXX 功能"即可，AI 会自动走完 propose → apply → pipeline
