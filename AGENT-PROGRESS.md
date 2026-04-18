# Agent Progress — MD Human Review

> 本文件用于跨会话记忆。每次会话结束时更新，下次会话启动时读取。
> 灵感来源：Anthropic "Effective Harnesses for Long-Running Agents"

---

## 最近更新

- **2026-04-18**: ✨ Hotfix — AI 修复指令追加"完成后提示刷新面板"提示。需求：用户希望 AI 修复完成后能自动提醒回到 MD Human Review 面板点击右上角刷新按钮。修复两处触达链路：(1) `webview/js/i18n.js` `modal.ai_result.copy_text`（发送到 AI 对话框的 prompt）中英文末尾追加"完成后请提醒我回到 MD Human Review 面板点击刷新按钮"；(2) `src/fileService.ts` `_aiLabels` 新增 `refresh_hint` 键（中英文）并在 `applyReview` 生成 `_aicmd.md` 指令文件时按 order_hint → anchor_hint → refresh_hint 顺序推入文件头部。测试：新增 Suite 22 BT-aiRefreshHint.1~4（Tier 1/2/3），覆盖 i18n 关键词存在、_aiLabels 键存在、占位符替换不破坏提示、端到端双渠道一致性。文档：README 一键 AI 修复条目补充说明。624 passing, 0 failing。Commit: <待生成>
- **2026-04-18**: 🐛 Hotfix — 修复"webview 关闭期间源文件被外部修改，重开仍恢复旧批注导致锚点失效"Bug（思路 A+B 并存）。根因：webview 关闭时磁盘 md 被外部工具改写，重新打开时无法感知中间变化，仍会 restoreFromReviewRecord 恢复 records[0] 旧批注，旧锚点在新文件上可能已失效。修复五处：(1) export.js generateReviewDoc JSON 块写入 rawMarkdown 快照；(2) fileService.ts extractAnnotationsFromReview 解析并透传 rawMarkdown；(3) store.js 新增 forceBumpVersion(prevVersion, content, docVersion)；(4) app.js 新增 _isRecordStaleOnOpen helper（A 主判据 rawMarkdown 对比 + B 辅助信号 docVersion 对比），handleFileContentPush/handleFileSelectChange 两处 restore 前检测，过期则 forceBumpVersion + triggerAutoSave 落盘新占位；(5) i18n.js 新增 notification.stale_content_bumped 中英文翻译。向后兼容：旧格式 record 无快照时保守放行。测试：新增 Suite 21 BT-staleContentDetect.1~8（Tier 1/2/3），端到端闭环 + 旧格式兼容。文档：README 补充关闭期间检测描述。616 passing, 0 failing。Commit: 25da75f
- **2026-04-18**: 🐛 Hotfix — 修复"AI 修复后没有创建新版本，重开恢复的是已处理过的旧批注"Bug。根因：handleRefresh 内容变化时 setFile 已正确自增 reviewVersion 到 v2 并清空批注，但 doAutoSave 空批注分支直接 return 不落盘，磁盘仅存 v1 旧批注；下次打开 getReviewRecords 返回 records[0]=v1，annotations.length>0 短路判断通过，restoreFromReviewRecord 把旧批注错误恢复。修复三处：(1) export.js doAutoSave 空批注分支在 reviewVersion>1 时 saveViaHost 写空占位；(2) app.js loadDocument(isNew=true) 触发 triggerAutoSave 立即落盘新版本；(3) app.js handleFileContentPush/handleFileSelectChange/handleRefresh 三处 records[0] 恢复逻辑移除 annotations.length>0 短路，即使空批注也 restoreFromReviewRecord 以恢复 reviewVersion。测试：新增 Suite 20 BT-versionBump.1~6（Tier 1/2/3），修正 BT-reviewKeep.6 branch 提取方式。文档：README 补充新版本创建描述。608 passing, 0 failing。Commit: a6bbee4
- **2026-04-18**: 🐛 Hotfix — 修复"清除所有批注按钮点击报 TypeError: Store.getRelPath is not a function"。根因：store.js 内部定义了 getRelPath() 函数但模块 return 对象中未导出，导致 app.js btnConfirmClearAll handler 调用时抛 TypeError，用户无法清除批注。修复：在 store.js return 列表补上 getRelPath。测试：新增 Suite 19 BT-storeExports.1~6（Tier 1/2/3），Tier 3 通过 vm 沙箱加载 store.js 真实调用验证；Tier 1 扫描所有 getX 函数确保全部被导出以防回归。602 passing, 0 failing。Commit: c253377
- **2026-04-18**: 🐛 Hotfix — 修复"AI修复后点刷新，.review 下所有历史批阅版本被删除"Bug（C-1 + C-a 策略）。根因：handleRefresh 内容变化分支触发 setFile 清空 annotations，doAutoSave 空批注分支无条件发送 deleteReviewRecords 消息，按 rbaseName_v* 前缀匹配删除所有历史版本（v1/v2/v3 全删）。修复策略 C-1：doAutoSave 空批注分支不再删除磁盘记录（历史版本永久保留），磁盘删除仅由用户显式 btnConfirmClearAll 触发；C-a：getReviewRecords 按 reviewVersion 倒序返回，打开文件时自动恢复 records[0]（最新版本）。同步清理上次 hotfix 遗留的 DELETE_ON_EMPTY_GRACE_MS 宽限期代码（冗余）。测试：重写 BT-annotationPersist.3~8（反映新策略），新增 BT-reviewKeep.1~6（C-1 + C-a 多版本保留场景 Tier 1/2/3）。文档：README/CLAUDE/CODEBUDDY 同步更新归档策略描述。596 passing, 0 failing。Commit: f36588c
- **2026-04-18**: ✨ Feature — 新增 `src/aiChatAdapters.ts` 适配层，将硬编码的 CodeBuddy 派发改为适配器模式，支持 CodeBuddy/Cursor/Windsurf/Trae/Kiro 多种 AI Chat 入口自动路由。reviewPanel.ts 精简 137 行；app.js/i18n.js/index.html 同步补充多 IDE 提示文案与多语言翻译。Commit: ff8d6bd
- **2026-04-18**: 🐛 Hotfix — 修复"添加批注后关闭再次打开 md 文件，批注被删除"Bug。根因：Extension Host 推送 fileContent 时 handleFileContentPush 未从 .review 目录恢复批注，导致 webview 以空批注启动，紧接着 Exporter.enableAutoSave() 触发 doAutoSave 无条件发送 deleteReviewRecords 消息，将磁盘上已存在的批阅记录文件清除。修复：(A) handleFileContentPush 改为 async，先 callHost('getReviewRecords') → Store.restoreFromReviewRecord，与 handleFileSelectChange 保持一致；(B) export.js 加入 DELETE_ON_EMPTY_GRACE_MS 宽限期保护。本次新 hotfix（f36588c）进一步简化为 C-1 永久保留策略，DELETE_ON_EMPTY_GRACE_MS 已废弃。新增 BT-annotationPersist.1~8 共 8 个回归测试（Tier1/2/3）。Commit: 0ade044
- **2026-04-16**: 🚀 发布 v1.3.4 到双市场（工作区文件短链接跳转支持：Markdown 中的相对路径链接可点击打开，.md/.mdc 文件用 Review Panel 打开，其他文件用 VS Code 打开）
- **2026-04-13**: 🚀 发布 v1.3.2 到 VS Code Marketplace（Mermaid 特殊字符渲染修复：flowchart/sequenceDiagram/classDiagram/stateDiagram 全覆盖）
- **2026-04-09**: 🚀 发布 v1.3.1 到 VS Code Marketplace（编辑模式多项 bugfix：代码块换行丢失、子列表缩进丢失、列表新增行标记缺失、图表编辑多行合并、颜色文本样式丢失、告警块空行丢失）
- **2026-04-08**: 编辑模式下图表源码编辑支持（edit-diagram-source），Mermaid/PlantUML/Graphviz 图表在编辑模式下显示为可编辑 textarea，支持直接修改源码
- **2026-04-08**: 测试基础设施全面优化（optimize-test-infrastructure），Playwright 测试从 23 个增长到 64 个，新增 test:all 统一命令，修复伪测试，补充搜索/编辑/设置/目录/批注/工具栏 UI 测试
- **2026-04-08**: 引入 Playwright 自动化 UI 测试基础设施（add-automated-ui-testing），23 个测试覆盖图表渲染、Lightbox 交互、Checkbox 行为、基础渲染、批注高亮
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
| edit-diagram-source | 编辑模式下 Mermaid/PlantUML/Graphviz 图表显示为可编辑源码 textarea，支持直接修改 | 2026-04-08 |
| optimize-test-infrastructure | 测试基础设施优化：统一测试命令、修复伪测试、补充 41 个新 UI 测试覆盖搜索/编辑/设置/目录/批注/工具栏 | 2026-04-08 |
| add-automated-ui-testing | Playwright 自动化 UI 测试基础设施，23 个测试覆盖图表/Lightbox/Checkbox/渲染/批注 | 2026-04-08 |
| add-search-features | Ctrl+F 正文检索、目录面板搜索过滤、批注面板搜索定位 | 2026-04-08 |
| add-i18n-support | 多语言支持（中文/英文），i18n 模块、设置面板语言切换、HTML/JS/CSS/TS 全量国际化 | 2026-04-06 |
| ui-enhancements-batch-1 | UI 增强：任务列表删除线移除、工具栏重排、面板隐藏按钮、多窗口、悬浮/嵌入模式、文档对齐、编辑后渲染修复 | 2026-04-05 |
| add-plantuml-graphviz-support | 新增 PlantUML（在线服务器渲染）和 Graphviz（Viz.js 本地渲染）图表支持 | 2026-04-05 |

---

## 待实施的变更 (Active)

<!-- 列出计划中的变更，按优先级排序 -->

| 变更名 | 描述 | 建议优先级 |
|--------|------|-----------|
| （暂无活跃变更） | — | — |

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
| ui-testing-infra | add-automated-ui-testing | Playwright 测试基础设施、Mock 层、测试容器、辅助工具 |
| ui-rendering-tests | add-automated-ui-testing | UI 渲染测试套件：图表、Lightbox、Checkbox、基础渲染、批注 |
| test-integration | optimize-test-infrastructure | 统一测试命令、修复伪测试、清理 diagnostic、测试容器增强 |
| ui-test-expansion | optimize-test-infrastructure | UI 测试扩展：搜索、编辑模式、设置面板、目录面板、批注面板、工具栏 |
| diagram-edit | edit-diagram-source | 编辑模式下图表源码编辑：textarea 转换、turndown 还原、自动高度、dirty 标记 |

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
├── test/                           # 测试
│   ├── suite/                      # Mocha 单元测试
│   └── ui/                         # Playwright UI 测试
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
