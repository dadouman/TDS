/**
 * Password Hashing & Comparison Utilities
 * Secure password handling using bcryptjs for one-way password hashing
 * 
 * Source: Story 1-032 Task 4 - Password Hashing Configuration
 */

import bcrypt from 'bcryptjs';
import { env } from './env';

/**
 * Hash a plaintext password using bcryptjs
 * 
 * @param plaintext - User's plaintext password (from registration/password change form)
 * @returns Promise resolving to bcrypt hash string (includes salt and algorithm info)
 * @security Hash is non-reversible; plaintext cannot be recovered from hash
 * @security Each call includes random salt; same plaintext produces different hashes
 * @security bcryptjs automatically handles salt generation and mixing
 * 
 * Async because bcrypt hashing is CPU-intensive (by design for security)
 * - Development: 10 rounds (~100ms)
 * - Test: 5 rounds (~10ms)
 * - Production: 12+ rounds (~250ms)
 * 
 * Notes:
 * - Never store plaintext passwords
 * - Always hash before database insertion
 * - NEVER include plaintext in error messages
 * 
 * Example:
 * ```typescript
 * const hash = await hashPassword('user_password_123');
 * // Store hash in database: user.passwordHash = hash;
 * ```
 */
export async function hashPassword(plaintext: string): Promise<string> {
  try {
    const hash = await bcrypt.hash(plaintext, env.BCRYPT_ROUNDS);
    return hash;
  } catch (error) {
    // Hash failed - log in development, rethrow
    if (env.NODE_ENV === 'development') {
      console.error('[password.ts] Error hashing password:', error);
    }
    throw new Error('Password hashing failed');
  }
}

/**
 * Compare plaintext password with stored hash
 * Uses timing-safe comparison to prevent timing attacks
 * 
 * @param plaintext - User-submitted plaintext password (from login form)
 * @param hash - Stored password hash from database
 * @returns Promise resolving to boolean: true if password matches, false otherwise
 * @security bcryptjs handles timing-safe comparison automatically
 * @security Always returns false if hash is invalid format (no exception)
 * 
 * Async because bcrypt comparison is computationally equivalent to hashing
 * Prevents attackers from distinguishing correct vs incorrect passwords by timing
 * 
 * Notes:
 * - Never reveal in error messages whether password is incorrect or user doesn't exist
 * - Use generic "Invalid credentials" for both cases
 * - Always compare with constant-time function (bcrypt does this)
 * 
 * Example:
 * ```typescript
 * const isValid = await comparePassword(submittedPassword, user.passwordHash);
 * if (!isValid) {
 *   return res.status(401).json({ error: 'Invalid credentials' });
 * }
 * ```
 */
export async function comparePassword(plaintext: string, hash: string): Promise<boolean> {
  try {
    // bcryptjs.compare handles timing-safe comparison internally
    const isMatch = await bcrypt.compare(plaintext, hash);
    return isMatch;
  } catch (error) {
    // Comparison failed (usually malformed hash) - return false, don't throw
    if (env.NODE_ENV === 'development') {
      console.debug('[password.ts] Error comparing password:', error);
    }
    return false;
  }
}

/**
 * Validate password meets security requirements before hashing
 * Called before hashPassword() to ensure strong passwords
 * 
 * @param password - Plaintext password to validate
 * @throws Error if password fails validation
 * 
 * Requirements:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
export function validatePasswordStrength(password: string): void {
  if (password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }
  if (!/[A-Z]/.test(password)) {
    throw new Error('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    throw new Error('Password must contain at least one lowercase letter');
  }
  if (!/\d/.test(password)) {
    throw new Error('Password must contain at least one digit');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    throw new Error('Password must contain at least one special character');
  }
}
