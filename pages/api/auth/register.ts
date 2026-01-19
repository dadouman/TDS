/**
 * User Registration API Handler
 * Handles POST /api/auth/register to create new user accounts
 * 
 * Source: Story 1-001 Task 4 - User Registration API Handler
 * 
 * Accepts:
 * - email (string, required, valid email format)
 * - password (string, required, min 8 chars, complexity rules)
 * - firstName (string, required)
 * - lastName (string, required)
 * - role (enum: 'freighter' | 'carrier' | 'warehouse' | 'store', required)
 * 
 * Returns:
 * - 201 Created: { success: true, userId, email, token, expiresIn }
 * - 400 Bad Request: { error: "validation error details" }
 * - 409 Conflict: { error: "Email already registered" }
 * - 500 Internal Server Error: { error: "Internal server error" }
 */

import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/utils/prisma';
import { hashPassword } from '@/utils/password';
import { validatePassword } from '@/utils/passwordValidator';
import { validateEmail, normalizeEmail } from '@/utils/emailValidator';
import { createToken } from '@/middleware/auth';
import { setSecureCookie } from '@/utils/cookies';

/**
 * Type definition for registration request body
 */
type RegistrationRequest = {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: string;
};

/**
 * Type definition for registration response
 */
type RegistrationResponse = {
  success?: boolean;
  userId?: string;
  email?: string;
  token?: string;
  expiresIn?: string;
  error?: string;
  details?: string[];
};

/**
 * Valid roles that users can register with
 */
const VALID_ROLES = ['freighter', 'carrier', 'warehouse', 'store'] as const;

/**
 * POST /api/auth/register
 * 
 * Public endpoint - no authentication required (users are registering)
 * Only POST method allowed
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<RegistrationResponse>
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    console.log(`[Register] Method not allowed: ${req.method}`);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password, firstName, lastName, role } = req.body as RegistrationRequest;

  console.log('[Register] Attempt:', { email: email ? email.substring(0, 3) + '***' : 'missing', role });

  // ====================
  // VALIDATION PHASE 1: Required Fields
  // ====================
  if (!email || !password || !firstName || !lastName || !role) {
    console.log('[Register] Validation Error: Missing required fields');
    return res.status(400).json({
      error: 'Validation failed',
      details: [
        email ? undefined : 'email is required',
        password ? undefined : 'password is required',
        firstName ? undefined : 'firstName is required',
        lastName ? undefined : 'lastName is required',
        role ? undefined : 'role is required',
      ].filter(Boolean) as string[],
    });
  }

  // ====================
  // VALIDATION PHASE 2: Email Format & Normalization
  // ====================
  if (!validateEmail(email)) {
    console.log('[Register] Validation Error: Invalid email format', { email: email.substring(0, 3) + '***' });
    return res.status(400).json({
      error: 'Validation failed',
      details: ['email must be valid format'],
    });
  }

  const normalizedEmail = normalizeEmail(email);

  // ====================
  // VALIDATION PHASE 3: Password Strength
  // ====================
  const passwordValidation = validatePassword(password);
  if (!passwordValidation.isValid) {
    console.log('[Register] Validation Error: Weak password', { passwordErrors: passwordValidation.errors.length });
    return res.status(400).json({
      error: 'Validation failed',
      details: passwordValidation.errors,
    });
  }

  // ====================
  // VALIDATION PHASE 4: Role Validation
  // ====================
  const normalizedRole = role.toLowerCase();
  if (!VALID_ROLES.includes(normalizedRole as any)) {
    console.log('[Register] Validation Error: Invalid role', { role });
    return res.status(400).json({
      error: 'Validation failed',
      details: [`role must be one of: ${VALID_ROLES.join(', ')}`],
    });
  }

  try {
    // ====================
    // DATABASE PHASE 1: Check for Duplicate Email
    // ====================
    const existingUser = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        is_deleted: false,
      },
    });

    if (existingUser) {
      console.log('[Register] Conflict: Email already registered', { email: normalizedEmail.substring(0, 3) + '***' });
      return res.status(409).json({
        error: 'Email already registered',
      });
    }

    // ====================
    // DATABASE PHASE 2: Hash Password
    // ====================
    const passwordHash = await hashPassword(password);

    // ====================
    // DATABASE PHASE 3: Create User
    // ====================
    const newUser = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password_hash: passwordHash,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        role: normalizedRole.toUpperCase() as 'FREIGHTER' | 'CARRIER' | 'WAREHOUSE' | 'STORE',
        isEmailVerified: false,
        is_deleted: false,
      },
    });

    console.log('[Register] Success: User created', { userId: newUser.id, email: normalizedEmail.substring(0, 3) + '***' });

    // ====================
    // TOKEN PHASE: Create JWT
    // ====================
    const token = createToken({
      userId: newUser.id,
      email: newUser.email,
      role: newUser.role.toLowerCase(),
    });

    // ====================
    // COOKIE PHASE: Set Secure HttpOnly Cookie
    // ====================
    const expiryMs = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    setSecureCookie(res, token, expiryMs);

    // ====================
    // RESPONSE PHASE: Return Success
    // ====================
    return res.status(201).json({
      success: true,
      userId: newUser.id,
      email: newUser.email,
      token,
      expiresIn: '7d',
    });
  } catch (error) {
    // Unexpected database or server error
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Register] Unexpected error:', errorMessage);

    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}
