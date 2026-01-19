/**
 * Email Validation Utility
 * Validates and normalizes email addresses for user registration and authentication
 * 
 * Source: Story 1-001 Task 3 - Email Validation Rules
 * 
 * Validation:
 * - Must be non-empty and not just whitespace
 * - Must match basic email format (RFC 5322 simplified)
 * - Normalized to lowercase for consistent database lookups
 * 
 * Notes:
 * - Does NOT perform SMTP validation or verify email exists
 * - Does NOT send verification emails (out of scope for MVP)
 * - Simple regex sufficient for MVP; more complex validation can be added later
 */

/**
 * Validate if a string is a valid email format
 * 
 * Uses simplified RFC 5322 validation - sufficient for MVP and UX purposes.
 * Format: {local}@{domain}.{tld}
 * 
 * @param email - The email string to validate
 * @returns true if email matches valid format, false otherwise
 * 
 * Examples:
 * ```typescript
 * validateEmail('user@example.com')           // true
 * validateEmail('john.doe+tag@subdomain.co.uk') // true
 * validateEmail('invalid.email')              // false (missing @)
 * validateEmail('user@domain')                // false (missing TLD)
 * validateEmail('')                           // false (empty)
 * validateEmail('   ')                        // false (whitespace only)
 * ```
 */
export function validateEmail(email: string): boolean {
  // Rule 1: Must be a string
  if (typeof email !== 'string') {
    return false;
  }

  // Rule 2: Must not be empty or just whitespace
  if (!email || !email.trim()) {
    return false;
  }

  const trimmed = email.trim();

  // Rule 3: Must not end with a dot (common typo)
  if (trimmed.endsWith('.')) {
    return false;
  }

  // Rule 4: Must not contain invalid characters like | 
  // Valid characters: alphanumeric, dots, dashes, underscores, plus signs in local part
  // Invalid characters: pipes, spaces, etc. are already excluded by regex
  if (trimmed.includes('|')) {
    return false;
  }

  // Rule 5: Match basic email regex (simplified RFC 5322)
  // Pattern: one-or-more-valid-chars @ one-or-more-valid-chars . one-or-more-valid-chars
  // Explanation:
  // - [^\s@]+ : one or more characters that are not space or @
  // - @ : literal @ symbol
  // - [^\s@]+ : one or more characters that are not space or @
  // - \. : literal dot (.)
  // - [^\s@]+ : one or more characters that are not space or @
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return emailRegex.test(trimmed);
}

/**
 * Normalize an email address for consistent database storage and lookup
 * 
 * Normalization includes:
 * - Trim whitespace from both ends
 * - Convert to lowercase (email addresses are case-insensitive by RFC)
 * 
 * @param email - The email string to normalize
 * @returns Normalized email (trimmed and lowercased)
 * 
 * Why lowercase?
 * - Email standard (RFC 5321) specifies local-part is case-insensitive
 * - Database lookups more efficient with consistent case
 * - Prevents duplicate emails like "User@example.com" and "user@example.com"
 * 
 * Example:
 * ```typescript
 * normalizeEmail('  John.Doe@Example.COM  ')
 * // Returns: 'john.doe@example.com'
 * ```
 */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
