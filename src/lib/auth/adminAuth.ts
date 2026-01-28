/**
 * Admin Authentication
 *
 * Simple password-based auth with HTTP-only cookies
 * - Password is checked against ADMIN_PASSWORD env var
 * - Session token stored in HTTP-only cookie
 * - Tokens expire after 24 hours
 */

import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'cardgpt-admin-2026';
const SESSION_COOKIE_NAME = 'cardgpt_admin_session';
const SESSION_DURATION_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Simple token generation using timestamp + random
 * For production, consider using a proper JWT or session library
 */
function generateSessionToken(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 15);
  return `${timestamp}-${random}`;
}

/**
 * Validate password and create session
 */
export async function login(password: string): Promise<{ success: boolean; error?: string }> {
  if (password !== ADMIN_PASSWORD) {
    return { success: false, error: 'Invalid password' };
  }

  const token = generateSessionToken();
  const expiresAt = Date.now() + SESSION_DURATION_MS;

  // Set HTTP-only cookie
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, `${token}:${expiresAt}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: SESSION_DURATION_MS / 1000, // seconds
  });

  return { success: true };
}

/**
 * Clear session cookie
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Check if current request is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);

  if (!sessionCookie?.value) {
    return false;
  }

  // Parse token and expiry
  const [, expiresAtStr] = sessionCookie.value.split(':');
  const expiresAt = parseInt(expiresAtStr, 10);

  if (isNaN(expiresAt) || Date.now() > expiresAt) {
    // Token expired, clear it
    cookieStore.delete(SESSION_COOKIE_NAME);
    return false;
  }

  return true;
}

/**
 * Check authentication from request headers (for API routes)
 * Supports both cookie-based and Bearer token auth
 */
export function isAuthenticatedFromRequest(request: NextRequest): boolean {
  // Check Bearer token first (for API calls)
  const authHeader = request.headers.get('Authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    if (token === ADMIN_PASSWORD) {
      return true;
    }
  }

  // Check cookie
  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (!sessionCookie?.value) {
    return false;
  }

  const [, expiresAtStr] = sessionCookie.value.split(':');
  const expiresAt = parseInt(expiresAtStr, 10);

  return !isNaN(expiresAt) && Date.now() <= expiresAt;
}

/**
 * Create unauthorized response
 */
export function unauthorizedResponse(message = 'Unauthorized'): NextResponse {
  return NextResponse.json(
    { error: 'Unauthorized', message },
    { status: 401 }
  );
}

/**
 * Redirect to login page
 */
export function redirectToLogin(): NextResponse {
  return NextResponse.redirect(new URL('/admin/login', process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'));
}
