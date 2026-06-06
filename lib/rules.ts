// FinView categorization rules.
// Matching priority: variable symbol > IBAN > merchant text.
// Edit here to match your own accounts, or create rules live in the Review tab.

export interface SeedRule {
  match:
    | { type: 'vs'; value: string }            // Tatra variable symbol (exact)
    | { type: 'iban'; value: string }           // IBAN (exact)
    | { type: 'iban_amount'; value: string; minAmount?: number; maxAmount?: number }
    | { type: 'text'; value: string }           // case-insensitive substring of description
    | { type: 'text'; value: string; account: 'revolut' | 'tatra' };
  category: string;
  note?: string;
}

// ---- Category master list (user can add more in-app) ----
export const SEED_CATEGORIES: string[] = [
  'Belá',
  'Utilities - Belá',
  'Utilities - Apartment 1',
  'Utilities - Apartment 2',
  'Utilities - Apartment 3',
  'Apartment - 1',
  'Apartment - 2',
  'Apartment - 3',
  'Insurance',
  'Investment - mine',
  'Investment - savings',
  'Family',
  'Partner',
  'Porn',
  'Food & Groceries',
  'Transport',
  'Subscriptions',
  'Donations',
  'Mortgage / Loans',
  'Shopping',
  'Income - business (vklad)',
  'Income - other',
  'Internal transfer',
  'Other',
  'Uncategorized',
];

// ---- Seed rules ----
// Replace the placeholder IBANs below with your real account numbers.
export const SEED_RULES: SeedRule[] = [

  // ===== PROPERTY / SUMMER HOUSE =====
  // Add IBANs for people/services you pay regularly for your property:
  // { match: { type: 'iban', value: 'SK...' }, category: 'Belá', note: 'repairs' },
  // { match: { type: 'iban', value: 'SK...' }, category: 'Belá', note: 'cleaning' },
  // { match: { type: 'iban', value: 'SK...' }, category: 'Belá', note: 'gardener' },
  // { match: { type: 'iban', value: 'SK...' }, category: 'Belá', note: 'water utility' },

  // ===== UTILITIES per property (matched by variable symbol) =====
  // { match: { type: 'vs', value: '6310803049' }, category: 'Utilities - Belá' },
  // { match: { type: 'vs', value: '6310523837' }, category: 'Utilities - Apartment 1' },
  // { match: { type: 'vs', value: '6310871487' }, category: 'Utilities - Apartment 2' },
  // { match: { type: 'vs', value: '6310871495' }, category: 'Utilities - Apartment 3' },
  // ZSE / electricity fallback by IBAN:
  // { match: { type: 'iban', value: 'SK...' }, category: 'Utilities - Belá', note: 'electricity' },

  // ===== APARTMENTS (split by variable symbol if same IBAN) =====
  // { match: { type: 'vs', value: '...' }, category: 'Apartment - 1', note: 'management company' },
  // { match: { type: 'vs', value: '...' }, category: 'Apartment - 2', note: 'management company' },
  // { match: { type: 'iban', value: 'SK...' }, category: 'Apartment - 3', note: 'management company' },

  // ===== INSURANCE =====
  { match: { type: 'iban', value: 'SK8411000000002623828137' }, category: 'Insurance', note: 'UNIQA' },
  { match: { type: 'iban', value: 'SK9765000000000020135711' }, category: 'Insurance', note: 'Allianz' },
  // { match: { type: 'vs', value: '...' }, category: 'Insurance' },

  // ===== MORTGAGE / LOANS =====
  { match: { type: 'text', value: 'splatka istiny' }, category: 'Mortgage / Loans' },
  { match: { type: 'text', value: 'splatka uroku' }, category: 'Mortgage / Loans' },
  { match: { type: 'text', value: 'splátka' }, category: 'Mortgage / Loans' },

  // ===== INVESTMENT =====
  // If two purposes share one IBAN, use the iban_amount type + the refine() logic in categorize.ts:
  // { match: { type: 'iban', value: 'SK...' }, category: 'Investment - mine', note: 'shared IBAN, refined by amount/text' },

  // ===== FAMILY / PARTNER =====
  // { match: { type: 'iban', value: 'SK...' }, category: 'Family', note: 'monthly support' },
  // { match: { type: 'iban', value: 'SK...' }, category: 'Partner', note: 'monthly transfer' },

  // ===== PORN (Revolut, beneficiary mmbill) =====
  { match: { type: 'text', value: 'mmbill', account: 'revolut' }, category: 'Porn' },

  // ===== SUBSCRIPTIONS =====
  { match: { type: 'text', value: 'spotify' }, category: 'Subscriptions' },
  { match: { type: 'text', value: 'netflix' }, category: 'Subscriptions' },
  { match: { type: 'text', value: 'dakboard' }, category: 'Subscriptions' },
  { match: { type: 'text', value: 'google' }, category: 'Subscriptions' },
  { match: { type: 'text', value: 'apple.com' }, category: 'Subscriptions' },
  { match: { type: 'text', value: 'openai' }, category: 'Subscriptions' },
  { match: { type: 'text', value: 'anthropic' }, category: 'Subscriptions' },
  { match: { type: 'text', value: 'busa fitn' }, category: 'Subscriptions', note: 'gym' },

  // ===== DONATIONS =====
  { match: { type: 'text', value: 'signal.org' }, category: 'Donations' },

  // ===== TRANSPORT =====
  { match: { type: 'text', value: 'bolt.eu' }, category: 'Transport' },
  { match: { type: 'text', value: 'dopravný podnik' }, category: 'Transport' },
  { match: { type: 'text', value: 'goscooters' }, category: 'Transport' },
  { match: { type: 'text', value: 'dpb' }, category: 'Transport' },

  // ===== FOOD & GROCERIES =====
  { match: { type: 'text', value: 'billa' }, category: 'Food & Groceries' },
  { match: { type: 'text', value: 'yeme' }, category: 'Food & Groceries' },
  { match: { type: 'text', value: 'lidl' }, category: 'Food & Groceries' },
  { match: { type: 'text', value: 'tesco' }, category: 'Food & Groceries' },
  { match: { type: 'text', value: 'kaufland' }, category: 'Food & Groceries' },
  { match: { type: 'text', value: 'bistro' }, category: 'Food & Groceries' },
  { match: { type: 'text', value: 'bao brothers' }, category: 'Food & Groceries' },
];

// ---- Your own account IBANs ----
// Transfers to/from these are tagged "Internal transfer" and excluded from totals.
// Add your own accounts here (savings, credit card, etc.).
export const INTERNAL_OWN_IBANS: string[] = [
  // 'SK...',   // e.g. your credit card repayment account
];

// Text markers that indicate an internal transfer (e.g. topping up Revolut from Tatra).
export const INTERNAL_TEXT_MARKERS: string[] = [
  'revolut',
];

// Tatra transactions above this amount are treated as internal (house sale, large repayments).
export const HOUSE_SALE_MIN_AMOUNT = 50000;

// Tatra cash deposit markers → "Income - business (vklad)"
export const INCOME_VKLAD_MARKERS: string[] = ['vklad', 'vlastný vklad', 'vklad v hotovosti'];
