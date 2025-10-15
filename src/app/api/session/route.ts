import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    // Ensure that even if session exists but role is undefined, we send null
    return NextResponse.json({ role: session?.role ?? null });
  } catch (err) {
    // If there's any error getting the session (e.g., misconfigured secret),
    // gracefully return null instead of throwing a 500 error.
    console.error('Error in /api/session:', err);
    return NextResponse.json({ role: null }, { status: 200 });
  }
}
