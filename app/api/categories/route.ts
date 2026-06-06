import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const d = db();
  const rows = d.prepare('SELECT name FROM categories ORDER BY name').all() as { name: string }[];
  return NextResponse.json({ categories: rows.map((r) => r.name) });
}

export async function POST(req: NextRequest) {
  const { name } = await req.json();
  if (!name?.trim()) return NextResponse.json({ error: 'name required' }, { status: 400 });
  db().prepare('INSERT OR IGNORE INTO categories(name) VALUES (?)').run(name.trim());
  return NextResponse.json({ ok: true });
}
