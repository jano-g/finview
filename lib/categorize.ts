import { db } from './db';
import { ParsedTx } from './types';
import {
  INTERNAL_OWN_IBANS,
  INTERNAL_TEXT_MARKERS,
  HOUSE_SALE_MIN_AMOUNT,
  INCOME_VKLAD_MARKERS,
} from './rules';

interface RuleRow {
  match_type: string;
  match_value: string;
  account: string | null;
  category: string;
}

export interface Categorized extends ParsedTx {
  category: string;
  is_internal: boolean;
  auto_categorized: boolean;
}

export function loadRules(): RuleRow[] {
  return db()
    .prepare('SELECT match_type, match_value, account, category FROM rules')
    .all() as RuleRow[];
}

export function detectInternal(tx: ParsedTx): boolean {
  const desc = tx.description.toLowerCase();

  // Own-account transfers (e.g. credit card account)
  if (tx.counterparty_iban && INTERNAL_OWN_IBANS.includes(tx.counterparty_iban)) return true;

  // Tatra -> Revolut top-ups (out side) and Revolut "Top-up by" (in side)
  if (INTERNAL_TEXT_MARKERS.some((m) => desc.includes(m))) return true;
  if (tx.account === 'revolut' && desc.startsWith('top-up by')) return true;

  // House sale + mortgage repayment: very large amounts on Tatra
  if (tx.account === 'tatra' && Math.abs(tx.amount) >= HOUSE_SALE_MIN_AMOUNT) return true;

  return false;
}

function applyRules(tx: ParsedTx, rules: RuleRow[]): string | null {
  // Priority: variable symbol > IBAN > text
  const vsRules = rules.filter((r) => r.match_type === 'vs');
  const ibanRules = rules.filter((r) => r.match_type === 'iban');
  const textRules = rules.filter((r) => r.match_type === 'text');

  if (tx.variable_symbol) {
    for (const r of vsRules) {
      if (tx.variable_symbol === r.match_value) return r.category;
    }
  }
  if (tx.counterparty_iban) {
    for (const r of ibanRules) {
      if (tx.counterparty_iban === r.match_value) return refine(tx, r.category);
    }
  }
  const desc = tx.description.toLowerCase();
  for (const r of textRules) {
    if (r.account && r.account !== tx.account) continue;
    if (desc.includes(r.match_value.toLowerCase())) return r.category;
  }
  return null;
}

// Investment IBAN is shared by "Investment - mine" and "Eliška sporenie".
// Heuristic: ~350 EUR = Eliška sporenie, larger = mine. Reference text overrides.
function refine(tx: ParsedTx, category: string): string {
  if (category === 'Investment - mine') {
    const d = tx.description.toLowerCase();
    if (d.includes('eli') || d.includes('eliška') || d.includes('eliska') || d.includes('sporenie'))
      return 'Investment - Eliška';
    if (Math.abs(tx.amount) <= 400) return 'Investment - Eliška';
  }
  return category;
}

export function categorize(tx: ParsedTx, rules?: RuleRow[]): Categorized {
  const internal = detectInternal(tx);

  if (internal) {
    return { ...tx, category: 'Internal transfer', is_internal: true, auto_categorized: true };
  }

  // Income detection (positive amounts)
  if (tx.amount > 0) {
    const desc = tx.description.toLowerCase();
    if (INCOME_VKLAD_MARKERS.some((m) => desc.includes(m))) {
      return { ...tx, category: 'Income - business (vklad)', is_internal: false, auto_categorized: true };
    }
  }

  const activeRules = rules ?? loadRules();
  const matched = applyRules(tx, activeRules);
  if (matched) {
    return { ...tx, category: matched, is_internal: false, auto_categorized: true };
  }

  // Fallback for income with no rule
  if (tx.amount > 0) {
    return { ...tx, category: 'Income - other', is_internal: false, auto_categorized: true };
  }

  return { ...tx, category: 'Uncategorized', is_internal: false, auto_categorized: false };
}

// Re-run categorization across all stored transactions (after new rule added).
// Rules are loaded once before the write transaction to avoid nested DB calls.
export function recategorizeAll() {
  const d = db();
  const rules = loadRules();
  const rows = d.prepare('SELECT * FROM transactions').all() as any[];
  const upd = d.prepare(
    'UPDATE transactions SET category=?, is_internal=?, auto_categorized=? WHERE id=?'
  );
  const runBatch = d.transaction((items: any[]) => {
    for (const r of items) {
      // don't override user manual categorization (auto_categorized=0 AND not Uncategorized)
      const isManual = r.auto_categorized === 0 && r.category !== 'Uncategorized';
      if (isManual) continue;
      const c = categorize({
        id: r.id,
        account: r.account,
        date: r.date,
        month: r.month,
        description: r.description,
        counterparty_iban: r.counterparty_iban,
        variable_symbol: r.variable_symbol,
        amount: r.amount,
        currency: r.currency,
        raw: r.raw,
      }, rules);
      upd.run(c.category, c.is_internal ? 1 : 0, c.auto_categorized ? 1 : 0, r.id);
    }
  });
  runBatch(rows);
}
