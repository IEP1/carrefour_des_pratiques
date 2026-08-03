import React from 'react';

const colors = { orange: 'var(--orange-400)', blue: 'var(--blue-mid)', green: 'var(--green-400)', navy: 'var(--navy-900)' };

export function SectionDivider({ label, color = 'blue' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <div style={{ width: 12, height: 40, background: colors[color] || colors.blue }} />
      <div style={{ width: 64, height: 4, background: colors[color] || colors.blue, marginLeft: -12, marginTop: 36 }} />
      {label && (
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 24, color: 'var(--navy-900)' }}>{label}</div>
      )}
    </div>
  );
}
