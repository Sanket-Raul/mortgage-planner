import { useState, useMemo } from 'react';
import {
  LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { amortise, fmt$, fmtDur } from '../utils/amortise.js';
import { RangeSlider, StatCard, Panel, CHART_STYLE } from '../components/ui.jsx';

export default function OffsetModeller({ loan }) {
  const [monthlyAdd, setMonthlyAdd] = useState(500);

  const { balance, offset, rate, payment, oldPayment } = loan;
  const april = [{ month: 1, payment: oldPayment }];

  // 3 scenarios
  const noOffset   = useMemo(() => amortise(balance, rate, payment, 0,      { paymentSchedule: april }), [balance, rate, payment, oldPayment]);
  const staticOff  = useMemo(() => amortise(balance, rate, payment, offset,  { paymentSchedule: april }), [balance, rate, payment, offset, oldPayment]);
  const growingOff = useMemo(() => amortise(balance, rate, payment, offset,  { paymentSchedule: april, offsetMonthlyAdd: monthlyAdd }), [balance, rate, payment, offset, oldPayment, monthlyAdd]);

  // Savings
  const savedVsNoOffset   = noOffset.totalInterest   - staticOff.totalInterest;
  const savedByGrowth     = staticOff.totalInterest  - growingOff.totalInterest;
  const monthsSavedStatic = noOffset.termMonths      - staticOff.termMonths;
  const monthsSavedGrow   = staticOff.termMonths     - growingOff.termMonths;

  // Chart data — balance over time
  const balanceData = useMemo(() => {
    const maxM = Math.max(noOffset.termMonths, staticOff.termMonths, growingOff.termMonths);
    const pts = [];
    for (let m = 0; m <= maxM + 6; m += 6) {
      pts.push({
        month: m,
        noOffset:   m === 0 ? balance : (noOffset.months[m-1]?.balance   ?? 0),
        staticOff:  m === 0 ? balance : (staticOff.months[m-1]?.balance  ?? 0),
        growingOff: m === 0 ? balance : (growingOff.months[m-1]?.balance ?? 0),
        offsetBal:  Math.min(offset + monthlyAdd * m, balance),
      });
    }
    return pts;
  }, [noOffset, staticOff, growingOff, balance, offset, monthlyAdd]);

  // Cumulative interest chart
  const interestData = useMemo(() => {
    const maxM = Math.max(noOffset.termMonths, staticOff.termMonths, growingOff.termMonths);
    const pts = [];
    for (let m = 0; m <= maxM + 6; m += 6) {
      pts.push({
        month: m,
        noOffset:   noOffset.months[m-1]?.totalInterest   ?? noOffset.totalInterest,
        staticOff:  staticOff.months[m-1]?.totalInterest  ?? staticOff.totalInterest,
        growingOff: growingOff.months[m-1]?.totalInterest ?? growingOff.totalInterest,
      });
    }
    return pts;
  }, [noOffset, staticOff, growingOff]);

  // Offset account balance milestones
  const offsetMilestones = useMemo(() => {
    const milestones = [50000, 100000, 150000, 200000, balance];
    return milestones
      .filter(t => t <= balance)
      .map(t => {
        const months = Math.ceil((t - offset) / monthlyAdd);
        const value  = Math.min(offset + monthlyAdd * months, balance);
        return { target: t, months: months > 0 ? months : 0, value };
      })
      .filter(m => m.months > 0 && m.months <= growingOff.termMonths);
  }, [offset, monthlyAdd, balance, growingOff.termMonths]);

  return (
    <div>
      {/* Control */}
      <Panel style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24 }}>
          <div>
            <RangeSlider
              label="Monthly Offset Contribution"
              min={0} max={3000} step={50}
              value={monthlyAdd} onChange={setMonthlyAdd}
              accent="#22d3ee"
              fmt={v => v === 0 ? 'None (static offset)' : `+$${v.toLocaleString()}/mo`}
            />
            <div style={{ fontSize: 11, color: '#94a3b8' }}>
              This models parking extra savings into the offset each month.
              The offset balance grows, reducing the interest-bearing portion of your loan.
              The funds remain accessible unlike extra repayments.
            </div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #1c2440' }}>
            <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 10 }}>
              Offset Projection
            </div>
            {[12, 24, 60].map(m => (
              <div key={m} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ fontSize: 12, color: '#64748b' }}>{m < 12 ? `${m}mo` : `${m/12}yr`}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#22d3ee' }}>
                  {fmt$(Math.min(offset + monthlyAdd * m, balance))}
                </span>
              </div>
            ))}
            <div style={{ height: 1, background: '#e2e8f0', margin: '8px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#64748b' }}>Fully offsets</span>
              <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#F5A623' }}>
                {monthlyAdd > 0
                  ? fmtDur(Math.ceil((balance - offset) / monthlyAdd))
                  : 'Never'}
              </span>
            </div>
          </div>
        </div>
      </Panel>

      {/* Stat cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <StatCard
          label="Current Offset"
          value={fmt$(offset)}
          sub={`Effective balance: ${fmt$(balance - offset)}`}
        />
        <StatCard
          label="Interest Saved (Offset vs None)"
          value={fmt$(savedVsNoOffset)}
          sub={`${fmtDur(monthsSavedStatic)} sooner than no offset`}
          accent="#4ade80"
        />
        <StatCard
          label="Extra Saved by Growing Offset"
          value={monthlyAdd > 0 ? fmt$(savedByGrowth) : '—'}
          sub={monthlyAdd > 0 ? `${fmtDur(monthsSavedGrow)} sooner than static offset` : 'Increase monthly contribution'}
          accent="#22d3ee"
        />
        <StatCard
          label="Projected Offset (5yr)"
          value={fmt$(Math.min(offset + monthlyAdd * 60, balance))}
          sub={`At $${monthlyAdd.toLocaleString()}/mo contribution`}
          accent="#a78bfa"
        />
      </div>

      {/* Loan balance chart */}
      <Panel title="Loan Balance vs Offset Growth" sub="Showing how a growing offset accelerates payoff" style={{ marginBottom: 16 }}>
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={balanceData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" />
            <XAxis dataKey="month" tickFormatter={v => `${Math.floor(v/12)}y`}
              tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#1a2035" interval={23} />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#1a2035" width={54} />
            <Tooltip
              {...CHART_STYLE}
              labelFormatter={v => `Month ${v} · Year ${(v/12).toFixed(1)}`}
              formatter={(val, key) => [
                `$${val?.toLocaleString()}`,
                key === 'noOffset' ? 'No offset' : key === 'staticOff' ? `Static offset ($${offset.toLocaleString()})` : key === 'growingOff' ? `Growing offset (+$${monthlyAdd.toLocaleString()}/mo)` : 'Offset balance',
              ]}
            />
            <Legend formatter={val => (
              <span style={{ fontSize: 11 }}>
                {val === 'noOffset' ? 'No offset' : val === 'staticOff' ? `Static offset (${fmt$(offset)})` : val === 'growingOff' ? `Growing offset (+$${monthlyAdd.toLocaleString()}/mo)` : 'Offset balance'}
              </span>
            )} wrapperStyle={{ paddingTop: 10 }} />
            <Line type="monotone" dataKey="noOffset"   stroke="#475569" strokeWidth={1.5} dot={false} strokeDasharray="4 4" />
            <Line type="monotone" dataKey="staticOff"  stroke="#F5A623" strokeWidth={2}   dot={false} />
            <Line type="monotone" dataKey="growingOff" stroke="#22d3ee" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="offsetBal"  stroke="#a78bfa" strokeWidth={1.5} dot={false} strokeDasharray="2 4" />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* Cumulative interest chart */}
      <Panel title="Cumulative Interest Paid" sub="Lower is better — the gap shows real money saved">
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={interestData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <defs>
              <linearGradient id="gNo"   x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#475569" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#475569" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gSt"  x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#F5A623" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#F5A623" stopOpacity={0}   />
              </linearGradient>
              <linearGradient id="gGr"  x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}   />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" />
            <XAxis dataKey="month" tickFormatter={v => `${Math.floor(v/12)}y`}
              tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#1a2035" interval={23} />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#1a2035" width={54} />
            <Tooltip
              {...CHART_STYLE}
              labelFormatter={v => `Month ${v}`}
              formatter={(val, key) => [
                `$${val?.toLocaleString()}`,
                key === 'noOffset' ? 'No offset' : key === 'staticOff' ? 'Static offset' : 'Growing offset',
              ]}
            />
            <Area type="monotone" dataKey="noOffset"   stroke="#475569" fill="url(#gNo)" strokeWidth={1.5} dot={false} />
            <Area type="monotone" dataKey="staticOff"  stroke="#F5A623" fill="url(#gSt)" strokeWidth={2}   dot={false} />
            <Area type="monotone" dataKey="growingOff" stroke="#22d3ee" fill="url(#gGr)" strokeWidth={2.5} dot={false} />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>
    </div>
  );
}
