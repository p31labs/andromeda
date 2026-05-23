import React, { useState, useEffect } from 'react';
import { useTable, Provider } from 'tinybase/ui-react';
import { initMatriarchDB, CulinaryStore } from './db';
import './p31-matriarch.css';

// --- COMPONENTS ---

const ContextToggle = ({
  context,
  setContext
}: {
  context: 'home' | 'business',
  setContext: (c: 'home' | 'business') => void
}) => (
  <nav className="context-toggle" aria-label="Environment Switcher">
    <button
      className="context-btn"
      data-active={context === 'home'}
      data-context="home"
      onClick={() => setContext('home')}
      aria-pressed={context === 'home'}
    >
      FAMILY
    </button>
    <button
      className="context-btn"
      data-active={context === 'business'}
      data-context="business"
      onClick={() => setContext('business')}
      aria-pressed={context === 'business'}
    >
      MECHANICS
    </button>
  </nav>
);

const ActiveBatches = ({
  context,
  store
}: {
  context: 'home' | 'business',
  store: ReturnType<typeof initMatriarchDB> extends Promise<infer U> ? U['store'] : any
}) => {
  // Reactive hook: Updates instantly without re-fetching
  const allBatches = useTable('batches', store);
  
  const activeBatches = Object.entries(allBatches).filter(
    ([_, batch]) => batch.context === context && batch.status === 'pending'
  );

  const handleComplete = (id: string) => {
    // Optimistic UI update in TinyBase. 
    // The sync layer will flush this to PGLite in the background.
    store.setCell('batches', id, 'status', 'completed');
  };

  if (activeBatches.length === 0) {
    return <div className="empty-state">All clear. Rest your mind.</div>;
  }

  return (
    <div className="prep-container">
      {activeBatches.map(([id, batch]) => (
        <article key={id} className="prep-card">
          <div className="prep-card-info">
            <h2>{batch.recipe_name}</h2>
            <p>Servings: <strong>{batch.target_servings}</strong></p>
          </div>
          <button 
            className={`btn-complete ${context}`}
            onClick={() => handleComplete(id)}
            aria-label={`Mark ${batch.recipe_name} as complete`}
          >
            DONE
          </button>
        </article>
      ))}
    </div>
  );
};

// --- MAIN APPLICATION ENTRY ---

export default function MatriarchApp() {
  const [dbState, setDbState] = useState<CulinaryStore | null>(null);
  const [activeContext, setActiveContext] = useState<'home' | 'business'>('home');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    initMatriarchDB()
      .then(state => {
        if (isMounted) {
          // Dev mock data injection to ensure she sees something immediately
          state.store.setRow('batches', 'mock-1', { recipe_name: 'Breakfast Burritos', target_servings: 15, context: 'business', status: 'pending' });
          state.store.setRow('batches', 'mock-2', { recipe_name: 'Chicken Parm', target_servings: 4, context: 'home', status: 'pending' });
          setDbState(state);
        }
      })
      .catch(err => {
        console.error("PGLite Init Failed:", err);
        if (isMounted) setError("Database initialization failed. Please reload.");
      });
    return () => { isMounted = false; };
  }, []);

  if (error) return <div className="empty-state" style={{color: 'var(--p31-coral)'}}>{error}</div>;
  if (!dbState) return <div className="empty-state">Waking up the kitchen...</div>;

  return (
    <Provider store={dbState.store}>
      <ContextToggle context={activeContext} setContext={setActiveContext} />
      <main>
        <ActiveBatches context={activeContext} store={dbState.store} />
      </main>
    </Provider>
  );
}
