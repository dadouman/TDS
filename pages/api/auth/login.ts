import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '@/utils/prisma';
import { comparePassword } from '@/utils/password';
import { validateEmail, normalizeEmail } from '@/utils/emailValidator';
import { createToken } from '@/middleware/auth';
import { setSecureCookie } from '@/utils/cookies';

type LoginRequest = {
  email: string;
  password: string;
};

type LoginResponse = {
  success?: boolean;
  userId?: string;
  email?: string;
  role?: string;
  token?: string;
  expiresIn?: string;
  error?: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<LoginResponse>
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body as LoginRequest;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }

  const normalizedEmail = normalizeEmail(email);

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: normalizedEmail,
        is_deleted: false,
      },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const passwordMatch = await comparePassword(password, user.password_hash);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = createToken({
      userId: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
    });

    const expiryMs = 7 * 24 * 60 * 60 * 1000;
    setSecureCookie(res, token, expiryMs);

    return res.status(200).json({
      success: true,
      userId: user.id,
      email: user.email,
      role: user.role.toLowerCase(),
      token,
      expiresIn: '7d',
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('[Login] Unexpected error:', errorMessage);

    return res.status(500).json({
      error: 'Internal server error',
    });
  }
}
