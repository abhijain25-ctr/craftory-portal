import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { comparePassword, signToken, setSessionCookie } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });

    if (!user) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const isValid = await comparePassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const sessionPayload = {
      id: user.id,
      email: user.email,
      realName: user.realName,
      role: user.role,
    };

    const token = signToken(sessionPayload);
    const response = NextResponse.json({
      message: 'Authenticated successfully',
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        realName: user.role === 'ADMIN' ? user.realName : undefined, // realName only returned to admin
      },
      token,
    });

    setSessionCookie(response, token);
    return response;
  } catch (err: any) {
    return NextResponse.json({ error: 'Authentication failed' }, { status: 500 });
  }
}
