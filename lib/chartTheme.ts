// Shared Recharts styling so tooltips/legends are readable on the dark theme.
// (Recharts defaults tooltip text to near-black, which is invisible on our dark cards.)

export const CHART = {
  grid: '#2a323d',
  axis: '#8b949e',
  text: '#e6edf3',
};

// Pass-through styles for <Tooltip>: dark background + light text.
export const tooltipStyle = {
  contentStyle: { background: '#161b22', border: '1px solid #2a323d', borderRadius: 8 },
  labelStyle: { color: '#e6edf3', fontWeight: 600, marginBottom: 4 },
  itemStyle: { color: '#e6edf3' },
};

// Categorical color palette for pies/bars.
export const PALETTE = [
  '#4ade80', '#38bdf8', '#fbbf24', '#f87171', '#a78bfa',
  '#fb923c', '#34d399', '#60a5fa', '#f472b6', '#94a3b8',
  '#22d3ee', '#c084fc', '#facc15', '#fca5a5', '#5eead4',
];
