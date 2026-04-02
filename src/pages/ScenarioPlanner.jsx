import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { amortise, fmt$, fmtDur } from '../utils/amortise.js';
import { NumInput, RangeSlider, StatCard, Panel, CHART_STYLE } from '../components/ui.jsx';

const SCENARIO_META = [
  { key: 'base',       label: 'Current Base', color: '#94a3b8', dashed: true  },
  { key: 'ex700',      label: '+$700/mo',     color: '#F5A623', dashed: false },
  { key: 'ex1825',     label: '+$1,825/mo',   color: '#22d3ee', dashed: false },
  { key: 'exCustom',   label: 'Custom',       color: '#a78bfa', dashed: false },
  { key: 'rateMinus',  label: 'Rate −0.25%',  color: '#4ade80', dashed: false },
  { key: 'ratePlus',   label: 'Rate +0.25%',  color: '#f87171', dashed: false },
  { key: 'escalating', label: 'Escalating ↑', color: '#fb923c', dashed: false },
];

function buildScenarios({ balance, offset, rate, payment, oldPayment, extra }) {
  const april = [{ month: 1, payment: oldPayment }];
  return {
    base:       amortise(balance, rate, payment, offset, { paymentSchedule: april }),
    ex700:      amortise(balance, rate, payment, offset, { paymentSchedule: april, extraMonthly: 700 }),
    ex1825:     amortise(balance, rate, payment, offset, { paymentSchedule: april, extraMonthly: 1825.26 }),
    exCustom:   amortise(balance, rate, payment, offset, { paymentSchedule: april, extraMonthly: extra }),
    rateMinus:  amortise(balance, rate - 0.25, payment, offset, { paymentSchedule: april }),
    ratePlus:   amortise(balance, rate + 0.25, payment, offset, { paymentSchedule: april }),
    escalating: amortise(balance, rate, payment, offset, {
      paymentSchedule: april,
      rateSchedule: [
        { month: 4, rate: rate + 0.25 },
        { month: 7, rate: rate + 0.50 },
        { month: 10, rate: rate + 0.75 },
      ],
    }),
  };
}

