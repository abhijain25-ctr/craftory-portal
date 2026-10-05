import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'craftory_portal_secret_key_prod_2026_super_confidential';
const COOKIE_NAME = 'craftory_session';

export interface SessionUser {
  id: string;
  email: string;
  realName: string;
  role: 'ADMIN' | 'CLIENT' | 'EMPLOYEE';
}

export async function hashPassword(plain: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plain, salt);
}

export async function comparePassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

import { mockStore } from './mock-store';

export function signToken(user: SessionUser): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      realName: user.realName,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function verifyToken(token: string): { sub: string; email: string; realName?: string; role: 'ADMIN' | 'CLIENT' | 'EMPLOYEE' } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as any;
  } catch (err) {
    return null;
  }
}

export async function getSessionUser(req: NextRequest): Promise<SessionUser | null> {
  // Check authorization header first, then cookie
  let token: string | undefined;
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = req.cookies.get(COOKIE_NAME)?.value;
  }

  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload || !payload.sub) return null;

  // Try Prisma first
  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        realName: true,
        role: true,
      },
    });

    if (user) {
      return user as SessionUser;
    }
  } catch (err) {
    // Database connection error / offline - fallback gracefully
  }

  // Fallback to in-memory store
  const mockUser = mockStore.users.find(
    (u) => u.id === payload.sub || u.email.toLowerCase() === payload.email.toLowerCase()
  );
  if (mockUser) {
    return {
      id: mockUser.id,
      email: mockUser.email,
      realName: mockUser.realName,
      role: mockUser.role,
    };
  }

  // Fallback to verified JWT claims
  if (payload.sub && payload.email && payload.role) {
    return {
      id: payload.sub,
      email: payload.email,
      realName: payload.realName || (payload.role === 'ADMIN' ? 'Sophia Vance (Operations Lead)' : payload.email),
      role: payload.role,
    };
  }

  return null;
}

export function setSessionCookie(res: NextResponse, token: string): void {
  res.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export function clearSessionCookie(res: NextResponse): void {
  res.cookies.set(COOKIE_NAME, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
