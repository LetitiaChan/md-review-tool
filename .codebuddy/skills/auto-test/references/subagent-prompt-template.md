# Auto-Test 执行模板

## 项目级 Agent 委托（推荐方式）

项目已配置 `auto-test` 项目级 Agent（`.codebuddy/agents/auto-test.md`），具备 `ExecuteCommand` 等全部工具，可独立完成编译 + 测试 + 诊断修复。

### 调用方式

```
Task(
  subagent_name="auto-test",
  subagent_path=".codebuddy/agents/auto-test.md",
  description="自动测试验证",
  prompt="执行全量编译 + 双层测试。上下文: <简述本次变更>"
)
```

---

## 主 Agent 直接执行（备选方式）

当 subagent 不可用时，主 agent 按以下步骤直接执行：

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
1. 诊断 → 读取错误信息，搜索源码
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

## 性能优化
1. 编译后未改 ts 可跳过重编译
2. Layer 1 & 2 可并行
3. Hotfix 可用 `--grep` 只跑子集
4. Playwright 可指定 spec 文件
