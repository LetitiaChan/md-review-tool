---
name: openspec-apply-change
description: Implement tasks from an OpenSpec change. Use when the user wants to start implementing, continue implementation, or work through tasks.
license: MIT
compatibility: Requires openspec CLI.
metadata:
  author: openspec
  version: "1.0"
  generatedBy: "1.2.0"
---

<!-- AUTO-GENERATED full copy from .aikp/skills/openspec-apply-change/SKILL.md — DO NOT EDIT -->
<!-- To modify, edit the source file and run: npm run sync-aikit -->

Implement tasks from an OpenSpec change.

**Input**: Optionally specify a change name. If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

**Steps**

0. **Session warm-up (cross-session continuity)**

   Before doing anything else, perform these orientation steps to recover context from prior sessions:

   a. **Read progress notes**: Read `AGENT-PROGRESS.md` at the repository root.
      - This file records: project overview, completed changes, pending changes with priorities, known issues, and suggestions for the next session.
      - Use this to understand where the project left off and what was planned.

   b. **Check Git recent history**: Run `git --no-pager log --oneline -5` to see what was done recently.

   c. **Verify environment health** (optional, if build issues are suspected): Run `cd f:/github/md-review-tool && npm run compile` to verify build succeeds.

   d. **Announce context**: Briefly state (in 1-2 sentences) what was learned from the progress notes and git log before proceeding with implementation.

   > **Why this step exists**: AI agents lose memory between sessions. This warm-up prevents "one-shot tendency" (treating each session as a fresh start) and ensures incremental progress. See: Anthropic "Effective Harnesses for Long-Running Agents".

0.5. **Pre-flight check: Completion Gate (mandatory)**

   Before starting ANY apply, check for stale completed changes **other than the one being applied**:

   a. **Scan `openspec/changes/`** for all non-archive directories (excluding the current target change)
   b. For each directory that has a `tasks.md` file, count `- [ ]` vs `- [x]` tasks
   c. **If any OTHER change has ALL tasks `[x]` (fully implemented) but is NOT in `archive/`**:
      - ⛔ **STOP** — do NOT start applying the new change
      - Report: "⚠️ Change `<name>` is fully implemented but not archived. The archive pipeline (build → test → archive → commit) must complete before starting a new apply."
      - **Automatically execute the remaining pipeline** for the stale change (Step 8-14)
      - After successful archive, continue with the user's apply request
   d. **If no stale changes found** → proceed to Step 1

1. **Select the change**

   If a name is provided, use it. Otherwise:
   - Infer from conversation context if the user mentioned a change
   - Auto-select if only one active change exists
   - If ambiguous, run `openspec list --json` to get available changes and use the **AskUserQuestion tool** to let the user select

   Always announce: "Using change: <name>" and how to override (e.g., `/opsx:apply <other>`).

2. **Check status to understand the schema**
   ```bash
   openspec status --change "<name>" --json
   ```
   Parse the JSON to understand:
   - `schemaName`: The workflow being used (e.g., "spec-driven")
   - Which artifact contains the tasks (typically "tasks" for spec-driven, check status for others)

3. **Get apply instructions**

   ```bash
   openspec instructions apply --change "<name>" --json
   ```

   This returns:
   - Context file paths (varies by schema - could be proposal/specs/design/tasks or spec/tests/implementation/docs)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If `state: "blocked"` (missing artifacts): show message, suggest using openspec-continue-change
   - If `state: "all_done"`: congratulate, suggest archive
   - Otherwise: proceed to implementation

4. **Read context files**

   Read the files listed in `contextFiles` from the apply instructions output.
   The files depend on the schema being used:
   - **spec-driven**: proposal, specs, design, tasks
   - Other schemas: follow the contextFiles from CLI output

5. **Show current progress**

   Display:
   - Schema being used
   - Progress: "N/M tasks complete"
   - Remaining tasks overview
   - Dynamic instruction from CLI

6. **Implement tasks (loop until done or blocked)**

   For each pending task:
   - Show which task is being worked on
   - Make the code changes required
   - Keep changes minimal and focused
   - Mark task complete in the tasks file: `- [ ]` → `- [x]`
   - Continue to next task

   **Pause if:**
   - Task is unclear → ask for clarification
   - Implementation reveals a design issue → suggest updating artifacts
   - Error or blocker encountered → report and wait for guidance
   - User interrupts

