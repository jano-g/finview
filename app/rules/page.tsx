'use client';
import { useEffect, useState, useCallback } from 'react';

export default function Rules() {
  const [rules, setRules] = useState<any[]>([]);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch('/api/rules').then((r) => r.json()).then((j) => setRules(j.rules));
  }, []);
  useEffect(() => { load(); }, [load]);

  const del = async (id: number) => {
    setBusy(true);
    await fetch('/api/rules?id=' + id, { method: 'DELETE' });
    setBusy(false);
    load();
  };

  const reapply = async () => {
    setBusy(true);
    await fetch('/api/recategorize', { method: 'POST' });
    setBusy(false);
    load();
  };

  const typeLabel: Record<string, string> = { iban: 'IBAN', vs: 'Var. symbol', text: 'Text contains' };

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2>Categorization rules</h2>
          <div className="row">
            <button disabled={busy} onClick={reapply}>{busy ? 'Working…' : 'Re-apply all rules'}</button>
            <a href="/review" style={{ color: 'var(--accent-2)', fontSize: '0.88rem' }}>← Back to review</a>
          </div>
        </div>
        <div className="notice section-gap">
          Deleting a rule re-runs categorization. Transactions it had matched (and aren't manually set) return to their default — often Uncategorized. Seed rules can be deleted too; they come back only on a fresh database.
        </div>
      </div>

      <div className="card">
        <table>
          <thead>
            <tr><th>Match type</th><th>Value</th><th>Account</th><th>Category</th><th>Source</th><th></th></tr>
          </thead>
          <tbody>
            {rules.map((r) => (
              <tr key={r.id}>
                <td>{typeLabel[r.match_type] || r.match_type}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: '0.82rem', maxWidth: 280, wordBreak: 'break-all' }}>{r.match_value}</td>
                <td className="muted">{r.account || 'any'}</td>
                <td>{r.category}</td>
                <td><span className="pill">{r.user_created ? 'you' : 'seed'}</span></td>
                <td><button className="ghost" disabled={busy} onClick={() => del(r.id)}>Delete</button></td>
              </tr>
            ))}
            {rules.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ textAlign: 'center', padding: 30 }}>No rules.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
