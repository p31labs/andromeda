// Copied from culinary-matria, converted from Tailwind to inline styles
import { Home, Briefcase } from 'lucide-react';
import { useAppStore } from '../stores/appStore';

export function ContextToggle() {
  const { context, setContext } = useAppStore();

  const isHome = context === 'home';

  return (
    <div style={styles.container}>
      <button
        onClick={() => setContext('home')}
        style={{
          ...styles.button,
          ...(isHome ? styles.buttonActiveHome : styles.buttonInactive),
        }}
      >
        <Home style={styles.icon} />
        <span>Home</span>
      </button>

      <button
        onClick={() => setContext('business')}
        style={{
          ...styles.button,
          ...(!isHome ? styles.buttonActiveWork : styles.buttonInactive),
        }}
      >
        <Briefcase style={styles.icon} />
        <span>Work</span>
      </button>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px',
    borderRadius: '12px',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    minHeight: '64px',
  },
  button: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '12px 16px',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.2s',
    minWidth: '80px',
    justifyContent: 'center',
    minHeight: '50px',
  },
  buttonActiveHome: {
    backgroundColor: '#5DCAA5',
    color: '#0f1115',
  },
  buttonActiveWork: {
    backgroundColor: '#cc6247',
    color: 'white',
  },
  buttonInactive: {
    backgroundColor: 'transparent',
    color: '#9ca3af',
  },
  icon: {
    width: '20px',
    height: '20px',
  },
};

export default ContextToggle;
