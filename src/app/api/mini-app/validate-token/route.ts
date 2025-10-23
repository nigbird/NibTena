// src/app/api/mini-app/validate-token/route.ts
import { NextResponse } from 'next/server';

/**
 * Validates the Authorization token by calling the official
 * Super App validation endpoint. Acts as a secure proxy.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');

    if (!authHeader) {
      return NextResponse.json(
        { status: 'error', message: 'Authorization header is missing.' },
        { status: 401 }
      );
    }

    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'error', message: 'Malformed Authorization header. Expected format: Bearer <token>' },
        { status: 400 }
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();

    const SUPER_APP_VALIDATION_URL = process.env.SUPER_APP_VALIDATION_URL;
    if (!SUPER_APP_VALIDATION_URL) {
      console.error('❌ SUPER_APP_VALIDATION_URL not set.');
      return NextResponse.json(
        { status: 'error', message: 'Server configuration error.' },
        { status: 500 }
      );
    }

    const response = await fetch(SUPER_APP_VALIDATION_URL, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const raw = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(raw);
    } catch {
      console.warn('⚠️ Non-JSON validation response:', raw);
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          status: 'error',
          message: `Super App validation failed (${response.status})`,
          details: raw,
        },
        { status: response.status }
      );
    }

    if (!data.phone) {
      return NextResponse.json(
        { status: 'error', message: 'Phone number missing in validation response.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      status: 'success',
      phone: data.phone,
      userId: data.userId || null,
    });
  } catch (error) {
    console.error('💥 Validation service error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
