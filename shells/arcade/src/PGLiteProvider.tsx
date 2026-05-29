import React, { createContext, useContext, useEffect, useState } from 'react';
import { PGLiteDatabaseContract, PGLiteFallback } from '../shared/db/pglite-fallback';
import schema from '../shared/db/schema.sql?raw';

export type { PGLiteDatabaseContract };

const PGLiteContext = createContext<PGLiteDatabaseContract | null>(null);

export const usePGLite = () => {
  const context = useContext(PGLiteContext);
  if (!context) {
    throw new Error('usePGLite must be used within a PGLiteProvider');
  }
  return context;
};

export const PGLiteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [db, setDb] = useState<PGLiteDatabaseContract | null>(null);

  useEffect(() => {
    const initDb = async () => {
      let pg: PGLiteDatabaseContract;
      try {
        const pgliteModule = await import('@electric-sql/pglite');
        // Corrected casing to PGlite (lowercase 'l') based on index.d.ts
        pg = new pgliteModule.PGlite();
        console.log("PGlite module loaded successfully.");
      } catch (error) {
        console.error("Failed to load @electric-sql/pglite, falling back to PGLiteFallback:", error);
        pg = new PGLiteFallback();
      }

      await pg.exec(schema);
      setDb(pg);
      console.log("Database initialized with PGLite or Fallback.");
    };

    initDb();

    return () => {
      db?.close();
    };
  }, []);

  if (!db) {
    return <div>Loading Database...</div>;
  }

  return (
    <PGLiteContext.Provider value={db}>
      {children}
    </PGLiteContext.Provider>
  );
};
