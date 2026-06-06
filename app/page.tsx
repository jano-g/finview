'use client';
import { useEffect, useState, useCallback } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

const eur = (n: number) =>
  new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

const PIE = ['#4ade80', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa', '#fb923c', '#34d399', '#60a5fa', '#f472b6', '#94a3b8'];

export default function Dashboard() {
  const [stats, setStats] = useState<any>(null);
  const [drag, setDrag] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>('');

  const load = useCallback(() => {
    fetch('/api/stats').then((r) => r.json()).then(setStats);
  }, []);
  useEffect(() => { load(); }, [load]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true); setMsg('');
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append('files', f));
    try {
      const r = await fetch('/api/upload', { method: 'POST', body: fd });
      const j = await r.json();
      if (j.error) setMsg('Error: ' + j.error);
      else {
        setMsg(`Imported ${j.inserted} new transactions (${j.duplicatesSkipped} duplicates skipped). ${j.uncategorized} need review.`);
        load();
      }
    } catch (e: any) { setMsg('Error: ' + e.message); }
    setBusy(false);
  };

  const totals = stats?.totals || {};
  const vklad = stats?.vkladTotal || {};
  const net = (totals.income || 0) - (totals.spend || 0);

  const monthlyData = (stats?.monthly || []).map((m: any) => ({
    month: m.month, spend: Math.round(m.spend), income: Math.round(m.income),
  }));
  const pieData = (stats?.byCategory || [])
    .filter((c: any) => c.category !== 'Uncategorized')
    .slice(0, 10)
    .map((c: any) => ({ name: c.category, value: Math.round(c.total) }));

  return (
    <div className="grid" style={{ gap: 22 }}>
      {/* Upload */}
      <div
        className={'dropzone' + (drag ? ' drag' : '')}
        onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
        onClick={() => document.getElementById('fileInput')?.click()}
      >
        {busy ? 'Importing…' : 'Drop Revolut & Tatra statements here, or click to choose'}
        <input id="fileInput" type="file" hidden multiple accept=".csv,.xlsx,.xls"
          onChange={(e) => upload(e.target.files)} />
      </div>
      {msg && <div className="notice">{msg}</div>}

      {/* Stat tiles */}
      <div className="grid cols-3">
        <div className="card stat">
          <span className="label">Total spent</span>
          <span className="value spend">{eur(totals.spend)}</span>
          <span className="muted">excl. internal transfers</span>
        </div>
        <div className="card stat">
          <span className="label">Total income</span>
          <span className="value income">{eur(totals.income)}</span>
          <span className="muted">{totals.n || 0} transactions</span>
        </div>
        <div className="card stat" style={{ borderColor: 'rgba(74,222,128,0.4)' }}>
          <span className="label">💰 VKLAD income (cash deposits)</span>
          <span className="value income">{eur(vklad.total)}</span>
          <span className="muted">{vklad.n || 0} deposits · your business income</span>
        </div>
      </div>

      <div className="grid cols-3">
        <div className="card stat">
          <span className="label">Net</span>
          <span className="value net">{eur(net)}</span>
        </div>
        <div className="card stat">
          <span className="label">Needs review</span>
          <span className="value" style={{ color: stats?.uncategorized ? 'var(--warn)' : 'var(--muted)' }}>
            {stats?.uncategorized ?? 0}
          </span>
          <span className="muted">uncategorized transactions</span>
        </div>
        <div className="card stat">
          <span className="label">Months of data</span>
          <span className="value">{monthlyData.length}</span>
        </div>
      </div>

      {/* Charts */}
      <div className="grid cols-2">
        <div className="card">
          <h2>Income vs Spending by month</h2>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2a323d" vertical={false} />
              <XAxis dataKey="month" stroke="#8b949e" fontSize={11} />
              <YAxis stroke="#8b949e" fontSize={11} tickFormatter={(v) => `€${v / 1000}k`} />
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #2a323d', borderRadius: 8 }}
                formatter={(v: number) => eur(v)} />
              <Legend />
              <Bar dataKey="income" fill="#4ade80" radius={[4, 4, 0, 0]} />
              <Bar dataKey="spend" fill="#f87171" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card">
          <h2>Spending by category</h2>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={55} outerRadius={95} paddingAngle={2}>
                {pieData.map((_: any, i: number) => <Cell key={i} fill={PIE[i % PIE.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #2a323d', borderRadius: 8 }}
                formatter={(v: number) => eur(v)} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* VKLAD detail */}
      <div className="card">
        <h2>💰 VKLAD deposits by month</h2>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={(stats?.vkladByMonth || []).map((v: any) => ({ month: v.month, total: Math.round(v.total) }))}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a323d" vertical={false} />
            <XAxis dataKey="month" stroke="#8b949e" fontSize={11} />
            <YAxis stroke="#8b949e" fontSize={11} tickFormatter={(v) => `€${v / 1000}k`} />
            <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #2a323d', borderRadius: 8 }}
              formatter={(v: number) => eur(v)} />
            <Bar dataKey="total" fill="#34d399" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Category table */}
      <div className="card">
        <h2>All categories</h2>
        <table>
          <thead><tr><th>Category</th><th>Transactions</th><th style={{ textAlign: 'right' }}>Total spent</th></tr></thead>
          <tbody>
            {(stats?.byCategory || []).map((c: any) => (
              <tr key={c.category}>
                <td>{c.category}</td>
                <td>{c.n}</td>
                <td className="num">{eur(c.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
