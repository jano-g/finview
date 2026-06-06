'use client';
import { useEffect, useState, useCallback } from 'react';

const eur = (n: number) =>
  new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(n || 0);

// Guess a useful keyword from a messy Revolut/Tatra description.
// Skips boilerplate tokens and prefers a meaningful merchant word.
function guessKeyword(desc: string): string {
  const STOP = new Set([
    'eur','usd','nakup','nákup','pos','int','gordulič','gordulic','jan','ján',
    'dublin','tallinn','platba','tpp','sdd','the','and','spotreba','internet','card','payment',
  ]);
  const cleaned = (desc || '')
    .replace(/—/g, ' ')
    .replace(/[*]+/g, ' ')
    .replace(/[0-9]/g, ' ')
    .split(/\s+/)
    .map((w) => w.replace(/[^A-Za-zÀ-ž]/g, '').trim())
    .filter((w) => w.length >= 3 && !STOP.has(w.toLowerCase()));
  const caps = cleaned.find((w) => w === w.toUpperCase() && /[A-Z]/.test(w));
  return (caps || cleaned[0] || desc || '').slice(0, 40);
}

export default function Review() {
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [filter, setFilter] = useState<'uncategorized' | 'vklad' | 'all'>('uncategorized');
  const [q, setQ] = useState('');
  const [newCat, setNewCat] = useState('');
  const [staged, setStaged] = useState<Record<string, string>>({});
  // when set, we are confirming a text-rule keyword for a transaction
  const [ruleModal, setRuleModal] = useState<{ tx: any; keyword: string; category: string } | null>(null);

  const loadCats = useCallback(() => {
    fetch('/api/categories').then((r) => r.json()).then((j) => setCats(j.categories));
  }, []);

  const loadRows = useCallback(() => {
    let url = '/api/transactions?limit=500';
    if (filter === 'uncategorized') url += '&uncategorized=1';
    if (filter === 'vklad') url += '&category=' + encodeURIComponent('Income - business (vklad)');
    if (q) url += '&q=' + encodeURIComponent(q);
    fetch(url).then((r) => r.json()).then((j) => {
      setRows(j.rows);
      const init: Record<string, string> = {};
      j.rows.forEach((r: any) => { init[r.id] = r.category; });
      setStaged(init);
    });
  }, [filter, q]);

  useEffect(() => { loadCats(); }, [loadCats]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const applyOne = async (tx: any) => {
    const category = staged[tx.id] || tx.category;
    await fetch('/api/transactions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tx.id, category }),
    });
    loadRows();
  };

  // Decide how to build a rule. IBAN/VS apply instantly; text opens a confirm modal.
  const startRule = (tx: any) => {
    const category = staged[tx.id] || tx.category;
    if (tx.counterparty_iban) return createRule(tx, 'iban', tx.counterparty_iban, category);
    if (tx.variable_symbol) return createRule(tx, 'vs', tx.variable_symbol, category);
    setRuleModal({ tx, keyword: guessKeyword(tx.description), category });
  };

  const createRule = async (tx: any, match_type: string, match_value: string, category: string) => {
    await fetch('/api/transactions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tx.id, category }),
    });
    await fetch('/api/rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ match_type, match_value, account: tx.account, category }),
    });
    setRuleModal(null);
    loadRows();
  };

  const addCategory = async () => {
    if (!newCat.trim()) return;
    await fetch('/api/categories', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newCat.trim() }),
    });
    setNewCat(''); loadCats();
  };

  const ruleHint = (tx: any) => {
    if (tx.counterparty_iban) return `all to IBAN ...${tx.counterparty_iban.slice(-6)}`;
    if (tx.variable_symbol) return `all with VS ${tx.variable_symbol}`;
    return 'choose keyword to match...';
  };

  const vkladTotal = filter === 'vklad' ? rows.reduce((s, r) => s + r.amount, 0) : 0;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <button className={filter === 'uncategorized' ? '' : 'ghost'} onClick={() => setFilter('uncategorized')}>Needs review</button>
            <button className={filter === 'vklad' ? '' : 'ghost'} onClick={() => setFilter('vklad')}>VKLAD deposits</button>
            <button className={filter === 'all' ? '' : 'ghost'} onClick={() => setFilter('all')}>All</button>
          </div>
          <input type="text" placeholder="Search description..." value={q}
            onChange={(e) => setQ(e.target.value)} style={{ minWidth: 220 }} />
        </div>
        {filter === 'vklad' && (
          <div className="notice section-gap"><b>{rows.length}</b> cash deposits · total <b className="pos">{eur(vkladTotal)}</b></div>
        )}
        <div className="row section-gap">
          <input type="text" placeholder="New category name..." value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button className="ghost" onClick={addCategory}>+ Add category</button>
          <a href="/rules" style={{ marginLeft: 'auto', color: 'var(--accent-2)', fontSize: '0.88rem' }}>Manage rules →</a>
        </div>
        <div className="notice section-gap">
          Pick a category, then <b>Apply</b> (just this one) or <b>+ rule</b> (this one and all similar). For card payments you'll confirm which keyword to match.
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Date</th><th>Account</th><th>Description</th><th style={{ textAlign: 'right' }}>Amount</th><th>Category</th><th>Action</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.date}</td>
                <td><span className="pill">{r.account}</span></td>
                <td style={{ maxWidth: 320 }}>{r.description}</td>
                <td className={'num ' + (r.amount < 0 ? 'neg' : 'pos')}>{eur(r.amount)}</td>
                <td>
                  <select value={staged[r.id] ?? r.category}
                    onChange={(e) => setStaged((s) => ({ ...s, [r.id]: e.target.value }))}>
                    {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <button onClick={() => applyOne(r)}>Apply</button>
                    <button className="ghost" title={ruleHint(r)} onClick={() => startRule(r)}>+ rule</button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 30 }}>
                Nothing here {filter === 'uncategorized' ? '- all categorized!' : ''}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {ruleModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setRuleModal(null)}>
          <div className="card" style={{ maxWidth: 520, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h2>Create rule</h2>
            <p className="muted" style={{ marginBottom: 14 }}>{ruleModal.tx.description}</p>
            <p className="muted" style={{ marginBottom: 6 }}>
              Categorize as <b style={{ color: 'var(--text)' }}>{ruleModal.category}</b> every {ruleModal.tx.account} transaction whose description contains:
            </p>
            <input type="text" value={ruleModal.keyword} style={{ width: '100%', marginBottom: 14 }}
              onChange={(e) => setRuleModal({ ...ruleModal, keyword: e.target.value })}
              autoFocus />
            <div className="notice" style={{ marginBottom: 14 }}>
              Tip: use a distinctive merchant word like <b>STARLINK</b> — not generic words like EUR or POS.
            </div>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="ghost" onClick={() => setRuleModal(null)}>Cancel</button>
              <button disabled={!ruleModal.keyword.trim()}
                onClick={() => createRule(ruleModal.tx, 'text', ruleModal.keyword.trim(), ruleModal.category)}>
                Create rule
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
