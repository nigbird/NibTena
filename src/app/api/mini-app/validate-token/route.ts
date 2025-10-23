// src/app/api/mini-app/validate-token/route.ts
import { NextResponse } from 'next/server';

/**
 * This API route validates the Authorization token received
 * from the Super App by forwarding it to the official
 * Super App token validation endpoint.
 *
 * It acts as a secure proxy — the Mini App should never
 * directly expose or store the token on the client side.
 */
export async function GET(request: Request) {
  try {
    const authHeader = request.headers.get('Authorization');

    // Step 1 — Check if Authorization header exists
    if (!authHeader) {
      return NextResponse.json(
        { status: 'error', message: 'Authorization header is missing.' },
        { status: 401 }
      );
    }

    // Step 2 — Ensure it starts with Bearer
    if (!authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { status: 'error', message: 'Malformed Authorization header. Expected format: Bearer <token>' },
        { status: 400 }
      );
    }

    // Step 3 — Get token
    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return NextResponse.json(
        { status: 'error', message: 'Bearer token is empty.' },
        { status: 400 }
      );
    }

    // Step 4 — Get validation URL from environment
    const SUPER_APP_VALIDATION_URL = process.env.SUPER_APP_VALIDATION_URL;
    if (!SUPER_APP_VALIDATION_URL) {
      console.error('❌ Environment variable SUPER_APP_VALIDATION_URL is not set.');
      return NextResponse.json(
        { status: 'error', message: 'Server configuration error. Validation URL is missing.' },
        { status: 500 }
      );
    }

    // Step 5 — Forward the token to the Super App validation API
    const response = await fetch(SUPER_APP_VALIDATION_URL, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const text = await response.text();
    let data: any = {};
    try {
      data = JSON.parse(text);
    } catch {
      console.error('⚠️ Unexpected non-JSON response from validation service:', text);
    }

    // Step 6 — If validation failed, return proper error
    if (!response.ok) {
      console.error('❌ Validation failed:', response.status, text);
      return NextResponse.json(
        {
          status: 'error',
          message: `Super App validation failed with status ${response.status}`,
          details: text,
        },
        { status: response.status }
      );
    }

    // Step 7 — Expecting at least a phone number in the response
    if (!data.phone) {
      console.warn('⚠️ Token validated but no phone field returned.');
      return NextResponse.json(
        { status: 'error', message: 'Phone number not found in validation response.' },
        { status: 400 }
      );
    }

    // Step 8 — Return success
    return NextResponse.json({
      status: 'success',
      phone: data.phone,
      userId: data.userId || null,
    });
  } catch (error) {
    console.error('💥 Unexpected server error:', error);
    return NextResponse.json(
      { status: 'error', message: 'Internal server error.' },
      { status: 500 }
    );
  }
}
