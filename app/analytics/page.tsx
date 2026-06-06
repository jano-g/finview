'use client';
import { Fragment, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid,
  LineChart, Line, Legend, Cell,
} from 'recharts';
import { groupOf, EXCLUDE_FROM_GROUPS } from '@/lib/groups';
import { CHART, tooltipStyle, PALETTE } from '@/lib/chartTheme';

const eur = (n: number) =>
  new Intl.NumberFormat('sk-SK', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n || 0);

type Row = { month: string; category: string; spend: number; income: number; n: number };
type Period = 'month' | 'year' | 'all';
type View = 'category' | 'group';
type Dir = 'spend' | 'income';

export default function Analytics() {
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>([]);
  const [months, setMonths] = useState<string[]>([]);
  const [period, setPeriod] = useState<Period>('month');
  const [view, setView] = useState<View>('group');
  const [dir, setDir] = useState<Dir>('spend');
  const [sel, setSel] = useState<string>('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetch('/api/analytics').then((r) => r.json()).then((j) => {
      setRows(j.rows || []);
      setMonths(j.months || []);
    });
  }, []);

  // Available periods for the picker.
  const periods = useMemo(() => {
    if (period === 'all') return ['all'];
    if (period === 'year') return Array.from(new Set(months.map((m) => m.slice(0, 4)))).sort();
    return [...months].sort();
  }, [period, months]);

  // Default selection = most recent period whenever the period type changes.
  useEffect(() => {
    if (period === 'all') setSel('all');
    else if (periods.length) setSel(periods[periods.length - 1]);
  }, [period, periods.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  const inPeriod = (m: string) =>
    period === 'all' ? true : period === 'year' ? m.slice(0, 4) === sel : m === sel;

  // Aggregate the selected period into the chosen view/direction.
  const breakdown = useMemo(() => {
    const byCat: Record<string, { value: number; n: number }> = {};
    for (const r of rows) {
      if (!inPeriod(r.month)) continue;
      const v = dir === 'spend' ? r.spend : r.income;
      if (!v) continue;
      if (!byCat[r.category]) byCat[r.category] = { value: 0, n: 0 };
      byCat[r.category].value += v;
      byCat[r.category].n += r.n;
    }

    if (view === 'category') {
      return Object.entries(byCat)
        .map(([category, x]) => ({ key: category, label: category, value: x.value, n: x.n, children: [] as any[] }))
        .filter((x) => x.value > 0)
        .sort((a, b) => b.value - a.value);
    }

    // group view: roll categories up by groupOf()
    const byGroup: Record<string, { value: number; n: number; children: Record<string, { value: number; n: number }> }> = {};
    for (const [category, x] of Object.entries(byCat)) {
      const g = EXCLUDE_FROM_GROUPS.has(category) ? category : groupOf(category);
      if (!byGroup[g]) byGroup[g] = { value: 0, n: 0, children: {} };
      byGroup[g].value += x.value;
      byGroup[g].n += x.n;
      byGroup[g].children[category] = { value: x.value, n: x.n };
    }
    return Object.entries(byGroup)
      .map(([g, x]) => ({
        key: g, label: g, value: x.value, n: x.n,
        children: Object.entries(x.children)
          .map(([c, y]) => ({ key: c, label: c, value: y.value, n: y.n }))
          .sort((a, b) => b.value - a.value),
      }))
      .filter((x) => x.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [rows, view, dir, sel, period]); // eslint-disable-line react-hooks/exhaustive-deps

  const periodTotal = breakdown.reduce((s, b) => s + b.value, 0);

  const chartData = breakdown.slice(0, 14).map((b) => ({
    name: b.label.length > 22 ? b.label.slice(0, 21) + '…' : b.label,
    value: Math.round(b.value),
  }));

  // Net cashflow trend across all periods (income - spend), using the current granularity.
  const trend = useMemo(() => {
    const gran = period === 'year' ? 'year' : 'month';
    const acc: Record<string, { income: number; spend: number }> = {};
    for (const r of rows) {
      const k = gran === 'year' ? r.month.slice(0, 4) : r.month;
      if (!acc[k]) acc[k] = { income: 0, spend: 0 };
      acc[k].income += r.income;
      acc[k].spend += r.spend;
    }
    let cum = 0;
    return Object.keys(acc).sort().map((k) => {
      const net = acc[k].income - acc[k].spend;
      cum += net;
      return { period: k, net: Math.round(net), cumulative: Math.round(cum) };
    });
  }, [rows, period]);

  const drill = (category: string) => {
    const params = new URLSearchParams({ category });
    if (period === 'month' && sel) params.set('month', sel);
    router.push('/review?' + params.toString());
  };

  const toggleExpand = (g: string) =>
    setExpanded((s) => { const n = new Set(s); n.has(g) ? n.delete(g) : n.add(g); return n; });

  const Toggle = ({ value, options, onChange }: { value: string; options: [string, string][]; onChange: (v: any) => void }) => (
    <div className="row" style={{ gap: 6 }}>
      {options.map(([v, label]) => (
        <button key={v} className={value === v ? '' : 'ghost'} onClick={() => onChange(v)}>{label}</button>
      ))}
    </div>
  );

  return (
    <div className="grid" style={{ gap: 18 }}>
      <div className="card">
        <div className="row" style={{ justifyContent: 'space-between', rowGap: 12 }}>
          <Toggle value={period} options={[['month', 'Monthly'], ['year', 'Yearly'], ['all', 'All-time']]} onChange={setPeriod} />
          {period !== 'all' && (
            <select value={sel} onChange={(e) => setSel(e.target.value)} style={{ minWidth: 130 }}>
              {periods.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          <Toggle value={view} options={[['group', 'By group'], ['category', 'By category']]} onChange={setView} />
          <Toggle value={dir} options={[['spend', 'Spending'], ['income', 'Income']]} onChange={setDir} />
        </div>
        <div className="notice section-gap">
          {dir === 'spend' ? 'Spending' : 'Income'} · {period === 'all' ? 'all time' : sel} ·
          total <b className={dir === 'spend' ? 'neg' : 'pos'}>{eur(periodTotal)}</b>
          {view === 'group' && ' · click a group to expand, click a row to see transactions'}
        </div>
      </div>

      <div className="grid cols-2">
        <div className="card">
          <h2>{view === 'group' ? 'By group' : 'By category'} — {period === 'all' ? 'all time' : sel}</h2>
          <ResponsiveContainer width="100%" height={Math.max(300, chartData.length * 32)}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 30 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
              <XAxis type="number" stroke={CHART.axis} fontSize={11} tickFormatter={(v) => `€${v / 1000 >= 1 ? v / 1000 + 'k' : v}`} />
              <YAxis type="category" dataKey="name" stroke={CHART.axis} fontSize={11} width={140} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => eur(v)} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
              <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                {chartData.map((_, i) => <Cell key={i} fill={dir === 'spend' ? PALETTE[i % PALETTE.length] : '#4ade80'} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card">
          <h2>Net cashflow trend</h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
              <XAxis dataKey="period" stroke={CHART.axis} fontSize={11} />
              <YAxis stroke={CHART.axis} fontSize={11} tickFormatter={(v) => `€${Math.round(v / 1000)}k`} />
              <Tooltip {...tooltipStyle} formatter={(v: number) => eur(v)} />
              <Legend />
              <Line type="monotone" dataKey="net" name="Net (per period)" stroke="#38bdf8" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="cumulative" name="Cumulative" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="card">
        <h2>Breakdown</h2>
        <table>
          <thead>
            <tr>
              <th>{view === 'group' ? 'Group' : 'Category'}</th>
              <th>Transactions</th>
              <th className="num">Share</th>
              <th className="num">{dir === 'spend' ? 'Spent' : 'Received'}</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.map((b) => {
              const pct = periodTotal ? Math.round((b.value / periodTotal) * 100) : 0;
              const hasChildren = view === 'group' && b.children.length > 1;
              const isOpen = expanded.has(b.key);
              return (
                <Fragment key={b.key}>
                  <tr style={{ cursor: 'pointer' }}
                    onClick={() => {
                      if (hasChildren) toggleExpand(b.key);
                      else if (view === 'group') drill(b.children[0]?.key ?? b.key);
                      else drill(b.key);
                    }}>
                    <td>
                      {hasChildren && <span style={{ color: 'var(--muted)', marginRight: 6 }}>{isOpen ? '▾' : '▸'}</span>}
                      {b.label}
                    </td>
                    <td>{b.n}</td>
                    <td className="num muted">{pct}%</td>
                    <td className={'num ' + (dir === 'spend' ? 'neg' : 'pos')}>{eur(b.value)}</td>
                  </tr>
                  {hasChildren && isOpen && b.children.map((c: any) => (
                    <tr key={b.key + '/' + c.key} style={{ cursor: 'pointer', background: 'rgba(255,255,255,0.02)' }}
                      onClick={() => drill(c.key)}>
                      <td style={{ paddingLeft: 34, color: 'var(--muted)' }}>{c.label}</td>
                      <td className="muted">{c.n}</td>
                      <td className="num muted">{periodTotal ? Math.round((c.value / periodTotal) * 100) : 0}%</td>
                      <td className="num muted">{eur(c.value)}</td>
                    </tr>
                  ))}
                </Fragment>
              );
            })}
            {breakdown.length === 0 && (
              <tr><td colSpan={4} className="muted" style={{ textAlign: 'center', padding: 30 }}>No data for this period.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
