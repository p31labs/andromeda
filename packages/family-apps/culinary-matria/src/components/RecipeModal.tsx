import { useState, useEffect } from 'react';
import { X, Clock, Users } from 'lucide-react';
import { getDB } from '../db/init';

interface Recipe {
  id?: string;
  title: string;
  description: string;
  prep_time_min: number;
  cook_time_min: number;
  base_servings: number;
  tags: string[];
  notes?: string;
}

interface Props {
  recipe?: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  mode: 'create' | 'view' | 'edit';
  scaleFactor?: number;
}

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  checked: boolean;
}

export function RecipeModal({ recipe, isOpen, onClose, onSave, mode, scaleFactor = 1 }: Props) {
  const [formData, setFormData] = useState<Recipe>({
    title: '',
    description: '',
    prep_time_min: 0,
    cook_time_min: 0,
    base_servings: 4,
    tags: [],
    notes: ''
  });
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    if (recipe?.id && (mode === 'edit' || mode === 'view')) {
      setFormData(recipe);
      loadIngredients(recipe.id!); // Non-null assertion since we checked recipe?.id
    } else {
      setFormData({
        title: '',
        description: '',
        prep_time_min: 0,
        cook_time_min: 0,
        base_servings: 4,
        tags: [],
        notes: ''
      });
      setIngredients([]);
    }
  }, [recipe, mode, isOpen]);

  async function loadIngredients(recipeId: string) {
    try {
      const db = await getDB();
      const result = await db.query(
        `SELECT i.id, i.name, ri.quantity, COALESCE(ri.unit, i.canonical_unit) as unit, 0 as checked
         FROM recipe_ingredients ri
         JOIN ingredients i ON ri.ingredient_id = i.id
         WHERE ri.recipe_id = $1`,
        [recipeId]
      );
      // @ts-ignore
      setIngredients(result.rows || []);
    } catch (err) {
      console.error('Failed to load ingredients:', err);
    }
  }

  const toggleIngredient = (id: string) => {
    setIngredients(prev => prev.map(ing => 
      ing.id === id ? { ...ing, checked: !ing.checked } : ing
    ));
  };

  const allChecked = ingredients.length > 0 && ingredients.every(ing => ing.checked);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === 'view') {
      onClose();
      return;
    }

    setSaving(true);
    try {
      const db = await getDB();
      const now = Math.floor(Date.now() / 1000);

      if (mode === 'edit' && recipe?.id) {
        await db.query(
          `UPDATE recipes SET 
            title = $1, description = $2, prep_time_min = $3, cook_time_min = $4, 
            base_servings = $5, tags_json = $6, notes = $7, updated_at = $8
           WHERE id = $9`,
          [
            formData.title,
            formData.description,
            formData.prep_time_min,
            formData.cook_time_min,
            formData.base_servings,
            JSON.stringify(formData.tags),
            formData.notes,
            now,
            recipe.id
          ]
        );
      } else {
        await db.query(
          `INSERT INTO recipes (title, description, prep_time_min, cook_time_min, 
            base_servings, tags_json, notes, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
          [
            formData.title,
            formData.description,
            formData.prep_time_min,
            formData.cook_time_min,
            formData.base_servings,
            JSON.stringify(formData.tags),
            formData.notes,
            now,
            now
          ]
        );
      }
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to save recipe:', err);
      alert('Failed to save recipe. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    const recipeId = recipe?.id;
    if (!recipeId || !confirm('Are you sure you want to delete this recipe?')) return;
    
    try {
      const db = await getDB();
      await db.query('DELETE FROM recipes WHERE id = $1', [recipeId]);
      onSave();
      onClose();
    } catch (err) {
      console.error('Failed to delete recipe:', err);
      alert('Failed to delete recipe.');
    }
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData({ ...formData, tags: [...formData.tags, tagInput.trim()] });
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData({ ...formData, tags: formData.tags.filter(t => t !== tagToRemove) });
  };

  const isEditing = mode === 'create' || mode === 'edit';

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="glass-card w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-xl font-bold">
            {mode === 'create' ? 'New Recipe' : mode === 'edit' ? 'Edit Recipe' : formData.title}
          </h2>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm text-p31-gray-400 mb-1">Recipe Name</label>
            {isEditing ? (
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-p31-teal"
                placeholder="e.g., Grandma's Chicken Soup"
                required
              />
            ) : (
              <p className="text-lg font-medium">{formData.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm text-p31-gray-400 mb-1">Description</label>
            {isEditing ? (
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-p31-teal resize-none"
                rows={2}
                placeholder="Brief description of the dish..."
              />
            ) : (
              <p className="text-sm text-p31-gray-400">{formData.description || 'No description'}</p>
            )}
          </div>

          {/* Time and Servings */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-p31-gray-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Prep (min)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.prep_time_min}
                  onChange={(e) => setFormData({ ...formData, prep_time_min: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-p31-teal"
                  min="0"
                />
              ) : (
                <p className="font-medium">{formData.prep_time_min} min</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-p31-gray-400 mb-1 flex items-center gap-1">
                <Clock className="w-3 h-3" /> Cook (min)
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.cook_time_min}
                  onChange={(e) => setFormData({ ...formData, cook_time_min: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-p31-teal"
                  min="0"
                />
              ) : (
                <p className="font-medium">{formData.cook_time_min} min</p>
              )}
            </div>
            <div>
              <label className="block text-xs text-p31-gray-400 mb-1 flex items-center gap-1">
                <Users className="w-3 h-3" /> Serves
              </label>
              {isEditing ? (
                <input
                  type="number"
                  value={formData.base_servings}
                  onChange={(e) => setFormData({ ...formData, base_servings: parseInt(e.target.value) || 1 })}
                  className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-p31-teal"
                  min="1"
                />
              ) : (
                <p className="font-medium">{formData.base_servings}</p>
              )}
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm text-p31-gray-400 mb-1">Tags</label>
            {isEditing ? (
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                  className="flex-1 px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-p31-teal"
                  placeholder="Add tag..."
                />
                <button
                  type="button"
                  onClick={addTag}
                  className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
                >
                  Add
                </button>
              </div>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {formData.tags.map((tag, i) => (
                <span
                  key={i}
                  className="px-2 py-1 rounded-full bg-p31-teal/20 text-p31-teal text-sm flex items-center gap-1"
                >
                  {tag}
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-p31-cyan"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm text-p31-gray-400 mb-1">Notes</label>
            {isEditing ? (
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 focus:outline-none focus:border-p31-teal resize-none"
                rows={3}
                placeholder="Family stories, tips, variations..."
              />
            ) : (
              <p className="text-sm text-p31-gray-400 whitespace-pre-wrap">{formData.notes || 'No notes'}</p>
            )}
          </div>

          {/* Ingredient Checklist (View Mode Only) */}
          {mode === 'view' && ingredients.length > 0 && (
            <div className="border-t border-white/10 pt-4">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm text-p31-gray-400">
                  Ingredients Checklist
                </label>
                {allChecked && (
                  <span className="text-xs text-p31-teal font-medium">
                    ✓ All Ready!
                  </span>
                )}
              </div>
              
              {/* Progress Bar */}
              <div className="w-full h-2 bg-white/10 rounded-full mb-4 overflow-hidden">
                <div 
                  className="h-full bg-p31-teal transition-all duration-300"
                  style={{ 
                    width: `${ingredients.length > 0 
                      ? (ingredients.filter(i => i.checked).length / ingredients.length) * 100 
                      : 0}%` 
                  }}
                />
              </div>

              {/* Checklist Items */}
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {ingredients.map((ing) => {
                  const scaledQty = (ing.quantity * scaleFactor).toFixed(2).replace(/\.00$/, '');
                  return (
                    <div
                      key={ing.id}
                      onClick={() => toggleIngredient(ing.id)}
                      className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                        ing.checked 
                          ? 'bg-p31-teal/20' 
                          : 'bg-white/5 hover:bg-white/10'
                      }`}
                      style={{ minHeight: '64px' }}
                    >
                      <div className={`w-6 h-6 rounded-md flex items-center justify-center border-2 ${
                        ing.checked 
                          ? 'bg-p31-teal border-p31-teal' 
                          : 'border-white/30'
                      }`}>
                        {ing.checked && (
                          <svg className="w-4 h-4 text-p31-void" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div className="flex-1">
                        <span className={`font-medium ${ing.checked ? 'line-through text-p31-gray-500' : ''}`}>
                          {ing.name}
                        </span>
                        <span className="text-sm text-p31-gray-400 ml-2">
                          {scaledQty} {ing.unit}
                          {scaleFactor !== 1 && (
                            <span className="text-xs text-p31-teal ml-1">
                              (×{scaleFactor.toFixed(1)})
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-white/10">
            {mode === 'view' ? (
              <>
                <button
                  type="button"
                  onClick={() => onClose()}
                  className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Switch to edit mode - this will be handled by parent
                    window.dispatchEvent(new CustomEvent('culinary:edit-recipe', { 
                      detail: { recipeId: recipe?.id } 
                    }));
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-p31-teal text-p31-void font-medium hover:bg-p31-teal/90 transition-colors"
                >
                  Edit Recipe
                </button>
              </>
            ) : (
              <>
                {mode === 'edit' && (
                  <button
                    type="button"
                    onClick={handleDelete}
                    className="px-4 py-2 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                  >
                    Delete
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formData.title}
                  className="flex-1 px-4 py-2 rounded-lg bg-p31-teal text-p31-void font-medium hover:bg-p31-teal/90 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : mode === 'create' ? 'Create Recipe' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
