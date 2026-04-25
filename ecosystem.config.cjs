const path = require('path');
const envPath = path.resolve(__dirname, '04_SOFTWARE/discord/p31-bot/.env');
const envContent = require('fs').readFileSync(envPath, 'utf8');
const env = envContent
  .split('\n')
  .filter(line => line.trim() && !line.startsWith('#'))
  .reduce((acc, line) => {
    const [key, ...valueParts] = line.split('=');
    const value = valueParts.join('=');
    acc[key.trim()] = value.trim();
    return acc;
  }, {});

// Debug: log the env object to see if token is captured
console.log('[PM2] Loaded env from .env:', Object.keys(env));
console.log('[PM2] DISCORD_TOKEN present:', !!env.DISCORD_TOKEN);
if (env.DISCORD_TOKEN) {
  console.log('[PM2] DISCORD_TOKEN length:', env.DISCORD_TOKEN.length);
}

module.exports = {
  apps: [
    {
      name: 'p31-discord-bot',
      script: '/home/p31/andromeda/04_SOFTWARE/discord/p31-bot/dist/index.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '200M',
      cwd: '/home/p31/andromeda/04_SOFTWARE/discord/p31-bot',
      env: {
        NODE_ENV: 'production',
        ...env,
      }
    },
    {
      name: 'p31-monitor',
      script: '/home/p31/andromeda/05_MONITORing/monitor.js',
      instances: 1,
      autorestart: true,
      max_memory_restart: '100M',
      exp_backoff_restart_delay: 100,
      env: {
        NODE_ENV: 'production',
        PORT: '9090'
      }
    }
  ]
};