export default function ScenarioPlanner({ loan, setLoan }) {
  const [extra,   setExtra]   = useState(0);
  const [hovered, setHovered] = useState(null);

  const { balance, offset, rate, payment, oldPayment } = loan;

  const scenarios = useMemo(() =>
    buildScenarios({ balance, offset, rate, payment, oldPayment, extra }),
    [balance, offset, rate, payment, oldPayment, extra]
  );

  const chartData = useMemo(() => {
    const maxM = Math.max(...Object.values(scenarios).map(s => s.termMonths));
    const pts  = [];
    for (let m = 0; m <= maxM + 6; m += 6) {
      const pt = { month: m };
      SCENARIO_META.forEach(({ key }) => {
        if (m === 0) { pt[key] = balance; return; }
        const row = scenarios[key]?.months[m - 1];
        pt[key] = row ? Math.round(row.balance) : 0;
      });
      pts.push(pt);
    }
    return pts;
  }, [scenarios, balance]);

  const base = scenarios.base;

  return (
    <div>
      {/* Loan inputs */}
      <Panel title="Loan Details" sub="Edit any field — all scenarios update instantly" style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
          <NumInput label="Loan Balance"   value={balance} onChange={v => setLoan(l => ({ ...l, balance: v }))} />
          <NumInput label="Offset Account" value={offset}  onChange={v => setLoan(l => ({ ...l, offset: v }))}  />
          <NumInput label="Interest Rate"  value={rate}    onChange={v => setLoan(l => ({ ...l, rate: v }))}    prefix="%" step={0.01} />
          <NumInput label="Base Repayment" value={payment} onChange={v => setLoan(l => ({ ...l, payment: v }))} />
        </div>
        <RangeSlider
          label="Custom Extra Monthly"
          min={0} max={2500} step={25}
          value={extra} onChange={setExtra}
          accent="#a78bfa"
          fmt={v => v === 0 ? 'None' : `+$${v.toLocaleString()}/mo → $${(payment + v).toLocaleString()}/mo total`}
        />
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          ℹ April 2026 payment fixed at ${oldPayment.toLocaleString()} (pre-hike) · Escalating: +0.25%/qtr × 3 from May
        </div>
      </Panel>

      {/* Key stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <StatCard label="Effective Balance"   value={fmt$(balance - offset)}      sub={`${fmt$(balance)} − ${fmt$(offset)} offset`} />
        <StatCard label="Interest Rate"       value={`${rate.toFixed(2)}%`}       sub="Was 5.47% · +0.25% RBA Mar 2026" />
        <StatCard label="New Repayment"       value={fmt$(payment)}               sub="from 22 May · Apr at $2,268" />
        <StatCard label="Total Interest Base" value={fmt$(base.totalInterest)}    sub={`Paid off ${fmtDur(base.termMonths)} from Apr 2026`} />
      </div>

      {/* Scenario cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginBottom: 18 }}>
        {SCENARIO_META.map(sc => {
          const s      = scenarios[sc.key];
          const iSaved = base.totalInterest - s.totalInterest;
          const mSaved = base.termMonths    - s.termMonths;
          const isHov  = hovered === sc.key;
          const label  = sc.key === 'exCustom'
            ? (extra === 0 ? 'Custom (+$0)' : `+$${extra.toLocaleString()}/mo`)
            : sc.label;
          const desc   = sc.key === 'base'       ? `$${Math.round(payment)}/mo · ${rate.toFixed(2)}%`
                       : sc.key === 'ex700'      ? `$${Math.round(payment+700)}/mo`
                       : sc.key === 'ex1825'     ? `$${Math.round(payment+1825)}/mo`
                       : sc.key === 'exCustom'   ? extra > 0 ? `$${Math.round(payment+extra)}/mo total` : 'Use slider above'
                       : sc.key === 'rateMinus'  ? `${(rate-0.25).toFixed(2)}%`
                       : sc.key === 'ratePlus'   ? `${(rate+0.25).toFixed(2)}%`
                       : `→ ${(rate+0.75).toFixed(2)}% over 9mo`;

          return (
            <div key={sc.key}
              className="print-card"
              onMouseEnter={() => setHovered(sc.key)}
              onMouseLeave={() => setHovered(null)}
              style={{
                background: isHov ? '#f1f5f9' : '#ffffff',
                border: `1px solid ${isHov ? sc.color + '60' : '#e2e8f0'}`,
                borderRadius: 10, padding: '13px 15px',
                position: 'relative', overflow: 'hidden',
                transition: 'all 0.15s', cursor: 'default',
              }}>
              <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: sc.color, borderRadius: '10px 10px 0 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{label}</div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{desc}</div>
                </div>
                <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, fontWeight: 600, color: sc.color }}>
                  {fmtDur(s.termMonths)}
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>Total Interest</div>
                  <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>{fmt$(s.totalInterest)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 2 }}>vs Base</div>
                  <div style={{
                    fontFamily: "'JetBrains Mono',monospace", fontSize: 13,
                    color: iSaved === 0 ? '#64748b' : iSaved > 0 ? '#4ade80' : '#f87171',
                  }}>
                    {iSaved === 0 ? '—' : iSaved > 0 ? `−${fmt$(iSaved)}` : `+${fmt$(-iSaved)}`}
                  </div>
                </div>
              </div>
              {mSaved !== 0 && (
                <div style={{ marginTop: 9, paddingTop: 8, borderTop: '1px solid #1c2440', fontSize: 11, color: mSaved > 0 ? '#4ade80' : '#f87171' }}>
                  {mSaved > 0 ? `▲ ${fmtDur(mSaved)} sooner` : `▼ ${fmtDur(-mSaved)} longer`}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Chart */}
      <Panel title="Loan Balance Over Time" sub="Hover a scenario card to highlight · All from Apr 2026">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" />
            <XAxis dataKey="month" tickFormatter={v => `${Math.floor(v/12)}y`}
              tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#1a2035" interval={23} />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#1a2035" width={54} />
            <Tooltip
              {...CHART_STYLE}
              labelFormatter={v => `Month ${v} · Year ${(v/12).toFixed(1)}`}
              formatter={(val, key) => {
                const sc = SCENARIO_META.find(s => s.key === key);
                const lbl = key === 'exCustom' ? (extra === 0 ? 'Custom' : `+$${extra.toLocaleString()}/mo`) : sc?.label;
                return [`$${val?.toLocaleString()}`, lbl];
              }}
            />
            <Legend
              formatter={val => {
                const sc = SCENARIO_META.find(s => s.key === val);
                const lbl = val === 'exCustom' ? (extra === 0 ? 'Custom (+$0)' : `+$${extra.toLocaleString()}/mo`) : sc?.label;
                return <span style={{ fontSize: 11 }}>{lbl}</span>;
              }}
              wrapperStyle={{ paddingTop: 10 }}
            />
            {SCENARIO_META.map(sc => (
              <Line key={sc.key} type="monotone" dataKey={sc.key}
                stroke={sc.color} strokeWidth={sc.key === 'base' ? 1.5 : 2}
                dot={false} strokeDasharray={sc.dashed ? '5 5' : undefined}
                strokeOpacity={hovered && hovered !== sc.key ? 0.1 : 1}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
