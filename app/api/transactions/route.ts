import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const d = db();
  const sp = req.nextUrl.searchParams;
  const month = sp.get('month');
  const category = sp.get('category');
  const q = sp.get('q');
  const uncategorizedOnly = sp.get('uncategorized') === '1';
  const limit = Math.min(parseInt(sp.get('limit') || '200'), 1000);

  const where: string[] = [];
  const params: any = {};
  if (month) { where.push('month = @month'); params.month = month; }
  if (category) { where.push('category = @category'); params.category = category; }
  if (uncategorizedOnly) where.push("category = 'Uncategorized'");
  if (q) { where.push('LOWER(description) LIKE @q'); params.q = `%${q.toLowerCase()}%`; }

  const sql = `SELECT * FROM transactions ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY date DESC LIMIT ${limit}`;
  const rows = d.prepare(sql).all(params);
  return NextResponse.json({ rows });
}

// Update a single transaction's category (manual override)
export async function PATCH(req: NextRequest) {
  const { id, category } = await req.json();
  if (!id || !category) return NextResponse.json({ error: 'id and category required' }, { status: 400 });
  const d = db();
  d.prepare('UPDATE transactions SET category=?, auto_categorized=0 WHERE id=?').run(category, id);
  return NextResponse.json({ ok: true });
}
