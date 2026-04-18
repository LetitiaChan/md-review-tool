<!-- AUTO-GENERATED full copy from .aikp/skills/auto-test/references/common-pitfalls.md — DO NOT EDIT -->
<!-- To modify, edit the source file and run: npm run sync-aikit -->
# Common Pitfalls & Solutions

This document captures frequently encountered issues during automated testing, along with proven solutions. These are framework-agnostic patterns — adapt the code examples for your specific stack.

<!-- ⚠️ CUSTOMIZE: Add your project-specific pitfalls as you discover them.
     The entries below are common across many projects. -->

## 1. Test Isolation — Shared State Between Tests

**Problem**: Tests that share global state (databases, files, environment variables) can cause intermittent failures depending on execution order.

**Solution**: Each test should create its own isolated state and clean up afterwards:

- Use temporary directories for file-based tests
- Use separate database instances or transactions that roll back
- Reset environment variables in setup/teardown
- Never rely on state from a previous test

## 2. Async Timing Issues

**Problem**: Async operations (DB writes, API calls, UI renders) are not instantly complete. Tests that check too quickly will see stale state.

**Solution**: Use appropriate waiting strategies:

| Strategy | When to Use |
|----------|------------|
| `await` / `then` | When you have a Promise to wait on |
| Polling / retry | When waiting for a side effect (file created, state changed) |
| Fixed delay | Last resort — use generous intervals |
| Event listeners | When you can subscribe to completion events |

**Prefer explicit waits over fixed delays whenever possible.**

## 3. Exit Code Handling

**Problem**: Test processes may not exit with the correct code, causing CI/scripts to think tests passed when they failed.

**Solution**: Ensure your test runner properly propagates exit codes:

```
# Check exit code after test run
if ($LASTEXITCODE -ne 0) { Write-Error "Tests failed"; exit 1 }  # PowerShell
# or
test_command || exit 1  # Bash
```

## 4. Console Output Truncation

**Problem**: Long test runs may have their stdout/stderr output truncated or lost by the shell.

**Solution**: Write all log output to a file simultaneously:

- Pipe output to both console and file: `command 2>&1 | tee test-output.log`
- Or write a log file explicitly within the test runner
- Always check the log file for complete output if console output seems incomplete

## 5. Environment Differences

**Problem**: Tests pass locally but fail in CI, or pass on one machine but fail on another.

**Solution**:
- Pin dependency versions (lockfiles)
- Use containers or standardized environments where possible
- Document required system dependencies
- Check for OS-specific path separators (`/` vs `\`)
- Check for timezone-sensitive code

## 6. Flaky Tests — Race Conditions

**Problem**: Tests that sometimes pass and sometimes fail, often due to race conditions in async code.

**Solution**:
- Add retry logic for known-flaky operations
- Increase timeouts for network or I/O operations
- Use deterministic data (avoid random values in assertions)
- Run flaky tests multiple times to confirm stability after fixes

## 7. Missing Test Data Setup

**Problem**: Tests assume certain data exists (fixtures, seed data) but don't create it.

**Solution**:
- Each test should set up its own required data
- Use factory functions or fixtures for common test data
- Never depend on database state from other tests or manual setup
- Clean up test data after each test (or use transactions)

## 8. Incorrect Mock/Stub Configuration

**Problem**: Mocks or stubs don't accurately represent the real dependency, causing tests to pass but production to fail.

**Solution**:
- Keep mocks as simple as possible
- Test against real dependencies in integration tests
- Use contract tests between service boundaries
- Review mocks when the underlying API changes

## 9. Build Output vs Source Code Confusion

**Problem**: Tests import from build output (compiled/bundled files) instead of source, or vice versa. This can cause MODULE_NOT_FOUND errors or stale code execution.

**Solution**:
- Be explicit about import paths in test files
- Run build before tests if tests depend on build output
- Consider testing source directly when possible (avoids build dependency)

## 10. Large Test Files — Maintainability

**Problem**: A single massive test file becomes hard to navigate, debug, and maintain.

**Solution**:
- Organize tests by feature or module
- Use descriptive test names that explain the scenario
- Group related tests in describe/context blocks
- Split into multiple files when a file exceeds ~300-500 lines
- Follow the naming pattern from your OpenSpec tasks: `<task-number>.<sub> <description>`
