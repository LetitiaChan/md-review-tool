---
name: OPSX: Apply
description: "Implement tasks from an OpenSpec change (Experimental)"
argument-hint: "[command arguments]"
---

<!-- AUTO-GENERATED full copy from .aikp/commands/opsx/apply.md — DO NOT EDIT -->
<!-- To modify, edit the source file and run: npm run sync-aikit -->

Implement tasks from an OpenSpec change.

**Input**: Optionally specify a change name (e.g., `/opsx:apply add-auth`). If omitted, check if it can be inferred from conversation context. If vague or ambiguous you MUST prompt for available changes.

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

0.5. **Pre-flight check: Unarchived Change Gate (mandatory)**

   Before starting ANY apply, check for stale completed changes **other than the one being applied**:

   a. **Scan `openspec/changes/`** for all non-archive directories (excluding the current target change)
   b. For each directory that has a `tasks.md` file, count `- [ ]` vs `- [x]` tasks
   c. **If any OTHER change has ALL tasks `[x]` (fully implemented) but is NOT in `archive/`**:
      - ⛔ **STOP** — do NOT start applying the new change
      - Report: "⚠️ Change `<name>` is fully implemented but not archived. Must complete its archive pipeline (build → test → archive → commit) before starting a new apply."
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
   - Context file paths (varies by schema)
   - Progress (total, complete, remaining)
   - Task list with status
   - Dynamic instruction based on current state

   **Handle states:**
   - If `state: "blocked"` (missing artifacts): show message, suggest using `/opsx:continue`
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

   <!-- ⚠️ CUSTOMIZE: Replace with your project's build command, e.g.:
        npm run build / cargo build --release / go build ./... / make build -->
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

9. **Auto Test — auto-test (⚠️ mandatory step — never skip)**

   > **MANDATORY**: This step MUST be executed. Do NOT skip it, even if the build succeeded. Do NOT proceed to Step 10 without running tests. If you find yourself about to skip this step, STOP and re-read this instruction.

   Invoke the `auto-test` skill to run the project's test suite:

   a. **First, update test scripts** to cover the current change's new features:
      - Read the change's `tasks.md` and `design.md` to understand new operations and components
      - Read existing test scripts
      - **Append new test cases** for the current change (do NOT rewrite existing tests — only add new blocks)
      - If test scripts don't exist yet, generate them from scratch based on `auto-test` skill's templates

   <!-- ⚠️ CUSTOMIZE: Replace with your project's test commands -->
   b. **Run tests**:
      ```bash
      cd <project-root> && <test-command>
      ```

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
       date=$(date +%Y-%m-%d)
       mkdir -p openspec/changes/archive
       mv "openspec/changes/<name>" "openspec/changes/archive/$date-<name>"
       ```
       ```powershell
       # Windows (PowerShell)
       $date = Get-Date -Format "yyyy-MM-dd"
       if (-not (Test-Path "openspec/changes/archive")) { New-Item -ItemType Directory -Path "openspec/changes/archive" -Force }
       Move-Item "openspec/changes/<name>" "openspec/changes/archive/$date-<name>"
       ```

    c. If archive target already exists → append a suffix (e.g., `-2`)

12. **Update AGENT-PROGRESS.md**

    Update the progress notes at repository root:
    - Move the change from "Pending Changes" to "Completed Changes" section
    - Add entry to "Recent Updates" with today's date and summary of what was done
    - Update "Next Session Suggestions" with the next recommended change
    - If any issues were encountered during the pipeline, add them to "Known Issues"

13. **Auto Git Commit**

    Stage all changes and create a commit:

    ```bash
    git add -A
    git commit -m "<type>(<change-name>): <auto-generated summary>"
    ```

    **Commit message conventions:**
    - `feat(<name>): 中文描述`
    - `fix(<name>): 中文描述`
    - `refactor(<name>): 中文描述`
    - 描述部分使用中文，最多 72 字符
    - Body (optional): list of key tasks completed

    **NEVER run `git push`** — leave that decision to the user.

13.5. **Auto Git Push（自动推送）**

    Commit 成功后自动推送到远程仓库：

    ```bash
    git push
    ```

    - 推送**成功** → 继续到 Step 14
    - 推送**失败**（如远程冲突、网络错误）→ 在 Step 14 报告中标注 ⚠️ 推送失败，记录错误信息，**不阻塞管线**（commit 已完成即视为本地安全）

    <!-- ⚠️ CUSTOMIZE: 如果不需要自动推送，删除此步骤并恢复 Step 13 的 "NEVER git push" 约束 -->

14. **Final Pipeline Report**

    Display a complete summary table:

    ```
    ## ✅ Pipeline Complete: <change-name>

    | Step          | Status | Details                              |
    |---------------|--------|--------------------------------------|
    | Build         | ✅     | Build succeeded                      |
    | Impact        | ✅     | N files changed, risk: 低/中/高      |
    | Test          | ✅     | N/N passed                           |
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
   - ❌ Verify: 2 CRITICAL issues unresolvable

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
