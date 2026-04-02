import { useState, useRef } from 'react';
import ScenarioPlanner from './pages/ScenarioPlanner.jsx';
import OffsetModeller  from './pages/OffsetModeller.jsx';
import BreakEven       from './pages/BreakEven.jsx';

const DEFAULTS = {
  balance:    319500,
  offset:     14000,
  rate:       5.72,
  payment:    2315.06,
  oldPayment: 2267.82,
};

const TABS = [
  { id: 'scenarios', label: '📊 Scenario Planner',     desc: '7 repayment & rate scenarios' },
  { id: 'offset',    label: '💰 Offset Modeller',       desc: 'Growing offset impact'        },
  { id: 'breakeven', label: '⚖️ Break-Even Calculator', desc: 'Prepay vs invest'              },
];

export default function App() {
  const [tab,  setTab]  = useState('scenarios');
  const [loan, setLoan] = useState(DEFAULTS);

  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9' }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="no-print" style={{
        borderBottom: '1px solid #e2e8f0',
        background: '#ffffff',
        position: 'sticky', top: 0, zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
      }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '0 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60 }}>

            {/* Logo */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 8,
                background: 'linear-gradient(135deg,#F5A623,#fb923c)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16,
              }}>🏠</div>
              <div>
                <div style={{ fontWeight: 800, fontSize: 15, letterSpacing: '-0.02em', color: '#0f172a' }}>
                  Mortgage Planner
                </div>
                <div style={{ fontSize: 10, color: '#94a3b8', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  AHL South Hedland · 5.72% Variable
                </div>
              </div>
            </div>

            {/* Tabs */}
            <nav style={{ display: 'flex', gap: 4 }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{
                  background:   tab === t.id ? '#f8fafc' : 'transparent',
                  border:       `1px solid ${tab === t.id ? '#e2e8f0' : 'transparent'}`,
                  borderRadius: 8,
                  color:        tab === t.id ? '#0f172a' : '#94a3b8',
                  padding:      '7px 14px',
                  cursor:       'pointer',
                  fontFamily:   "'Syne', sans-serif",
                  fontSize:     13,
                  fontWeight:   tab === t.id ? 600 : 400,
                  transition:   'all 0.15s',
                }}>
                  {t.label}
                </button>
              ))}
            </nav>

            {/* Print */}
            <button onClick={() => window.print()} style={{
              background: '#f8fafc', border: '1px solid #e2e8f0',
              borderRadius: 8, color: '#64748b', fontSize: 12,
              padding: '7px 14px', cursor: 'pointer',
              fontFamily: "'Syne', sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              🖨 Print / PDF
            </button>
          </div>
        </div>
      </header>

      {/* ── Loan summary bar ─────────────────────────────────────────────── */}
      <div style={{ borderBottom: '1px solid #e2e8f0', background: '#ffffff' }}>
        <div style={{ maxWidth: 1400, margin: '0 auto', padding: '10px 24px' }}>
          <div style={{ display: 'flex', gap: 32, alignItems: 'center', flexWrap: 'wrap' }}>
            {[
              { label: 'Balance',   val: `$${loan.balance.toLocaleString()}` },
              { label: 'Offset',    val: `$${loan.offset.toLocaleString()}` },
              { label: 'Effective', val: `$${(loan.balance - loan.offset).toLocaleString()}` },
              { label: 'Rate',      val: `${loan.rate.toFixed(2)}%` },
              { label: 'Repayment',  val: `$${loan.payment.toLocaleString()} /mo` },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
                <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: '#475569', fontWeight: 500 }}>{val}</span>
              </div>
            ))}
            <div style={{ marginLeft: 'auto', fontSize: 11, color: '#cbd5e1' }}>
              RBA Mar 2026 · 5.47% → 5.72% · $2,315.06 from 22 May
            </div>
          </div>
        </div>
      </div>

      {/* ── Page content ─────────────────────────────────────────────────── */}
      <main style={{ maxWidth: 1400, margin: '0 auto', padding: '24px 24px 48px' }}>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: '#F5A623', textTransform: 'uppercase', letterSpacing: '0.2em', marginBottom: 4 }}>
            {TABS.find(t => t.id === tab)?.desc}
          </div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', color: '#0f172a' }}>
            {TABS.find(t => t.id === tab)?.label.replace(/^[^\s]+\s/, '')}
          </h2>
        </div>

        {tab === 'scenarios' && <ScenarioPlanner loan={loan} setLoan={setLoan} />}
        {tab === 'offset'    && <OffsetModeller  loan={loan} />}
        {tab === 'breakeven' && <BreakEven        loan={loan} />}
      </main>

      {/* ── Footer ───────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid #e2e8f0', background: '#ffffff', padding: '16px 24px', textAlign: 'center', fontSize: 11, color: '#cbd5e1' }}>
        Indicative modelling only · Not financial advice · Based on standard amortisation
      </footer>
    </div>
  );
}
