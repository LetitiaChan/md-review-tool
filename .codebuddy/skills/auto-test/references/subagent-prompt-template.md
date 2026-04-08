# Auto-Test 执行模板

> **重要发现**: `code-explorer` subagent **不具备 `execute_command` 工具**，无法执行编译/测试命令。
> 因此自动测试必须由**主 agent 直接执行**（Mode 1），不能委托给 subagent。
> 
> `code-explorer` subagent 的价值在于：**测试失败后的诊断阶段**——搜索源码、定位错误原因、分析影响面。

---

## 主 Agent 自动测试标准流程

### Step 1: 编译验证
```bash
cd f:/github/md-review-tool && npm run compile 2>&1
cd f:/github/md-review-tool && npm run compile:test 2>&1
```

### Step 2 & 3: 双层测试（可并行）
```bash
cd f:/github/md-review-tool && npm test 2>&1
cd f:/github/md-review-tool && npm run test:ui 2>&1
```
- Layer 1: 查找 `N passing` 和 `N failing`
- Layer 2: 查找 `N passed`、`N failed`、`N skipped`

### Step 4: Auto-Fix Loop（如有失败，max 3 轮）
1. 诊断 → 可委托 `code-explorer` 搜索源码
2. 分类 → Trivial(<10行)/Moderate(<50行)/Large(>50行)
3. 修复 → replace_in_file → 重编译 → 重测试

### Step 5: 报告
```
## Auto-Test Report
| 阶段 | 状态 | 详情 |
|------|------|------|
| 编译 | ✅/❌ | 结果 |
| Layer 1 (Mocha) | ✅/❌ | N passing, K failing |
| Layer 2 (Playwright) | ✅/❌ | N passed, K failed, S skipped |
| Auto-Fix | ✅/⏭️/❌ | 修复 N 个 / 不需要 / N 个未解决 |
```

---

## Subagent 委托（仅诊断阶段）

```
Task(
  subagent_name="code-explorer",
  description="测试失败诊断",
  prompt="在 f:/github/md-review-tool 中，测试 '<名>' 失败。错误: <详情>。搜索相关源码分析原因。"
)
```

## 性能优化
1. 编译后未改 ts 可跳过重编译
2. Layer 1 & 2 可并行
3. Hotfix 可用 `--grep` 只跑子集
4. Playwright 可指定 spec 文件
