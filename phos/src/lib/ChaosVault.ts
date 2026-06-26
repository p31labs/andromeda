    await dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS unified_knowledge_graph (
        id BigSerial PRIMARY KEY,
        source_door Text NOT NULL,
        raw_text Text NOT NULL,
        created_at Timestamp DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_source_door ON unified_knowledge_graph(source_door);
    `);
  return dbInstance;
}

export async function ingestToChaosVault(
  door: string,
  text: string,
  embedding: number[],
): Promise<void> {
}

export async function querySimilarity(
  embedding: number[],
  limit: number = 3,
): Promise<Array<{ source_door: string; raw_text: string; score: number }>> {
}
