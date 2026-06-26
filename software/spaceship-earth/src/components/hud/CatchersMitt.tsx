 *
 * Visualizes buffered signals from the Catcher's Mitt temporal window.
 * Displays gentle pulsing indicator instead of flashing incoming data.
 *
        color: 'var(--color-cyan)',
            background: pendingCount > 0 ? 'var(--color-amber)' : 'var(--color-cyan)',
            boxShadow: `0 0 ${4 + pendingCount * 2}px ${pendingCount > 0 ? 'var(--color-amber)' : 'var(--color-cyan)'}`,
        <span style={{ color: pendingCount > 0 ? 'var(--color-amber)' : '#666' }}>
          color: 'var(--color-cyan)',
}
