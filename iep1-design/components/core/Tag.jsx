import React from 'react';

const tones = {
  navy: { background: 'var(--navy-900)', color: '#fff' },
  blue: { background: 'var(--blue-deep)', color: '#fff' },
  orange: { background: 'var(--orange-400)', color: 'var(--navy-900)' },
  green: { background: 'var(--green-400)', color: 'var(--navy-900)' },
  neutral: { background: 'var(--paper)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' },
};

export function Tag({ children, tone = 'neutral' }) {
  const t = tones[tone] || tones.neutral;
  return (
    <span style={{
      fontFamily: 'var(--font-body)',
      fontWeight: 700,
      fontSize: 13,
      letterSpacing: '0.3px',
      padding: '4px 12px',
      borderRadius: 'var(--radius-pill)',
      display: 'inline-block',
      ...t,
    }}>
      {children}
    </span>
  );
}
