/**
 * useExport - Export functionality for Chromatica
 * Arthritis-optimized: One-tap export, large buttons
 */

import { useCallback } from 'react';
import { useChromaticaStore } from '../stores/useChromaticaStore';

export interface ExportOptions {
  format: 'csv' | 'json' | 'png';
  includeAssets?: boolean;
  dateRange?: 'all' | 'last7days' | 'last30days';
}

export function useExport() {
  const { entities, preferences } = useChromaticaStore();

  const exportData = useCallback((options: ExportOptions) => {
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `chromatica-export-${timestamp}`;

    switch (options.format) {
      case 'csv':
        exportCSV(entities, filename);
        break;
      case 'json':
        exportJSON(entities, filename);
        break;
      case 'png':
        // Would need canvas implementation for PNG export
        console.log('PNG export would render canvas');
        break;
    }

    // Announce to screen reader
    if ('speechSynthesis' in window && preferences.voiceEnabled) {
      const utterance = new SpeechSynthesisUtterance(`Export complete. File saved as ${filename}`);
      utterance.rate = 0.9;
      speechSynthesis.speak(utterance);
    }
  }, [entities, preferences.voiceEnabled]);

  const exportCSV = (data: typeof entities, filename: string) => {
    const headers = ['ID', 'Context', 'Created At', 'Updated At', 'Data'];
    const rows = data.map(e => [
      e.id,
      e.context,
      new Date(e.createdAt).toISOString(),
      new Date(e.updatedAt).toISOString(),
      JSON.stringify(e.data),
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    downloadFile(csv, `${filename}.csv`, 'text/csv');
  };

  const exportJSON = (data: typeof entities, filename: string) => {
    const json = JSON.stringify(data, null, 2);
    downloadFile(json, `${filename}.json`, 'application/json');
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return { exportData, exportCSV, exportJSON };
}

export default useExport;
