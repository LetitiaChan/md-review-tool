---
name: auto-test
description: >-
  Automated testing skill for verifying implementation after OpenSpec task completion.
  This skill should be used after completing OpenSpec task implementation (apply-change)
  to automatically run tests, diagnose failures, and attempt auto-fix for bugs found.
  Trigger phrases include "run tests", "verify implementation", "auto test", "e2e verify",
  or when the user has just finished an openspec apply-change session.
  Supports subagent delegation via Task tool for parallel/async execution.
license: MIT
metadata:
  author: openspec-harness-kit
  version: "2.0"
---

# Auto-Test Skill

Automated testing and bug-fixing workflow for **md-human-review** VS Code 扩展项目。支持两种执行模式：直接执行 和 subagent 委托。

## When to Use

- After completing an `openspec-apply-change` session (all tasks marked done)
- When the user explicitly requests testing/verification
- When verifying that code changes don't break existing functionality
- After any significant code modification
- In Hotfix Mini-Pipeline H3 回归测试阶段

## Project Testing Architecture

双层测试架构，共 **624+ 个测试用例**：

| 层级 | 框架 | 命令 | 测试文件 | 说明 |
|------|------|------|---------|------|
| Layer 1 | Mocha + @vscode/test-electron | `npm test` | 12 个 `.test.ts` (test/suite/) | 扩展逻辑/服务/消息通信/工作流，需启动真实 VS Code 实例 |
| Layer 2 | Playwright (Chromium) | `npm run test:ui` | 12 个 `.spec.ts` (test/ui/specs/) | 浏览器端 UI 测试，file:// 加载 test-container.html |
| 全量 | — | `npm run test:all` | 全部 24 个文件 | 串行执行 Layer1 + Layer2 |

### Layer 1 测试文件索引

| 文件 | 覆盖领域 |
|------|---------|
| extension.test.ts | 扩展激活、命令注册 |
| fileService.test.ts | 文件读写服务 |
| stateService.test.ts | 状态管理 |
| reviewPanel.test.ts | 审阅面板 |
| annotation-logic.test.ts | 批注逻辑 |
| export-logic.test.ts | 导出功能 |
| store-logic.test.ts | Store 数据管理 |
| message-comm.test.ts | Extension ↔ Webview 消息通信 |
| file-integration.test.ts | 文件集成 |
| workflow.test.ts | 完整工作流 |
| e2e-review-flow.test.ts | 端到端审阅流程 |
| e2e-edge-cases.test.ts | 端到端边缘案例 |
| ui-interaction.test.ts | UI 交互 |

### Layer 2 测试文件索引

| Spec 文件 | 覆盖领域 |
|----------|---------|
| basic-rendering.spec.ts | 标题/列表/代码块/表格/KaTeX/告警块渲染 |
| chart-rendering.spec.ts | Mermaid/PlantUML/Graphviz 图表 |
| annotations.spec.ts | 批注功能 |
| annotation-panel.spec.ts | 批注面板 |
| checkbox.spec.ts | 复选框交互 |
| edit-mode.spec.ts | WYSIWYG 编辑模式 |
| lightbox.spec.ts | 图片灯箱 |
| search.spec.ts | 搜索功能 |
| settings-panel.spec.ts | 设置面板 |
| toc-panel.spec.ts | 目录面板 |
| toolbar.spec.ts | 工具栏 |
| diagnostic.spec.ts | 诊断 |

## Execution Mode 1: 直接执行（推荐，同步模式）

主 agent 直接按以下步骤执行测试，适用于管线中需要阻塞等待结果的场景。

### Step 1: 编译验证

```bash
cd f:/github/md-review-tool && npm run compile 2>&1
cd f:/github/md-review-tool && npm run compile:test 2>&1
```

- 失败 → 分析错误，修复（最多 3 次）
- 成功 → 继续

### Step 2: Layer 1 — Mocha 扩展测试

```bash
cd f:/github/md-review-tool && npm test 2>&1
```

解析输出：查找 `N passing` 和 `N failing`。

### Step 3: Layer 2 — Playwright UI 测试

