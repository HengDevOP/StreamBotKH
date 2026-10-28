import { NextResponse } from 'next/server';

export async function POST() {
  return NextResponse.json(
    { error: 'Local demo authentication is disabled. Please sign in with Google.' },
    { status: 403 }
  );
}

export async function GET() {
  return NextResponse.json(
    { error: 'Local demo authentication is disabled. Please sign in with Google.' },
    { status: 403 }
  );
}
