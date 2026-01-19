# Test Development Guide - TDS Project

**Author**: Murat (TEA Agent)
**Date**: 2026-01-17
**Status**: Reference document for all developers

---

## Quick Start: Writing Tests for New Endpoints

### Step-by-Step Process

#### 1. Create a Factory (5 minutes)

Create a file in `test-utils/factories/` with your response type:

```typescript
// test-utils/factories/[feature]-factory.ts
export type YourResponse = {
  id: string;
  name: string;
  status: 'active' | 'inactive';
};

export const create[Feature] = (overrides: Partial<YourResponse> = {}): YourResponse => ({
  id: faker.string.uuid(),
  name: faker.commerce.productName(),
  status: 'active',
  ...overrides,
});
```

**Why**: Factories provide a single source of truth for test data. They prevent:
- Hardcoded magic strings/numbers
- Collisions in parallel tests (using faker)
- Brittleness when schema evolves
- Duplicate test setup code

#### 2. Create Test File (15 minutes)

Use the template in `__tests__/api/api-test-template.ts`:

```bash
cp __tests__/api/api-test-template.ts __tests__/api/your-feature.test.ts
```

Edit the template:
- Change `[EPIC.STORY]` to your story
- Change `GET /api/endpoint` to your endpoint
- Add 3 success cases
- Add 2 error cases
- Add 1 shape validation test

#### 3. Name Tests with IDs

**Format**: `[EPIC.STORY-LEVEL-SEQ]`

Examples:
- `[1.001-API-001]` - Epic 1, Story 001, API level, Test sequence 001
- `[2.005-INT-003]` - Epic 2, Story 005, Integration level, Test sequence 003
- `[3.010-E2E-002]` - Epic 3, Story 010, E2E level, Test sequence 002

**Levels**:
- `API` = Unit/API test (no external calls)
- `INT` = Integration test (with DB, cache, etc)
- `E2E` = End-to-end test (full workflow)

#### 4. Use BDD Structure

Every test must have GIVEN-WHEN-THEN comments:

```typescript
it('[1.031-API-001] should return 200 with status ok', async () => {
  // GIVEN: [What's the starting state?]
  const req = { method: 'GET' } as NextApiRequest;
  const res = createMockResponse();

  // WHEN: [What action do we take?]
  await handler(req, res);

  // THEN: [What's the expected result?]
  expect(res.status).toHaveBeenCalledWith(200);
});
```

#### 5. Mark Priorities

Add JSDoc comments to your test suite:

```typescript
describe('[1.031] Infrastructure - Feature', () => {
  /**
   * P0 CRITICAL - This is why this test matters
   * Include impact if failure
   * Example: "User registration blocked, no new accounts"
   */
  describe('GET /api/feature - Success Path', () => {
    // ...tests...
  });

  /**
   * P1 HIGH - Secondary importance
   */
  describe('GET /api/feature - Error Handling', () => {
    // ...tests...
  });
});
```

**Priority Levels**:
- **P0 Critical**: Revenue, security, infrastructure (health, auth, payments)
- **P1 High**: User-facing features (create order, list plans)
- **P2 Medium**: Support features (admin, reporting)
- **P3 Low**: Polish, edge cases, optimizations

---

## Test Quality Criteria (Definition of Done)

Before committing, ensure your tests pass ALL criteria:

### ✅ Structure (10 points)
- [ ] Test IDs in format `[EPIC.STORY-LEVEL-SEQ]`
- [ ] GIVEN-WHEN-THEN comments on all tests
- [ ] Priority documented (P0/P1/P2/P3)
- [ ] Tests grouped in descriptive describe blocks
- [ ] Clear assertions explaining expected behavior

### ✅ Determinism (10 points)
- [ ] No `sleep()`, `waitForTimeout()`, or hardcoded delays
- [ ] No `if/else` controlling test flow
- [ ] No `try-catch` for error handling in tests
- [ ] No `Math.random()` or uncontrolled values
- [ ] All data generation via factories

### ✅ Isolation (10 points)
- [ ] No shared state between tests
- [ ] Each test can run independently
- [ ] Tests can run in parallel safely
- [ ] No test pollution (cleanup after each test)
- [ ] Unique data (via faker) prevents collisions

### ✅ Implementation (10 points)
- [ ] All assertions explicit and visible in test body
- [ ] No assertions hidden in helper functions
- [ ] Response types validated (string, number, etc)
- [ ] Error cases tested (at least 1 error path)
- [ ] Response shape validated (properties, types)

### ✅ Performance (5 points)
- [ ] Test file ≤ 300 lines (consider splitting if larger)
- [ ] Single test ≤ 50 lines
- [ ] Total test execution ≤ 1.5 minutes
- [ ] Each test ≤ 100ms (most tests < 5ms)

### ✅ Coverage (5 points)
- [ ] Happy path tested
- [ ] Error paths tested
- [ ] Edge cases considered
- [ ] Type validation included
- [ ] Boundary conditions checked

---

## Common Mistakes to Avoid

### ❌ DON'T: Validate Hardcoded Objects

```typescript
// BAD: Tests a literal object, not the endpoint
it('should return ok', () => {
  const response = { status: 'ok' };
  expect(response).toHaveProperty('status', 'ok');
});
```

### ✅ DO: Call the Actual Handler

