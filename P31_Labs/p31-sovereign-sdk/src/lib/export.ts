export function exportLedgerJSON(didKey: string, telemetryHashes: string[]) {
  if (telemetryHashes.length === 0) return;
  const payload = {
    os_version: "2026.03.05",
    hardware_root_did: didKey,
    export_timestamp_iso: new Date().toISOString(),
    chain_length: telemetryHashes.length,
    telemetry_ledger: telemetryHashes
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `p31_ledger_export_${Date.now()}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
