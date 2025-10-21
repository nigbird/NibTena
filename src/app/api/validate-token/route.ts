import { NextResponse, type NextRequest } from 'next/server';

/**
 * MOCK API Endpoint for Step 2: Token Validation
 * This endpoint simulates the Super App's validation server.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json(
      { success: false, message: 'Authorization header is missing or malformed.' },
      { status: 401 }
    );
  }

  const token = authHeader.substring(7);

  // In a real scenario, you would validate this token against a database or auth service.
  // For this mock, we will consider any non-empty token as valid.
  if (!token) {
    return NextResponse.json(
      { success: false, message: 'Bearer token is missing.' },
      { status: 401 }
    );
  }

  // If the token is "valid" (i.e., exists), return the mock phone number.
  return NextResponse.json({
    phone: '912345678', // Hardcoded phone number for testing
    message: 'Token validated successfully.',
  });
}
