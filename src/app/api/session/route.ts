import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET(request: Request) {
  try {
    const session = await getSession();
    return NextResponse.json({ role: session?.role ?? null });
  } catch (err) {
    return NextResponse.json({ role: null }, { status: 200 });
  }
}
