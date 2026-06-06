// All categorization knowledge derived from Jan's accounts.
// Matching priority: variable symbol > IBAN > merchant/description text.
// Edit freely — but the app also learns new rules from the Review inbox.

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
  'Utilities - Gorkého byt',
  'Utilities - Gorkého garzónka',
  'Utilities - Slnečnice',
  'Apartment - Gorkého byt',
  'Apartment - Gorkého garzónka',
  'Apartment - Slnečnice (Mama)',
  'Apartment - Mestská (sold)',
  'Insurance',
  'Investment - mine',
  'Investment - Eliška',
  'Family - Mama (MATI)',
  'Lucia',
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
export const SEED_RULES: SeedRule[] = [
  // ===== BELÁ (everything Belá → one category) =====
  { match: { type: 'iban', value: 'SK1111000000002618510650' }, category: 'Belá', note: 'Ignác Tóth - repairs' },
  { match: { type: 'iban', value: 'SK2856000000004985799002' }, category: 'Belá', note: 'Ildikó - cleaning' },
  { match: { type: 'iban', value: 'SK2511110000001272729000' }, category: 'Belá', note: 'Jozef Matyó - gardener' },
  { match: { type: 'iban', value: 'SK2009000000000233888565' }, category: 'Belá', note: 'Voda Belá - Západoslovenská vodárenská' },
  { match: { type: 'text', value: 'zuzana franova' }, category: 'Belá', note: 'cleaning lady' },
  { match: { type: 'text', value: 'franová' }, category: 'Belá', note: 'cleaning lady' },

  // ===== UTILITIES per property (matched by variable symbol) =====
  { match: { type: 'vs', value: '6310803049' }, category: 'Utilities - Belá' },
  { match: { type: 'vs', value: '6310523837' }, category: 'Utilities - Gorkého byt' },
  { match: { type: 'vs', value: '6310871487' }, category: 'Utilities - Gorkého garzónka' },
  { match: { type: 'vs', value: '6310871495' }, category: 'Utilities - Slnečnice' },
  // ZSE electricity (general)
  { match: { type: 'iban', value: 'SK5281300000002000260100' }, category: 'Utilities - Belá', note: 'ZSE electricity (fallback)' },

  // ===== APARTMENTS (blahobyt = one IBAN, split by variable symbol) =====
  { match: { type: 'vs', value: '1340060070' }, category: 'Apartment - Gorkého byt', note: 'blahobyt' },
  { match: { type: 'vs', value: '1340060040' }, category: 'Apartment - Gorkého garzónka', note: 'blahobyt' },
  { match: { type: 'vs', value: '3160020090' }, category: 'Apartment - Mestská (sold)', note: 'blahobyt - sold last year' },
  // hprobyt = Mama / Slnečnice apartment
  { match: { type: 'iban', value: 'SK2011000000002926890851' }, category: 'Apartment - Slnečnice (Mama)', note: 'hprobyt / správa Slnečnice' },

  // ===== INSURANCE =====
  { match: { type: 'iban', value: 'SK8411000000002623828137' }, category: 'Insurance', note: 'UNIQA - gorkého byt + garzónka' },
  { match: { type: 'iban', value: 'SK9765000000000020135711' }, category: 'Insurance', note: 'Allianz SP' },
  { match: { type: 'vs', value: '5900853374' }, category: 'Insurance', note: 'insurance - Gorkého garzónka' },

  // ===== ELIŠKA =====
  { match: { type: 'text', value: 'eliska gordulic' }, category: 'Investment - Eliška', note: '208 EUR payment' },

  // ===== MORTGAGE / LOANS (SPLATKA ISTINY / UROKU). Over 50k handled as internal in code. =====
  { match: { type: 'text', value: 'splatka istiny' }, category: 'Mortgage / Loans' },
  { match: { type: 'text', value: 'splatka uroku' }, category: 'Mortgage / Loans' },
  { match: { type: 'text', value: 'splátka' }, category: 'Mortgage / Loans' },

  // ===== INVESTMENT =====
  { match: { type: 'iban', value: 'SK7483300000007678876788' }, category: 'Investment - mine', note: 'Investícia / Eliška sporenie - same IBAN, refined below' },
  // (Eliška vs mine share an IBAN; split is handled in categorize.ts by amount/reference)

  // ===== FAMILY =====
  { match: { type: 'iban', value: 'SK9711000000002613042376' }, category: 'Family - Mama (MATI)', note: 'supporting mother' },
  { match: { type: 'iban', value: 'SK0711000000002614444385' }, category: 'Lucia', note: 'wife - 1500 transfers' },

  // ===== PORN (Revolut, beneficiary mmbill) =====
  { match: { type: 'text', value: 'mmbill', account: 'revolut' }, category: 'Porn' },

  // ===== SUBSCRIPTIONS / common merchants (Revolut + Tatra text) =====
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

// IBANs that are Jan's OWN accounts — movements to/from these are INTERNAL transfers
// (kept visible, but excluded from spend/income totals).
export const INTERNAL_OWN_IBANS: string[] = [
  'SK0711000000002004005246', // kreditka (own credit card account)
];

// Text markers that indicate an internal transfer (e.g. topping up Revolut from Tatra)
export const INTERNAL_TEXT_MARKERS: string[] = [
  'revolut',          // Tatra -> Revolut top-ups (Dublin / Revolut**)
];

// Large credits that are the house sale + mortgage repayment → internal, not income.
// These are detected by being a Kredit on Tatra above this threshold from own-loan accounts.
export const HOUSE_SALE_MIN_AMOUNT = 50000;

// Income markers
export const INCOME_VKLAD_MARKERS: string[] = ['vklad', 'vlastný vklad', 'vklad v hotovosti'];
