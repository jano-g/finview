import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { parseRevolut } from '@/lib/parsers/revolut';
import { parseTatra } from '@/lib/parsers/tatra';
import { categorize } from '@/lib/categorize';
import { db } from '@/lib/db';
import { ParsedTx } from '@/lib/types';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function detectFormat(filename: string, text: string): 'revolut' | 'tatra' {
  const head = text.slice(0, 500);
  if (head.includes('Dátum spracovania') || head.includes('Variabilný symbol')) return 'tatra';
  if (head.includes('Started Date') && head.includes('Completed Date')) return 'revolut';
  // fallback by filename
  return /revolut/i.test(filename) ? 'revolut' : 'tatra';
}

export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();
    const files = form.getAll('files') as File[];
    if (!files.length) return NextResponse.json({ error: 'No files' }, { status: 400 });

    let parsed: ParsedTx[] = [];
    const report: { file: string; format: string; rows: number }[] = [];

    for (const f of files) {
      const buf = Buffer.from(await f.arrayBuffer());
      let text: string;
      // xlsx -> convert to csv text
      if (/\.xlsx?$/i.test(f.name)) {
        const wb = XLSX.read(buf, { type: 'buffer' });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        text = XLSX.utils.sheet_to_csv(sheet);
      } else {
        text = buf.toString('utf-8');
      }
      const fmt = detectFormat(f.name, text);
      const rows = fmt === 'revolut' ? parseRevolut(text) : parseTatra(text);
      parsed = parsed.concat(rows);
      report.push({ file: f.name, format: fmt, rows: rows.length });
    }

    // categorize + upsert (dedup on id)
    const d = db();
    const ins = d.prepare(`
      INSERT INTO transactions
        (id, account, date, month, description, counterparty_iban, variable_symbol,
         amount, currency, category, is_internal, auto_categorized, raw)
      VALUES (@id,@account,@date,@month,@description,@counterparty_iban,@variable_symbol,
              @amount,@currency,@category,@is_internal,@auto_categorized,@raw)
      ON CONFLICT(id) DO NOTHING
    `);
    let inserted = 0;
    const tx = d.transaction((items: ParsedTx[]) => {
      for (const t of items) {
        const c = categorize(t);
        const res = ins.run({
          ...c,
          is_internal: c.is_internal ? 1 : 0,
          auto_categorized: c.auto_categorized ? 1 : 0,
        });
        inserted += res.changes;
      }
    });
    tx(parsed);

    const uncategorized = d
      .prepare("SELECT COUNT(*) c FROM transactions WHERE category='Uncategorized'")
      .get() as { c: number };

    return NextResponse.json({
      ok: true,
      report,
      totalParsed: parsed.length,
      inserted,
      duplicatesSkipped: parsed.length - inserted,
      uncategorized: uncategorized.c,
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
