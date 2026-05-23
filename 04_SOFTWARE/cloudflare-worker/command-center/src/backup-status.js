#!/usr/bin/env node
/**
 * Backup status.json to R2 daily
 * Run via: wrangler deploy --path 04_SOFTWARE/cloudflare-worker/command-center/
 * Cron: 0 2 * * * (2 AM UTC daily)
 */

export async function handleStatusBackup(env) {
  try {
    const status = await env.STATUS_KV.get('status');
    if (!status) {
      console.error('No status to backup');
      return { ok: false, error: 'No status found' };
    }

    const timestamp = new Date().toISOString();
    const backupKey = `status-backup-${timestamp.split('T')[0]}.json`;

    await env.ARTIFACTS.put(backupKey, status, {
      httpMetadata: { contentType: 'application/json' }
    });

    // Keep only last 30 days of backups
    const list = await env.ARTIFACTS.list({ prefix: 'status-backup-' });
    const sorted = list.objects.sort((a, b) => b.uploaded - a.uploaded);
    for (let i = 30; i < sorted.length; i++) {
      await env.ARTIFACTS.delete(sorted[i].key);
    }

    return { ok: true, key: backupKey, timestamp };
  } catch (e) {
    console.error('Backup failed:', e);
    return { ok: false, error: e.message };
  }
}
