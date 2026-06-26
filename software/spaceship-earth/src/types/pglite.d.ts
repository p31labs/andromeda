/**
 * WCD-SE02: PGLite Ambient Type Declarations
 * Patches missing types for @electric-sql/pglite v0.11+ in strict TS environments.
 * Unblocks ledgerStore.test.ts, ledgerWorker.ts, and persistence.ts.
 */

declare module '@electric-sql/pglite' {
  export interface QueryResult {
    rows: any[];
    fields: any[];
    affectedRows?: number;
  }

  export interface PGliteOptions {
    dataDir?: string;
    debug?: boolean;
  }

  /**
   * PGlite - SQLite compiled to WebAssembly, running in the browser via IndexedDB.
   */
  export class PGlite {
    /**
     * Initialize a new PGLite instance.
     * @param dataDir The IndexedDB URL (e.g., 'idb://spaceship-earth-ledger') or memory path
     */
    constructor(dataDir?: string);
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    /**
     * Initialize the database (async).
     */
    ready: Promise<void>;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    /**
     * Execute a parameterized SQL query.
     */
    query<T = any>(query: string, params?: any[]): Promise<QueryResult & { rows: T[] }>;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    /**
     * Execute a raw SQL string (multiple statements allowed).
     */
    exec(query: string): Promise<void>;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    /**
     * Close the database connection.
     */
    close(): Promise<void>;
<<<<<<< HEAD
    
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
    /**
     * Add a custom extension or function.
     */
    addExtension(name: string, func: Function): void;
  }

  /**
   * Create a new PGlite database instance.
   */
  export function createDB(dataDir?: string): PGlite;
<<<<<<< HEAD
  
=======

>>>>>>> auto-heal/ui-ux-drift-20260620-120057
  /**
   * Utility to run migrations.
   */
  export function migrate(
    db: PGlite,
    migrations: { up: string }[]
  ): Promise<void>;
}
