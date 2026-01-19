/**
 * Health Check API Tests
 * 
 * Test suite for the health endpoint at GET /api/health
 * 
 * These tests validate:
 * - HTTP status codes (200 success, 405 method not allowed)
 * - Response structure and data types
 * - ISO 8601 timestamp format compliance
 * - Error handling for unsupported HTTP methods
 * 
 * Story: [1.031] Infrastructure Setup
 * Epic: Infrastructure and API Foundation
 * 
 * @see test-quality.md - Test quality definition of done
 * @see test-levels-framework.md - API test level selection
 * @see data-factories.md - Factory pattern for test data
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import handler from '../../pages/api/health';
import { createHealthResponse, isValidISO8601 } from '../../test-utils/factories/health-response-factory';

// Mock response for testing
const createMockResponse = () => {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as NextApiResponse;
  return res;
};

describe('[1.031] Infrastructure - API Health Check', () => {
  /**
   * P0 CRITICAL - Health endpoint is infrastructure dependency
   * All microservices rely on this endpoint for liveness checks
   * Failure blocks all dependent services from starting
   */
  describe('GET /api/health - Success Path', () => {
    it('[1.031-API-001] should return 200 ok status with ISO timestamp', async () => {
      // GIVEN: Health endpoint is deployed and accessible
      // WHEN: Client sends GET request to /api/health
      const req = {
        method: 'GET',
      } as NextApiRequest;
      const res = createMockResponse();

      // THEN: Should return 200 with { status: 'ok', timestamp: ISO-8601 }
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalled();

      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody).toHaveProperty('status', 'ok');
      expect(responseBody).toHaveProperty('timestamp');
      expect(typeof responseBody.timestamp).toBe('string');
      expect(isValidISO8601(responseBody.timestamp)).toBe(true);
    });

    it('[1.031-API-002] should return valid ISO 8601 formatted timestamp', async () => {
      // GIVEN: Health endpoint returns a response
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Endpoint processes the GET request
      await handler(req, res);

      // THEN: Timestamp should be in ISO 8601 format (YYYY-MM-DDTHH:mm:ss.sssZ)
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      const timestamp = responseBody.timestamp;

      // Validate format strictly
      expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);

      // Ensure it's a parseable date
      const parsedDate = new Date(timestamp);
      expect(parsedDate instanceof Date).toBe(true);
      expect(parsedDate.toString()).not.toBe('Invalid Date');
    });

    it('[1.031-API-003] should have string status property', async () => {
      // GIVEN: Endpoint is called with GET method
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Handler processes the request
      await handler(req, res);

      // THEN: Response status should be exactly 'ok' (string type)
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];

      expect(typeof responseBody.status).toBe('string');
      expect(responseBody.status).toBe('ok');
      // Ensure it's not falsy or accidental type coercion
      expect(responseBody.status.length).toBeGreaterThan(0);
    });
  });

  /**
   * P1 HIGH - Error handling for unsupported methods
   * Validates that unsupported HTTP methods are rejected properly
   */
  describe('GET /api/health - Error Handling', () => {
    it('[1.031-API-004] should return 405 for POST requests', async () => {
      // GIVEN: Health endpoint only accepts GET
      // WHEN: Client sends POST request to /api/health
      const req = {
        method: 'POST',
      } as NextApiRequest;
      const res = createMockResponse();

      // THEN: Should return 405 Method Not Allowed
      await handler(req, res);

      expect(res.status).toHaveBeenCalledWith(405);
      expect(res.json).toHaveBeenCalled();

      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      expect(responseBody.status).toBe('error');
    });

    it('[1.031-API-005] should return 405 for PUT requests', async () => {
      // GIVEN: Health endpoint is read-only
      const req = { method: 'PUT' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Client sends PUT request
      await handler(req, res);

      // THEN: Should reject with 405
      expect(res.status).toHaveBeenCalledWith(405);
    });

    it('[1.031-API-006] should return 405 for DELETE requests', async () => {
      // GIVEN: Health endpoint is read-only
      const req = { method: 'DELETE' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Client sends DELETE request
      await handler(req, res);

      // THEN: Should reject with 405
      expect(res.status).toHaveBeenCalledWith(405);
    });
  });

  /**
   * P2 MEDIUM - Response shape validation
   * Ensures response structure is consistent across all calls
   */
  describe('Response Shape Validation', () => {
    it('[1.031-API-007] should have exactly 2 properties in response', async () => {
      // GIVEN: Health endpoint is healthy
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Endpoint returns response
      await handler(req, res);

      // THEN: Response should have exactly status and timestamp (no extra fields)
      const responseBody = (res.json as jest.Mock).mock.calls[0][0];
      const properties = Object.keys(responseBody);

      expect(properties.length).toBe(2);
      expect(properties).toContain('status');
      expect(properties).toContain('timestamp');
    });

    it('[1.031-API-008] should match health response factory contract', async () => {
      // GIVEN: Expected response shape from factory
      const expectedResponse = createHealthResponse();
      const req = { method: 'GET' } as NextApiRequest;
      const res = createMockResponse();

      // WHEN: Endpoint is called
      await handler(req, res);

      // THEN: Response should match factory structure
      const actualResponse = (res.json as jest.Mock).mock.calls[0][0];

      expect(actualResponse).toEqual(expect.objectContaining({
        status: expect.any(String),
        timestamp: expect.any(String),
      }));

      // Verify timestamp is parseable (same as factory)
      expect(isValidISO8601(actualResponse.timestamp)).toBe(true);
    });
  });
});
