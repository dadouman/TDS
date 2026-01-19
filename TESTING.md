# Testing Strategy - TDS Project

**Last Updated**: 2026-01-17
**Maintained By**: Murat (TEA - Master Test Architect)
**Status**: ✅ Active & Production Ready

---

## Quick Start

### Run Tests
```bash
npm test                              # Run all tests
npm run test:watch                    # Watch mode (re-run on changes)
npm run test:coverage                 # Coverage report
npm test -- --testNamePattern="1.031" # Run tests matching pattern
```

### Write New Tests
1. Read: [TEST-DEVELOPMENT-GUIDE.md](../tds/TEST-DEVELOPMENT-GUIDE.md)
2. Copy: `__tests__/api/api-test-template.ts`
3. Create your factory in `test-utils/factories/`
4. Adapt template to your endpoint
5. Run: `npm test your-file.test.ts`

**Estimated time**: ~30 minutes per test file

---

## Test Suite Overview

### Current Coverage

| Story | Endpoint | Level | Tests | Status |
|-------|----------|-------|-------|--------|
| 1.031 | GET /api/health | API | 8 | ✅ 100% passing |
| 1.001 | POST /api/users/register | API | - | 📋 Planned |
| 1.002 | POST /api/auth/login | API | - | 📋 Planned |
| 2.005 | POST /api/plans | API | - | 📋 Planned |
| 2.006 | GET /api/plans | API | - | 📋 Planned |

**Total**: 8/? tests passing

### Test Files Structure

```
__tests__/
├── api/
│   ├── health.test.ts              ✅ 8 tests (100% passing)
│   ├── api-test-template.ts        📚 Reference template
│   └── [NEW_FEATURE].test.ts       🔄 To be created
│
└── utils/                          📋 Coming soon (unit tests)
    └── factories.test.ts           📋 Coming soon
```

---

## Quality Standards

### Definition of Done (for every test)

Every test must pass ALL criteria:

- ✅ **Test ID**: Format `[EPIC.STORY-LEVEL-SEQ]`
- ✅ **BDD Comments**: GIVEN-WHEN-THEN structure
- ✅ **Priority**: P0/P1/P2/P3 marked
- ✅ **No Hard Waits**: No sleep(), waitForTimeout()
- ✅ **Deterministic**: No if/else, Math.random()
- ✅ **Isolated**: Can run independently, in any order
- ✅ **Explicit Assertions**: All assertions visible in test
- ✅ **Factory Pattern**: Use data factories, not hardcoded data
- ✅ **Error Cases**: At least 1 error path tested
- ✅ **All Passing**: `npm test` shows 100% pass
- ✅ **No Flakiness**: Runs consistently (3x rule: pass 3x in a row)

**Checklist**: See [TEST-DEVELOPMENT-GUIDE.md](../tds/TEST-DEVELOPMENT-GUIDE.md) for full checklist

---

## Test Levels

### API Tests (Current Focus)
- **Level**: Unit test of handler logic
- **Framework**: Jest + mocked responses
- **Speed**: <5ms per test
- **Scope**: Single endpoint handler
- **Example**: [1.031-API-001] health endpoint returns 200

### Integration Tests (Planned)
- **Level**: Handler + Database interaction
- **Framework**: Jest + test database
- **Speed**: <100ms per test
- **Scope**: Full CRUD flow
- **Example**: [1.001-INT-001] create user and verify in database

### E2E Tests (Future)
- **Level**: Full workflow via HTTP
- **Framework**: Playwright + Supertest
- **Speed**: <1s per test
- **Scope**: Complete user journey
- **Example**: [1.001-E2E-001] register → login → dashboard

---

## Priority Classification

### P0 - Critical (Revenue, Security, Infrastructure)
- Health checks (`GET /api/health`)
- Authentication endpoints (`POST /api/auth/login`)
- Payment processing
- User registration

**Action on Failure**: 🚨 Block all deployments

**Test Count**: Minimum 3 tests per P0 endpoint
- Happy path ✅
- Error handling ❌
- Edge cases ⚠️

