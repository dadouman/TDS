/**
 * Unit Tests for Email Validation Utility
 * Tests all email validation and normalization functions
 * 
 * Source: Story 1-001 Task 6 Subtask 6.2
 */

import { validateEmail, normalizeEmail } from '@/utils/emailValidator';

describe('emailValidator', () => {
  describe('validateEmail', () => {
    describe('✅ Valid Emails', () => {
      it('should accept standard email format', () => {
        expect(validateEmail('user@example.com')).toBe(true);
      });

      it('should accept email with dots in local part', () => {
        expect(validateEmail('john.doe@example.com')).toBe(true);
      });

      it('should accept email with plus signs (for email tagging)', () => {
        expect(validateEmail('user+tag@example.com')).toBe(true);
      });

      it('should accept email with dashes', () => {
        expect(validateEmail('user-name@example.com')).toBe(true);
      });

      it('should accept email with numbers', () => {
        expect(validateEmail('user123@example.com')).toBe(true);
      });

      it('should accept email with subdomain', () => {
        expect(validateEmail('user@mail.example.com')).toBe(true);
      });

      it('should accept email with multiple domain levels', () => {
        expect(validateEmail('user@subdomain.example.co.uk')).toBe(true);
      });

      it('should accept email with uppercase letters', () => {
        // Validates format only; normalization handles case
        expect(validateEmail('User@Example.COM')).toBe(true);
      });

      it('should accept email with whitespace around (validates trimmed)', () => {
        // The regex validates after trim
        expect(validateEmail('  user@example.com  ')).toBe(true);
      });
    });

    describe('❌ Invalid Emails - Format Issues', () => {
      it('should reject email without @ symbol', () => {
        expect(validateEmail('userexample.com')).toBe(false);
      });

      it('should reject email without domain', () => {
        expect(validateEmail('user@')).toBe(false);
      });

      it('should reject email without local part', () => {
        expect(validateEmail('@example.com')).toBe(false);
      });

      it('should reject email without TLD', () => {
        expect(validateEmail('user@domain')).toBe(false);
      });

      it('should reject email with space in local part', () => {
        expect(validateEmail('user name@example.com')).toBe(false);
      });

      it('should reject email with space in domain', () => {
        expect(validateEmail('user@example .com')).toBe(false);
      });

      it('should reject email with multiple @ symbols', () => {
        expect(validateEmail('user@@example.com')).toBe(false);
      });

      it('should reject email ending with dot', () => {
        expect(validateEmail('user@example.com.')).toBe(false);
      });
    });

    describe('❌ Invalid Emails - Empty/Null', () => {
      it('should reject empty string', () => {
        expect(validateEmail('')).toBe(false);
      });

      it('should reject whitespace-only string', () => {
        expect(validateEmail('   ')).toBe(false);
      });

      it('should reject non-string input', () => {
        // @ts-ignore - Testing type coercion
        expect(validateEmail(null)).toBe(false);
      });

      it('should reject undefined', () => {
        // @ts-ignore - Testing type coercion
        expect(validateEmail(undefined)).toBe(false);
      });

      it('should reject number', () => {
        // @ts-ignore - Testing type coercion
        expect(validateEmail(123)).toBe(false);
      });
    });

    describe('❌ Invalid Emails - Common Mistakes', () => {
      it('should reject email with comma instead of @ (common typo)', () => {
        expect(validateEmail('user,example.com')).toBe(false);
      });

      it('should reject email with pipe (|) symbol', () => {
        expect(validateEmail('user|name@example.com')).toBe(false);
      });

      it('should reject email with just a domain', () => {
        expect(validateEmail('example.com')).toBe(false);
      });
    });
  });

  describe('normalizeEmail', () => {
    describe('✅ Lowercasing', () => {
      it('should convert uppercase to lowercase', () => {
        expect(normalizeEmail('USER@EXAMPLE.COM')).toBe('user@example.com');
      });

      it('should handle mixed case', () => {
        expect(normalizeEmail('John.Doe@Example.COM')).toBe('john.doe@example.com');
      });

      it('should handle already lowercase', () => {
        expect(normalizeEmail('user@example.com')).toBe('user@example.com');
      });
    });

    describe('✅ Trimming', () => {
      it('should trim leading whitespace', () => {
        expect(normalizeEmail('  user@example.com')).toBe('user@example.com');
      });

      it('should trim trailing whitespace', () => {
        expect(normalizeEmail('user@example.com  ')).toBe('user@example.com');
      });

      it('should trim both sides', () => {
        expect(normalizeEmail('  user@example.com  ')).toBe('user@example.com');
      });

      it('should trim tabs and newlines', () => {
        expect(normalizeEmail('\t\nuser@example.com\n\t')).toBe('user@example.com');
      });
    });

    describe('✅ Combined Normalization', () => {
      it('should trim and lowercase together', () => {
        expect(normalizeEmail('  JOHN.DOE@EXAMPLE.COM  ')).toBe('john.doe@example.com');
      });

      it('should handle email with plus tagging', () => {
        expect(normalizeEmail('  User+TAG@Example.COM  ')).toBe('user+tag@example.com');
      });

      it('should preserve dashes and underscores', () => {
        expect(normalizeEmail('  User-Name_123@EXAMPLE.COM  ')).toBe('user-name_123@example.com');
      });
    });

    describe('✅ Real-world Scenarios', () => {
      it('should normalize user registration input', () => {
        // Simulating user copy-paste with extra spaces and mixed case
        const userInput = '  John.Doe@Gmail.COM  ';
        const normalized = normalizeEmail(userInput);
        expect(normalized).toBe('john.doe@gmail.com');
      });

      it('should make duplicate check work (case-insensitive)', () => {
        const email1 = normalizeEmail('User@Example.com');
        const email2 = normalizeEmail('user@example.com');
        expect(email1).toBe(email2); // Both normalize to same value
      });
    });
  });

  describe('Integration: validateEmail + normalizeEmail', () => {
    it('should validate before normalization (typical flow)', () => {
      const email = '  User@Example.COM  ';

      // Step 1: Validate format
      expect(validateEmail(email)).toBe(true);

      // Step 2: Normalize for storage
      const normalized = normalizeEmail(email);
      expect(normalized).toBe('user@example.com');

      // Step 3: Validate normalized email
      expect(validateEmail(normalized)).toBe(true);
    });

    it('should reject invalid email even after trim attempt', () => {
      const invalidEmail = '  user@invalid  ';
      expect(validateEmail(invalidEmail)).toBe(false);
    });
  });
});
