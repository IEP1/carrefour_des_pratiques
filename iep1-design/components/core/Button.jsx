import React from 'react';

const sizes = {
  sm: { padding: '8px 16px', fontSize: 14 },
  md: { padding: '12px 24px', fontSize: 16 },
  lg: { padding: '16px 32px', fontSize: 19 },
};

const variants = {
  primary: { background: 'var(--blue-deep)', color: '#fff', border: 'none' },
  navy: { background: 'var(--navy-900)', color: '#fff', border: 'none' },
  outline: { background: 'transparent', color: 'var(--blue-deep)', border: '1px solid var(--blue-deep)' },
  ghost: { background: 'transparent', color: 'var(--blue-deep)', border: 'none' },
};

export function Button({ children, variant = 'primary', size = 'md', disabled = false, onClick }) {
  const v = variants[variant] || variants.primary;
  const s = sizes[size] || sizes.md;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        fontFamily: 'var(--font-body)',
        fontWeight: 700,
        borderRadius: 'var(--radius-sm)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.45 : 1,
        transition: 'filter 120ms ease, transform 80ms ease',
        ...v,
        ...s,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = 'brightness(0.92)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = 'none'; }}
      onMouseDown={(e) => { if (!disabled) e.currentTarget.style.transform = 'scale(0.98)'; }}
      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {children}
    </button>
  );
}
