// PM2 Configuration for Production Environment
// Created: 2025-10-17
// Updated: 2025-10-21 - Fixed backend path and PORT configuration

module.exports = {
  apps: [
    {
      name: 'tradeframe-prod-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/www-root/data/www/prod.dataworker.ru',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/tradeframe-prod-frontend-error.log',
      out_file: '/var/log/pm2/tradeframe-prod-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    },
    {
      name: 'tradeframe-prod-backend',
      script: 'index.js',
      cwd: '/var/www/www-root/data/www/prod.dataworker.ru/server',
      exec_mode: 'fork',  // ВАЖНО: fork для одного процесса, иначе EADDRINUSE
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: '/var/log/pm2/tradeframe-prod-backend-error.log',
      out_file: '/var/log/pm2/tradeframe-prod-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
