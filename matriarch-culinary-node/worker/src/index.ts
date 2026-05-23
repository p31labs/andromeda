
export const PHOS_TOOLS = [
  {
    name: "update_inventory",
    description: "Add or adjust ingredient quantity in the pantry",
    parameters: {
      type: "object",
      properties: {
        context: { type: "string", enum: ["home", "business"] },
        ingredient_id: { type: "string", description: "canonical ingredient id" },
        delta: { type: "number", description: "positive = add, negative = subtract" },
        unit: { type: "string", enum: ["piece", "cup", "lb", "tsp", "batch"] }
      },
      required: ["context", "ingredient_id", "delta", "unit"]
    }
  },
  {
    name: "start_prep_session",
    description: "Begin an active prep session for a recipe",
    parameters: {
      type: "object",
      properties: {
        recipe_id: { type: "string" },
        target_servings: { type: "number" },
        context: { type: "string", enum: ["home", "business"] }
      },
      required: ["recipe_id", "target_servings", "context"]
    }
  }
];

interface Env {
  PGLITE_PERSISTENCE: KVNamespace;
  DB_OBJECT: DurableObjectNamespace;
}

// Durable Object for PGLite
export class PGLiteDurableObject implements DurableObject {
  state: DurableObjectState;
  env: Env;
  db: any; // Placeholder for PGLite instance

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;
    // PGLite initialization would go here, possibly loading from KV
    console.log("PGLiteDurableObject initialized");
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/init-db") {
        // Initialize PGLite and apply schema.sql
        // This is a placeholder for actual PGLite setup
        console.log("Initializing PGLite DB and applying schema...");
        return new Response("DB Init placeholder", { status: 200 });
    }

    if (url.pathname === "/execute-sql") {
      try {
        const { sql, params } = await request.json();
        // Execute SQL against PGLite
        console.log("Executing SQL:", sql, params);
        return new Response(JSON.stringify({ results: "SQL execution placeholder" }), { status: 200 });
      } catch (error: any) {
        return new Response(error.message, { status: 500 });
      }
    }

    return new Response("PGLite Durable Object is running", { status: 200 });
  }
}


export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/phos-tools") {
      return new Response(JSON.stringify(PHOS_TOOLS), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (url.pathname === "/tool-call") {
      try {
        const { tool_name, parameters } = await request.json();

        // Get Durable Object ID for the database
        const id = env.DB_OBJECT.idFromName(env.PGLITE_DB_NAME);
        const stub = env.DB_OBJECT.get(id);

        let sqlQuery: string = "";
        let sqlParams: any[] = [];

        switch (tool_name) {
          case "update_inventory":
            const { context, ingredient_id, delta, unit } = parameters;
            // Placeholder for generating SQL for update_inventory
            sqlQuery = \`INSERT INTO inventory (context_id, ingredient_id, quantity, unit)
                        VALUES (?, ?, ?, ?)
                        ON CONFLICT(context_id, ingredient_id) DO UPDATE SET quantity = quantity + ?, updated_at = CURRENT_TIMESTAMP;\`;
            sqlParams = [context, ingredient_id, delta, unit, delta];
            break;
          case "start_prep_session":
            const { recipe_id, target_servings, context: prepContext } = parameters;
            // Placeholder for generating SQL for start_prep_session
            sqlQuery = \`INSERT INTO batches (id, recipe_id, context_id, target_servings)
                        VALUES (?, ?, ?, ?);\`;
            sqlParams = [\`batch-\${Date.now()}\`, recipe_id, prepContext, target_servings];
            break;
          default:
            return new Response(\`Unknown tool: \${tool_name}\`, { status: 400 });
        }

        // Send SQL to Durable Object
        const doResponse = await stub.fetch(new Request("https://fake-host/execute-sql", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sql: sqlQuery, params: sqlParams }),
        }));

        const doResult = await doResponse.json();
        return new Response(JSON.stringify({ success: true, result: doResult }), {
          headers: { 'Content-Type': 'application/json' },
        });

      } catch (error: any) {
        return new Response(error.message, { status: 500 });
      }
    }

    return new Response("Matriarch Culinary Node Worker is running", { status: 200 });
  },
};
