import { PGlite } from '@electric-sql/pglite';

let dbInstance: PGlite | null = null;

// Full CWP-CULINARY-01 Schema
const SCHEMA_SQL = `
-- Core tables
CREATE TABLE IF NOT EXISTS recipes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  context TEXT DEFAULT 'home' CHECK (context IN ('home', 'business')),
  base_servings INTEGER DEFAULT 4,
  prep_time_min INTEGER DEFAULT 0,
  cook_time_min INTEGER DEFAULT 0,
  total_time_min INTEGER GENERATED ALWAYS AS (prep_time_min + cook_time_min) STORED,
  tags_json TEXT DEFAULT '[]',
  notes TEXT,
  created_at INTEGER DEFAULT (extract(epoch from now())::integer),
  updated_at INTEGER DEFAULT (extract(epoch from now())::integer)
);

-- Ingredients master list
CREATE TABLE IF NOT EXISTS ingredients (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL UNIQUE,
  canonical_unit TEXT DEFAULT 'piece',
  aisle TEXT,
  created_at INTEGER DEFAULT (extract(epoch from now())::integer)
);

-- Recipe ingredients (many-to-many with quantities)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
  recipe_id TEXT NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  quantity REAL NOT NULL,
  unit TEXT,
  notes TEXT,
  PRIMARY KEY (recipe_id, ingredient_id)
);

-- Inventory/Pantry tracking
CREATE TABLE IF NOT EXISTS inventory (
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  context TEXT NOT NULL DEFAULT 'home' CHECK (context IN ('home', 'business')),
  quantity REAL NOT NULL DEFAULT 0,
  unit TEXT DEFAULT 'piece',
  last_counted INTEGER DEFAULT (extract(epoch from now())::integer),
  PRIMARY KEY (ingredient_id, context)
);

-- Active cooking sessions
CREATE TABLE IF NOT EXISTS active_sessions (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  recipe_id TEXT NOT NULL REFERENCES recipes(id),
  context TEXT NOT NULL DEFAULT 'home' CHECK (context IN ('home', 'business')),
  target_servings INTEGER NOT NULL DEFAULT 4,
  scale_factor REAL NOT NULL DEFAULT 1.0,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed')),
  started_at INTEGER DEFAULT (extract(epoch from now())::integer),
  completed_at INTEGER
);

-- Session ingredient checklist
CREATE TABLE IF NOT EXISTS session_checklist (
  session_id TEXT NOT NULL REFERENCES active_sessions(id) ON DELETE CASCADE,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  scaled_quantity REAL NOT NULL,
  unit TEXT,
  checked INTEGER DEFAULT 0,
  PRIMARY KEY (session_id, ingredient_id)
);

-- Shopping list
CREATE TABLE IF NOT EXISTS shopping_list (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ingredient_id TEXT NOT NULL REFERENCES ingredients(id),
  context TEXT NOT NULL DEFAULT 'home' CHECK (context IN ('home', 'business')),
  quantity_needed REAL NOT NULL,
  unit TEXT,
  acquired INTEGER DEFAULT 0,
  session_id TEXT REFERENCES active_sessions(id),
  created_at INTEGER DEFAULT (extract(epoch from now())::integer)
);

-- Sync queue for mesh
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  table_name TEXT NOT NULL,
  record_id TEXT NOT NULL,
  operation TEXT NOT NULL,
  payload TEXT,
  created_at INTEGER DEFAULT (extract(epoch from now())::integer),
  retry_count INTEGER DEFAULT 0
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_recipes_context ON recipes(context);
CREATE INDEX IF NOT EXISTS idx_recipes_updated ON recipes(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_context ON inventory(context);
CREATE INDEX IF NOT EXISTS idx_shopping_acquired ON shopping_list(context, acquired);
CREATE INDEX IF NOT EXISTS idx_sessions_status ON active_sessions(status);
`;

