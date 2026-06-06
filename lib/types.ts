export interface ParsedTx {
  id: string;
  account: 'revolut' | 'tatra';
  date: string;          // yyyy-mm-dd
  month: string;         // yyyy-mm
  description: string;
  counterparty_iban: string | null;
  variable_symbol: string | null;
  amount: number;        // signed
  currency: string;
  raw: string;
}
