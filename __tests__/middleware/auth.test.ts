/**
 * Authentication Middleware Tests
 * Comprehensive testing of JWT verification, token creation, and extraction
 * 
 * Source: Story 1-032 Task 9 - Comprehensive Tests
 * Test Spec: Story AC #9 - Authentication & JWT Tests
 */

import { verifyToken, createToken, extractToken, getTokenPayload, type TokenPayload } from '@/middleware/auth';
import * as jwt from 'jsonwebtoken';
import { env } from '@/utils/env';

describe('Authentication Middleware (auth.ts)', () => {
  const testPayload: TokenPayload = {
    userId: 'user123',
    email: 'test@example.com',
    role: 'freighter',
  };

  // ========== TOKEN VERIFICATION TESTS ==========

  describe('verifyToken()', () => {
    it('should verify a valid JWT token and return decoded payload', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act
      const result = verifyToken(token);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(testPayload.userId);
      expect(result?.email).toBe(testPayload.email);
      expect(result?.role).toBe(testPayload.role);
    });

    it('should return null if token is undefined', () => {
      // Act
      const result = verifyToken(undefined);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if token is an empty string', () => {
      // Act
      const result = verifyToken('');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if token has invalid signature', () => {
      // Arrange
      const invalidToken = jwt.sign(testPayload, 'wrong-secret', {
        expiresIn: env.JWT_EXPIRY,
      });

      // Act
      const result = verifyToken(invalidToken);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if token is malformed', () => {
      // Act
      const result = verifyToken('not.a.valid.token');

      // Assert
      expect(result).toBeNull();
    });

    it('should decode token and include iat and exp claims', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act
      const result = verifyToken(token);

      // Assert
      expect(result?.iat).toBeDefined();
      expect(result?.exp).toBeDefined();
      expect(typeof result?.iat).toBe('number');
      expect(typeof result?.exp).toBe('number');
    });
  });

  // ========== TOKEN CREATION TESTS ==========

  describe('createToken()', () => {
    it('should create a valid JWT token', () => {
      // Act
      const token = createToken(testPayload);

      // Assert
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3); // JWT has 3 parts
    });

    it('should create token that can be verified', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act
      const decoded = verifyToken(token);

      // Assert
      expect(decoded).not.toBeNull();
      expect(decoded?.userId).toBe(testPayload.userId);
    });

    it('should include payload fields in token', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act
      const decoded = jwt.decode(token) as any;

      // Assert
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should include expiration in token', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act
      const decoded = jwt.decode(token, { complete: true }) as any;

      // Assert
      expect(decoded.payload.exp).toBeDefined();
      expect(decoded.payload.iat).toBeDefined();
    });

    it('should use JWT_SECRET from environment', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act & Assert
      expect(() => {
        jwt.verify(token, env.JWT_SECRET);
      }).not.toThrow();
    });
  });

  // ========== TOKEN EXTRACTION TESTS ==========

  describe('extractToken()', () => {
    it('should extract token from cookie', () => {
      // Arrange - Create a mock request object with cookies
      const req = {
        cookies: { token: 'test-token-value' },
        headers: {},
      } as any;

      // Act
      const result = extractToken(req);

      // Assert
      expect(result).toBe('test-token-value');
    });

    it('should extract token from Authorization Bearer header', () => {
      // Arrange
      const req = {
        cookies: {},
        headers: { authorization: 'Bearer test-token-from-header' },
      } as any;

      // Act
      const result = extractToken(req);

      // Assert
      expect(result).toBe('test-token-from-header');
    });

    it('should prefer cookie over Bearer header', () => {
      // Arrange
      const req = {
        cookies: { token: 'from-cookie' },
        headers: { authorization: 'Bearer from-header' },
      } as any;

      // Act
      const result = extractToken(req);

      // Assert
      expect(result).toBe('from-cookie');
    });

    it('should return undefined if no token in cookie or header', () => {
      // Arrange
      const req = {
        cookies: {},
        headers: {},
      } as any;

      // Act
      const result = extractToken(req);

      // Assert
      expect(result).toBeUndefined();
    });

    it('should return undefined if Authorization header is not Bearer', () => {
      // Arrange
      const req = {
        cookies: {},
        headers: { authorization: 'Basic credentials' },
      } as any;

      // Act
      const result = extractToken(req);

      // Assert
      expect(result).toBeUndefined();
    });
  });

  // ========== CONVENIENCE FUNCTION TESTS ==========

  describe('getTokenPayload()', () => {
    it('should extract and verify token in one call', () => {
      // Arrange
      const token = createToken(testPayload);
      const req = {
        cookies: {},
        headers: { authorization: `Bearer ${token}` },
      } as any;

      // Act
      const result = getTokenPayload(req);

      // Assert
      expect(result).not.toBeNull();
      expect(result?.userId).toBe(testPayload.userId);
    });

    it('should return null if token is invalid', () => {
      // Arrange
      const req = {
        cookies: {},
        headers: { authorization: 'Bearer invalid-token' },
      } as any;

      // Act
      const result = getTokenPayload(req);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null if no token present', () => {
      // Arrange
      const req = {
        cookies: {},
        headers: {},
      } as any;

      // Act
      const result = getTokenPayload(req);

      // Assert
      expect(result).toBeNull();
    });
  });

  // ========== INTEGRATION TESTS ==========

  describe('Token Lifecycle (Integration)', () => {
    it('should create, extract, and verify token from cookie', () => {
      // Arrange
      const token = createToken(testPayload);
      const req = {
        cookies: { token },
        headers: {},
      } as any;

      // Act
      const extracted = extractToken(req);
      const verified = verifyToken(extracted);

      // Assert
      expect(extracted).toBe(token);
      expect(verified?.userId).toBe(testPayload.userId);
    });

    it('should create, extract, and verify token from Bearer header', () => {
      // Arrange
      const token = createToken(testPayload);
      const req = {
        cookies: {},
        headers: { authorization: `Bearer ${token}` },
      } as any;

      // Act
      const extracted = extractToken(req);
      const verified = verifyToken(extracted);

      // Assert
      expect(extracted).toBe(token);
      expect(verified?.userId).toBe(testPayload.userId);
    });

    it('should handle different user roles', () => {
      // Arrange & Act
      const freighterToken = createToken({ ...testPayload, role: 'freighter' });
      const carrierToken = createToken({ ...testPayload, role: 'carrier' });
      const warehouseToken = createToken({ ...testPayload, role: 'warehouse' });

      // Assert
      expect(verifyToken(freighterToken)?.role).toBe('freighter');
      expect(verifyToken(carrierToken)?.role).toBe('carrier');
      expect(verifyToken(warehouseToken)?.role).toBe('warehouse');
    });
  });
});
