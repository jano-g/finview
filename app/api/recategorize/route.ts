import { NextResponse } from 'next/server';
import { recategorizeAll } from '@/lib/categorize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  recategorizeAll();
  return NextResponse.json({ ok: true });
}
