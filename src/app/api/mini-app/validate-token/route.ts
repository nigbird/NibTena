
import { NextResponse } from 'next/server';

/**
 * Mock endpoint to simulate the Super App's token validation service.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader) {
    return NextResponse.json(
      { error: 'Authorization header is missing' },
      { status: 401 }
    );
  }

  if (!authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { error: 'Malformed Authorization header' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);

  // In a real scenario, you would validate the token against a database or service.
  // For this mock, we'll consider any non-empty token as valid.
  if (!token) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 403 });
  }

  // If the token is "valid", return a dummy phone number.
  return NextResponse.json({
    phone: '912345678', // A hardcoded phone number for testing
    userId: 'user-from-super-app-123',
    status: 'success',
  });
}
