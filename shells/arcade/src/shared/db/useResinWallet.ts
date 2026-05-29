import { useEffect, useState, useCallback } from 'react';
import { usePGLite } from '../../app/PGLiteProvider';
import { useSync } from '../../app/SyncProvider';
export interface ResinTransaction {
  id: string;
  gameId: string;
  transactionType: 'CREDIT' | 'DEBIT';
  amount: number;
  reason: string;
}

export function useResinWallet(franchiseId: string) {
  const db = usePGLite();
  const { broadcast } = useSync();
  const [balance, setBalance] = useState<number>(100); // Base default balance
  const [history, setHistory] = useState<ResinTransaction[]>([]);

  // 1. Reactive Balance Query (Sums the Ledger)
  useEffect(() => {
    if (!db || !franchiseId) return;

    let unsubscribe: (() => Promise<void>) | undefined;

    const fetchWallet = async () => {
      // Aggregate balance directly from ledger to ensure absolute accuracy
      const result = await db.query(`
        SELECT COALESCE(SUM(CASE WHEN transaction_type = 'CREDIT' THEN amount ELSE -amount END), 100) as current_balance
        FROM resin_ledger
        WHERE franchise_id = $1
      `, [franchiseId]);
      
      const netBalance = result.rows[0]?.current_balance ?? 100;
      setBalance(Number(netBalance));

      // Fetch recent history
      const historyResult = await db.query(`
        SELECT id, game_id as "gameId", transaction_type as "transactionType", amount, reason
        FROM resin_ledger
        WHERE franchise_id = $1
        ORDER BY created_at DESC
        LIMIT 10
      `, [franchiseId]);
      setHistory(historyResult.rows as ResinTransaction[]);
    };

    const setupListener = async () => {
      await fetchWallet();
      // Set up a listener or poll depending on PGLite's live query capabilities
      const unsub = await db.listen('resin_ledger_changes', () => {
        fetchWallet();
      });
      unsubscribe = unsub;
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [db, franchiseId]);

  // 2. Transaction Mutator
  const transact = useCallback(async (amount: number, type: 'CREDIT' | 'DEBIT', gameId: string, reason: string) => {
    if (!db || !franchiseId) return false;

    const transactionId = crypto.randomUUID();
    
    // Guard against overspending
    if (type === 'DEBIT' && balance < amount) {
      console.warn("Transaction Rejected: Insufficient Resin.");
      return false;
    }

    await db.query(`
      INSERT INTO resin_ledger (id, franchise_id, game_id, transaction_type, amount, reason, _crdt_clock)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), 0)
    `, [transactionId, franchiseId, gameId, type, amount, reason]);

    // Also update cached balance
    await db.query(`
      INSERT INTO resin_wallets (franchise_id, balance, last_updated_at, _crdt_clock)
      VALUES ($1, $2, NOW(), 0)
      ON CONFLICT (franchise_id) DO UPDATE
      SET balance = resin_wallets.balance + $3, last_updated_at = NOW(), _crdt_clock = EXCLUDED._crdt_clock
    `, [
      franchiseId, 
      type === 'CREDIT' ? amount : -amount, 
      type === 'CREDIT' ? amount : -amount
    ]);

    broadcast('resin_ledger', {
      id: transactionId,
      franchise_id: franchiseId,
      game_id: gameId,
      transaction_type: type,
      amount,
      reason,
      created_at: new Date().toISOString(),
      _crdt_clock: Date.now()
    });

    return true;
  }, [db, franchiseId, balance, broadcast]);

  return { balance, history, transact };
}
