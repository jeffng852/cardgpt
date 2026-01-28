/**
 * Admin Auth API
 *
 * POST /api/admin/auth - Login with password
 * DELETE /api/admin/auth - Logout
 * GET /api/admin/auth - Check auth status
 */

import { NextRequest, NextResponse } from 'next/server';
import { login, logout, isAuthenticated } from '@/lib/auth/adminAuth';

/**
 * POST /api/admin/auth - Login
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Password is required' },
        { status: 400 }
      );
    }

    const result = await login(password);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Unauthorized', message: result.error },
        { status: 401 }
      );
    }

    return NextResponse.json({ success: true, message: 'Logged in successfully' });
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Login failed' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/auth - Logout
 */
export async function DELETE() {
  try {
    await logout();
    return NextResponse.json({ success: true, message: 'Logged out successfully' });
  } catch (error) {
    console.error('Logout error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Logout failed' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/auth - Check auth status
 */
export async function GET() {
  try {
    const authenticated = await isAuthenticated();
    return NextResponse.json({ authenticated });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ authenticated: false });
  }
}
