import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const d = db();

  // Monthly totals (excluding internal)
  const monthly = d
    .prepare(`
      SELECT month,
        SUM(CASE WHEN amount < 0 AND is_internal=0 THEN -amount ELSE 0 END) AS spend,
        SUM(CASE WHEN amount > 0 AND is_internal=0 THEN amount ELSE 0 END) AS income
      FROM transactions
      GROUP BY month ORDER BY month
    `)
    .all();

  // Spend by category (all time, excluding internal & income)
  const byCategory = d
    .prepare(`
      SELECT category, SUM(-amount) AS total, COUNT(*) AS n
      FROM transactions
      WHERE amount < 0 AND is_internal=0
      GROUP BY category ORDER BY total DESC
    `)
    .all();

  // Per-month per-category (for compare)
  const monthCategory = d
    .prepare(`
      SELECT month, category, SUM(-amount) AS total
      FROM transactions
      WHERE amount < 0 AND is_internal=0
      GROUP BY month, category
    `)
    .all();

  const totals = d
    .prepare(`
      SELECT
        SUM(CASE WHEN amount<0 AND is_internal=0 THEN -amount ELSE 0 END) AS spend,
        SUM(CASE WHEN amount>0 AND is_internal=0 THEN amount ELSE 0 END) AS income,
        COUNT(*) AS n
      FROM transactions
    `)
    .get();

  const uncategorized = d
    .prepare("SELECT COUNT(*) c FROM transactions WHERE category='Uncategorized'")
    .get() as { c: number };

  // VKLAD (cash deposit) income — Jan's business income, surfaced separately
  const vkladByMonth = d
    .prepare(`
      SELECT month, SUM(amount) AS total, COUNT(*) AS n
      FROM transactions
      WHERE category='Income - business (vklad)' AND is_internal=0
      GROUP BY month ORDER BY month
    `)
    .all();
  const vkladTotal = d
    .prepare(`
      SELECT SUM(amount) AS total, COUNT(*) AS n
      FROM transactions
      WHERE category='Income - business (vklad)' AND is_internal=0
    `)
    .get();

  return NextResponse.json({
    monthly,
    byCategory,
    monthCategory,
    totals,
    uncategorized: uncategorized.c,
    vkladByMonth,
    vkladTotal,
  });
}