```typescript
// GOOD: Tests the real handler
it('[1.031-API-001] should return 200 ok', async () => {
  const req = { method: 'GET' } as NextApiRequest;
  const res = createMockResponse();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
});
```

---

### ❌ DON'T: Use expect.any() for Specific Values

```typescript
// BAD: Too permissive, accepts any string including ''
expect(response.timestamp).toEqual(expect.any(String));
```

### ✅ DO: Validate Specific Format

```typescript
// GOOD: Specific validation
expect(response.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
expect(new Date(response.timestamp).toString()).not.toBe('Invalid Date');
```

---

### ❌ DON'T: Hide Assertions in Helpers

```typescript
// BAD: Helper obscures what's being validated
function validateUser(response) {
  expect(response.id).toBeTruthy();
  expect(response.email).toBeTruthy();
}

it('should create user', () => {
  const response = createUser();
  validateUser(response); // What did this validate?
});
```

### ✅ DO: Keep Assertions Visible

```typescript
// GOOD: Clear what's validated
it('[1.001-API-001] should create user with id and email', () => {
  const response = createUser();
  
  expect(response.id).toBeTruthy();
  expect(response.email).toMatch(/^[^\@]+@[^\@]+\.[^\@]+$/); // Email format
});
```

---

### ❌ DON'T: Tests with Conditionals

```typescript
// BAD: Test behavior varies between runs
it('should handle optional field', () => {
  if (Math.random() > 0.5) {
    expect(response.optional).toBeDefined();
  } else {
    expect(response.optional).toBeUndefined();
  }
});
```

### ✅ DO: Separate Tests for Each Path

```typescript
// GOOD: Each path tested separately
it('[1.001-API-001] should include optional field when provided', () => {
  const response = createUser({ optional: 'value' });
  expect(response.optional).toBe('value');
});

it('[1.001-API-002] should omit optional field when not provided', () => {
  const response = createUser();
  expect(response.optional).toBeUndefined();
});
```

---

## File Structure Reference

```
tds/
├── pages/api/                           # API endpoints
│   ├── health.ts                       # ✅ Template endpoint
│   ├── users/                          
│   │   └── create.ts                   # POST /api/users/create
│   └── ...
│
├── test-utils/                         # Test support code
│   └── factories/
│       ├── health-response-factory.ts  # ✅ Template factory
│       ├── user-factory.ts
│       ├── order-factory.ts
│       └── ...
│
└── __tests__/
    └── api/
        ├── api-test-template.ts        # ✅ Copy this for new endpoints
        ├── health.test.ts              # ✅ Reference implementation
        ├── users/
        │   ├── create.test.ts
        │   └── ...
        └── ...
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run single test file
npm test __tests__/api/health.test.ts

# Run in watch mode (re-run on changes)
npm run test:watch

# Run with coverage report
npm run test:coverage

# Run matching pattern
npm test -- --testNamePattern="should return 200"
```

---

## Debugging Tests

### View detailed failure output

```bash
npm test -- --verbose
```

### Run specific test only

```bash
npm test -- --testNamePattern="1.031-API-001"
```

### Inspect state in test

```typescript
it('debug test', () => {
  const response = createUser();
  console.log('Response:', JSON.stringify(response, null, 2));
  expect(response).toBeDefined();
});
```

Run with: `npm test -- --verbose`

---

## Knowledge Base References

These tests follow TEA (Test Architect) best practices:

- 📚 [test-quality.md](../_bmad/bmm/testarch/knowledge/test-quality.md)
  - Determinism, isolation, explicit assertions

- 📚 [data-factories.md](../_bmad/bmm/testarch/knowledge/data-factories.md)
  - Factory patterns with overrides

- 📚 [test-levels-framework.md](../_bmad/bmm/testarch/knowledge/test-levels-framework.md)
  - When to use unit vs integration vs E2E

- 📚 [test-priorities-matrix.md](../_bmad/bmm/testarch/knowledge/test-priorities-matrix.md)
  - P0/P1/P2/P3 classification

- 📚 [test-healing-patterns.md](../_bmad/bmm/testarch/knowledge/test-healing-patterns.md)
  - How to fix flaky tests

---

## Questions? Check These First

**Q: How do I create test data?**
A: Use factories in `test-utils/factories/`. See [data-factories.md](../_bmad/bmm/testarch/knowledge/data-factories.md)

**Q: How do I handle database setup?**
A: For now, use direct handler calls (unit tests). For E2E with DB, we'll add database fixtures.

**Q: How do I test error cases?**
A: Create separate tests with error inputs. Example: `createHealthResponse({ status: 'degraded' })`

**Q: How do I know if my test is good?**
A: Check against criteria in **Test Quality Criteria** section above. All ✅ required before commit.

**Q: My test is flaky—what do I do?**
A: See [test-healing-patterns.md](../_bmad/bmm/testarch/knowledge/test-healing-patterns.md). Common causes:
- Hard waits (use waitForResponse instead)
- Shared state (use factories with faker)
- Race conditions (order should be independent)

---

## Summary

✅ **In 30 minutes, you can write production-ready API tests:**
- 5 min: Create factory in `test-utils/factories/`
- 15 min: Create test file from template
- 5 min: Add test IDs, BDD comments, priorities
- 5 min: Run tests (`npm test`)

**Remember**: Tests are living documentation. Make them clear, keep them fast, and keep them deterministic.

Happy testing! 🧪