---

### P1 - High (User-Facing Features)
- Create transport plan
- List trips
- Update user profile

**Action on Failure**: ⚠️ Warn but allow deployment

**Test Count**: Minimum 2 tests per P1 endpoint

---

### P2 - Medium (Support Features)
- Admin functions
- Reporting endpoints
- Utility functions

**Action on Failure**: ℹ️ Log but allow deployment

**Test Count**: Minimum 1 test per P2 endpoint

---

### P3 - Low (Polish, Optimizations)
- Search filters
- Sort options
- Nice-to-have features

**Action on Failure**: 📝 Log only

**Test Count**: Optional

---

## File Structure

### Test Files Location
```
__tests__/
├── api/
│   ├── health.test.ts          # Endpoint tests
│   ├── users/
│   │   ├── register.test.ts
│   │   └── login.test.ts
│   └── ...
└── utils/                      # Utility/unit tests
    └── [feature].test.ts
```

### Test Support (Factories, Helpers)
```
test-utils/
├── factories/
│   ├── health-response-factory.ts
│   ├── user-factory.ts
│   └── ...
├── helpers/
│   ├── mock-response.ts
│   └── ...
└── fixtures/                   # Playwright fixtures (future)
    └── api-fixture.ts
```

---

## Data Factories

### Pattern

Every test should use a factory for test data:

```typescript
// test-utils/factories/user-factory.ts
export const createUser = (overrides: Partial<User> = {}): User => ({
  id: faker.string.uuid(),
  email: faker.internet.email(),
  name: faker.person.fullName(),
  role: 'user',
  ...overrides, // Easy override for specific tests
});

// Usage in test
it('[1.001-API-001] should create user', () => {
  const user = createUser();                           // Default user
  const admin = createUser({ role: 'admin' });        // Admin user
  const testUser = createUser({ email: 'test@t.c' }); // Custom email
});
```

### Why Factories?
- ✅ Single source of truth
- ✅ Prevent hardcoded magic strings
- ✅ Safe parallel execution (faker ensures uniqueness)
- ✅ Easy to test edge cases
- ✅ Schema evolution resilience

---

## Common Mistakes to Avoid

### ❌ DON'T: Validate Hardcoded Objects
```typescript
// BAD
it('should return ok', () => {
  const response = { status: 'ok' };
  expect(response).toHaveProperty('status');
});
```

### ✅ DO: Call the Real Handler
```typescript
// GOOD
it('[1.031-API-001] should return 200 ok', async () => {
  const req = { method: 'GET' };
  const res = createMockResponse();
  await handler(req, res);
  expect(res.status).toHaveBeenCalledWith(200);
});
```

---

### ❌ DON'T: Use `expect.any()`
```typescript
// TOO PERMISSIVE
expect(response.email).toEqual(expect.any(String)); // Accepts ''
```

### ✅ DO: Validate Specific Format
```typescript
// SPECIFIC
expect(response.email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
```

---

### ❌ DON'T: Hide Assertions in Helpers
```typescript
// OBSCURE
function validateUser(user) {
  expect(user.id).toBeDefined();
  expect(user.email).toBeDefined();
}
it('should create user', () => {
  const user = createUser();
  validateUser(user); // What did this validate?
});
```

### ✅ DO: Keep Assertions Visible
```typescript
// CLEAR
it('[1.001-API-001] should create user with id and email', () => {
  const user = createUser();
  expect(user.id).toBeTruthy();
  expect(user.email).toMatch(/^[^@]+@[^@]+\.[^@]+$/);
});
```

---

### ❌ DON'T: Tests with Conditionals
```typescript
// FLAKY
it('should handle optional field', () => {
  if (Math.random() > 0.5) {
    expect(response.optional).toBeDefined();
  } else {
    expect(response.optional).toBeUndefined();
  }
});
```

### ✅ DO: Separate Tests
```typescript
// DETERMINISTIC
it('[1.001-API-001] should include optional field', () => {
  const response = createUser({ optional: 'value' });
  expect(response.optional).toBe('value');
});

it('[1.001-API-002] should omit optional field', () => {
  const response = createUser();
  expect(response.optional).toBeUndefined();
});
```