7. **On completion or pause, show status**

   Display:
   - Tasks completed this session
   - Overall progress: "N/M tasks complete"
   - If paused: explain why and wait for guidance. **Do NOT proceed to the automation pipeline below.**
   - If all done: announce "All tasks complete! Starting automation pipeline..." and **proceed immediately to Step 8**.

---

## Automation Pipeline (Steps 8–14)

> **This pipeline runs automatically when ALL tasks are complete (N/N).** If implementation was paused (incomplete tasks), STOP HERE and wait for user guidance. The user does NOT need to trigger each step manually.

8. **Auto Build**

   <!-- ⚠️ CUSTOMIZE: Replace with your project's build command -->
   ```bash
   cd <project-root> && <build-command>
   ```

   - If build **succeeds** → proceed to Step 8.5
   - If build **fails** → diagnose errors, apply fixes, rebuild (max 3 attempts)
   - If still failing after 3 attempts → **STOP pipeline**, report build errors to user, update AGENT-PROGRESS.md with the failure

8.5. **Impact Analysis（影响面分析 — 为测试提供上下文）**

   在运行测试之前，先分析本次变更的影响范围。这为后续测试的诊断提供关键上下文。

   输出格式：
   ```
   ### 影响面分析
   - **修改文件**: 列出所有修改/新增的文件 + 各自改动行数
   - **直接影响**: 被修改的模块/功能
   - **间接影响**: 依赖被修改模块的上下游模块
   - **不受影响**: 与改动无关的独立模块（回归测试对照组）
   - **风险评估**: 低/中/高 + 简述理由
   ```

   此步骤不阻塞管线（纯分析输出），但如果风险评估为"高"，在报告中标注 ⚠️ 提醒用户格外关注测试结果。

9. **Auto Test (⚠️ Mandatory step — NEVER skip)**

   > **MANDATORY**: This step MUST be executed. Do NOT skip it, even if the build succeeded. Do NOT proceed to Step 10 without running tests. If you find yourself about to skip this step, STOP and re-read this instruction.

   Invoke the `auto-test` skill to run the project's test suite:

   <!-- ⚠️ CUSTOMIZE: Replace with your project's test commands -->
   a. **First, update test scripts** to cover the current change's new features (Three-Tier Model):
      - Read the change's `tasks.md` and `design.md` to understand what was implemented
      - **Tier 1 — Existence Assertions**: Append API exposure checks, DOM element presence checks, source code keyword assertions
      - **Tier 2 — Behavioral Assertions (⚠️ MANDATORY)**: For any UI interaction feature (drag, collapse, input, toggle, keyboard), write assertions that simulate real user actions and verify DOM state actually changes
      - **Tier 3 — Task-Specific Assertions**: For each UI-related task in the current change, write at least 1 behavioral assertion named `BT-<task>.<sub> <desc>`
      - **Do NOT rewrite existing tests — only add new blocks**
      - If test scripts don't exist yet, generate them from scratch based on the `auto-test` skill's templates

   b. **Run tests**: Execute the project's test command(s)

   > **测试范围优化**：如果 Step 8 构建已通过且本轮新增了测试用例，可先只运行新增测试验证通过，
   > 再执行全量回归。如果无新增测试，直接执行全量回归即可。

   For each test phase:
   - If tests **all pass** → proceed
   - If tests **fail** → enter Auto-Fix Loop:
     1. Diagnose failure (read error messages, locate source code)
     2. Classify fix scope: Trivial (<10 lines) / Moderate (<50 lines) / Large (>50 lines)
     3. Trivial/Moderate → auto-fix → rebuild → re-run failing test
     4. Large → **STOP pipeline**, report to user with details
     5. Max 3 fix iterations per failing test
   - If all tests pass after fixes → proceed to Step 10
   - If unfixable failures remain → **STOP pipeline**, report remaining failures

   > **Note**: If test scripts don't exist yet (first change implementing a new feature), generate them based on the `auto-test` skill's guidelines before running.

9.3. **运行时诊断策略（复杂场景专用，按需执行）**

   - **触发条件**：新功能涉及运行时行为，自动测试环境无法直接覆盖（如依赖真实 VS Code 宿主环境、用户交互时序、特定文件内容等）
   - **策略 A — 诊断日志 + 自动测试捕获**（优先）：
     · 在关键代码路径中插入诊断日志（console.log / OutputChannel），标记 `[DIAG]` 前缀
     · 编写测试用例，通过 mock/stub 模拟运行时条件，捕获日志输出并断言关键信息
     · 诊断日志在功能确认稳定后应清理或降级为 debug 级别
   - **策略 B — 用户协助验证**（降级）：
     · 当策略 A 无法覆盖时，在代码中保留诊断日志
     · 完成 Step 9.5 打包后，告知用户安装新包并反馈 `[DIAG]` 开头的日志输出
   - **⚠️ 无论使用哪种策略，都必须在 Step 14 报告中注明诊断方式和结论**

