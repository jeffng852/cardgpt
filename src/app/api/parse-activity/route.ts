/**
 * API endpoint for AI-powered activity parsing
 *
 * POST /api/parse-activity
 * Body: { activity: string }
 * Returns: { category, confidence, reasoning, error? }
 *
 * Rate limited: 1 request per 60 seconds per IP
 */

import { NextRequest, NextResponse } from 'next/server';
import { parseActivity } from '@/lib/ai/parseActivity';

// In-memory rate limiter (simple implementation)
// For production, use Redis or similar
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 60 seconds

function getClientIP(request: NextRequest): string {
  // Try various headers for IP detection
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  // Fallback for local development
  return 'localhost';
}

function isRateLimited(ip: string): { limited: boolean; retryAfterSeconds?: number } {
  const now = Date.now();
  const lastRequest = rateLimitMap.get(ip);

  if (lastRequest) {
    const elapsed = now - lastRequest;
    if (elapsed < RATE_LIMIT_WINDOW_MS) {
      const retryAfterSeconds = Math.ceil((RATE_LIMIT_WINDOW_MS - elapsed) / 1000);
      return { limited: true, retryAfterSeconds };
    }
  }

  // Update last request time
  rateLimitMap.set(ip, now);

  // Cleanup old entries periodically (prevent memory leak)
  if (rateLimitMap.size > 10000) {
    const cutoff = now - RATE_LIMIT_WINDOW_MS;
    for (const [key, time] of rateLimitMap.entries()) {
      if (time < cutoff) {
        rateLimitMap.delete(key);
      }
    }
  }

  return { limited: false };
}

export async function POST(request: NextRequest) {
  try {
    // Get client IP and check rate limit
    const clientIP = getClientIP(request);
    const rateLimit = isRateLimited(clientIP);

    if (rateLimit.limited) {
      return NextResponse.json(
        {
          error: 'Rate limited',
          message: `Please wait ${rateLimit.retryAfterSeconds} seconds before trying again.`,
          retryAfterSeconds: rateLimit.retryAfterSeconds,
        },
        {
          status: 429,
          headers: {
            'Retry-After': String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    // Parse request body
    const body = await request.json();
    const { activity } = body;

    if (!activity || typeof activity !== 'string') {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Activity description is required' },
        { status: 400 }
      );
    }

    if (activity.length > 80) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Activity description too long (max 80 characters)' },
        { status: 400 }
      );
    }

    // Call AI parser
    const result = await parseActivity(activity.trim());

    if (result.error) {
      return NextResponse.json(
        {
          category: result.category,
          confidence: result.confidence,
          error: result.error,
        },
        { status: 200 } // Still return 200 with fallback category
      );
    }

    return NextResponse.json({
      category: result.category,
      confidence: result.confidence,
      reasoning: result.reasoning,
      mcc: result.mcc,
    });

  } catch (error) {
    console.error('[parse-activity] Error:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', message: 'Failed to parse activity' },
      { status: 500 }
    );
  }
}
