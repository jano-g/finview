'use client';
import { useEffect, useState, useCallback } from 'react';

const eur = (n: number) =>
  new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR' }).format(n || 0);

function guessKeyword(desc: string): string {
  const STOP = new Set([
    'eur','usd','nakup','nákup','pos','int',
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

type SortCol = 'date' | 'description' | 'amount';

export default function Review() {
  const [rows, setRows] = useState<any[]>([]);
  const [cats, setCats] = useState<string[]>([]);
  const [filter, setFilter] = useState<'uncategorized' | 'vklad' | 'all'>('uncategorized');
  const [q, setQ] = useState('');
  const [newCat, setNewCat] = useState('');
  const [staged, setStaged] = useState<Record<string, string>>({});
  const [ruleModal, setRuleModal] = useState<{ tx: any; keyword: string; category: string } | null>(null);

  const [sortBy, setSortBy] = useState<SortCol>('date');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkCat, setBulkCat] = useState('');
  const [renameModal, setRenameModal] = useState(false);
  const [renameFrom, setRenameFrom] = useState('');
  const [renameTo, setRenameTo] = useState('');
  // Drill-down filter from URL (?category=...&month=...)
  const [categoryFilter, setCategoryFilter] = useState('');
  const [monthFilter, setMonthFilter] = useState('');

  // Read drill-down params on mount.
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const cat = sp.get('category');
    const mon = sp.get('month');
    if (cat) { setCategoryFilter(cat); setFilter('all'); }
    if (mon) setMonthFilter(mon);
  }, []);

  const loadCats = useCallback(() => {
    fetch('/api/categories').then((r) => r.json()).then((j) => {
      setCats(j.categories);
      if (!bulkCat && j.categories.length) setBulkCat(j.categories[0]);
    });
  }, []);

  const loadRows = useCallback(() => {
    let url = '/api/transactions?limit=500';
    if (categoryFilter) {
      url += '&category=' + encodeURIComponent(categoryFilter);
      if (monthFilter) url += '&month=' + encodeURIComponent(monthFilter);
    } else {
      if (filter === 'uncategorized') url += '&uncategorized=1';
      if (filter === 'vklad') url += '&category=' + encodeURIComponent('Income - business (vklad)');
    }
    if (q) url += '&q=' + encodeURIComponent(q);
    fetch(url).then((r) => r.json()).then((j) => {
      setRows(j.rows);
      setSelected(new Set());
      const init: Record<string, string> = {};
      j.rows.forEach((r: any) => { init[r.id] = r.category; });
      setStaged(init);
    });
  }, [filter, q, categoryFilter, monthFilter]);

  const clearDrilldown = () => { setCategoryFilter(''); setMonthFilter(''); };

  useEffect(() => { loadCats(); }, [loadCats]);
  useEffect(() => { loadRows(); }, [loadRows]);

  const toggleSort = (col: SortCol) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortBy(col); setSortDir(col === 'amount' ? 'asc' : 'asc'); }
  };

  const arrow = (col: SortCol) => sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '';

  const sorted = [...rows].sort((a, b) => {
    let cmp = 0;
    if (sortBy === 'date') cmp = a.date.localeCompare(b.date);
    else if (sortBy === 'description') cmp = (a.description || '').localeCompare(b.description || '');
    else if (sortBy === 'amount') cmp = a.amount - b.amount;
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const toggleOne = (id: string) =>
    setSelected((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const allSelected = rows.length > 0 && selected.size === rows.length;
  const toggleAll = () => setSelected(allSelected ? new Set() : new Set(rows.map((r) => r.id)));

  const applyOne = async (tx: any) => {
    const category = staged[tx.id] || tx.category;
    await fetch('/api/transactions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: tx.id, category }),
    });
    loadRows();
  };

  const applyBulk = async () => {
    if (!bulkCat || selected.size === 0) return;
    await fetch('/api/transactions', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: [...selected], category: bulkCat }),
    });
    loadRows();
  };

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

  const openRename = () => {
    setRenameFrom(cats[0] || '');
    setRenameTo('');
    setRenameModal(true);
  };

  const renameCategory = async () => {
    if (!renameFrom || !renameTo.trim() || renameFrom === renameTo.trim()) return;
    await fetch('/api/categories', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: renameFrom, to: renameTo.trim() }),
    });
    setRenameModal(false);
    loadCats();
    loadRows();
  };

  const ruleHint = (tx: any) => {
    if (tx.counterparty_iban) return `all to IBAN ...${tx.counterparty_iban.slice(-6)}`;
    if (tx.variable_symbol) return `all with VS ${tx.variable_symbol}`;
    return 'choose keyword to match...';
  };

  const vkladTotal = filter === 'vklad' ? rows.reduce((s, r) => s + r.amount, 0) : 0;

  const thStyle: React.CSSProperties = { cursor: 'pointer', userSelect: 'none', whiteSpace: 'nowrap' };

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="row">
            <button className={!categoryFilter && filter === 'uncategorized' ? '' : 'ghost'} onClick={() => { clearDrilldown(); setFilter('uncategorized'); }}>Needs review</button>
            <button className={!categoryFilter && filter === 'vklad' ? '' : 'ghost'} onClick={() => { clearDrilldown(); setFilter('vklad'); }}>VKLAD deposits</button>
            <button className={!categoryFilter && filter === 'all' ? '' : 'ghost'} onClick={() => { clearDrilldown(); setFilter('all'); }}>All</button>
          </div>
          <input type="text" placeholder="Search description..." value={q}
            onChange={(e) => setQ(e.target.value)} style={{ minWidth: 220 }} />
        </div>
        {categoryFilter && (
          <div className="notice section-gap row" style={{ justifyContent: 'space-between' }}>
            <span>Showing <b>{categoryFilter}</b>{monthFilter ? <> in <b>{monthFilter}</b></> : ''} · <b>{rows.length}</b> transactions</span>
            <button className="ghost" onClick={clearDrilldown}>Clear filter</button>
          </div>
        )}
        {filter === 'vklad' && (
          <div className="notice section-gap"><b>{rows.length}</b> cash deposits · total <b className="pos">{eur(vkladTotal)}</b></div>
        )}
        <div className="row section-gap">
          <input type="text" placeholder="New category name..." value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <button className="ghost" onClick={addCategory}>+ Add category</button>
          <button className="ghost" onClick={openRename}>Rename category</button>
          <a href="/rules" style={{ marginLeft: 'auto', color: 'var(--accent-2)', fontSize: '0.88rem' }}>Manage rules →</a>
        </div>
        <div className="notice section-gap">
          Pick a category, then <b>Apply</b> (just this one) or <b>+ rule</b> (this one and all similar). For card payments you'll confirm which keyword to match.
        </div>

        {selected.size > 0 && (
          <div className="row section-gap" style={{ background: 'var(--surface-2, #1e2130)', borderRadius: 8, padding: '10px 14px', gap: 12 }}>
            <span className="muted" style={{ fontSize: '0.88rem' }}><b style={{ color: 'var(--text)' }}>{selected.size}</b> selected</span>
            <select value={bulkCat} onChange={(e) => setBulkCat(e.target.value)} style={{ flex: 1, maxWidth: 260 }}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <button onClick={applyBulk}>Apply to {selected.size}</button>
            <button className="ghost" onClick={() => setSelected(new Set())}>Clear</button>
          </div>
        )}
      </div>

      <div className="card">
        <table>
          <thead>
            <tr>
              <th style={{ width: 32 }}>
                <input type="checkbox" checked={allSelected} onChange={toggleAll} />
              </th>
              <th style={thStyle} onClick={() => toggleSort('date')}>Date{arrow('date')}</th>
              <th>Account</th>
              <th style={thStyle} onClick={() => toggleSort('description')}>Description{arrow('description')}</th>
              <th style={{ ...thStyle, textAlign: 'right' }} onClick={() => toggleSort('amount')}>Amount{arrow('amount')}</th>
              <th>Category</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.id} style={selected.has(r.id) ? { background: 'rgba(99,102,241,0.08)' } : undefined}>
                <td>
                  <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggleOne(r.id)} />
                </td>
                <td className="muted">{r.date}</td>
                <td><span className="pill">{r.account}</span></td>
                <td style={{ maxWidth: 320 }}>
                  {r.description}
                  {(r.counterparty_iban || r.variable_symbol) && (
                    <div style={{ marginTop: 4, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      {r.counterparty_iban && (
                        <span className="pill" title={r.counterparty_iban} style={{ fontFamily: 'var(--mono)' }}>
                          IBAN ··{r.counterparty_iban.slice(-6)}
                        </span>
                      )}
                      {r.variable_symbol && (
                        <span className="pill" style={{ fontFamily: 'var(--mono)' }}>VS {r.variable_symbol}</span>
                      )}
                    </div>
                  )}
                </td>
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
              <tr><td colSpan={7} className="muted" style={{ textAlign: 'center', padding: 30 }}>
                Nothing here {filter === 'uncategorized' ? '- all categorized!' : ''}
              </td></tr>
            )}
          </tbody>
        </table>
      </div>

      {renameModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}
          onClick={() => setRenameModal(false)}>
          <div className="card" style={{ maxWidth: 440, width: '90%' }} onClick={(e) => e.stopPropagation()}>
            <h2>Rename category</h2>
            <p className="muted" style={{ marginBottom: 14 }}>Updates all transactions and rules that use this category.</p>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>Rename from</label>
            <select value={renameFrom} onChange={(e) => setRenameFrom(e.target.value)} style={{ width: '100%', marginBottom: 14 }}>
              {cats.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
            <label style={{ display: 'block', marginBottom: 6, fontSize: '0.85rem', color: 'var(--muted)' }}>New name</label>
            <input type="text" value={renameTo} onChange={(e) => setRenameTo(e.target.value)}
              style={{ width: '100%', marginBottom: 18 }} placeholder="New category name..." autoFocus />
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="ghost" onClick={() => setRenameModal(false)}>Cancel</button>
              <button disabled={!renameTo.trim() || renameTo.trim() === renameFrom} onClick={renameCategory}>
                Rename
              </button>
            </div>
          </div>
        </div>
      )}

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
