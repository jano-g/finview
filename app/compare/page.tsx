'use client';
import { useEffect, useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Legend } from 'recharts';
import { CHART, tooltipStyle } from '@/lib/chartTheme';

const eur = (n: number) =>
  new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

export default function Compare() {
  const [stats, setStats] = useState<any>(null);
  const [a, setA] = useState('');
  const [b, setB] = useState('');

  useEffect(() => {
    fetch('/api/stats').then((r) => r.json()).then((j) => {
      setStats(j);
      const months = (j.monthly || []).map((m: any) => m.month);
      if (months.length >= 2) { setA(months[months.length - 2]); setB(months[months.length - 1]); }
      else if (months.length === 1) { setA(months[0]); setB(months[0]); }
    });
  }, []);

  if (!stats) return <div className="card">Loading…</div>;
  const months = (stats.monthly || []).map((m: any) => m.month);

  const catsForMonth = (month: string) => {
    const map: Record<string, number> = {};
    (stats.monthCategory || []).filter((x: any) => x.month === month)
      .forEach((x: any) => { map[x.category] = x.total; });
    return map;
  };
  const ma = catsForMonth(a), mb = catsForMonth(b);
  const allCats = Array.from(new Set([...Object.keys(ma), ...Object.keys(mb)]))
    .filter((c) => c !== 'Uncategorized')
    .sort((x, y) => (mb[y] || 0) + (ma[y] || 0) - (mb[x] || 0) - (ma[x] || 0));

  const chartData = allCats.map((c) => ({
    category: c.length > 18 ? c.slice(0, 17) + '…' : c,
    [a]: Math.round(ma[c] || 0),
    [b]: Math.round(mb[c] || 0),
  }));

  const totalA = Object.values(ma).reduce((s, v) => s + v, 0);
  const totalB = Object.values(mb).reduce((s, v) => s + v, 0);
  const diff = totalB - totalA;

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="row">
          <span className="muted">Compare</span>
          <select value={a} onChange={(e) => setA(e.target.value)}>
            {months.map((m: string) => <option key={m}>{m}</option>)}
          </select>
          <span className="muted">with</span>
          <select value={b} onChange={(e) => setB(e.target.value)}>
            {months.map((m: string) => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="grid cols-3 section-gap">
          <div className="stat"><span className="label">{a} spend</span><span className="value spend">{eur(totalA)}</span></div>
          <div className="stat"><span className="label">{b} spend</span><span className="value spend">{eur(totalB)}</span></div>
          <div className="stat"><span className="label">Difference</span>
            <span className="value" style={{ color: diff > 0 ? 'var(--danger)' : 'var(--accent)' }}>
              {diff > 0 ? '+' : ''}{eur(diff)}
            </span>
          </div>
        </div>
      </div>

      <div className="card">
        <h2>Category comparison</h2>
        <ResponsiveContainer width="100%" height={Math.max(320, chartData.length * 34)}>
          <BarChart data={chartData} layout="vertical" margin={{ left: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
            <XAxis type="number" stroke={CHART.axis} fontSize={11} tickFormatter={(v) => `€${v}`} />
            <YAxis type="category" dataKey="category" stroke={CHART.axis} fontSize={11} width={130} />
            <Tooltip {...tooltipStyle} formatter={(v: number) => eur(v)} />
            <Legend />
            <Bar dataKey={a} fill="#38bdf8" radius={[0, 4, 4, 0]} />
            <Bar dataKey={b} fill="#4ade80" radius={[0, 4, 4, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="card">
        <h2>Breakdown</h2>
        <table>
          <thead><tr><th>Category</th><th className="num">{a}</th><th className="num">{b}</th><th className="num">Δ</th></tr></thead>
          <tbody>
            {allCats.map((c) => {
              const d = (mb[c] || 0) - (ma[c] || 0);
              return (
                <tr key={c}>
                  <td>{c}</td>
                  <td className="num">{eur(ma[c] || 0)}</td>
                  <td className="num">{eur(mb[c] || 0)}</td>
                  <td className="num" style={{ color: d > 0 ? 'var(--danger)' : d < 0 ? 'var(--accent)' : 'var(--muted)' }}>
                    {d > 0 ? '+' : ''}{eur(d)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
