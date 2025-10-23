// src/app/api/mini-app/validate-token/route.ts
import { NextResponse } from 'next/server';

/**
 * This route acts as a proxy between your Mini App and the Super App backend.
 * It validates the Authorization token by forwarding it to the Super App's
 * official token validation API.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json(
      { error: 'Authorization header is missing' },
      { status: 401 },
    );
  }

  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Malformed Authorization header' },
      { status: 401 },
    );
  }

  const SUPER_APP_VALIDATION_URL = process.env.SUPER_APP_VALIDATION_URL;

  if (!SUPER_APP_VALIDATION_URL) {
    return NextResponse.json(
      { error: 'SUPER_APP_VALIDATION_URL is not configured' },
      { status: 500 },
    );
  }

  try {
    // Forward the token to the real Super App validation service
    const validationResponse = await fetch(SUPER_APP_VALIDATION_URL, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
        Accept: 'application/json',
      },
      cache: 'no-store',
    });

    const raw = await validationResponse.text();

    if (!validationResponse.ok) {
      return NextResponse.json(
        { error: `Super App validation failed: ${validationResponse.status} - ${raw}` },
        { status: validationResponse.status },
      );
    }

    const data = JSON.parse(raw);

    // Example: Expecting { phone: "09..." } in response
    if (!data.phone) {
      return NextResponse.json(
        { error: 'Phone number not found in Super App response.' },
        { status: 400 },
      );
    }

    return NextResponse.json({
      phone: data.phone,
      userId: data.userId,
      status: 'success',
    });
  } catch (err) {
    console.error('Error contacting Super App validation service:', err);
    return NextResponse.json(
      { error: 'Failed to connect to Super App validation service.' },
      { status: 500 },
    );
  }
}
