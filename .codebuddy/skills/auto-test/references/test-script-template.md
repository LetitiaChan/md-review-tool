# Test Script Templates

These templates provide the **structure** for adding new test cases. Adapt the syntax and patterns for your specific testing framework.

<!-- ⚠️ CUSTOMIZE: Replace the generic examples below with your project's
     actual testing framework patterns (Jest, Vitest, pytest, etc.) -->

## Unit / Data Layer Test Template

Use this template when adding new unit or data-layer test cases.

### New Test Block Template

```
// =====================================================
//  Task XX: <Feature Name> — Unit Tests
// =====================================================

describe('Task XX: <Feature Name>', () => {

  // XX.1 Basic CRUD
  test('XX.1 Create and read back', () => {
    // Create
    const created = createXxx({ /* params */ })
    expect(created.id).toBeGreaterThan(0)
    expect(created.field).toBe(expectedValue)

    // Read back
    const loaded = loadXxx(created.id)
    expect(loaded.id).toBe(created.id)
  })

  // XX.2 Update
  test('XX.2 Update and verify', () => {
    updateXxx(created.id, { /* params */ })
    const updated = loadXxx(created.id)
    expect(updated.field).toBe(newValue)
  })

  // XX.3 Delete
  test('XX.3 Delete and confirm gone', () => {
    deleteXxx(created.id)
    const deleted = loadXxx(created.id)
    expect(deleted).toBeUndefined()
  })

  // XX.4 Edge Cases
  test('XX.4 Handle invalid input', () => {
    expect(() => createXxx({})).toThrow()
  })
})
```

### Service Function Template

```
function createXxx(params) {
  // Insert into data store
  // Return the created entity
}

function loadXxx(id) {
  // Query data store by ID
  // Return entity or undefined
}

function updateXxx(id, updates) {
  // Apply updates to entity
  // Return updated entity
}

function deleteXxx(id) {
  // Remove entity from data store
}
```

## Integration / E2E Test Template

Use this template when adding new integration or end-to-end test cases.

### New Integration Test Section Template

```
// ====================== TASK XX: <Feature Name> E2E Tests ======================

describe('Task XX: <Feature Name> E2E', () => {

  // --- XX.1 Component/Page Visibility ---
  test('XX.1 Component is visible', async () => {
    // Navigate to page or render component
    // Assert component is visible/present
  })

  // --- XX.2 Interaction Test ---
  test('XX.2 User interaction works', async () => {
    // Perform user action (click, type, etc.)
    // Wait for response
    // Assert expected result
  })

  // --- XX.3 Form Input ---
  test('XX.3 Form submission works', async () => {
    // Fill in form fields
    // Submit form
    // Wait for save
    // Assert data was saved correctly
  })

  // --- XX.4 API Verification ---
  test('XX.4 API endpoint responds correctly', async () => {
    // Call API endpoint
    // Assert response status and body
  })
})
```

## Test Data Setup Template

When tests need seed data or fixtures:

```
// Shared test setup
function setupTestData() {
  return {
    // Create any required test entities
    // Return references for use in tests
  }
}

// Shared test teardown
function cleanupTestData() {
  // Remove test data
  // Reset state
}
```

## Naming Conventions

Follow these patterns for consistency:

| Pattern | Example |
|---------|---------|
| Test file | `<feature>.test.ts` or `<feature>.spec.ts` |
| Test block | `Task XX: <Feature Name>` |
| Individual test | `XX.N <description>` |
| Test data | `test-<entity>-<scenario>` |

These naming conventions align with OpenSpec task numbering, making it easy to trace test coverage back to requirements.
