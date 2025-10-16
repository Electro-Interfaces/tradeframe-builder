module.exports = {
  apps: [{
    name: 'tradeframe-backend-proxy',
    script: 'index.js',
    cwd: '/var/www/www-root/data/www/prod.dataworker.ru/server',
    instances: 1,
    exec_mode: 'fork',
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      // STS API Configuration
      STS_API_URL: 'https://pos.autooplata.ru/tms',
      STS_API_USERNAME: 'UserApi',
      STS_API_PASSWORD: 'lHQfLZHzB3tn',
      // CORS Configuration
      ALLOWED_ORIGINS: 'https://prod.dataworker.ru,http://localhost:3000,http://localhost:3002'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
