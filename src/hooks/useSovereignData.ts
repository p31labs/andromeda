
import { useState, useEffect } from 'react';
import { get, set } from 'idb-keyval';

export interface VaultItem {
  id: string;
  text: string;
  timestamp: number;
  signature: string;
}

const VAULT_KEY = 'sovereign-vault';

export function useSovereignData() {
  const [data, setData] = useState<VaultItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const timer = setTimeout(async () => {
        try {
          const storedData = await get<VaultItem[]>(VAULT_KEY);
          if (storedData) {
            setData(storedData);
          } else {
            const initialItem: VaultItem = {
              id: crypto.randomUUID(),
              text: 'Initial Setup Seed',
              timestamp: Date.now(),
              signature: 'mock-signature-' + Math.random().toString(36).substring(2, 15)
            };
            setData([initialItem]);
            await set(VAULT_KEY, [initialItem]);
          }
        } catch (e) {
          setError('Failed to load data from IndexedDB.');
        }
        setIsLoading(false);
      }, 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const addVaultItem = async (payload: string) => {
    if (typeof window !== 'undefined') {
      const newItem: VaultItem = {
        id: crypto.randomUUID(),
        text: payload,
        timestamp: Date.now(),
        signature: 'mock-signature-' + Math.random().toString(36).substring(2, 15)
      };
      const newData = [newItem, ...data];
      setData(newData);
      await set(VAULT_KEY, newData);
    }
  };

  const deleteVaultItem = async (id: string) => {
    if (typeof window !== 'undefined') {
      const newData = data.filter(item => item.id !== id);
      setData(newData);
      await set(VAULT_KEY, newData);
    }
  };

  return { data, isLoading, error, addVaultItem, deleteVaultItem };
}
