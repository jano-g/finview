import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { recategorizeAll } from '@/lib/categorize';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const rows = db().prepare('SELECT * FROM rules ORDER BY id DESC').all();
  return NextResponse.json({ rules: rows });
}

// Create a rule learned from the Review inbox, then recategorize matching txns.
// body: { match_type:'iban'|'vs'|'text', match_value, account?, category, applyTo?: txId }
export async function POST(req: NextRequest) {
  const { match_type, match_value, account, category } = await req.json();
  if (!match_type || !match_value || !category)
    return NextResponse.json({ error: 'match_type, match_value, category required' }, { status: 400 });

  const d = db();
  d.prepare('INSERT OR IGNORE INTO categories(name) VALUES (?)').run(category);
  d.prepare(
    'INSERT INTO rules(match_type, match_value, account, category, note, user_created) VALUES (?,?,?,?,?,1)'
  ).run(match_type, match_value, account || null, category, 'learned from review');

  try {
    recategorizeAll();
  } catch (e) {
    console.error('recategorizeAll failed:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
  db().prepare('DELETE FROM rules WHERE id=?').run(id);
  recategorizeAll();
  return NextResponse.json({ ok: true });
}
