/**
 * Unit Tests for User Profile API Handler
 * Tests that JWT tokens work correctly and authentication is enforced
 * 
 * Source: Story 1-001 Task 5 - Integration Tests for withAuth
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/user/profile';
import * as authUtils from '@/middleware/auth';

// Mock auth utilities
jest.mock('@/middleware/auth', () => ({
  extractToken: jest.fn(),
  verifyToken: jest.fn(),
}));

describe('/api/user/profile', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('✅ Valid Token - Authentication Success', () => {
    it('should return user profile with valid token', async () => {
      // Mock successful token verification
      (authUtils.extractToken as jest.Mock).mockReturnValue('valid_token');
      (authUtils.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user_123',
        email: 'john@example.com',
        role: 'freighter',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.userId).toBe('user_123');
      expect(data.email).toBe('john@example.com');
      expect(data.role).toBe('freighter');
    });

    it('should work with token from cookie', async () => {
      (authUtils.extractToken as jest.Mock).mockReturnValue('token_from_cookie');
      (authUtils.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user_456',
        email: 'jane@example.com',
        role: 'carrier',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        cookies: { token: 'token_from_cookie' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.userId).toBe('user_456');
    });

    it('should work with token from Authorization header', async () => {
      (authUtils.extractToken as jest.Mock).mockReturnValue('bearer_token_value');
      (authUtils.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user_789',
        email: 'test@example.com',
        role: 'warehouse',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
        headers: { authorization: 'Bearer bearer_token_value' },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data.userId).toBe('user_789');
    });

    it('should return all roles correctly', async () => {
      const roles = ['freighter', 'carrier', 'warehouse', 'store'];

      for (const role of roles) {
        jest.clearAllMocks();
        (authUtils.extractToken as jest.Mock).mockReturnValue('valid_token');
        (authUtils.verifyToken as jest.Mock).mockReturnValue({
          userId: `user_${role}`,
          email: `${role}@example.com`,
          role,
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'GET',
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(200);
        const data = JSON.parse(res._getData());
        expect(data.role).toBe(role);
      }
    });
  });

  describe('❌ Invalid/Missing Token - Authentication Failure', () => {
    it('should reject request without token', async () => {
      (authUtils.extractToken as jest.Mock).mockReturnValue(undefined);
      (authUtils.verifyToken as jest.Mock).mockReturnValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized - Invalid or missing token');
    });

    it('should reject expired token', async () => {
      (authUtils.extractToken as jest.Mock).mockReturnValue('expired_token');
      (authUtils.verifyToken as jest.Mock).mockReturnValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized - Invalid or missing token');
    });

    it('should reject invalid token signature', async () => {
      (authUtils.extractToken as jest.Mock).mockReturnValue('invalid_signature_token');
      (authUtils.verifyToken as jest.Mock).mockReturnValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized - Invalid or missing token');
    });

    it('should reject malformed token', async () => {
      (authUtils.extractToken as jest.Mock).mockReturnValue('not.a.valid.jwt');
      (authUtils.verifyToken as jest.Mock).mockReturnValue(null);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(401);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Unauthorized - Invalid or missing token');
    });
  });

  describe('❌ Method Not Allowed (405)', () => {
    it('should reject POST requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Method not allowed');
    });

    it('should reject PUT requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'PUT',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });

    it('should reject DELETE requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'DELETE',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(405);
    });
  });

  describe('✅ Integration: Registration Token Verification', () => {
    it('should verify token created during registration works here', async () => {
      // Simulate the exact token payload created during registration
      const registrationTokenPayload = {
        userId: 'user_newly_registered',
        email: 'new@example.com',
        role: 'freighter',
      };

      (authUtils.extractToken as jest.Mock).mockReturnValue('registration_token');
      (authUtils.verifyToken as jest.Mock).mockReturnValue(registrationTokenPayload);

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(200);
      const data = JSON.parse(res._getData());
      expect(data).toEqual(registrationTokenPayload);
    });
  });

  describe('✅ Security: No Sensitive Data Leaks', () => {
    it('should not return plaintext secrets', async () => {
      (authUtils.extractToken as jest.Mock).mockReturnValue('valid_token');
      (authUtils.verifyToken as jest.Mock).mockReturnValue({
        userId: 'user_123',
        email: 'john@example.com',
        role: 'freighter',
        // Note: real JWT might have iat, exp claims - those are ok to return
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      // Should not return the token itself
      expect(data.token).toBeUndefined();
      // Should not return password or hash
      expect(data.password).toBeUndefined();
      expect(data.password_hash).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain('secret');
    });
  });
});