9.4. **文档同步检查（规则 6 — 测试通过后、打包前执行）**

   测试全部通过后，代码已稳定，此时检查是否需要同步更新文档：

   - **触发条件**：本次变更涉及用户可感知的功能变更（新增/修改/删除功能、命令、配置项）
   - **检查范围**：
     · `README.md` — 功能列表、使用说明、配置说明等相关章节
     · `docs/` 下的用户指南、策划文档中的功能描述
     · `package.json` 中的 `contributes` 描述（如涉及 VS Code 命令/配置变更）
   - **跳过条件**：纯内部重构（不改变外部行为）、Bug 修复（修复的是文档中已描述的预期行为）
   - **⚠️ 文档放在测试之后更新的原因**：避免因 Auto-Fix Loop 修改代码导致文档内容失效，此时代码已稳定

9.5. **Auto Package
9.5. **Auto Package（打包发布 — 测试通过后、commit 前）**

   测试全部通过后，立即打包生成安装包：

   ```bash
   cd f:/github/md-review-tool && npx @vscode/vsce package --no-dependencies
   ```

   - 打包**成功** → 安装包已生成，继续 Step 10
   - 打包**失败** → 在 Step 14 报告中标注 ⚠️ 打包失败，记录错误信息，**不阻塞管线**（打包失败不影响代码质量和归档流程）

10. **Auto Verify (openspec-verify-change)**

    Run the verification process from the `openspec-verify-change` skill against the current change:

    - **Completeness**: All tasks checked? All spec requirements implemented?
    - **Correctness**: Implementation matches spec intent? Scenarios covered?
    - **Coherence**: Follows design decisions? Code patterns consistent?

    Decision logic:
    - **0 CRITICAL issues** → proceed to Step 11
    - **CRITICAL issues found** → attempt auto-fix:
      1. For each CRITICAL issue, apply the recommended fix
      2. Re-run verification (max 2 re-verify cycles)
      3. If resolved → proceed
      4. If unresolvable → **STOP pipeline**, report CRITICAL issues to user
    - **WARNING/SUGGESTION only** → log them in the final report, proceed to Step 11

11. **Auto Archive (openspec-archive-change)**

    Perform the archive with smart defaults (no user prompts needed):

    a. **Delta spec sync strategy**:
       - If delta specs exist at `openspec/changes/<name>/specs/`:
         - For each capability: check if a main spec exists at `openspec/specs/<capability>/`
         - **Exact name match** → auto-sync (merge into existing main spec)
         - **No match** → auto-create new main spec
         - **Fuzzy/ambiguous match** → **STOP pipeline**, ask user which target to merge into
       - If no delta specs → skip sync

    b. **Perform archive**:
       ```bash
       # Unix/macOS
       mkdir -p openspec/changes/archive
       DATE=$(date +%Y-%m-%d)
       mv openspec/changes/<name> openspec/changes/archive/$DATE-<name>

       # Windows (PowerShell)
       # $date = Get-Date -Format "yyyy-MM-dd"
       # if (-not (Test-Path "openspec/changes/archive")) { New-Item -ItemType Directory -Path "openspec/changes/archive" -Force }
       # Move-Item "openspec/changes/<name>" "openspec/changes/archive/$date-<name>"
       ```

    c. If archive target already exists → append a suffix (e.g., `-2`)

12. **Update AGENT-PROGRESS.md**

    Update the progress notes at repository root:
    - Move the change from "pending changes" to "completed changes" section
    - Add entry to "recent updates" with today's date and summary of what was done
    - Update "next session suggestions" with the next recommended change
    - If any issues were encountered during the pipeline, add them to "known issues"

13. **Auto Git Commit**

    Stage all changes and create a commit:

    ```bash
    git add -A
    git commit -m "<type>(<change-name>): <auto-generated summary>"
    ```

    **Commit message conventions:**
    - `feat(<name>)`: New feature implementation
    - `fix(<name>)`: Bug fix change
    - `refactor(<name>)`: Refactoring change
    - Summary: brief description of what was implemented (max 72 chars)
    - Body (optional): list of key tasks completed

    - 描述部分使用中文，格式：`feat(<name>): 中文描述`

