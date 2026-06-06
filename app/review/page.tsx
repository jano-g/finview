'use client';
import { useEffect, useState, useCallback } from 'react';

const eur = (n: number) =>
  new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(n || 0);

export default function Review() {
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [filter, setFilter] = useState<'uncategorized' | 'vklad' | 'all'>('uncategorized');
  const [q, setQ] = useState('');
  const [newCat, setNewCat] = useState('');

  const loadCats = useCallback(() => {
    fetch('/api/categories').then((r) => r.json()).then((j) => setCats(j.categories));
  }, []);

  const loadRows = useCallback(() => {
    let url = '/api/transactions?limit=500';
    if (filter === 'uncategorized') url += '&uncategorized=1';
    if (filter === 'vklad') url += '&category=' + encodeURIComponent('Income - business (vklad)');
    if (q) url += '&q=' + encodeURIComponent(q);
    fetch(url).then((r) => r.json()).then((j) => setRows(j.rows));
  }, [filter, q]);

  useEffect(() => { loadCats(); }, [loadCats]);
  useEffect(() => { loadRows(); }, [loadRows]);

  // Assign category to one tx + optionally make a rule for similar
  const assign = async (tx: any, category: string, makeRule: boolean) => {
    await fetch('/api/transactions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tx.id, category }),
    });
    if (makeRule) {
      // prefer IBAN, then variable symbol, then a text token
      let match_type = 'text', match_value = tx.description?.split(' ')[0] || '';
      if (tx.counterparty_iban) { match_type = 'iban'; match_value = tx.counterparty_iban; }
      else if (tx.variable_symbol) { match_type = 'vs'; match_value = tx.variable_symbol; }
      await fetch('/api/rules', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ match_type, match_value, account: tx.account, category }),
      });
    }
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

  const vkladTotal = filter === 'vklad' ? rows.reduce((s, r) => s + r.amount, 0) : 0;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <button className={filter === 'uncategorized' ? '' : 'ghost'} onClick={() => setFilter('uncategorized')}>
              Needs review
            </button>
            <button className={filter === 'vklad' ? '' : 'ghost'} onClick={() => setFilter('vklad')}>
              💰 VKLAD deposits
            </button>
            <button className={filter === 'all' ? '' : 'ghost'} onClick={() => setFilter('all')}>
              All
            </button>
          </div>
          <input type="text" placeholder="Search description…" value={q}
            onChange={(e) => setQ(e.target.value)} style={{ minWidth: 220 }} />
        </div>
        {filter === 'vklad' && (
          <div className="notice section-gap">
            <b>{rows.length}</b> cash deposits · total <b className="pos">{eur(vkladTotal)}</b>
          </div>
        )}
        <div className="row section-gap">
          <input type="text" placeholder="New category name…" value={newCat}
            onChange={(e) => setNewCat(e.target.value)} />
          <button className="ghost" onClick={addCategory}>+ Add category</button>
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th>Date</th><th>Account</th><th>Description</th>
              <th style={{ textAlign: 'right' }}>Amount</th><th>Assign</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.date}</td>
                <td><span className="pill">{r.account}</span></td>
                <td style={{ maxWidth: 360 }}>{r.description}</td>
                <td className={'num ' + (r.amount < 0 ? 'neg' : 'pos')}>{eur(r.amount)}</td>
                <td>
                  <div className="row">
                    <select defaultValue={r.category}
                      onChange={(e) => assign(r, e.target.value, false)}>
                      {cats.map((c) => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <button className="ghost" title="Apply to all similar (by IBAN / symbol)"
                      onClick={() => {
                        const sel = (document.activeElement as any);
                        const row = sel?.closest('tr');
                        const val = row?.querySelector('select')?.value || r.category;
                        assign(r, val, true);
                      }}>
                      + rule
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ textAlign: 'center', padding: 30 }}>
                Nothing here {filter === 'uncategorized' ? '— all categorized! 🎉' : ''}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
