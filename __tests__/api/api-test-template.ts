/**
 * API Test Template - Use this for all new API endpoints
 * 
 * Copy this template when creating tests for new endpoints.
 * Adapt it to your specific endpoint while following these patterns.
 * 
 * @see test-quality.md - Test quality definition
 * @see data-factories.md - Factory pattern
 * @see test-levels-framework.md - API test level selection
 */

import type { NextApiRequest, NextApiResponse } from 'next';

/**
 * STEP 1: Create your factory in test-utils/factories/
 * 
 * Example: test-utils/factories/user-factory.ts
 * 
 * export type User = { id: string; email: string; role: string; };
 * export const createUser = (overrides: Partial<User> = {}): User => ({
 *   id: 'uuid-123',
 *   email: faker.internet.email(),
 *   role: 'user',
 *   ...overrides,
 * });
 */

// STEP 2: Import your factory and handler
import { createHealthResponse, isValidISO8601 } from '../../test-utils/factories/health-response-factory';
import handler from '../../pages/api/health';

// STEP 3: Create mock response helper
const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;
  return res;
};

// STEP 4: Structure tests with descriptive describe blocks
describe('[EPIC.STORY] Feature - Endpoint Name', () => {
  /**
   * Document priority for this endpoint
   * P0 = Critical path (revenue, security, infrastructure)
   * P1 = High importance (user-facing features)
   * P2 = Medium importance (nice-to-have features)
   * P3 = Low importance (edge cases, optimizations)
   */
  describe('GET /api/endpoint - Success Path', () => {
    /**
     * STEP 5: For each test, use this structure:
     * 1. Test ID in brackets: [EPIC.STORY-LEVEL-SEQ]
     * 2. Descriptive name after test ID
     * 3. GIVEN-WHEN-THEN comments explaining test intent
     * 4. Arrange-Act-Assert pattern in code
     */
    it('[1.000-API-001] should return 200 with expected structure', async () => {
      // GIVEN: [Setup preconditions]
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: [Action being tested]
      await handler(req, res);

      // THEN: [Expected outcome]
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody).toEqual(expect.objectContaining({
        status: expect.any(String),
        timestamp: expect.any(String),
      }));
    });

    it('[1.000-API-002] should validate response types', async () => {
      // GIVEN: Handler is ready
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Called
      await handler(req, res);

      // THEN: All types should be correct
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(typeof responseBody.status).toBe('string');
      expect(typeof responseBody.timestamp).toBe('string');
    });

    it('[1.000-API-003] should match factory contract', async () => {
      // GIVEN: Factory defines expected structure
      const expected = createHealthResponse();
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Endpoint returns
      await handler(req, res);

      // THEN: Matches factory shape
      const actual = (res.json as jest.Mock).mock.calls[0][0];
      expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
    });
  });

  describe('GET /api/endpoint - Error Handling', () => {
    it('[1.000-API-004] should reject unsupported methods', async () => {
      // GIVEN: Endpoint is GET only
      const req = { method: 'POST' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: POST is sent
      await handler(req, res);

      // THEN: Should return 405
      expect(res.status).toHaveBeenCalledWith(405);
    });

    it('[1.000-API-005] should handle invalid input gracefully', async () => {
      // GIVEN: Invalid request parameters
      const req = { method: 'GET', query: { invalid: 'param' } } as any as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Handler processes request
      await handler(req, res);

      // THEN: Should either ignore or validate gracefully
      expect(res.status).toHaveBeenCalledWith(expect.any(Number));
    });
  });

  describe('Response Shape Validation', () => {
    it('[1.000-API-006] should have all required properties', async () => {
      // GIVEN: Expected properties defined
      const requiredProperties = ['status', 'timestamp'];
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Endpoint responds
      await handler(req, res);

      // THEN: All required properties present
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      for (const prop of requiredProperties) {
        expect(responseBody).toHaveProperty(prop);
      }
    });

    it('[1.000-API-007] should not have extra properties', async () => {
      // GIVEN: Response shape is strict
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Handler returns
      await handler(req, res);

      // THEN: Only expected properties, no extras
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      const properties = Object.keys(responseBody);
      expect(properties.length).toBeLessThanOrEqual(3); // Adjust for your endpoint
    });
  });
});

/**
 * TESTING CHECKLIST - Before committing tests
 * 
 * ✅ Test IDs: All tests have [EPIC.STORY-LEVEL-SEQ] format
 * ✅ BDD Comments: All tests have GIVEN-WHEN-THEN structure
 * ✅ Priority: Suite documented with P0/P1/P2/P3
 * ✅ Factory: Response shape defined in test-utils/factories/
 * ✅ Error Cases: At least 1 error path tested
 * ✅ Response Shape: Properties validated
 * ✅ Types: All types validated (string, number, etc.)
 * ✅ Pass/Fail: All tests green before commit
 * ✅ No Hard Waits: No sleep(), waitForTimeout(), delays
 * ✅ No Conditionals: No if/else in test bodies
 * 
 * Run: npm test [file.test.ts]
 * Coverage: npm run test:coverage
 */
