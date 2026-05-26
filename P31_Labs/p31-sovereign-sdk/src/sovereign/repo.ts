// src/sovereign/repo.ts
import type { AnyDocumentId, DocHandle } from "@automerge/automerge-repo";
import { Repo } from "@automerge/automerge-repo";
import { IndexedDBStorageAdapter } from "@automerge/automerge-repo-storage-indexeddb";
import { BrowserWebSocketClientAdapter } from "@automerge/automerge-repo-network-websocket";

export const repo = new Repo({
  storage: new IndexedDBStorageAdapter("p31-genesis"),
  network: [
    // Cloud relay (optional, when online)
    new BrowserWebSocketClientAdapter('wss://bonding-relay.trimtab-signal.workers.dev'),
  ],
});

// Create or find a document
export async function getOrCreateDoc<T>(
  url: string | null,
  initialValue: T
): Promise<DocHandle<T>> {
  let handle: DocHandle<T>;
  if (url) {
    handle = await repo.find<T>(url as AnyDocumentId);
  } else {
    handle = repo.create<T>(initialValue);
  }
  await handle.whenReady();
  return handle;
}