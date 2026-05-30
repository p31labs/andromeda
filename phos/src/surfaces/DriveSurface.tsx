/**
 * DriveSurface.tsx — Google Drive browser and mass ingestion for PHOS.
 *
 * Flow:
 * 1. User clicks "Connect Google Drive" → OAuth consent screen
 * 2. User picks files/folders in Drive browser (checkboxes)
 * 3. Click "Ingest Selected" → files downloaded, embedded, stored in PGLite
 * 4. Progress shown per file with LOVE rewards
 *
 * References:
 * Google Drive API v3: https://developers.google.com/drive/api/v3/reference
 * Token exchange: https://developers.google.com/identity/protocols/oauth2/web-server
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useAtmosphere } from '../components/AtmosphereProvider';
import { phosAPI } from '../lib/phos-api';
import { KarmaEngine } from '../lib/KarmaEngine';
import { logEvent } from '../lib/EventLogger';
import { ingestAndEmbed } from '../lib/Embedder';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime?: string;
  parents?: string[];
}

interface IngestStatus {
  fileId: string;
  fileName: string;
  status: 'pending' | 'downloading' | 'embedding' | 'done' | 'error';
  error?: string;
}

interface Props {
  className?: string;
}

export const DriveSurface: React.FC<Props> = ({ className }) => {
  const { spoons, grayRock } = useAtmosphere();
  const [connected, setConnected] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [folderId, setFolderId] = useState('root');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [ingesting, setIngesting] = useState(false);
  const [ingestProgress, setIngestProgress] = useState<IngestStatus[]>([]);

  // Check if we already have a token in localStorage
  useEffect(() => {
    const token = localStorage.getItem('phos_drive_token');
    if (token) {
      setAccessToken(token);
      setConnected(true);
    }
  }, []);

  // Check for OAuth callback (code in URL)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    if (code && !accessToken) {
      exchangeCode(code);
    }
  }, []);

  const exchangeCode = useCallback(async (code: string) => {
    try {
      const tokens = await phosAPI.exchangeDriveCode(code);
      if (tokens.accessToken) {
        localStorage.setItem('phos_drive_token', tokens.accessToken);
        setAccessToken(tokens.accessToken);
        setConnected(true);
        if (tokens.refreshToken) {
          localStorage.setItem('phos_drive_refresh', tokens.refreshToken);
        }
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    } catch (err) {
      setError('Failed to connect Google Drive. Try again.');
    }
  }, []);

  const handleConnect = useCallback(async () => {
    try {
      const { authUrl } = await phosAPI.getDriveAuthUrl();
      window.location.href = authUrl;
    } catch {
      setError('Failed to initiate OAuth. Check worker configuration.');
    }
  }, []);

  const fetchFiles = useCallback(async (folder = 'root') => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q='${folder}'+in+parents+and+trashed=false&fields=files(id,name,mimeType,size,modifiedTime,parents)&pageSize=100`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      if (!response.ok) {
        if (response.status === 401) {
          // Token expired, try refresh
          const refreshToken = localStorage.getItem('phos_drive_refresh');
          if (refreshToken) {
            const newToken = await phosAPI.refreshDriveToken(refreshToken);
            if (newToken) {
              localStorage.setItem('phos_drive_token', newToken);
              setAccessToken(newToken);
              return fetchFiles(folder);
            }
          }
          setConnected(false);
          setAccessToken(null);
          localStorage.removeItem('phos_drive_token');
          throw new Error('Session expired. Please reconnect.');
        }
        throw new Error(`Drive API error: ${response.status}`);
      }
      const data = await response.json() as { files: DriveFile[] };
      setFiles(data.files || []);
      setFolderId(folder);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch files');
    }
    setLoading(false);
  }, [accessToken]);

  useEffect(() => {
    if (connected && accessToken) {
      fetchFiles();
    }
  }, [connected, accessToken, fetchFiles]);

  const toggleFile = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === files.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(files.map(f => f.id)));
    }
  };

  const handleIngestSelected = useCallback(async () => {
    if (selected.size === 0) return;
    setIngesting(true);
    const selectedFiles = files.filter(f => selected.has(f.id));
    const initialProgress: IngestStatus[] = selectedFiles.map(f => ({
      fileId: f.id,
      fileName: f.name,
      status: 'pending',
    }));
    setIngestProgress(initialProgress);

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < selectedFiles.length; i++) {
      const file = selectedFiles[i];
      setIngestProgress(prev => prev.map((p, idx) =>
        idx === i ? { ...p, status: 'downloading' as const } : p
      ));

      try {
        // Download file content
        let content = '';
        if (file.mimeType === 'application/vnd.google-apps.document') {
          // Google Docs — export as plain text
          const exportRes = await fetch(
            `https://docs.googleapis.com/v1/documents/${file.id}`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (exportRes.ok) {
            const doc = await exportRes.json() as Parameters<typeof extractTextFromGoogleDoc>[0];
            content = extractTextFromGoogleDoc(doc);
          }
        } else if (file.mimeType.startsWith('text/') || file.mimeType === 'application/json') {
          // Plain text files
          const downloadRes = await fetch(
            `https://www.googleapis.com/drive/v3/files/${file.id}?alt=media`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
          );
          if (downloadRes.ok) content = await downloadRes.text();
        } else {
          // Binary files — skip with note
          setIngestProgress(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error' as const, error: 'Binary file — skipped' } : p
          ));
          errorCount++;
          continue;
        }

        if (!content.trim()) {
          setIngestProgress(prev => prev.map((p, idx) =>
            idx === i ? { ...p, status: 'error' as const, error: 'Empty content' } : p
          ));
          errorCount++;
          continue;
        }

        setIngestProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'embedding' as const } : p
        ));

        // Ingest to knowledge graph
        const result = await ingestAndEmbed('drive', content, {
          fileName: file.name,
          fileId: file.id,
          mimeType: file.mimeType,
          sourcePath: `gdrive://${folderId}/${file.name}`,
        });

        setIngestProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'done' as const } : p
        ));
        successCount++;
        KarmaEngine.addLove(2, `Ingested: ${file.name}`);
        logEvent('FAMILY_CONTACT' as any, { action: 'drive_ingest', fileId: file.id, fileName: file.name, embedded: result.embedded });

        // Rate limit — avoid overwhelming the local LLM
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        setIngestProgress(prev => prev.map((p, idx) =>
          idx === i ? { ...p, status: 'error' as const, error: err instanceof Error ? err.message : 'Unknown' } : p
        ));
        errorCount++;
      }
    }

    setIngesting(false);
    setSelected(new Set());
    // Refresh browse to show updated counts
    await fetchFiles();
  }, [selected, files, accessToken, folderId, fetchFiles]);

  const formatSize = (bytes?: string) => {
    if (!bytes) return '';
    const n = parseInt(bytes);
    if (n < 1024) return `${n} B`;
    if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`;
    return `${(n / 1048576).toFixed(1)} MB`;
  };

  const isFolder = (mimeType: string) => mimeType === 'application/vnd.google-apps.folder';

  if (!connected) {
    return (
      <div className={className}>
        <h2 className="text-2xl font-semibold mb-4" style={{ color: '#00e5ff' }}>Google Drive</h2>
        <p className="text-sm mb-4" style={{ color: '#64748b' }}>
          Connect your Google Drive to ingest documents, legal briefs, medical records, and research papers
          into the PHOS knowledge graph. All processing happens locally — files never leave your device
          except for the initial download from Google.
        </p>
        <div className="flex gap-3">
          <button
            onClick={handleConnect}
            className="px-6 py-3 rounded-xl font-semibold text-sm"
            style={{ backgroundColor: '#00e5ff', color: '#001122' }}
          >
            Connect Google Drive
          </button>
        </div>
        {error && <p className="text-xs mt-3" style={{ color: '#ef4444' }}>{error}</p>}
      </div>
    );
  }

  if (grayRock) {
    return (
      <div className={className}>
        <div className="text-center py-12 text-zinc-500 font-mono text-sm">Drive suspended. Gray Rock active.</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-semibold" style={{ color: '#00e5ff' }}>Google Drive</h2>
          <p className="text-[10px]" style={{ color: '#64748b' }}>Browse and ingest files into local knowledge graph</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => fetchFiles(folderId)} className="text-xs px-3 py-1 rounded-lg"
            style={{ border: '1px solid #224466', color: '#64748b' }}>Refresh</button>
          <button
            onClick={handleIngestSelected}
            disabled={selected.size === 0 || ingesting}
            className="text-xs px-3 py-1 rounded-lg font-semibold disabled:opacity-30"
            style={{ backgroundColor: '#00e5ff', color: '#001122' }}
          >
            {ingesting ? `Ingesting (${ingestProgress.filter(p => p.status === 'done').length}/${selected.size})...` : `Ingest Selected (${selected.size})`}
          </button>
        </div>
      </div>

      {error && <p className="text-xs mb-3 p-2 rounded-lg" style={{ color: '#ef4444', backgroundColor: 'rgba(239,68,68,0.1)' }}>{error}</p>}

      {/* Progress bar during ingestion */}
      {ingesting && ingestProgress.length > 0 && (
        <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: 'rgba(0,229,255,0.05)', border: '1px solid #224466' }}>
          <div className="text-[10px] mb-2" style={{ color: '#00e5ff' }}>Ingestion Progress</div>
          <div className="space-y-1">
            {ingestProgress.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-[10px]">
                <span className="w-2 h-2 rounded-full" style={{
                  backgroundColor: p.status === 'done' ? '#059669' : p.status === 'error' ? '#ef4444' : p.status === 'embedding' ? '#f59e0b' : '#64748b',
                }} />
                <span className="flex-1 truncate" style={{ color: '#94a3b8' }}>{p.fileName}</span>
                <span style={{ color: p.status === 'done' ? '#059669' : p.status === 'error' ? '#ef4444' : '#64748b' }}>
                  {p.status === 'pending' ? '...' : p.status === 'downloading' ? '↓' : p.status === 'embedding' ? '⟳' : p.status === 'done' ? '✓' : '✕'}
                </span>
                {p.error && <span style={{ color: '#ef4444' }}>: {p.error}</span>}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* File list */}
      {loading ? (
        <p className="text-xs text-center py-8" style={{ color: '#64748b' }}>Loading files...</p>
      ) : files.length === 0 ? (
        <div className="p-6 rounded-xl text-center" style={{ border: '1px dashed #224466' }}>
          <p className="text-xs" style={{ color: '#64748b' }}>No files in this folder. Try a different folder or check Drive permissions.</p>
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-3 mb-2 p-2 rounded-lg" style={{ backgroundColor: 'rgba(0,229,255,0.05)' }}>
            <input type="checkbox" checked={selected.size === files.length && files.length > 0} onChange={toggleAll}
              style={{ accentColor: '#00e5ff' }} />
            <span className="text-[10px]" style={{ color: '#64748b' }}>
              {selected.size} of {files.length} selected
            </span>
          </div>
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {files.map(file => (
              <div key={file.id}
                className="flex items-center gap-3 p-2 rounded-lg transition-colors"
                style={{ backgroundColor: selected.has(file.id) ? 'rgba(0,229,255,0.08)' : 'transparent', border: selected.has(file.id) ? '1px solid rgba(0,229,255,0.2)' : '1px solid transparent' }}>
                <input type="checkbox" checked={selected.has(file.id)} onChange={() => toggleFile(file.id)}
                  style={{ accentColor: '#00e5ff' }} />
                <span className="text-sm flex-none">{isFolder(file.mimeType) ? '📁' : '📄'}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-xs truncate" style={{ color: '#e0e0e0' }}>{file.name}</div>
                  <div className="text-[9px]" style={{ color: '#64748b' }}>
                    {file.mimeType.split('.').pop()} {file.size ? `· ${formatSize(file.size)}` : ''}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper: extract plain text from Google Docs JSON
function extractTextFromGoogleDoc(doc: { body?: { content?: Array<{ paragraph?: { elements?: Array<{ textRun?: { content?: string } }> } }> } }): string {
  const parts: string[] = [];
  const content = doc?.body?.content || [];
  for (const block of content) {
    const elements = block?.paragraph?.elements || [];
    for (const el of elements) {
      if (el?.textRun?.content) parts.push(el.textRun.content);
    }
  }
  return parts.join('').trim();
}

export default DriveSurface;
