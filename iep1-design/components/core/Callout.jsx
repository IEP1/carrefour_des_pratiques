import React from 'react';

export function Callout({ title, children, tone = 'info' }) {
  const accent = tone === 'warning' ? 'var(--orange-400)' : tone === 'success' ? 'var(--green-400)' : 'var(--blue-deep)';
  return (
    <div style={{
      background: '#fff',
      border: '1px solid var(--border-subtle)',
      borderRadius: 'var(--radius-md)',
      boxShadow: 'var(--shadow-card)',
      padding: '24px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      maxWidth: 480,
    }}>
      <div style={{ width: 32, height: 4, background: accent, borderRadius: 2 }} />
      {title && (
        <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: 'var(--navy-900)' }}>{title}</div>
      )}
      <div style={{ fontFamily: 'var(--font-body)', fontSize: 15, lineHeight: 1.5, color: 'var(--text-secondary)' }}>{children}</div>
    </div>
  );
}
