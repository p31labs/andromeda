import { useState, useEffect } from 'react';
import { Clock, Users, ChevronRight } from 'lucide-react';
import { getDB } from '../db/init';

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

interface Props {
  searchQuery: string;
  onRecipeClick: (recipe: Recipe) => void;
  contextFilter?: 'home' | 'business';
}

export function RecipeList({ searchQuery, onRecipeClick, contextFilter }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRecipes();
  }, [searchQuery]);

  async function loadRecipes() {
    try {
      setLoading(true);
      const db = await getDB();
      let query = 'SELECT * FROM recipes WHERE 1=1';
      let params: (string | number)[] = [];
      let paramIndex = 1;

      if (contextFilter) {
        query += ` AND (context = $${paramIndex} OR context = 'family')`;
        params.push(contextFilter);
        paramIndex++;
      }

      if (searchQuery) {
        query += ` AND (title ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
        params.push(`%${searchQuery}%`);
        paramIndex++;
      }

      query += ' ORDER BY created_at DESC';

      const result = await db.query(query, params);
      
      const mapped: Recipe[] = result.rows.map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description || '',
        prep_time_min: row.prep_time_min || 0,
        cook_time_min: row.cook_time_min || 0,
        base_servings: row.base_servings || 4,
        tags: row.tags_json ? JSON.parse(row.tags_json) : [],
        notes: row.notes || ''
      }));

      setRecipes(mapped);
    } catch (err) {
      console.error('Failed to load recipes:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-2 border-p31-teal border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (recipes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
          <span className="text-3xl">🍳</span>
        </div>
        <h3 className="font-medium mb-2">
          {searchQuery ? `No recipes match "${searchQuery}"` : "No recipes yet"}
        </h3>
        <p className="text-sm text-p31-gray-400 mb-6">
          {searchQuery 
            ? "Try a different search term"
            : "Start building your family cookbook by adding your first recipe"}
        </p>
        {!searchQuery && (
          <button 
            onClick={() => window.dispatchEvent(new CustomEvent('culinary:create-recipe'))}
            className="px-6 py-3 rounded-lg bg-p31-teal text-p31-void font-medium hover:bg-p31-teal/90 transition-colors inline-flex items-center gap-2"
          >
            <span>Add First Recipe</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {recipes.map(recipe => (
        <div 
          key={recipe.id}
          onClick={() => onRecipeClick(recipe)}
          className="glass-card p-4 hover:bg-white/[0.07] transition-all cursor-pointer group active:scale-[0.99]"
          style={{ minHeight: '64px' }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between">
                <h3 className="font-medium text-p31-cloud group-hover:text-p31-teal transition-colors truncate pr-2 text-lg">
                  {recipe.title}
                </h3>
                <ChevronRight className="w-6 h-6 text-p31-gray-500 flex-shrink-0 group-hover:text-p31-teal transition-colors" />
              </div>
              
              {recipe.description && (
                <p className="text-sm text-p31-gray-400 mt-1 line-clamp-2">{recipe.description}</p>
              )}
              
              <div className="flex items-center gap-4 mt-3 text-sm text-p31-gray-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {recipe.prep_time_min + recipe.cook_time_min} min
                </span>
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4" />
                  Serves {recipe.base_servings}
                </span>
                {recipe.tags.length > 0 && (
                  <span className="text-p31-teal">
                    {recipe.tags.length} tag{recipe.tags.length !== 1 ? 's' : ''}
                  </span>
                )}
              </div>

              {recipe.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {recipe.tags.slice(0, 3).map((tag, i) => (
                    <span 
                      key={i}
                      className="px-3 py-1.5 rounded bg-white/5 text-sm text-p31-gray-400"
                      style={{ minHeight: '32px', display: 'inline-flex', alignItems: 'center' }}
                    >
                      {tag}
                    </span>
                  ))}
                  {recipe.tags.length > 3 && (
                    <span 
                      className="px-3 py-1.5 rounded bg-white/5 text-sm text-p31-gray-400"
                      style={{ minHeight: '32px', display: 'inline-flex', alignItems: 'center' }}
                    >
                      +{recipe.tags.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
      
      <p className="text-center text-xs text-p31-gray-500 pt-4">
        {recipes.length} recipe{recipes.length !== 1 ? 's' : ''} in your cookbook
      </p>
    </div>
  );
}
