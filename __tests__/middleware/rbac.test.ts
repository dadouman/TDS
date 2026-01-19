/**
 * Role-Based Access Control (RBAC) Middleware Tests
 * Tests for role verification and authorization checks
 * 
 * Source: Story 1-032 Task 9 - Comprehensive Tests
 * Test Spec: Story AC #9 - RBAC Tests
 */

import {
  requireRole,
  isAuthorizedRole,
  checkAuthorization,
} from '@/middleware/rbac';
import { createToken, type TokenPayload } from '@/middleware/auth';

describe('RBAC Middleware (rbac.ts)', () => {
  const freighterUser: TokenPayload = {
    userId: 'freight1',
    email: 'freighter@example.com',
    role: 'freighter',
  };

  const carrierUser: TokenPayload = {
    userId: 'carrier1',
    email: 'carrier@example.com',
    role: 'carrier',
  };

  const adminUser: TokenPayload = {
    userId: 'admin1',
    email: 'admin@example.com',
    role: 'admin',
  };

  // ========== REQUIRE ROLE TESTS ==========

  describe('requireRole() Middleware', () => {
    it('should allow user with correct role', () => {
      // Arrange
      const token = createToken(freighterUser);
      const req = { cookies: { token }, headers: {} } as any;
      const res = { status: function() { return this; }, json: function() { return this; }, statusCode: 200 } as any;

      // Act
      const middleware = requireRole('freighter');
      const result = middleware(req, res);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(freighterUser.userId);
      expect(result?.role).toBe('freighter');
    });

    it('should reject user with wrong role (403 Forbidden)', () => {
      // Arrange
      const token = createToken(freighterUser);
      const req = { cookies: { token }, headers: {} } as any;
      const res = { status: function(code: number) { this.statusCode = code; return this; }, json: function(data: any) { this.data = data; return this; } } as any;

      // Act
      const middleware = requireRole('admin');
      const result = middleware(req, res);

      // Assert
      expect(result).toBeNull();
      expect(res.statusCode).toBe(403);
    });

    it('should reject request with no token (401 Unauthorized)', () => {
      // Arrange
      const req = { cookies: {}, headers: {} } as any;
      const res = { status: function(code: number) { this.statusCode = code; return this; }, json: function(data: any) { this.data = data; return this; } } as any;

      // Act
      const middleware = requireRole('freighter');
      const result = middleware(req, res);

      // Assert
      expect(result).toBeNull();
      expect(res.statusCode).toBe(401);
    });

    it('should reject invalid token (401 Unauthorized)', () => {
      // Arrange
      const req = { cookies: {}, headers: { authorization: 'Bearer invalid-token' } } as any;
      const res = { status: function(code: number) { this.statusCode = code; return this; }, json: function(data: any) { this.data = data; return this; } } as any;

      // Act
      const middleware = requireRole('freighter');
      const result = middleware(req, res);

      // Assert
      expect(result).toBeNull();
      expect(res.statusCode).toBe(401);
    });

    it('should allow user with any of multiple allowed roles', () => {
      // Arrange
      const token = createToken(carrierUser);
      const req = { cookies: { token }, headers: {} } as any;
      const res = { status: function() { return this; }, json: function() { return this; } } as any;

      // Act
      const middleware = requireRole('admin', 'carrier', 'warehouse');
      const result = middleware(req, res);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.role).toBe('carrier');
    });

    it('should reject user not in multiple allowed roles', () => {
      // Arrange
      const token = createToken(freighterUser);
      const req = { cookies: { token }, headers: {} } as any;
      const res = { status: function(code: number) { this.statusCode = code; return this; }, json: function(data: any) { this.data = data; return this; } } as any;

      // Act
      const middleware = requireRole('admin', 'carrier', 'warehouse');
      const result = middleware(req, res);

      // Assert
      expect(result).toBeNull();
      expect(res.statusCode).toBe(403);
    });

    it('should extract token from cookie if no Bearer header', () => {
      // Arrange
      const token = createToken(freighterUser);
      const req = { cookies: { token }, headers: {} } as any;
      const res = { status: function() { return this; }, json: function() { return this; } } as any;

      // Act
      const middleware = requireRole('freighter');
      const result = middleware(req, res);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(freighterUser.userId);
    });
  });

  // ========== HELPER FUNCTION TESTS ==========

  describe('isAuthorizedRole()', () => {
    it('should return true if role is in allowed list', () => {
      // Act & Assert
      expect(isAuthorizedRole('freighter', ['freighter', 'admin'])).toBe(true);
      expect(isAuthorizedRole('admin', ['freighter', 'admin'])).toBe(true);
    });

    it('should return false if role is not in allowed list', () => {
      // Act & Assert
      expect(isAuthorizedRole('carrier', ['freighter', 'admin'])).toBe(false);
    });

    it('should return false if allowed list is empty', () => {
      // Act & Assert
      expect(isAuthorizedRole('freighter', [])).toBe(false);
    });

    it('should be case-sensitive', () => {
      // Act & Assert
      expect(isAuthorizedRole('Freighter', ['freighter'])).toBe(false);
      expect(isAuthorizedRole('freighter', ['Freighter'])).toBe(false);
    });
  });

  describe('checkAuthorization()', () => {
    it('should return payload if authorized', () => {
      // Arrange
      const token = createToken(freighterUser);
      const req = { cookies: { token }, headers: {} } as any;

      // Act
      const result = checkAuthorization(req, 'freighter');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(freighterUser.userId);
    });

    it('should return null if role not authorized', () => {
      // Arrange
      const token = createToken(freighterUser);
      const req = { cookies: { token }, headers: {} } as any;

      // Act
      const result = checkAuthorization(req, 'admin');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if no token', () => {
      // Arrange
      const req = { cookies: {}, headers: {} } as any;

      // Act
      const result = checkAuthorization(req, 'freighter');

      // Assert
      expect(result).toBeNull();
    });

    it('should accept multiple allowed roles', () => {
      // Arrange
      const token = createToken(carrierUser);
      const req = { cookies: { token }, headers: {} } as any;

      // Act
      const result = checkAuthorization(req, 'admin', 'carrier', 'warehouse');

      // Assert
      expect(result).not.toBeNull();
      expect(result?.role).toBe('carrier');
    });
  });

  // ========== INTEGRATION TESTS ==========

  describe('RBAC Integration', () => {
    it('should enforce role-based access across different users', () => {
      // Arrange
      const freighterToken = createToken(freighterUser);
      const adminToken = createToken(adminUser);

      const freightReq = { cookies: { token: freighterToken }, headers: {} } as any;
      const adminReq = { cookies: { token: adminToken }, headers: {} } as any;

      const freightRes = { status: function(code: number) { this.statusCode = code; return this; }, json: function(data: any) { this.data = data; return this; } } as any;
      const adminRes = { status: function(code: number) { this.statusCode = code; return this; }, json: function(data: any) { this.data = data; return this; } } as any;

      // Act
      const adminOnlyMiddleware = requireRole('admin');
      const freightResult = adminOnlyMiddleware(freightReq, freightRes);
      const adminResult = adminOnlyMiddleware(adminReq, adminRes);

      // Assert
      expect(freightResult).toBeNull();
      expect(freightRes.statusCode).toBe(403);

      expect(adminResult).not.toBeNull();
    });

    it('should support all standard roles', () => {
      // Arrange
      const roles = ['freighter', 'carrier', 'warehouse', 'store', 'admin'];
      const tokens = roles.map((role) =>
        createToken({
          userId: `user-${role}`,
          email: `${role}@example.com`,
          role: role,
        })
      );

      // Act & Assert
      tokens.forEach((token, index) => {
        const req = { cookies: { token }, headers: {} } as any;
        const res = { status: function() { return this; }, json: function() { return this; } } as any;

        const middleware = requireRole(roles[index]);
        const result = middleware(req, res);

        expect(result).not.toBeNull();
        expect(result?.role).toBe(roles[index]);
      });
    });
  });
});
