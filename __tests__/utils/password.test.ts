/**
 * Password Hashing Utilities Tests
 * Tests for secure password hashing and comparison
 * 
 * Source: Story 1-032 Task 9 - Comprehensive Tests
 * Test Spec: Story AC #9 - Password Hashing Tests
 */

import {
  hashPassword,
  comparePassword,
  validatePasswordStrength,
} from '@/utils/password';

describe('Password Utilities (password.ts)', () => {
  const validPassword = 'SecurePass123!@#';
  const wrongPassword = 'WrongPassword123!@#';

  // ========== PASSWORD HASHING TESTS ==========

  describe('hashPassword()', () => {
    it('should hash a plaintext password', async () => {
      // Act
      const hash = await hashPassword(validPassword);

      // Assert
      expect(hash).toBeDefined();
      expect(typeof hash).toBe('string');
      expect(hash).not.toBe(validPassword);
      expect(hash.length).toBeGreaterThan(0);
    });

    it('should produce different hashes for same password', async () => {
      // Act
      const hash1 = await hashPassword(validPassword);
      const hash2 = await hashPassword(validPassword);

      // Assert
      // Bcrypt includes random salt, so hashes should be different
      expect(hash1).not.toBe(hash2);
    });

    it('should include bcrypt salt and algorithm prefix', async () => {
      // Act
      const hash = await hashPassword(validPassword);

      // Assert
      // Bcrypt hashes start with $2a$, $2b$, $2x$, or $2y$ followed by cost factor
      expect(hash).toMatch(/^\$2[aby]\$/);
    });
  });

  // ========== PASSWORD COMPARISON TESTS ==========

  describe('comparePassword()', () => {
    it('should accept matching password', async () => {
      // Arrange
      const hash = await hashPassword(validPassword);

      // Act
      const isMatch = await comparePassword(validPassword, hash);

      // Assert
      expect(isMatch).toBe(true);
    });

    it('should reject non-matching password', async () => {
      // Arrange
      const hash = await hashPassword(validPassword);

      // Act
      const isMatch = await comparePassword(wrongPassword, hash);

      // Assert
      expect(isMatch).toBe(false);
    });

    it('should reject wrong case for case-sensitive password', async () => {
      // Arrange
      const hash = await hashPassword('MyPassword123!@#');

      // Act
      const isMatch = await comparePassword('mypassword123!@#', hash);

      // Assert
      expect(isMatch).toBe(false);
    });

    it('should return false for invalid hash format', async () => {
      // Act
      const isMatch = await comparePassword(validPassword, 'not-a-valid-hash');

      // Assert
      expect(isMatch).toBe(false);
    });

    it('should not match if only one character different', async () => {
      // Arrange
      const hash = await hashPassword('Password123!@#A');

      // Act
      const isMatch = await comparePassword('Password123!@#B', hash);

      // Assert
      expect(isMatch).toBe(false);
    });
  });

  // ========== PASSWORD VALIDATION TESTS ==========

  describe('validatePasswordStrength()', () => {
    it('should accept strong password', () => {
      // Act & Assert
      expect(() => {
        validatePasswordStrength('StrongPass123!@#');
      }).not.toThrow();
    });

    it('should reject password less than 8 characters', () => {
      // Act & Assert
      expect(() => {
        validatePasswordStrength('Pass1!');
      }).toThrow('at least 8 characters');
    });

    it('should reject password without uppercase', () => {
      // Act & Assert
      expect(() => {
        validatePasswordStrength('lowercase123!@#');
      }).toThrow('uppercase');
    });

    it('should reject password without lowercase', () => {
      // Act & Assert
      expect(() => {
        validatePasswordStrength('UPPERCASE123!@#');
      }).toThrow('lowercase');
    });

    it('should reject password without digit', () => {
      // Act & Assert
      expect(() => {
        validatePasswordStrength('NoDigit!@#abcde');
      }).toThrow('digit');
    });

    it('should reject password without special character', () => {
      // Act & Assert
      expect(() => {
        validatePasswordStrength('NoSpecialChar123');
      }).toThrow('special character');
    });
  });

  // ========== INTEGRATION TESTS ==========

  describe('Password Workflow (Integration)', () => {
    it('should hash, then verify matching plaintext', async () => {
      // Arrange
      const password = 'MyPassword123!@#';

      // Act
      const hash = await hashPassword(password);
      const isMatch = await comparePassword(password, hash);

      // Assert
      expect(isMatch).toBe(true);
    });

    it('should fail full workflow with wrong password', async () => {
      // Arrange
      const correctPassword = 'Correct123!@#pwd';
      const wrongPassword = 'Wrong123!@#word';

      // Act
      const hash = await hashPassword(correctPassword);
      const isMatch = await comparePassword(wrongPassword, hash);

      // Assert
      expect(isMatch).toBe(false);
    });

    it('should support multiple users with independent hashes', async () => {
      // Arrange
      const user1Password = 'User1Pass123!@#';
      const user2Password = 'User2Pass123!@#';

      // Act
      const user1Hash = await hashPassword(user1Password);
      const user2Hash = await hashPassword(user2Password);

      // Assert
      expect(user1Hash).not.toBe(user2Hash);

      // Verify each password only matches its own hash
      expect(await comparePassword(user1Password, user1Hash)).toBe(true);
      expect(await comparePassword(user1Password, user2Hash)).toBe(false);
      expect(await comparePassword(user2Password, user2Hash)).toBe(true);
      expect(await comparePassword(user2Password, user1Hash)).toBe(false);
    });
  });
});
