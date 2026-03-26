module.exports = {
  apps: [{
    name: 'p31-discord-bot',
    script: 'dist/index.js',
    cwd: '.',
    instances: 1,
    autorestart: true,
    watch: false,
    env: {
      NODE_ENV: 'production'
    },
    error_file: 'logs/error.log',
    out_file: 'logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true
  }]
};
