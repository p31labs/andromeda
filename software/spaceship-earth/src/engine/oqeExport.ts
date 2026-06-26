 *
 * Daubert-standard export of immutable local IndexedDB telemetry.
 * Generates cryptographically verifiable JSON for legal/medical evidence.
 *
 *
 *

    request.onerror = () => reject(new Error('Failed to open IndexedDB'));

    request.onsuccess = async () => {
      const db = request.result;
      const allRecords: OQERecord[] = [];

      try {
        for (const storeName of storeNames) {
          if (!db.objectStoreNames.contains(storeName)) continue;

          const tx = db.transaction(storeName, 'readonly');
          const store = tx.objectStore(storeName);

          const getAllRequest = store.getAll();

          await new Promise<void>((res, rej) => {
            getAllRequest.onsuccess = () => {
              const records = getAllRequest.result || [];



 *

  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));

 *


  // Sort by timestamp
  records.sort((a, b) => a.timestamp - b.timestamp);


  // Calculate payload hash
  const payloadHash = await calculateHash({ records, metadata: { timeRange } });


 *

  // Pretty-print JSON for readability
  const jsonString = JSON.stringify(exportData, null, 2);

  // Create blob and trigger download
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);


  document.body.appendChild(link);
  link.click();

 *

  const timestamp = exportData.metadata.timestamp.replace(/[:.]/g, '-').slice(0, 19);
  const filename = `P31_OQE_Export_${timestamp}.json`;

  downloadOQEExport(exportData, filename);

  console.log(`[OQE] Exported ${exportData.metadata.recordCount} records, hash: ${exportData.metadata.payloadHash.slice(0, 16)}...`);

 *

    if (!exportData.metadata || !exportData.records) {
      return false;
    }

    const storedHash = exportData.metadata.payloadHash;
    const calculatedHash = await calculateHash({
      records: exportData.records,
      metadata: { timeRange: exportData.metadata.timeRange }
    });

}
