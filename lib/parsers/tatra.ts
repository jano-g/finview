import Papa from 'papaparse';
import crypto from 'crypto';
import { ParsedTx } from '../types';

// Tatra banka export columns (Slovak, semicolon? no — comma, quoted):
// "Dátum spracovania","Dátum zúčtovania",Suma,Mena,Typ,"Predčíslie","Číslo účtu",
// "Kód banky",IBAN,"Variabilný symbol","Špecifický symbol","Konštantný symbol",
// "Referencia platiteľa","Informácia pre príjemcu",Popis
//
// Quirks:
//  - Suma is positive string with comma decimal ("10,99"); sign comes from Typ.
//  - Typ: "Debet" = money out (negative), "Kredit" = money in (positive).
//  - Variable symbol must be read as a STRING (avoid float precision loss).
//  - Date format dd.mm.yyyy.

function slovakAmount(s: string): number {
  // "1 234,56" -> 1234.56
  return parseFloat((s || '').replace(/\s/g, '').replace(/\./g, '').replace(',', '.'));
}

function isoDate(d: string): string {
  // dd.mm.yyyy -> yyyy-mm-dd
  const m = (d || '').trim().match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  if (!m) return '';
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function parseTatra(csv: string): ParsedTx[] {
  const { data } = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  });

  const out: ParsedTx[] = [];
  for (const row of data) {
    const typ = (row['Typ'] || '').trim();
    const magnitude = slovakAmount(row['Suma']);
    if (isNaN(magnitude)) continue;

    const sign = typ.toLowerCase().startsWith('debet') ? -1 : 1;
    const amount = sign * magnitude;

    const date = isoDate(row['Dátum zúčtovania'] || row['Dátum spracovania']);
    if (!date) continue;

    const iban = (row['IBAN'] || '').trim() || null;
    // variable symbol: strip any non-digits, keep as string
    const vsRaw = (row['Variabilný symbol'] || '').trim();
    const variable_symbol = vsRaw ? vsRaw.replace(/\D/g, '') || null : null;

    const descParts = [
      row['Popis'],
      row['Informácia pre príjemcu'],
      row['Referencia platiteľa'],
    ]
      .map((x) => (x || '').trim())
      .filter(Boolean);
    const description = descParts.join(' — ') || 'Tatra transakcia';

    const raw = JSON.stringify(row);
    const id =
      'tat_' +
      crypto
        .createHash('sha1')
        .update(`${date}|${amount}|${iban || ''}|${variable_symbol || ''}|${description}`)
        .digest('hex')
        .slice(0, 16);

    out.push({
      id,
      account: 'tatra',
      date,
      month: date.slice(0, 7),
      description,
      counterparty_iban: iban,
      variable_symbol,
      amount,
      currency: (row['Mena'] || 'EUR').trim(),
      raw,
    });
  }
  return out;
}