---

## Debugging Failed Tests

### View Verbose Output
```bash
npm test -- --verbose
```

### Run Single Test
```bash
npm test -- --testNamePattern="1.031-API-001"
```

### Debug Specific File
```bash
npm test __tests__/api/health.test.ts
```

### Inspect Test State
```typescript
it('debug test', () => {
  const response = createUser();
  console.log('Response:', JSON.stringify(response, null, 2));
  expect(response).toBeDefined();
});
```

Run with: `npm test -- --verbose` to see console output

---

## CI/CD Integration (Future)

### Before Commit (Local)
```bash
npm test              # All tests must pass
npm run test:coverage # Verify coverage
```

### Pre-Push Hook (Planned)
```bash
npm test -- --onlyChanged  # Test only changed files
```

### CI Pipeline (Planned)
```yaml
test:
  script:
    - npm test
    - npm run test:coverage
  coverage: '/Lines\s+:\s+(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml
```

---

## Knowledge Base References

All tests follow these TEA (Test Architect) best practices:

- 📚 [test-quality.md](../_bmad/bmm/testarch/knowledge/test-quality.md)
  - Determinism, isolation, explicit assertions

- 📚 [data-factories.md](../_bmad/bmm/testarch/knowledge/data-factories.md)
  - Factory patterns with overrides

- 📚 [test-levels-framework.md](../_bmad/bmm/testarch/knowledge/test-levels-framework.md)
  - Choosing between unit, integration, E2E

- 📚 [test-priorities-matrix.md](../_bmad/bmm/testarch/knowledge/test-priorities-matrix.md)
  - P0/P1/P2/P3 classification

- 📚 [test-healing-patterns.md](../_bmad/bmm/testarch/knowledge/test-healing-patterns.md)
  - Fixing flaky tests

---

## Support & Questions

### FAQ

**Q: How do I create test data?**
A: Use factories in `test-utils/factories/`. See [data-factories.md](../_bmad/bmm/testarch/knowledge/data-factories.md)

**Q: How do I test error cases?**
A: Create separate tests with error inputs. Don't use conditionals in tests.

**Q: My test is flaky—what do I do?**
A: See [test-healing-patterns.md](../_bmad/bmm/testarch/knowledge/test-healing-patterns.md). Common causes:
- Hard waits (use waitForResponse instead)
- Shared state (use factories with faker)
- Race conditions (order should be independent)

**Q: How long should each test take?**
A: Aim for <5ms per test. If >100ms, check for external calls or inefficient queries.

### Getting Help

1. Check [TEST-DEVELOPMENT-GUIDE.md](../tds/TEST-DEVELOPMENT-GUIDE.md) for step-by-step help
2. Review existing tests in `__tests__/api/health.test.ts`
3. Copy template from `__tests__/api/api-test-template.ts`
4. Run `npm test -- --verbose` to debug

---

## Reporting Issues

### Found a Flaky Test?
1. Run 3x consecutively: `npm test -- --verbose`
2. Note any intermittent failures
3. Check for hard waits, shared state, race conditions
4. File issue with reproduction steps

### Found a Bug in Test Helpers?
1. Check `test-utils/factories/` and `test-utils/helpers/`
2. Create minimal reproduction
3. File issue with example

---

## Summary

✅ **Test Suite Status**: Production Ready
✅ **Current Coverage**: 8 tests (health endpoint)
✅ **Quality Score**: 92/100 (A grade)
✅ **All Tests Passing**: Yes (8/8)

📈 **Next Steps**:
1. Write tests for User endpoints (1.001, 1.002)
2. Write tests for Plan endpoints (2.005, 2.006)
3. Setup CI/CD pipeline
4. Add integration tests
5. Add E2E tests

---

**Maintained By**: Murat (Master Test Architect)
**Last Review**: 2026-01-17
**Next Review**: 2026-02-01

See [CHANGELOG.md](./_bmad-output/CHANGELOG.md) for history.
