---
name: auto-test
description: >-
  Automated testing skill for verifying implementation after OpenSpec task completion.
  This skill should be used after completing OpenSpec task implementation (apply-change)
  to automatically run tests, diagnose failures, and attempt auto-fix for bugs found.
  Trigger phrases include "run tests", "verify implementation", "auto test", "e2e verify",
  or when the user has just finished an openspec apply-change session.
license: MIT
metadata:
  author: openspec-harness-kit
  version: "1.0"
---

# Auto-Test Skill

Automated testing and bug-fixing workflow designed to run after OpenSpec task implementation. This is a **template** — customize it for your project's specific testing stack.

<!-- ⚠️ CUSTOMIZE THIS ENTIRE FILE for your project's testing framework.
     This template provides the STRUCTURE and WORKFLOW.
     You need to fill in the PROJECT-SPECIFIC sections marked with ⚠️.

     Examples of customization:
     - Jest/Vitest for unit tests
     - Playwright/Cypress for E2E tests
     - pytest for Python projects
     - cargo test for Rust projects
     - Custom integration test scripts
-->

## When to Use

- After completing an `openspec-apply-change` session (all tasks marked done)
- When the user explicitly requests testing/verification
- When verifying that code changes don't break existing functionality
- After any significant code modification

## Overview

The testing workflow has two phases executed sequentially:

1. **Phase 1 — Unit / Data Layer Tests**: Mocha tests via `npm test` covering extension logic, file service, state service
2. **Phase 2 — Integration / UI Layer Tests**: Same test runner (VS Code extension tests run in a VS Code instance via @vscode/test-electron)

After each phase, if failures are detected, enter **Auto-Fix Loop** (up to 3 iterations per failing test).

## Prerequisites

Before running tests, ensure the project is buildable:

<!-- ⚠️ CUSTOMIZE: Replace with your project's build command -->
```bash
cd <project-root>
<build-command>
```

If the build fails, fix the build errors first. Do NOT proceed with testing until build succeeds.

## Phase 1: Unit / Data Layer Tests

### Purpose

Verify business logic, data operations, service functions, and core algorithms — without UI dependency.

### Execution

<!-- ⚠️ CUSTOMIZE: Replace with your project's test command -->
```bash
cd <project-root>
<test-command-phase-1>
```

### What to Test

For each OpenSpec change, generate test cases covering:

| Area | What to Verify |
|------|---------------|
| Core Logic | Business rules, calculations, transformations |
| Data Operations | CRUD operations, data validation, persistence |
| Error Handling | Edge cases, invalid inputs, error propagation |
| Integration Points | API contracts, service boundaries |

### Interpreting Results

Parse test output for pass/fail indicators:
- Standard test runners output pass ✓ / fail ✗ markers
- Check exit code: 0 = all passed, non-zero = failures
- If failures exist → proceed to Auto-Fix

## Phase 2: Integration / UI Layer Tests

### Purpose

Verify user-facing functionality, API endpoints, UI interactions, and end-to-end flows.

### Execution

```bash
cd f:/github/md-review-tool
npm test
# Note: VS Code extension tests run via @vscode/test-electron, covering both unit and integration
```

### What to Test

| Area | What to Verify |
|------|---------------|
| User Flows | Complete user journeys from start to finish |
| API Endpoints | Request/response correctness, error handling |
| UI Rendering | Components render correctly, interactions work |
| Data Flow | End-to-end data persistence and retrieval |

### Interpreting Results

- Check test output and exit code
- Review any generated screenshots or artifacts
- Summary: N passed, M failed

## Auto-Fix Loop

When tests fail, enter the auto-fix loop:

### Step 1: Diagnose

For each failing test:

1. **Read the error message** — extract expected vs actual, or the specific assertion name
2. **Identify the source layer**:
   - Unit test fail → likely in core business logic / service code
   - Integration test fail → likely in API layer, data layer, or UI components
3. **Search the codebase** for the relevant code

### Step 2: Classify the Fix

| Category | Scope | Action |
|----------|-------|--------|
| **Trivial** | Single file, <10 lines | Auto-fix immediately |
| **Moderate** | 2-3 files, <50 lines total | Auto-fix, explain changes |
| **Large** | >3 files or >50 lines or architectural change | **ASK USER before proceeding** |

**CRITICAL: For large-scope fixes, ALWAYS ask the user:**
> "Detected a large-scope fix needed (N files, ~M lines of code). Details:\n1. ...\n2. ...\nProceed?"

### Step 3: Apply Fix

1. Make the code change using `replace_in_file`
2. Rebuild the project
3. Re-run the failing test phase
4. If still failing → loop back to Step 1 (max 3 iterations)
5. If max iterations reached → report remaining failures to user

### Step 4: Report

After all fix attempts, generate a summary:

```
## Test Report

### Phase 1 (Unit / Data Layer)
- Passed: N / Total: M
- Auto-fixed: K bug(s)

### Phase 2 (Integration / UI Layer)
- Passed: N / Total: M
- Auto-fixed: K bug(s)

### Unresolved Issues
- (list any issues that could not be auto-fixed)
```

## Adapting Tests for New Changes

When an OpenSpec change adds new features, the test scripts need to be updated:

### Adding Tests for New Features

1. Read the change's `tasks.md` to understand what was implemented
2. Read the change's `design.md` to understand technical decisions
3. Read relevant source files to understand the implementation
4. **Append new test cases** to the appropriate test files:
   - Follow existing naming patterns and conventions
   - Cover positive cases, edge cases, and error cases
   - Do NOT rewrite existing tests — only add new blocks

### Common Pitfalls to Avoid

Refer to `references/common-pitfalls.md` for detailed solutions to frequently encountered issues during test authoring and execution.

## Integration with OpenSpec Workflow

This skill integrates into the OpenSpec workflow as follows:

```
openspec-apply-change (implement tasks)
    ↓
Build project
    ↓
auto-test (this skill)
    ↓ (if all pass)
openspec-verify-change → openspec-archive-change
    ↓ (if failures)
Auto-Fix Loop → Re-test → Report
```

Typical invocation after apply-change completes:
- "run tests"
- "verify the implementation"
- "auto test"
- Or automatically triggered at the end of an apply-change session