```bash
cd f:/github/md-review-tool && npm run test:ui 2>&1
```

解析输出：查找 `N passed`、`N failed`、`N skipped`。

### Auto-Fix Loop（每个失败测试最多 3 轮）

1. **诊断**: 读取错误信息，定位失败的测试名和原因
2. **搜索**: 在源码中搜索相关代码
3. **分类**:
   | 类别 | 范围 | 动作 |
   |------|------|------|
   | Trivial | 单文件, <10行 | 直接修复 |
   | Moderate | 2-3文件, <50行 | 修复并解释 |
   | Large | >3文件 或 >50行 | **标记 Unresolved，报告用户** |
4. **修复**: replace_in_file 应用修复 → 重编译 → 重测试
5. **循环**: 仍失败且 <3轮 → 回到步骤 1

### Step 4: 报告

```
## 🧪 Auto-Test Report

| 阶段 | 状态 | 详情 |
|------|------|------|
| 编译 | ✅/❌ | 编译通过/失败原因 |
| Layer 1 (Mocha) | ✅/❌ | N/M passing, K failing |
| Layer 2 (Playwright) | ✅/❌ | N passed, K failed, S skipped |
| Auto-Fix | ✅/⏭️/❌ | 修复 N 个 / 不需要 / N 个未解决 |
```

## Execution Mode 2: 项目级 Subagent 委托（推荐）

项目已配置专用的 `auto-test` 项目级 Agent（`.codebuddy/agents/auto-test.md`），具备 `ExecuteCommand`、`ReadFile`、`SearchContent`、`ReplaceInFile` 等完整工具集，可独立执行编译 + 测试 + 诊断修复全流程。

### 调用方式

```
Task(
  subagent_name="auto-test",
  subagent_path=".codebuddy/agents/auto-test.md",
  description="自动测试验证",
  prompt="执行全量编译 + 双层测试。上下文: <简述本次变更>"
)
```

### 使用场景

| 场景 | prompt 示例 |
|------|-------------|
| OpenSpec apply 完成后 | "执行全量编译 + 双层测试。上下文: 刚完成 xxx change 的所有任务实现" |
| Hotfix 回归测试 | "执行全量编译 + 双层测试。上下文: hotfix 修复了 xxx（修改了 src/xxx.ts）" |
| 用户手动请求 | "执行全量编译 + 双层测试。上下文: 用户请求全量测试验证" |

详见 `.codebuddy/agents/auto-test.md` 中的完整 System Prompt。

## Adapting Tests for New Changes

When an OpenSpec change adds new features:

1. Read the change's `tasks.md` and `design.md`
2. Read relevant source files
3. **Append new test cases** to appropriate test files:
   - Layer 1: `test/suite/<module>.test.ts`（TDD 风格：`suite/test`）
   - Layer 2: `test/ui/specs/<feature>.spec.ts`（Playwright `test.describe/test`）
4. Follow naming patterns: `BT-<module>.<序号> <描述>`
5. 覆盖三层测试模型:
   - Tier 1: 存在性断言（API/DOM 元素存在检查）
   - Tier 2: 行为级断言（模拟用户操作，验证 DOM 变化）
   - Tier 3: 任务特定断言（针对本次变更的具体场景）

### Common Pitfalls

Refer to `references/common-pitfalls.md` for solutions to 10 common testing issues.

## Integration with OpenSpec Workflow

```
openspec-apply-change (implement tasks)
    ↓
Build (npm run compile)
    ↓
auto-test (this skill — Mode 1 直接执行 或 Mode 2 委托项目级 auto-test Agent)
    ↓ (all pass)
openspec-verify-change → openspec-archive-change
    ↓ (failures)
Auto-Fix Loop → Re-test → Report
```

## Baseline (2026-04-09)

| Layer | Passing | Failing | Skipped |
|-------|---------|---------|---------|
| Layer 1 (Mocha) | 558 | 0 | 0 |
| Layer 2 (Playwright) | 64 | 0 | 2 |
| **Total** | **622** | **0** | **2** |
