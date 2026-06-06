import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { SEED_CATEGORIES, SEED_RULES } from './rules';

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const DB_PATH = path.join(DATA_DIR, 'finance.db');

// Use a global singleton so every API route shares ONE connection.
// Without this, Next.js can instantiate multiple modules -> multiple
// SQLite connections -> writes from one not visible to reads from another.
const g = globalThis as unknown as { __finviewDb?: Database.Database };

export function db(): Database.Database {
  if (g.__finviewDb) return g.__finviewDb;
  const conn = new Database(DB_PATH);
  conn.pragma('journal_mode = WAL');
  init(conn);
  g.__finviewDb = conn;
  return conn;
}

function init(d: Database.Database) {
  d.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,            -- dedup hash
      account TEXT NOT NULL,          -- 'revolut' | 'tatra'
      date TEXT NOT NULL,             -- ISO yyyy-mm-dd
      month TEXT NOT NULL,            -- yyyy-mm
      description TEXT,
      counterparty_iban TEXT,
      variable_symbol TEXT,
      amount REAL NOT NULL,           -- signed: negative = out, positive = in
      currency TEXT DEFAULT 'EUR',
      category TEXT NOT NULL DEFAULT 'Uncategorized',
      is_internal INTEGER NOT NULL DEFAULT 0,
      auto_categorized INTEGER NOT NULL DEFAULT 1,
      raw TEXT
    );
    CREATE TABLE IF NOT EXISTS categories (
      name TEXT PRIMARY KEY
    );
    CREATE TABLE IF NOT EXISTS rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      match_type TEXT NOT NULL,       -- 'vs' | 'iban' | 'text'
      match_value TEXT NOT NULL,
      account TEXT,                   -- optional scope
      category TEXT NOT NULL,
      note TEXT,
      user_created INTEGER NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_tx_month ON transactions(month);
    CREATE INDEX IF NOT EXISTS idx_tx_cat ON transactions(category);
  `);

  const seeded = d.prepare('SELECT COUNT(*) c FROM categories').get() as { c: number };
  if (seeded.c === 0) {
    const insC = d.prepare('INSERT OR IGNORE INTO categories(name) VALUES (?)');
    for (const c of SEED_CATEGORIES) insC.run(c);
    const insR = d.prepare(
      'INSERT INTO rules(match_type, match_value, account, category, note, user_created) VALUES (?,?,?,?,?,0)'
    );
    for (const r of SEED_RULES) {
      const m: any = r.match;
      const type = m.type === 'iban_amount' ? 'iban' : m.type;
      insR.run(type, m.value, m.account ?? null, r.category, r.note ?? null);
    }
  }
}
