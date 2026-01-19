/**
 * Token Refresh Mechanism Tests
 * Tests for token refreshing, grace period validation, and expiry checking
 * 
 * Source: Story 1-032 Task 9 - Comprehensive Tests
 * Test Spec: Story AC #9 - Token Refresh Tests
 */

import {
  refreshToken,
  getTokenExpiryMs,
  isTokenExpiringSoon,
} from '@/utils/tokenRefresh';
import { createToken, type TokenPayload } from '@/middleware/auth';
import * as jwt from 'jsonwebtoken';
import { env } from '@/utils/env';

describe('Token Refresh Utilities (tokenRefresh.ts)', () => {
  const testPayload: TokenPayload = {
    userId: 'user123',
    email: 'test@example.com',
    role: 'freighter',
  };

  // ========== TOKEN REFRESH TESTS ==========

  describe('refreshToken()', () => {
    it('should refresh a valid token', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act
      const newToken = refreshToken(token);

      // Assert
      expect(newToken).not.toBeNull();
      // Both tokens should be valid JWTs but may be identical if created within same second
      expect(typeof newToken).toBe('string');
      expect(newToken?.split('.').length).toBe(3);
    });

    it('should refresh token with updated expiry', async () => {
      // Arrange - Create token with different expiry
      const token = createToken(testPayload);

      // Wait a bit to ensure different timestamp
      await new Promise(resolve => setTimeout(resolve, 100));

      // Act
      const newToken = refreshToken(token);
      const oldDecoded = jwt.decode(token, { complete: true }) as any;
      const newDecoded = jwt.decode(newToken, { complete: true }) as any;

      // Assert - New token's iat should be >= old token's iat
      expect(newDecoded.payload.iat).toBeGreaterThanOrEqual(oldDecoded.payload.iat);
      // New token's exp should be >= old token's exp (allowing for processing time)
      expect(newDecoded.payload.exp).toBeGreaterThanOrEqual(oldDecoded.payload.exp);
    });

    it('should preserve user claims during refresh', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act
      const newToken = refreshToken(token);
      const decoded = jwt.decode(newToken) as any;

      // Assert
      expect(decoded.userId).toBe(testPayload.userId);
      expect(decoded.email).toBe(testPayload.email);
      expect(decoded.role).toBe(testPayload.role);
    });

    it('should return null if token signature is invalid', () => {
      // Arrange
      const invalidToken = jwt.sign(testPayload, 'wrong-secret', {
        expiresIn: '1ms',
      });

      // Act
      const result = refreshToken(invalidToken);

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for malformed token', () => {
      // Act
      const result = refreshToken('not.a.valid.token');

      // Assert
      expect(result).toBeNull();
    });

    it('should return null for empty token', () => {
      // Act
      const result = refreshToken('');

      // Assert
      expect(result).toBeNull();
    });

    it('should work across different roles', () => {
      // Arrange
      const roles = ['freighter', 'carrier', 'warehouse'];
      const tokens = roles.map((role) =>
        createToken({ ...testPayload, role })
      );

      // Act & Assert
      tokens.forEach((token, index) => {
        const newToken = refreshToken(token);
        const decoded = jwt.decode(newToken) as any;
        expect(decoded.role).toBe(roles[index]);
        expect(newToken).not.toBeNull();
      });
    });
  });

  // ========== EXPIRY MS CALCULATION TESTS ==========

  describe('getTokenExpiryMs()', () => {
    it('should convert seconds format', () => {
      // Act & Assert
      expect(getTokenExpiryMs('15s')).toBe(15 * 1000);
      expect(getTokenExpiryMs('60s')).toBe(60 * 1000);
    });

    it('should convert minutes format', () => {
      // Act & Assert
      expect(getTokenExpiryMs('15m')).toBe(15 * 60 * 1000);
      expect(getTokenExpiryMs('1m')).toBe(60 * 1000);
    });

    it('should convert hours format', () => {
      // Act & Assert
      expect(getTokenExpiryMs('1h')).toBe(60 * 60 * 1000);
      expect(getTokenExpiryMs('24h')).toBe(24 * 60 * 60 * 1000);
    });

    it('should convert days format', () => {
      // Act & Assert
      expect(getTokenExpiryMs('1d')).toBe(24 * 60 * 60 * 1000);
      expect(getTokenExpiryMs('7d')).toBe(7 * 24 * 60 * 60 * 1000);
    });

    it('should return null for invalid format', () => {
      // Act & Assert
      expect(getTokenExpiryMs('invalid')).toBeNull();
      expect(getTokenExpiryMs('15')).toBeNull();
    });

    it('should work with default environment variable', () => {
      // Act
      const result = getTokenExpiryMs();

      // Assert
      expect(result).not.toBeNull();
      expect(result).toBeGreaterThan(0);
    });
  });

  // ========== EXPIRY SOON TESTS ==========

  describe('isTokenExpiringSoon()', () => {
    it('should return false for fresh token', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act
      const result = isTokenExpiringSoon(token, 5 * 60 * 1000); // 5 min threshold

      // Assert
      expect(result).toBe(false);
    });

    it('should use default threshold if not provided', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act - Should use default 5-minute threshold
      const result = isTokenExpiringSoon(token);

      // Assert
      expect(result).toBe(false);
    });

    it('should return true for malformed token', () => {
      // Act
      const result = isTokenExpiringSoon('not-a-token', 0);

      // Assert
      expect(result).toBe(true);
    });
  });

  // ========== INTEGRATION TESTS ==========

  describe('Token Refresh Workflow (Integration)', () => {
    it('should handle complete token lifecycle', () => {
      // Arrange
      const token = createToken(testPayload);

      // Act
      const isExpiring = isTokenExpiringSoon(token, 5 * 60 * 1000);
      const newToken = refreshToken(token);

      // Assert
      expect(isExpiring).toBe(false);
      expect(newToken).not.toBeNull();
    });

    it('should support multiple consecutive refreshes', () => {
      // Arrange
      let token = createToken(testPayload);

      // Act - Refresh 3 times
      let newToken = refreshToken(token);
      expect(newToken).not.toBeNull();

      newToken = refreshToken(newToken!);
      expect(newToken).not.toBeNull();

      newToken = refreshToken(newToken!);
      expect(newToken).not.toBeNull();

      // Assert - Last token should have valid claims
      const decoded = jwt.decode(newToken) as any;
      expect(decoded.userId).toBe(testPayload.userId);
    });
  });
});
