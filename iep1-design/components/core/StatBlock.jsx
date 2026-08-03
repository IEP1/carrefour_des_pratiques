import React from 'react';

export function StatBlock({ value, label, color = 'blue' }) {
  const c = { blue: 'var(--blue-deep)', orange: 'var(--orange-400)', green: 'var(--green-400)', navy: 'var(--navy-900)' }[color] || 'var(--blue-deep)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 120 }}>
      <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 40, color: c, lineHeight: 1 }}>{value}</div>
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 14, color: 'var(--text-secondary)' }}>{label}</div>
    </div>
  );
}
