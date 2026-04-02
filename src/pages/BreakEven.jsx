import { useState, useMemo } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import { amortise, fmt$, fmtDur } from '../utils/amortise.js';
import { RangeSlider, StatCard, Panel, CHART_STYLE } from '../components/ui.jsx';

// Compound investment value: monthly contributions for N months at R% annual
function investmentValue(monthlyAmount, annualReturn, months) {
  const r = annualReturn / 100 / 12;
  if (r === 0) return monthlyAmount * months;
  return monthlyAmount * ((Math.pow(1 + r, months) - 1) / r) * (1 + r);
}

export default function BreakEven({ loan }) {
  const [extra,     setExtra]     = useState(700);
  const [invReturn, setInvReturn] = useState(8);
  const [taxRate,   setTaxRate]   = useState(34.5); // marginal tax rate for investment gains

  const { balance, offset, rate, payment, oldPayment } = loan;
  const april = [{ month: 1, payment: oldPayment }];

  const baseScen  = useMemo(() => amortise(balance, rate, payment, offset, { paymentSchedule: april }), [balance, rate, payment, offset, oldPayment]);
  const extraScen = useMemo(() => amortise(balance, rate, payment, offset, { paymentSchedule: april, extraMonthly: extra }), [balance, rate, payment, offset, oldPayment, extra]);

  const interestSaved = baseScen.totalInterest - extraScen.totalInterest;
  const monthsSaved   = baseScen.termMonths    - extraScen.termMonths;

  // After mortgage paid off, the extra repayment amount could be invested
  // Total period = base loan term
  const horizon = baseScen.termMonths;

  // Investment path: invest $extra/mo for the whole base-loan horizon
  const grossInvValue   = investmentValue(extra, invReturn, horizon);
  const totalInvested   = extra * horizon;
  const grossInvGain    = grossInvValue - totalInvested;
  const taxOnGain       = grossInvGain * (taxRate / 100);
  const netInvGain      = grossInvGain - taxOnGain;
  const netInvValue     = totalInvested + netInvGain;

  // Mortgage path benefit: interest saved (tax is n/a — loan repayments are after-tax)
  const mortgageBenefit = interestSaved;

  // Difference
  const netDiff = netInvGain - mortgageBenefit;
  const investingWins = netDiff > 0;

  // After mortgage is paid off early (extraScen.termMonths), remaining months
  // we can invest the full payment amount
  const remainingMonths = baseScen.termMonths - extraScen.termMonths;
  const postPayoffValue = remainingMonths > 0
    ? investmentValue(payment + extra, invReturn, remainingMonths)
    : 0;

  // Break-even rate: what investment return makes investing = mortgage benefit
  // interest_saved = extra × ((1+r)^horizon - 1) / r  → solve numerically
  const breakEvenRate = useMemo(() => {
    if (interestSaved <= 0) return 0;
    let lo = 0, hi = 30;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      const val = investmentValue(extra, mid, horizon) - totalInvested;
      const netVal = val * (1 - taxRate / 100);
      if (netVal < interestSaved) lo = mid;
      else hi = mid;
    }
    return (lo + hi) / 2;
  }, [extra, horizon, totalInvested, interestSaved, taxRate]);

  // Chart: cumulative benefit over time, sampled every 6 months
  const chartData = useMemo(() => {
    const pts = [];
    for (let m = 6; m <= horizon + 6; m += 6) {
      const mSafe = Math.min(m, horizon);
      // Interest saved up to month m
      const iSavedSoFar = (extraScen.months[mSafe - 1]
        ? baseScen.months[mSafe - 1]?.totalInterest - extraScen.months[mSafe - 1]?.totalInterest
        : interestSaved) ?? 0;

      // Investment portfolio value at month m (gross gain)
      const invM    = investmentValue(extra, invReturn, mSafe);
      const gainM   = invM - extra * mSafe;
      const netGainM = gainM * (1 - taxRate / 100);

      pts.push({
        month: mSafe,
        mortgageBenefit: Math.max(0, Math.round(iSavedSoFar)),
        investGain:      Math.max(0, Math.round(netGainM)),
        investPortfolio: Math.round(invM),
      });
    }
    return pts;
  }, [extraScen, baseScen, interestSaved, extra, invReturn, horizon, taxRate]);

  // Find crossover month
  const crossover = chartData.find((pt, i) => {
    const prev = chartData[i - 1];
    return prev && prev.investGain <= prev.mortgageBenefit && pt.investGain > pt.mortgageBenefit;
  });

  return (
    <div>
      {/* Controls */}
      <Panel style={{ marginBottom: 18 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 28 }}>
          <RangeSlider
            label="Monthly Extra Amount"
            min={100} max={2500} step={50}
            value={extra} onChange={setExtra}
            accent="#F5A623"
            fmt={v => `$${v.toLocaleString()}/mo`}
          />
          <RangeSlider
            label="Investment Return (p.a.)"
            min={3} max={15} step={0.5}
            value={invReturn} onChange={setInvReturn}
            accent="#22d3ee"
            fmt={v => `${v.toFixed(1)}%`}
          />
          <RangeSlider
            label="Marginal Tax Rate"
            min={0} max={47} step={0.5}
            value={taxRate} onChange={setTaxRate}
            accent="#a78bfa"
            fmt={v => `${v}%`}
          />
        </div>
        <div style={{ marginTop: 8, padding: '10px 14px', background: '#ffffff', borderRadius: 8, border: '1px solid #1c2440', fontSize: 11, color: '#475569' }}>
          <strong style={{ color: '#475569' }}>How this works:</strong> If you have ${extra.toLocaleString()}/mo extra, you can either (A) put it on the mortgage — saving {fmt$(interestSaved)} in interest over the loan life — or (B) invest it at {invReturn}% p.a. The calculator shows which path generates more wealth. Tax applies to investment gains only (not mortgage savings). Your current mortgage rate is {rate.toFixed(2)}% — that's your &ldquo;guaranteed return&rdquo; on prepayments.
        </div>
      </Panel>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        <StatCard
          label="Interest Saved (Mortgage Path)"
          value={fmt$(interestSaved)}
          sub={`Paid off ${fmtDur(monthsSaved)} sooner`}
          accent="#F5A623"
        />
        <StatCard
          label="Net Investment Gain (After Tax)"
          value={fmt$(netInvGain)}
          sub={`Gross: ${fmt$(grossInvGain)} · Tax: ${fmt$(taxOnGain)}`}
          accent="#22d3ee"
        />
        <StatCard
          label={investingWins ? '🏆 Investing wins by' : '🏠 Mortgage prepayment wins by'}
          value={fmt$(Math.abs(netDiff))}
          sub={investingWins
            ? `At ${invReturn}% return after ${taxRate}% tax`
            : `Mortgage rate ${rate.toFixed(2)}% beats ${invReturn}% net`}
          accent={investingWins ? '#4ade80' : '#F5A623'}
          highlight
        />
        <StatCard
          label="Break-even Investment Return"
          value={`${breakEvenRate.toFixed(2)}%`}
          sub={`Returns above this beat prepaying (after ${taxRate}% tax)`}
          accent="#a78bfa"
        />
      </div>

      {/* Extra detail — post payoff */}
      {remainingMonths > 0 && (
        <div style={{
          background: '#ffffff', border: '1px solid #22d3ee30',
          borderRadius: 10, padding: '12px 16px', marginBottom: 18,
          display: 'flex', gap: 24, alignItems: 'center',
        }}>
          <div style={{ fontSize: 20 }}>💡</div>
          <div style={{ fontSize: 13, color: '#475569' }}>
            With the mortgage path, you'd be debt-free <strong style={{ color: '#22d3ee' }}>{fmtDur(monthsSaved)} early</strong> and could then invest {fmt$(payment + extra)}/mo for the remaining {fmtDur(remainingMonths)} — building an additional{' '}
            <strong style={{ color: '#F5A623' }}>{fmt$(postPayoffValue)}</strong> portfolio. This compounding "freed-up cashflow" effect isn't captured in the simple comparison above.
          </div>
        </div>
      )}

      {/* Chart */}
      <Panel title="Cumulative Benefit Over Time" sub={`Interest saved (mortgage path) vs net investment gain · $${extra.toLocaleString()}/mo at ${invReturn}% after ${taxRate}% tax`}>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1a2035" />
            <XAxis dataKey="month" tickFormatter={v => `${Math.floor(v/12)}y`}
              tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#1a2035" interval={11} />
            <YAxis tickFormatter={v => `$${(v/1000).toFixed(0)}k`}
              tick={{ fontSize: 11, fill: '#94a3b8' }} stroke="#1a2035" width={56} />
            <Tooltip
              {...CHART_STYLE}
              labelFormatter={v => `Month ${v} · Year ${(v/12).toFixed(1)}`}
              formatter={(val, key) => [
                `$${val?.toLocaleString()}`,
                key === 'mortgageBenefit' ? 'Interest saved (mortgage)' : key === 'investGain' ? 'Net investment gain' : 'Investment portfolio value',
              ]}
            />
            <Legend formatter={val => (
              <span style={{ fontSize: 11 }}>
                {val === 'mortgageBenefit' ? 'Interest saved (mortgage prepayment)' : val === 'investGain' ? `Net investment gain (${invReturn}% after tax)` : 'Gross investment portfolio'}
              </span>
            )} wrapperStyle={{ paddingTop: 10 }} />
            {crossover && (
              <ReferenceLine x={crossover.month} stroke="#64748b" strokeDasharray="3 3"
                label={{ value: `Crossover`, fill: '#64748b', fontSize: 10, position: 'top' }} />
            )}
            <Line type="monotone" dataKey="mortgageBenefit" stroke="#F5A623" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="investGain"      stroke="#22d3ee" strokeWidth={2.5} dot={false} />
            <Line type="monotone" dataKey="investPortfolio" stroke="#22d3ee" strokeWidth={1}   dot={false} strokeDasharray="3 5" strokeOpacity={0.5} />
          </LineChart>
        </ResponsiveContainer>
      </Panel>

      {/* Tax note */}
      <div style={{ marginTop: 12, fontSize: 11, color: '#475569', textAlign: 'center' }}>
        Investment returns taxed at {taxRate}% marginal rate · CGT discount (50%) not applied — adjust tax rate to ~{(taxRate/2).toFixed(0)}% for assets held 12+ months · Not financial advice
      </div>
    </div>
  );
}
