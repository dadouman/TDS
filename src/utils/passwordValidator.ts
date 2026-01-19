/**
 * Password Validation Utility
 * Enforces password complexity rules for user registration and password changes
 * 
 * Source: Story 1-001 Task 2 - Password Validation Rules
 * 
 * Rules:
 * - Minimum 8 characters
 * - At least 1 uppercase letter (A-Z)
 * - At least 1 lowercase letter (a-z)
 * - At least 1 digit (0-9)
 * - At least 1 special character (!@#$%^&*)
 * - Maximum 128 characters (prevent DOS)
 * - Cannot be common/dictionary password
 */

/**
 * Result of password validation with specific error reasons
 */
export interface PasswordValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * List of common passwords that should be rejected
 * Prevents users from choosing easy-to-guess passwords
 * These are EXACT matches (case-insensitive), not substrings to allow password compositions like "Password123!"
 */
const commonPasswords = [
  'password',
  'password123',
  '123456',
  '12345678',
  'qwerty',
  'abc123',
  'letmein',
  'welcome',
  'admin',
  'pass123',
];

/**
 * Validate a password against complexity rules
 * 
 * @param password - The password string to validate
 * @returns PasswordValidationResult with isValid flag and array of error messages
 * 
 * Each error message corresponds to a specific rule violation.
 * Client can use these to provide granular feedback to the user.
 * 
 * Example:
 * ```typescript
 * const result = validatePassword('weak');
 * if (!result.isValid) {
 *   console.log(result.errors);
 *   // Output: [
 *   //   'Password must be at least 8 characters',
 *   //   'Password must contain uppercase letter',
 *   //   'Password must contain special character'
 *   // ]
 * }
 * ```
 */
export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Rule 1: Password is required
  if (!password) {
    errors.push('Password is required');
    return { isValid: false, errors };
  }

  // Rule 2: Minimum 8 characters
  if (password.length < 8) {
    errors.push('Password must be at least 8 characters');
  }

  // Rule 3: Maximum 128 characters (DOS prevention)
  if (password.length > 128) {
    errors.push('Password must not exceed 128 characters');
  }

  // Rule 4: At least one uppercase letter (A-Z)
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain uppercase letter');
  }

  // Rule 5: At least one lowercase letter (a-z)
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain lowercase letter');
  }

  // Rule 6: At least one digit (0-9)
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain digit');
  }

  // Rule 7: At least one special character (!@#$%^&*)
  if (!/[!@#$%^&*]/.test(password)) {
    errors.push('Password must contain special character');
  }

  // Rule 8: Not a common/dictionary password (case-insensitive exact match)
  // Only reject if the entire password (lowercased) matches a common password exactly
  // This allows "Password123!" but rejects "password123" or "qwerty"
  const passwordLower = password.toLowerCase();
  if (commonPasswords.includes(passwordLower)) {
    errors.push('Password is too common');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}
