/**
 * Unit & Integration Tests for User Registration API Handler
 * Tests registration endpoint validation, error handling, and JWT token creation
 * 
 * Source: Story 1-001 Task 6 Subtask 6.1
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/auth/register';
import { prisma } from '@/utils/prisma';
import * as authUtils from '@/middleware/auth';

// Mock Prisma client
jest.mock('@/utils/prisma', () => ({
  prisma: {
    user: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
  },
}));

// Mock auth utilities
jest.mock('@/middleware/auth', () => ({
  createToken: jest.fn(),
}));

// Mock password hashing
jest.mock('@/utils/password', () => ({
  hashPassword: jest.fn(async (pwd) => `hashed_${pwd}`),
}));

// Mock cookies utility
jest.mock('@/utils/cookies', () => ({
  setSecureCookie: jest.fn(),
}));

describe('/api/auth/register', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup default mock for createToken
    (authUtils.createToken as jest.Mock).mockReturnValue('mock_jwt_token_12345');
  });

  describe('✅ Valid Registration - Success Cases', () => {
    it('should register user with valid data and return 201', async () => {
      // Mock successful database operations
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null); // No existing user
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user_123',
        email: 'john@example.com',
        password_hash: 'hashed_pass',
        firstName: 'John',
        lastName: 'Doe',
        role: 'FREIGHTER',
        isEmailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        is_deleted: false,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
      const data = JSON.parse(res._getData());
      expect(data.success).toBe(true);
      expect(data.userId).toBe('user_123');
      expect(data.email).toBe('john@example.com');
      expect(data.token).toBe('mock_jwt_token_12345');
      expect(data.expiresIn).toBe('7d');
    });

    it('should normalize email to lowercase', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user_456',
        email: 'JOHN@EXAMPLE.COM'.toLowerCase(),
        role: 'CARRIER',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'JOHN@EXAMPLE.COM',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'carrier',
        },
      });

      await handler(req, res);

      // Verify create was called with lowercase email
      const createCall = (prisma.user.create as jest.Mock).mock.calls[0];
      expect(createCall[0].data.email).toBe('john@example.com');
    });

    it('should accept all four valid roles', async () => {
      const roles = ['freighter', 'carrier', 'warehouse', 'store'];

      for (const role of roles) {
        jest.clearAllMocks();
        (authUtils.createToken as jest.Mock).mockReturnValue('token_' + role);
        (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
        (prisma.user.create as jest.Mock).mockResolvedValue({
          id: 'user_' + role,
          email: 'test@example.com',
          role: role.toUpperCase(),
        });

        const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
          method: 'POST',
          body: {
            email: 'test@example.com',
            password: 'SecurePass123!',
            firstName: 'Test',
            lastName: 'User',
            role,
          },
        });

        await handler(req, res);

        expect(res._getStatusCode()).toBe(201);
      }
    });
  });

  describe('❌ Validation Errors - Missing Fields (400)', () => {
    it('should reject request without email', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBeDefined();
      expect(data.details).toContain('email is required');
    });

    it('should reject request without password', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.details).toContain('password is required');
    });

    it('should reject request without firstName', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.details).toContain('firstName is required');
    });

    it('should reject request without lastName', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.details).toContain('lastName is required');
    });

    it('should reject request without role', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.details).toContain('role is required');
    });

    it('should reject request with multiple missing fields', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          // Missing firstName, lastName, role
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.details).toContain('firstName is required');
      expect(data.details).toContain('lastName is required');
      expect(data.details).toContain('role is required');
    });
  });

  describe('❌ Email Validation Errors (400)', () => {
    it('should reject invalid email format', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'invalid.email',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Validation failed');
      expect(data.details).toContain('email must be valid format');
    });

    it('should reject email without @', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'nomatdomain.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.details).toContain('email must be valid format');
    });
  });

  describe('❌ Password Validation Errors (400)', () => {
    it('should reject weak password (too short)', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'Short',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
      expect(data.details.length).toBeGreaterThan(0);
    });

    it('should reject password without uppercase', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'nouppercasep@ss123',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.details).toContain('Password must contain uppercase letter');
    });
  });

  describe('❌ Role Validation Errors (400)', () => {
    it('should reject invalid role', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'superuser',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(400);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Validation failed');
      expect(data.details).toBeDefined();
    });

    it('should accept role in any case', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user_123',
        email: 'john@example.com',
        role: 'FREIGHTER',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'FREIGHTER', // Uppercase
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(201);
    });
  });

  describe('❌ Conflict Errors - Duplicate Email (409)', () => {
    it('should reject duplicate email (case-insensitive)', async () => {
      // Mock: email already exists
      (prisma.user.findFirst as jest.Mock).mockResolvedValue({
        id: 'existing_user',
        email: 'john@example.com',
        is_deleted: false,
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'JOHN@EXAMPLE.COM', // Different case
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(409);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Email already registered');
    });

    it('should only check non-deleted users', async () => {
      // Mock: email exists but is deleted (soft delete)
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user_123',
        email: 'john@example.com',
        role: 'FREIGHTER',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      // Should succeed because deleted user is ignored
      expect(res._getStatusCode()).toBe(201);
      // Verify findFirst was called with is_deleted: false filter
      const findCall = (prisma.user.findFirst as jest.Mock).mock.calls[0];
      expect(findCall[0].where.is_deleted).toBe(false);
    });
  });

  describe('❌ Server Errors (500)', () => {
    it('should return 500 on unexpected database error', async () => {
      (prisma.user.findFirst as jest.Mock).mockRejectedValue(new Error('Database connection lost'));

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      expect(res._getStatusCode()).toBe(500);
      const data = JSON.parse(res._getData());
      expect(data.error).toBe('Internal server error');
    });
  });

  describe('❌ Method Not Allowed (405)', () => {
    it('should reject GET requests', async () => {
      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'GET',
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

  describe('✅ JWT Token & Security', () => {
    it('should create JWT token with correct payload', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user_123',
        email: 'john@example.com',
        password_hash: 'hashed_password',
        firstName: 'John',
        lastName: 'Doe',
        role: 'FREIGHTER',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      // Verify createToken was called with correct payload
      expect(authUtils.createToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user_123',
          email: 'john@example.com',
          role: 'freighter', // lowercase in token
        })
      );
    });

    it('should never return password hash in response', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user_123',
        email: 'john@example.com',
        password_hash: 'hashed_password_should_not_be_returned',
        firstName: 'John',
        lastName: 'Doe',
        role: 'FREIGHTER',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      const data = JSON.parse(res._getData());
      expect(data.password_hash).toBeUndefined();
      expect(data.passwordHash).toBeUndefined();
      expect(JSON.stringify(data)).not.toContain('hashed_password');
    });

    it('should set secure cookie with token', async () => {
      const setSecureCookieMock = require('@/utils/cookies').setSecureCookie;

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user_123',
        email: 'john@example.com',
        role: 'FREIGHTER',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: 'John',
          lastName: 'Doe',
          role: 'freighter',
        },
      });

      await handler(req, res);

      // Verify setSecureCookie was called
      expect(setSecureCookieMock).toHaveBeenCalled();
      const callArgs = setSecureCookieMock.mock.calls[0];
      expect(callArgs[1]).toBe('mock_jwt_token_12345'); // token
      expect(callArgs[2]).toBe(7 * 24 * 60 * 60 * 1000); // 7 days in ms
    });
  });

  describe('✅ Data Trimming', () => {
    it('should trim firstName and lastName whitespace', async () => {
      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: 'user_123',
        email: 'john@example.com',
        firstName: 'John',
        lastName: 'Doe',
        role: 'FREIGHTER',
      });

      const { req, res } = createMocks<NextApiRequest, NextApiResponse>({
        method: 'POST',
        body: {
          email: 'john@example.com',
          password: 'SecurePass123!',
          firstName: '  John  ',
          lastName: '  Doe  ',
          role: 'freighter',
        },
      });

      await handler(req, res);

      const createCall = (prisma.user.create as jest.Mock).mock.calls[0];
      expect(createCall[0].data.firstName).toBe('John');
      expect(createCall[0].data.lastName).toBe('Doe');
    });
  });
});