13.5. **Auto Git Push（自动推送）**

    Commit 成功后自动推送到远程仓库：

    ```bash
    git push
    ```

    - 推送**成功** → 继续到 Step 14
    - 推送**失败**（如远程冲突、网络错误）→ 在 Step 14 报告中标注 ⚠️ 推送失败，记录错误信息，**不阻塞管线**（commit 已完成即视为本地安全）

    <!-- ⚠️ CUSTOMIZE: 如果不需要自动推送，删除此步骤并在 Step 13 中添加 "NEVER run git push" 约束 -->

14. **Final Pipeline Report**

    Display a complete summary table:

    ```
    ## ✅ Pipeline Complete: <change-name>

    | Step          | Status | Details                              |
    |---------------|--------|--------------------------------------|
    | Build         | ✅     | Build succeeded                      |
    | Impact        | ✅     | N files changed, risk: 低/中/高      |
    | Test          | ✅     | N/N passed                           |
    | Package       | ✅     | 安装包已生成                          |
    | Verify        | ✅     | Completeness ✓ Correctness ✓ Coherence ✓ |
    | Archive       | ✅     | → archive/YYYY-MM-DD-<name>         |
    | Spec Sync     | ✅     | N capabilities synced to main specs  |
    | Progress      | ✅     | AGENT-PROGRESS.md updated            |
    | Git Commit    | ✅     | <commit-hash> <commit-message>       |
    | Git Push      | ✅     | pushed to origin/<branch>            |

    ### Auto-fixes Applied (if any)
    - Fixed: <description> in <file>

    ### Warnings (non-blocking)
    - <any WARNING/SUGGESTION from verify step>
    ```

---

## Pipeline Brake Mechanism

At ANY step, if an unrecoverable failure occurs:

1. **STOP** the pipeline immediately — do NOT proceed to subsequent steps
2. **Report** what was completed and what failed:
   ```
   ## ⚠️ Pipeline Stopped at: <step-name>

   ### Completed Steps
   - ✅ Build
   - ✅ Test

   ### Failed Step
   - ❌ Verify: 2 CRITICAL issues after 2 fix attempts

   ### Remaining Failures
   - <failure details with file references>

   ### Recommendation
   - <specific suggestion for manual resolution>
   ```
3. **Update AGENT-PROGRESS.md** with the partial progress and failure details
4. **Wait** for user guidance before resuming

---

**Output During Implementation**

```
## Implementing: <change-name> (schema: <schema-name>)

Working on task 3/7: <task description>
[...implementation happening...]
✓ Task complete

Working on task 4/7: <task description>
[...implementation happening...]
✓ Task complete
```

**Output On Pause (Issue Encountered During Implementation)**

```
## Implementation Paused

**Change:** <change-name>
**Schema:** <schema-name>
**Progress:** 4/7 tasks complete

### Issue Encountered
<description of the issue>

**Options:**
1. <option 1>
2. <option 2>
3. Other approach

What would you like to do?
```

**Guardrails**
- Keep going through tasks until done or blocked
- Always read context files before starting (from the apply instructions output)
- If task is ambiguous, pause and ask before implementing
- If implementation reveals issues, pause and suggest artifact updates
- Keep code changes minimal and scoped to each task
- Update task checkbox immediately after completing each task
- Pause on errors, blockers, or unclear requirements - don't guess
- Use contextFiles from CLI output, don't assume specific file names
- **When all tasks complete, proceed to automation pipeline AUTOMATICALLY — do not ask the user**
- **Never skip the pipeline steps or claim completion before the pipeline finishes**
- **⚠️ Step 8.5 (impact analysis) must be performed — this provides critical context for test diagnosis**
- **⚠️ Step 9 (auto-test) is MANDATORY — NEVER skip testing even if build succeeds**
- **⚠️ Step 11 (archive) + Step 13 (git commit) + Step 13.5 (git push) are MANDATORY — a change is NOT complete until archived, committed and pushed**
- **⚠️ Step 14 (pipeline report) must be displayed — this is how the user verifies pipeline completeness**
- **⚠️ Git push failure does NOT block the pipeline — log the error and continue to report**

**Fluid Workflow Integration**

This skill supports the "actions on a change" model:

- **Can be invoked anytime**: Before all artifacts are done (if tasks exist), after partial implementation, interleaved with other actions
- **Allows artifact updates**: If implementation reveals design issues, suggest updating artifacts - not phase-locked, work fluidly
