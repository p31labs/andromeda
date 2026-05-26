import { useState, useEffect } from 'react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { OfflineIndicator } from './components/OfflineIndicator';
import { P31Welcome } from './components/P31Welcome';
import { RecipeList } from './components/RecipeList';
import { RecipeModal } from './components/RecipeModal';
import { VoiceButton } from './components/VoiceButton';
import { ContextToggle } from './components/ContextToggle';
import { ScaleButtons } from './components/ScaleButtons';
import { initDB, getDB } from './db/init';
import { useAppStore, initBioState } from './stores/appStore';
import { ChefHat, Plus, Search, X } from 'lucide-react';
import { ReturnRibbon } from '@p31/arcade-theme';

// CWP-020: Genesis Protocol - Sovereign Onboarding
import { GenesisFlow } from '../../shared-components/onboarding/components/GenesisFlow';
import type { SovereignIdentity } from '../../shared-components/onboarding/types';

interface Recipe {
  id: string;
  title: string;
  description: string;
  prep_time_min: number;
  cook_time_min: number;
  base_servings: number;
  tags: string[];
  notes?: string;
}

function App() {
  // ────────────────────────────────────────────────────────────────────────────
  // CWP-020: SOVEREIGN IDENTITY THRESHOLD
  // ────────────────────────────────────────────────────────────────────────────
  const [sovereignIdentity, setSovereignIdentity] = useState<SovereignIdentity | null>(null);
  const [inviteAlias, setInviteAlias] = useState<string>('Guest');
  const [isCheckingThreshold, setIsCheckingThreshold] = useState(true);

  useEffect(() => {
    // 1. Identity Check: Do they have a minted SBT?
    const storedIdentity = localStorage.getItem('p31_sovereign_identity');
    if (storedIdentity) {
      try {
        setSovereignIdentity(JSON.parse(storedIdentity));
      } catch {
        // Invalid stored identity, will trigger onboarding
      }
    }

    // 2. URL Parsing: Did Will send them a custom link?
    const urlParams = new URLSearchParams(window.location.search);
    const queryInvite = urlParams.get('invite');
    const pathMatch = window.location.pathname.match(/\/join\/([^/]+)/);

    if (queryInvite) {
      setInviteAlias(decodeURIComponent(queryInvite));
    } else if (pathMatch) {
      setInviteAlias(decodeURIComponent(pathMatch[1]));
    }

    setIsCheckingThreshold(false);
  }, []);

  // ────────────────────────────────────────────────────────────────────────────
  // APP STATE (Original)
  // ────────────────────────────────────────────────────────────────────────────
  const [dbReady, setDbReady] = useState(false);
  const [showWelcome, setShowWelcome] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalMode, setModalMode] = useState<'create' | 'view' | 'edit' | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [showScaleButtons, setShowScaleButtons] = useState(false);
  const [pendingServings, setPendingServings] = useState<number | null>(null);

  const { context, spoons, calcium } = useAppStore();

  useEffect(() => {
    const hasVisited = localStorage.getItem('culinary-matria:visited');
    if (!hasVisited) {
      setShowWelcome(true);
    }

    initDB().then(() => {
      setDbReady(true);
      initBioState();
    }).catch(err => {
      console.error('DB init failed:', err);
    });

    const handleCreateRecipe = () => handleCreateClick();
    const handleEditRecipe = (e: CustomEvent) => {
      const recipeId = e.detail?.recipeId;
      if (recipeId && selectedRecipe?.id === recipeId) {
        setModalMode('edit');
      }
    };

    window.addEventListener('culinary:create-recipe', handleCreateRecipe);
    window.addEventListener('culinary:edit-recipe', handleEditRecipe as EventListener);

    return () => {
      window.removeEventListener('culinary:create-recipe', handleCreateRecipe);
      window.removeEventListener('culinary:edit-recipe', handleEditRecipe as EventListener);
    };
  }, [selectedRecipe]);

  const handleWelcomeClose = () => {
    setShowWelcome(false);
    localStorage.setItem('culinary-matria:visited', 'true');
  };

  const handleRecipeClick = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setShowScaleButtons(true);
    setPendingServings(null);
  };

  const handleCreateClick = () => {
    setSelectedRecipe(null);
    setModalMode('create');
    setShowScaleButtons(false);
  };

  const handleScaleSelect = (servings: number) => {
    setPendingServings(servings);
    setShowScaleButtons(false);
    setModalMode('view');

    if (selectedRecipe) {
      createSession(selectedRecipe.id, servings);
    }
  };

  const createSession = async (recipeId: string, servings: number) => {
    try {
      const db = await getDB();
      const scaleFactor = servings / (selectedRecipe?.base_servings || 4);

      const sessionResult = await db.query(
        `INSERT INTO active_sessions (recipe_id, context, target_servings, scale_factor, status)
         VALUES ($1, $2, $3, $4, 'active')
         RETURNING id`,
        [recipeId, context, servings, scaleFactor]
      );

      const sessionId = (sessionResult.rows[0] as { id: number })?.id;

      await db.query(
        `INSERT INTO session_checklist (session_id, ingredient_id, scaled_quantity, unit, checked)
         SELECT $1, ri.ingredient_id, ri.quantity * $2, COALESCE(ri.unit, i.canonical_unit), 0
         FROM recipe_ingredients ri
         JOIN ingredients i ON ri.ingredient_id = i.id
         WHERE ri.recipe_id = $3`,
        [sessionId, scaleFactor, recipeId]
      );
    } catch (err) {
      console.error('Failed to create session:', err);
    }
  };

  const handleSave = () => {
    setRefreshKey(prev => prev + 1);
  };

  const handleCloseModal = () => {
    setModalMode(null);
    setSelectedRecipe(null);
    setShowScaleButtons(false);
    setPendingServings(null);
  };

  const handleVoiceCommand = async (transcript: string) => {
    console.log('Voice command:', transcript);
    const text = transcript.toLowerCase();

    const pantryMatch = text.match(/add\s+(\d+|a|an)?\s*(\w+)\s+(\w+)/);
    if (pantryMatch) {
      alert(`Adding ${pantryMatch[3]} to ${context} pantry`);
      return;
    }

    const startMatch = text.match(/(?:start|make|cook)\s+(?:the\s+)?(.+?)\s+(?:for|feed)/);
    if (startMatch) {
      const searchTerm = startMatch[1].trim();
      setSearchQuery(searchTerm);
      return;
    }
  };

  const getBioColor = () => {
    if (calcium && calcium <= 7.5) return 'bg-red-500';
    if (spoons < 0.3) return 'bg-amber-500';
    return 'bg-p31-teal';
  };

  // ────────────────────────────────────────────────────────────────────────────
  // CWP-020: THRESHOLD CHECKS
  // ────────────────────────────────────────────────────────────────────────────

  // Prevent flash while checking identity
  if (isCheckingThreshold) {
    return <div className="min-h-screen bg-zinc-950" />;
  }

  // 3. Absolute Interception: The Genesis Protocol
  if (!sovereignIdentity) {
    return (
      <GenesisFlow
        inviteCode="p31-family-mesh"
        invitedAlias={inviteAlias}
        onComplete={(identity) => {
          // 4. Post-Ceremony: Save identity, unlock app
          setSovereignIdentity(identity);
          localStorage.setItem('p31_sovereign_identity', JSON.stringify(identity));

          // Clean the URL
          const cleanUrl = window.location.pathname.replace(/\/join\/[^/]+/, '');
          window.history.replaceState({}, document.title, cleanUrl || '/');
        }}
        onExit={() => {
          // 5. Exit Handling: Send to public hub
          window.location.href = 'https://p31ca.org';
        }}
      />
    );
  }

  // ────────────────────────────────────────────────────────────────────────────
  // MAIN APP RENDER (Sovereign verified)
  // ────────────────────────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-p31-void">
        <OfflineIndicator />

        {showWelcome && (
          <P31Welcome
            appName="Culinary Matria"
            description="Family recipe management with local-first sync"
            onClose={handleWelcomeClose}
          />
        )}

        {/* Bio-State Status Bar */}
        <div className="fixed top-0 left-0 right-0 h-8 bg-p31-gray-100 border-b border-p31-gray-300 z-50 flex items-center px-4">
          <div className="flex items-center gap-4 w-full max-w-screen-2xl mx-auto">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${getBioColor()} animate-pulse`} />
              <span className="text-xs text-p31-gray-400">
                {calcium && calcium <= 7.5
                  ? '⚠️ Calcium Critical'
                  : spoons < 0.3
                    ? 'Spoons Low'
                    : `${Math.round(spoons * 100)}% spoons`}
              </span>
            </div>
            <div className="flex-1" />
            {/* Sovereign indicator */}
            <span className="text-xs text-cyan-400 font-mono mr-4">
              {sovereignIdentity.alias}
            </span>
            <span className="text-xs text-p31-teal font-mono">
              {context.toUpperCase()} MODE
            </span>
          </div>
        </div>

        {/* Header */}
        <header className="sticky top-8 z-40 bg-p31-void/80 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-p31-teal to-p31-cyan flex items-center justify-center">
                <ChefHat className="w-6 h-6 text-p31-void" />
              </div>
              <div>
                <h1 className="font-bold text-lg">Culinary Matria</h1>
                <p className="text-xs text-p31-gray-400">
                  {context === 'home' ? 'Family recipes' : 'Business prep'}
                </p>
              </div>
            </div>
            <ContextToggle />
          </div>
        </header>

        {/* Search Bar */}
        <div className="px-4 py-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-p31-gray-400" />
            <input
              type="text"
              placeholder="Search recipes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-12 py-4 rounded-xl bg-white/5 border border-white/10 text-base focus:outline-none focus:border-p31-teal transition-colors"
              style={{ minHeight: '64px' }}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5 text-p31-gray-400" />
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <main className="px-4 pb-32">
          {dbReady ? (
            <RecipeList
              key={refreshKey}
              searchQuery={searchQuery}
              onRecipeClick={handleRecipeClick}
              contextFilter={context}
            />
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="w-8 h-8 border-2 border-p31-teal border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
                <p className="text-sm text-p31-gray-400">Loading recipes...</p>
              </div>
            </div>
          )}
        </main>

        {/* Scale Selection Overlay */}
        {showScaleButtons && selectedRecipe && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="glass-card w-full max-w-md p-6">
              <h2 className="text-xl font-bold mb-2 text-center">
                {selectedRecipe.title}
              </h2>
              <p className="text-sm text-p31-gray-400 text-center mb-6">
                Base recipe serves {selectedRecipe.base_servings}.
                How many people are you feeding?
              </p>

              <ScaleButtons
                baseServings={selectedRecipe.base_servings}
                onScale={handleScaleSelect}
              />

              <button
                onClick={() => setShowScaleButtons(false)}
                className="w-full mt-4 py-4 rounded-xl bg-white/5 hover:bg-white/10 transition-colors"
                style={{ minHeight: '64px' }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Voice Button */}
        <VoiceButton onCommand={handleVoiceCommand} />

        {/* Create FAB */}
        {!showScaleButtons && (
          <button
            onClick={handleCreateClick}
            className="fixed bottom-6 right-6 w-16 h-16 rounded-full bg-p31-teal text-p31-void flex items-center justify-center shadow-lg hover:scale-110 active:scale-95 transition-transform"
            style={{ minHeight: '64px', minWidth: '64px' }}
          >
            <Plus className="w-8 h-8" />
          </button>
        )}

        {/* Recipe Modal */}
        <RecipeModal
          recipe={selectedRecipe}
          isOpen={modalMode !== null}
          onClose={handleCloseModal}
          onSave={handleSave}
          mode={modalMode || 'view'}
          scaleFactor={pendingServings && selectedRecipe
            ? pendingServings / selectedRecipe.base_servings
            : 1}
        />

        <ReturnRibbon currentApp="culinary-matria" />
      </div>
    </ErrorBoundary>
  );
}

export default App;
