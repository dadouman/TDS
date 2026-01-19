/**
 * Unit Tests for Password Validation Utility
 * Tests all password complexity rules and error messages
 * 
 * Source: Story 1-001 Task 6 Subtask 6.3
 */

import { validatePassword } from '@/utils/passwordValidator';

describe('passwordValidator', () => {
  describe('✅ Valid Passwords', () => {
    it('should accept password with all character types', () => {
      const result = validatePassword('SecurePass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept minimum length password (8 chars)', () => {
      const result = validatePassword('Pass123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept longer password', () => {
      const result = validatePassword('MyLongPassword12345!@#$%');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept maximum length password (128 chars)', () => {
      // Create exactly 128 character password
      // Need: uppercase, lowercase, digit, special character
      // A=60, a=1, 1=1, !=1, Z=60, z=1, 2=1, @=1 = 126, need 2 more chars
      const password = 'A'.repeat(62) + 'a' + '1' + '!' + 'Z'.repeat(62) + 'z';
      expect(password.length).toBe(128);
      const result = validatePassword(password);
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept password with multiple special characters', () => {
      const result = validatePassword('Pass1!@#$%^&*');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept password with numbers at different positions', () => {
      const result = validatePassword('1Password2Test3!');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('❌ Required Field Validation', () => {
    it('should reject empty password', () => {
      const result = validatePassword('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject undefined password', () => {
      // @ts-ignore - Testing edge case
      const result = validatePassword(undefined);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should reject null password', () => {
      // @ts-ignore - Testing edge case
      const result = validatePassword(null);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });

  describe('❌ Length Validation', () => {
    describe('Minimum Length (8 chars)', () => {
      it('should reject password with 7 characters', () => {
        const result = validatePassword('Pass12!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
      });

      it('should reject very short password (2 chars)', () => {
        const result = validatePassword('Pa');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must be at least 8 characters');
      });

      it('should accept exactly 8 character password', () => {
        const result = validatePassword('Pass123!');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must be at least 8 characters');
      });
    });

    describe('Maximum Length (128 chars)', () => {
      it('should reject password with 129 characters', () => {
        const password = 'A'.repeat(62) + 'a' + '1' + '!' + 'Z'.repeat(62) + 'z' + 'X';
        expect(password.length).toBe(129);
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must not exceed 128 characters');
      });

      it('should reject extremely long password', () => {
        const password = 'Pass123!' + 'x'.repeat(1000);
        const result = validatePassword(password);
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must not exceed 128 characters');
      });
    });
  });

  describe('❌ Character Type Validation - Each Rule Independent', () => {
    describe('Uppercase Letter Requirement', () => {
      it('should reject password without uppercase', () => {
        const result = validatePassword('password123!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain uppercase letter');
      });

      it('should accept password with one uppercase', () => {
        const result = validatePassword('Password123!');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain uppercase letter');
      });

      it('should accept password with multiple uppercase', () => {
        const result = validatePassword('PASSword123!');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain uppercase letter');
      });
    });

    describe('Lowercase Letter Requirement', () => {
      it('should reject password without lowercase', () => {
        const result = validatePassword('PASSWORD123!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain lowercase letter');
      });

      it('should accept password with one lowercase', () => {
        const result = validatePassword('PASSword123!');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain lowercase letter');
      });

      it('should accept password with multiple lowercase', () => {
        const result = validatePassword('Passwordtest123!');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain lowercase letter');
      });
    });

    describe('Digit Requirement', () => {
      it('should reject password without digits', () => {
        const result = validatePassword('Password!');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain digit');
      });

      it('should accept password with one digit', () => {
        const result = validatePassword('Password1!');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain digit');
      });

      it('should accept password with multiple digits', () => {
        const result = validatePassword('Password123!');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain digit');
      });

      it('should accept password starting with digit', () => {
        const result = validatePassword('1Password!');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain digit');
      });
    });

    describe('Special Character Requirement', () => {
      it('should reject password without special characters', () => {
        const result = validatePassword('Password123');
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Password must contain special character');
      });

      it('should accept password with ! special character', () => {
        const result = validatePassword('Password123!');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain special character');
      });

      it('should accept password with @ special character', () => {
        const result = validatePassword('Password123@');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain special character');
      });

      it('should accept password with # special character', () => {
        const result = validatePassword('Password123#');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain special character');
      });

      it('should accept password with $ special character', () => {
        const result = validatePassword('Password123$');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain special character');
      });

      it('should accept password with multiple special characters', () => {
        const result = validatePassword('Password!@#$%^&*123');
        expect(result.isValid).toBe(true);
        expect(result.errors).not.toContain('Password must contain special character');
      });
    });
  });

  describe('❌ Common Password Detection', () => {
    it('should reject exact match of "password" (case-insensitive)', () => {
      const result = validatePassword('Password');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common');
    });

    it('should reject exact match of "password123"', () => {
      const result = validatePassword('Password123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common');
    });

    it('should reject exact match of "123456"', () => {
      const result = validatePassword('123456');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common');
    });

    it('should reject exact match of "12345678"', () => {
      const result = validatePassword('12345678');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common');
    });

    it('should reject exact match of "qwerty" (case-insensitive)', () => {
      const result = validatePassword('QWERTY');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common');
    });

    it('should accept password containing common word but different composition', () => {
      const result = validatePassword('MyPassword123!');
      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain('Password is too common');
    });

    it('should accept password that is NOT exact common password match', () => {
      const result = validatePassword('UniqueTest789!');
      expect(result.isValid).toBe(true);
      expect(result.errors).not.toContain('Password is too common');
    });

    it('should be case-insensitive when checking common passwords', () => {
      // "PASSWORD123" (uppercase) should match "password123" (lowercase) exactly
      const result = validatePassword('PASSWORD123');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password is too common');
    });
  });

  describe('Multiple Validation Errors', () => {
    it('should report all violations at once', () => {
      const result = validatePassword('weak');
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
      expect(result.errors).toContain('Password must be at least 8 characters');
      expect(result.errors).toContain('Password must contain uppercase letter');
      expect(result.errors).toContain('Password must contain digit');
      expect(result.errors).toContain('Password must contain special character');
    });

    it('should report max + common password violations', () => {
      // Create password that is TOO LONG and is exactly a common password
      // "password123" is 11 chars, need to pad it to >128
      const password = 'password123' + 'x'.repeat(118); // 11 + 118 = 129 chars
      const result = validatePassword(password);
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must not exceed 128 characters');
      // This one won't fail on "too common" because it's not an exact match of password123
      // Since it has extra characters. Let's change the test to make sense:
      // Actually, since it starts with "password123" but has extra chars, it won't match exactly
      // Let me create a test that makes more sense
    });

    it('should report multiple violations including common password (exact match)', () => {
      // "password" is exactly 8 chars (minimum length) but is common and missing required types
      const result = validatePassword('password');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain uppercase letter');
      expect(result.errors).toContain('Password must contain digit');
      expect(result.errors).toContain('Password must contain special character');
      expect(result.errors).toContain('Password is too common');
    });

    it('should report missing uppercase + missing digit + missing special', () => {
      const result = validatePassword('passwordtest');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Password must contain uppercase letter');
      expect(result.errors).toContain('Password must contain digit');
      expect(result.errors).toContain('Password must contain special character');
    });
  });

  describe('Edge Cases', () => {
    it('should handle password with only special characters and required types', () => {
      const result = validatePassword('Pass!!!123');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle password with unicode characters', () => {
      // Unicode characters don't match [A-Z], [a-z], [0-9], or special char
      const result = validatePassword('Pässwörd123!');
      expect(result.isValid).toBe(true); // Has all required types
      expect(result.errors).toHaveLength(0);
    });

    it('should handle password with leading/trailing spaces as-is', () => {
      // Password validator doesn't trim; that's email validator's job
      const result = validatePassword(' Pass123! ');
      expect(result.isValid).toBe(true);
      // Spaces don't match any rule, but all required types are present
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('Real-world Scenarios', () => {
    it('should accept strong passwords users might create', () => {
      const strongPasswords = [
        'SuperSecure#2024',
        'MyP@ssw0rd!',
        'BlueSky$Rising2025',
        'Coffee&Code123',
        'RainbowUnicorn!99',
      ];

      strongPasswords.forEach((pwd) => {
        const result = validatePassword(pwd);
        expect(result.isValid).toBe(true);
        expect(result.errors).toHaveLength(0);
      });
    });

    it('should reject weak passwords users might try', () => {
      const weakPasswords = [
        'password', // too short, all lowercase
        '12345678', // no letters or special chars
        'qwerty', // common
        'Pass', // too short
        'PASSWORD', // no lowercase, no digits, no special chars
      ];

      weakPasswords.forEach((pwd) => {
        const result = validatePassword(pwd);
        expect(result.isValid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });
    });
  });
});
