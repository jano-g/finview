import Papa from 'papaparse';
import crypto from 'crypto';
import { ParsedTx } from '../types';

// Revolut export columns:
// Type,Product,Started Date,Completed Date,Description,Amount,Fee,Currency,State,Balance
export function parseRevolut(csv: string): ParsedTx[] {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const out: ParsedTx[] = [];
  for (const row of data) {
    const state = (row['State'] || '').trim();
    if (state && state !== 'COMPLETED') continue; // skip pending/reverted

    const amount = parseFloat(row['Amount']);
    if (isNaN(amount)) continue;

    const completed = (row['Completed Date'] || row['Started Date'] || '').trim();
    const date = completed.slice(0, 10); // yyyy-mm-dd
    if (!date) continue;

    const description = (row['Description'] || '').trim();
    const type = (row['Type'] || '').trim();

    const raw = JSON.stringify(row);
    const id =
      'rev_' +
      crypto
        .createHash('sha1')
        .update(`${type}|${completed}|${amount}|${description}|${row['Balance'] || ''}`)
        .digest('hex')
        .slice(0, 16);

    out.push({
      id,
      account: 'revolut',
      date,
      month: date.slice(0, 7),
      description: type === 'Exchange' ? `${description} (Exchange)` : description,
      counterparty_iban: null,
      variable_symbol: null,
      amount,
      currency: (row['Currency'] || 'EUR').trim(),
      raw,
    });
  }
  return out;
}
