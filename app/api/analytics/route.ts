import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Per-month, per-category spend & income (internal transfers excluded).
// The client aggregates this into Month/Year/All × Category/Group × Spending/Income.
export async function GET() {
  const d = db();

  const rows = d
    .prepare(`
      SELECT
        month,
        category,
        SUM(CASE WHEN amount < 0 AND is_internal = 0 THEN -amount ELSE 0 END) AS spend,
        SUM(CASE WHEN amount > 0 AND is_internal = 0 THEN  amount ELSE 0 END) AS income,
        COUNT(*) AS n
      FROM transactions
      WHERE is_internal = 0
      GROUP BY month, category
      ORDER BY month
    `)
    .all();

  // Distinct months and years available, for the period picker.
  const months = d
    .prepare(`SELECT DISTINCT month FROM transactions ORDER BY month`)
    .all() as { month: string }[];

  return NextResponse.json({
    rows,
    months: months.map((m) => m.month),
  });
}
