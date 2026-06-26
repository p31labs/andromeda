import React from 'react';

interface Mvp {
  name: string;
  status: string;
  url: string;
  badge: string;
}

interface MvpCardProps {
  mvp: Mvp;
}

export const MvpCard: React.FC<MvpCardProps> = ({ mvp }) => {
  return (
    <a
      href={mvp.url}
      style={{
        display: 'block',
        padding: '1rem',
        border: '1px solid #2a2d35',
        borderRadius: '0.5rem',
        background: '#161920',
<<<<<<< HEAD
        color: '#d8d6d0',
=======
        color: 'var(--color-cloud)',
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        textDecoration: 'none',
        transition: 'border-color 0.2s',
      }}
      target={mvp.url.startsWith('http') ? '_blank' : undefined}
      rel={mvp.url.startsWith('http') ? 'noopener noreferrer' : undefined}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
<<<<<<< HEAD
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#d8d6d0', margin: 0 }}>{mvp.name}</h3>
=======
        <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-cloud)', margin: 0 }}>{mvp.name}</h3>
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
        <span style={{ fontSize: '1.5rem' }}>{mvp.badge}</span>
      </div>
      <p style={{ fontSize: '0.875rem', marginTop: '0.25rem', color: '#8b8d89', margin: '0.25rem 0 0' }}>{mvp.status}</p>
    </a>
  );
<<<<<<< HEAD
};
=======
};
>>>>>>> auto-heal/ui-ux-drift-20260620-120057
