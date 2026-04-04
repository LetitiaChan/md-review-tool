# Agent Progress — MD Human Review

> 本文件用于跨会话记忆。每次会话结束时更新，下次会话启动时读取。
> 灵感来源：Anthropic "Effective Harnesses for Long-Running Agents"

---

## 最近更新

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
| add-plantuml-graphviz-support | 新增 PlantUML（在线服务器渲染）和 Graphviz（Viz.js 本地渲染）图表支持 | 2026-04-05 |

---

## 待实施的变更 (Active)

<!-- 列出计划中的变更，按优先级排序 -->

| 变更名 | 描述 | 建议优先级 |
|--------|------|-----------|

---

## 已积累的 Specs

| Spec | 来源 | 说明 |
|------|------|------|
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
