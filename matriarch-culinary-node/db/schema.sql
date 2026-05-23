-- Contexts: home or business
CREATE TABLE IF NOT EXISTS contexts (
    id TEXT PRIMARY KEY, -- 'home' or 'business'
    name TEXT NOT NULL UNIQUE
);

INSERT OR IGNORE INTO contexts (id, name) VALUES ('home', 'Home Kitchen');
INSERT OR IGNORE INTO contexts (id, name) VALUES ('business', 'Business Kitchen');

-- Ingredients
CREATE TABLE IF NOT EXISTS ingredients (
    id TEXT PRIMARY KEY, -- canonical ingredient ID (e.g., 'milk-whole', 'flour-all-purpose')
    name TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipes
CREATE TABLE IF NOT EXISTS recipes (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Recipe Ingredients (many-to-many relationship)
CREATE TABLE IF NOT EXISTS recipe_ingredients (
    recipe_id TEXT NOT NULL,
    ingredient_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL, -- e.g., 'cup', 'gram', 'piece'
    PRIMARY KEY (recipe_id, ingredient_id),
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

-- Inventory (what's on hand, separated by context)
CREATE TABLE IF NOT EXISTS inventory (
    context_id TEXT NOT NULL,
    ingredient_id TEXT NOT NULL,
    quantity REAL NOT NULL,
    unit TEXT NOT NULL, -- e.g., 'piece', 'cup', 'lb', 'tsp', 'batch'
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (context_id, ingredient_id),
    FOREIGN KEY (context_id) REFERENCES contexts(id),
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id)
);

-- Batches (records of past preparations)
CREATE TABLE IF NOT EXISTS batches (
    id TEXT PRIMARY KEY,
    recipe_id TEXT NOT NULL,
    context_id TEXT NOT NULL,
    target_servings REAL NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    FOREIGN KEY (recipe_id) REFERENCES recipes(id),
    FOREIGN KEY (context_id) REFERENCES contexts(id)
);
