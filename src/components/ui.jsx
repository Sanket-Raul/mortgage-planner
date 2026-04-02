// Shared UI primitives — light theme

export function NumInput({ label, value, onChange, prefix = '$', step = 1, min, max }) {
  return (
    <div>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 5 }}>
        {label}
      </div>
      <div style={{
        display: 'flex', alignItems: 'center',
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: 7, overflow: 'hidden',
      }}>
        <span style={{ padding: '7px 9px', fontSize: 12, color: '#94a3b8', borderRight: '1px solid #e2e8f0', userSelect: 'none' }}>
          {prefix}
        </span>
        <input
          type="number" value={value} step={step}
          min={min} max={max}
          onChange={e => onChange(Number(e.target.value))}
          style={{
            background: 'transparent', border: 'none', outline: 'none',
            color: '#0f172a', fontFamily: "'JetBrains Mono', monospace",
            fontSize: 13, padding: '7px 9px', width: '100%',
          }}
        />
      </div>
    </div>
  );
}

export function RangeSlider({ label, min, max, step, value, onChange, fmt, accent = '#F5A623' }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 13, color: accent, fontWeight: 600 }}>
          {fmt ? fmt(value) : value}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: '100%', accentColor: accent }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#cbd5e1', marginTop: 3 }}>
        <span>{fmt ? fmt(min) : min}</span>
        <span>{fmt ? fmt(max) : max}</span>
      </div>
    </div>
  );
}

export function StatCard({ label, value, sub, accent = '#F5A623', highlight = false }) {
  return (
    <div className="print-card" style={{
      background: highlight ? '#fffbf0' : '#ffffff',
      border: `1px solid ${highlight ? accent + '60' : '#e2e8f0'}`,
      borderRadius: 10, padding: '13px 15px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
    }}>
      <div style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: 7 }}>
        {label}
      </div>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 20, fontWeight: 600, color: accent }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{sub}</div>}
    </div>
  );
}

export function Panel({ children, title, sub, style = {} }) {
  return (
    <div style={{
      background: '#ffffff',
      border: '1px solid #e2e8f0',
      borderRadius: 12, padding: '18px 20px',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
      ...style,
    }}>
      {title && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#0f172a' }}>{title}</div>
          {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{sub}</div>}
        </div>
      )}
      {children}
    </div>
  );
}

export function Divider() {
  return <div style={{ height: 1, background: '#e2e8f0', margin: '14px 0' }} />;
}

export const CHART_STYLE = {
  contentStyle: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8, fontSize: 11,
    fontFamily: "'JetBrains Mono', monospace",
    color: '#0f172a',
  },
};
