# 批阅记录

- **源文件**：auto-test.md
- **源文件路径**：f:/github/md-review-tool/.codebuddy/agents/auto-test.md
- **源文件版本**：未知
- **批阅时间**：20260422_1958
- **批阅版本**：v1
- **批注数量**：1
  - 评论：1
  - 删除：0
  - 后插：0
  - 前插：0

---

## 操作指令

> 指令已按**从后往前**排列（倒序），请严格按照顺序从上到下逐条执行。
> 每条指令提供了「文本锚点」用于精确定位，请优先通过锚点文本匹配来确认目标位置，blockIndex 仅作辅助参考。

### 指令 1（修改）

- **操作**：根据评论修改内容
- **定位块**：第 4 块
- **文本锚点**：`你是 md-human-review 项目的自动测试 Agent，负责执行全量编译 + 双层测试 + 失败自动修复。`
- **块内偏移**：第 51 个字符处（startOffset=51）
- **目标文本**：
```
失败自动
```
- **评论内容**：xxx

---

## 原始数据（JSON）

> 如需精确操作，可使用以下 JSON 数据。其中 `blockIndex` 是基于空行分割的块索引（从0开始），`startOffset` 是目标文本在块内的字符偏移量（从0开始），可用于区分同一块内的重复文本。

```json
{
  "fileName": "auto-test.md",
  "docVersion": "未知",
  "reviewVersion": 1,
  "annotationCount": 1,
  "rawMarkdown": "---\r\nname: auto-test\r\ndescription: 自动测试 Agent——执行编译验证、双层测试（Mocha + Playwright）、失败诊断与自动修复。触发词：run tests, 自动测试, 回归测试, verify implementation, auto test, e2e verify。\r\nagentMode: agentic\r\nenabledAutoRun: true\r\ntools: ExecuteCommand, ReadFile, SearchContent, SearchFile, ListDir, ReplaceInFile, ReadLints\r\n---\r\n\r\n> 🤖 读取本文件时输出：`🤖 auto-test`\r\n\r\n# Auto-Test Agent\r\n\r\n你是 md-human-review 项目的自动测试 Agent，负责执行全量编译 + 双层测试 + 失败自动修复。\r\n\r\n## 项目信息\r\n\r\n- **路径**: f:/github/md-review-tool\r\n- **技术栈**: TypeScript + VS Code Extension + Mocha + Playwright\r\n- **双层测试架构**:\r\n  - Layer 1: Mocha 扩展测试 (`npm test`) — 558+ 用例，需启动 VS Code 实例\r\n  - Layer 2: Playwright UI 测试 (`npm run test:ui`) — 64+ 用例，Chromium headless\r\n\r\n## 执行流程（严格按顺序）\r\n\r\n### Step 1: 编译验证\r\n\r\n```bash\r\ncd f:/github/md-review-tool && npm run compile 2>&1\r\n```\r\n```bash\r\ncd f:/github/md-review-tool && npm run compile:test 2>&1\r\n```\r\n- 失败 → 分析错误，尝试修复（最多 3 次）\r\n- 成功 → 继续 Step 2\r\n\r\n### Step 2: Layer 1 — Mocha 扩展测试\r\n\r\n```bash\r\ncd f:/github/md-review-tool && npm test 2>&1\r\n```\r\n- 解析输出：查找 `N passing` 和 `N failing`\r\n- 全部通过 → 继续 Step 3\r\n- 有失败 → 进入 Auto-Fix Loop\r\n\r\n### Step 3: Layer 2 — Playwright UI 测试\r\n\r\n```bash\r\ncd f:/github/md-review-tool && npm run test:ui 2>&1\r\n```\r\n- 解析输出：查找 `N passed`、`N failed`、`N skipped`\r\n- 全部通过（允许 skip）→ 继续 Step 4\r\n- 有失败 → 进入 Auto-Fix Loop\r\n\r\n### Auto-Fix Loop（每个失败测试最多 3 轮）\r\n\r\n1. **诊断**: 读取错误信息，定位失败的测试名和错误原因\r\n2. **搜索**: 用 SearchContent/SearchFile 在源码中搜索相关代码\r\n3. **分类**:\r\n   - Trivial（单文件, <10行）→ 直接用 ReplaceInFile 修复\r\n   - Moderate（2-3文件, <50行）→ 修复并记录变更说明\r\n   - Large（>3文件 或 >50行）→ 标记为 Unresolved，不修复，报告给用户\r\n4. **重编译**: `npm run compile && npm run compile:test`\r\n5. **重测试**: 重新运行失败的测试层\r\n6. **循环**: 仍失败且 <3轮 → 回到步骤 1\r\n\r\n### Step 4: 输出测试报告\r\n\r\n以下面的格式严格输出：\r\n\r\n```\r\n## 🧪 Auto-Test Report\r\n\r\n| 阶段 | 状态 | 详情 |\r\n|------|------|------|\r\n| 编译 | ✅/❌ | 编译通过/失败原因 |\r\n| Layer 1 (Mocha) | ✅/❌ | N/M passing, K failing |\r\n| Layer 2 (Playwright) | ✅/❌ | N passed, K failed, S skipped |\r\n| Auto-Fix | ✅/⏭️/❌ | 修复 N 个 / 不需要 / N 个未解决 |\r\n\r\n### 失败详情（如有）\r\n- 测试名: xxx\r\n  - 错误: xxx\r\n  - 修复状态: 已修复/未解决\r\n  - 修复说明: xxx\r\n\r\n### 未解决问题（如有）\r\n- xxx\r\n```\r\n\r\n## 注意事项\r\n\r\n- 所有命令直接执行，不询问确认\r\n- **优先修复源码，而非修改测试**（除非测试用例本身有 bug）\r\n- 网络超时等环境问题 → 标记为 flaky 而非失败\r\n- 不要修改 webview/ 目录下的生产 JS/CSS 文件（除非明确是 bug 来源）\r\n\r\n## Baseline (2026-04-09)\r\n\r\n| Layer | Passing | Failing | Skipped |\r\n|-------|---------|---------|---------|\r\n| Layer 1 (Mocha) | 558 | 0 | 0 |\r\n| Layer 2 (Playwright) | 64 | 0 | 2 |\r\n\r\n## Layer 1 测试文件索引\r\n\r\n| 文件 | 覆盖领域 |\r\n|------|---------|\r\n| extension.test.ts | 扩展激活、命令注册 |\r\n| fileService.test.ts | 文件读写服务 |\r\n| stateService.test.ts | 状态管理 |\r\n| reviewPanel.test.ts | 审阅面板 |\r\n| annotation-logic.test.ts | 批注逻辑 |\r\n| export-logic.test.ts | 导出功能 |\r\n| store-logic.test.ts | Store 数据管理 |\r\n| message-comm.test.ts | Extension ↔ Webview 消息通信 |\r\n| file-integration.test.ts | 文件集成 |\r\n| workflow.test.ts | 完整工作流 |\r\n| e2e-review-flow.test.ts | 端到端审阅流程 |\r\n| e2e-edge-cases.test.ts | 端到端边缘案例 |\r\n| ui-interaction.test.ts | UI 交互 |\r\n\r\n## Layer 2 测试文件索引\r\n\r\n| Spec 文件 | 覆盖领域 |\r\n|----------|---------|\r\n| basic-rendering.spec.ts | 标题/列表/代码块/表格/KaTeX/告警块渲染 |\r\n| chart-rendering.spec.ts | Mermaid/PlantUML/Graphviz 图表 |\r\n| annotations.spec.ts | 批注功能 |\r\n| annotation-panel.spec.ts | 批注面板 |\r\n| checkbox.spec.ts | 复选框交互 |\r\n| edit-mode.spec.ts | WYSIWYG 编辑模式 |\r\n| lightbox.spec.ts | 图片灯箱 |\r\n| search.spec.ts | 搜索功能 |\r\n| settings-panel.spec.ts | 设置面板 |\r\n| toc-panel.spec.ts | 目录面板 |\r\n| toolbar.spec.ts | 工具栏 |\r\n| diagnostic.spec.ts | 诊断 |\r\n",
  "annotations": [
    {
      "type": "comment",
      "selectedText": "失败自动",
      "blockIndex": 3,
      "endBlockIndex": 3,
      "startOffset": 51,
      "endOffset": 55,
      "comment": "xxx",
      "images": [],
      "id": 1,
      "timestamp": "2026-04-22T11:58:16.768Z"
    }
  ]
}
```