const SAMPLE_RECIPES = [
  {
    id: 'recipe-1',
    title: "Grandma's Chicken Soup",
    description: 'The healing soup that fixes everything. Passed down through three generations.',
    context: 'home',
    base_servings: 6,
    prep_time_min: 20,
    cook_time_min: 90,
    tags_json: JSON.stringify(['soup', 'chicken', 'comfort', 'healing']),
    created_at: Math.floor(Date.now() / 1000)
  },
  {
    id: 'recipe-2',
    title: 'Quick Breakfast Smoothie',
    description: '15g protein, calcium-rich smoothie for low-spoon mornings.',
    context: 'home',
    base_servings: 1,
    prep_time_min: 5,
    cook_time_min: 0,
    tags_json: JSON.stringify(['breakfast', 'quick', 'healthy', 'low-spoon', 'personal']),
    created_at: Math.floor(Date.now() / 1000) - 86400
  },
  {
    id: 'recipe-3',
    title: 'One-Pan Pasta Primavera',
    description: 'Minimal cleanup, maximum flavor. Perfect for tired days.',
    context: 'home',
    base_servings: 4,
    prep_time_min: 10,
    cook_time_min: 20,
    tags_json: JSON.stringify(['pasta', 'vegetarian', 'one-pan', 'easy', 'family']),
    created_at: Math.floor(Date.now() / 1000) - 172800
  },
  {
    id: 'recipe-4',
    title: 'Catering Batch BBQ Chicken',
    description: 'Large batch recipe for events. Serves 50. Prepped in hotel pans.',
    context: 'business',
    base_servings: 50,
    prep_time_min: 45,
    cook_time_min: 120,
    tags_json: JSON.stringify(['catering', 'bbq', 'batch', 'event']),
    created_at: Math.floor(Date.now() / 1000) - 200000
  }
];

const SAMPLE_INGREDIENTS = [
  { id: 'ing-1', name: 'chicken breast', canonical_unit: 'lb', aisle: 'meat' },
  { id: 'ing-2', name: 'carrots', canonical_unit: 'piece', aisle: 'produce' },
  { id: 'ing-3', name: 'onion', canonical_unit: 'piece', aisle: 'produce' },
  { id: 'ing-4', name: 'celery', canonical_unit: 'stalk', aisle: 'produce' },
  { id: 'ing-5', name: 'egg', canonical_unit: 'piece', aisle: 'dairy' }
];

export async function initDB(): Promise<PGlite> {
  if (dbInstance) return dbInstance;

  // Create new instance - v2 schema
  const newDb = await new PGlite('idb://culinary-matria-v2');
  await newDb.waitReady;

  // Run schema
  await newDb.exec(SCHEMA_SQL);

  // Check if we need to seed
  const countResult = await newDb.query('SELECT COUNT(*) as count FROM recipes');
  // @ts-ignore
  const count = parseInt(countResult.rows[0]?.count || '0', 10);

  if (count === 0) {
    // Seed recipes
    for (const recipe of SAMPLE_RECIPES) {
      await newDb.query(
        `INSERT INTO recipes(id, title, description, context, base_servings, prep_time_min, cook_time_min, tags_json, created_at) 
         VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9)
         ON CONFLICT DO NOTHING`,
        [
          recipe.id,
          recipe.title,
          recipe.description,
          recipe.context,
          recipe.base_servings,
          recipe.prep_time_min,
          recipe.cook_time_min,
          recipe.tags_json,
          recipe.created_at
        ]
      );
    }

    // Seed ingredients
    for (const ing of SAMPLE_INGREDIENTS) {
      await newDb.query(
        `INSERT INTO ingredients(id, name, canonical_unit, aisle) 
         VALUES($1, $2, $3, $4)
         ON CONFLICT DO NOTHING`,
        [ing.id, ing.name, ing.canonical_unit, ing.aisle]
      );
    }

    // Seed some recipe ingredients
    await newDb.query(
      `INSERT INTO recipe_ingredients(recipe_id, ingredient_id, quantity, unit, notes)
       VALUES($1, $2, $3, $4, $5)`,
      ['recipe-1', 'ing-1', 2, 'lb', 'diced']
    );
    await newDb.query(
      `INSERT INTO recipe_ingredients(recipe_id, ingredient_id, quantity, unit, notes)
       VALUES($1, $2, $3, $4, $5)`,
      ['recipe-1', 'ing-2', 3, 'piece', 'sliced']
    );
  }

  dbInstance = newDb;
  return newDb;
}

export async function getDB(): Promise<PGlite> {
  if (!dbInstance) {
    return initDB();
  }
  return dbInstance;
}
