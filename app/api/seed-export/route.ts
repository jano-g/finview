import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SEED_CATEGORIES } from '@/lib/rules';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  const d = db();

  // User-created rules only (seed rules are already in rules.ts)
  const userRules = d.prepare(
    'SELECT match_type, match_value, account, category, note FROM rules WHERE user_created=1 ORDER BY id'
  ).all() as any[];

  // Categories not already in the hardcoded seed list
  const allCats = (d.prepare('SELECT name FROM categories ORDER BY name').all() as { name: string }[]).map(r => r.name);
  const seedSet = new Set(SEED_CATEGORIES);
  const customCats = allCats.filter(c => !seedSet.has(c));

  // Format as TypeScript to paste into lib/rules.ts
  const catLines = customCats.map(c => `  '${c}',`).join('\n');
  const ruleLines = userRules.map(r => {
    const match = r.account
      ? `{ type: '${r.match_type}', value: '${r.match_value}', account: '${r.account}' as const }`
      : `{ type: '${r.match_type}', value: '${r.match_value}' }`;
    const note = r.note ? `, note: '${r.note}'` : '';
    return `  { match: ${match}, category: '${r.category}'${note} },`;
  }).join('\n');

  const output = [
    '/* ── PASTE INTO lib/rules.ts ───────────────────────────────────────── */',
    '',
    customCats.length
      ? `// Add these to SEED_CATEGORIES:\n${catLines}`
      : '// No custom categories to add.',
    '',
    userRules.length
      ? `// Add these to SEED_RULES:\n${ruleLines}`
      : '// No user-created rules to add.',
    '',
    '/* ──────────────────────────────────────────────────────────────────── */',
  ].join('\n');

  return new NextResponse(output, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
}
