// PM2 Configuration for Testing Environment
// Created: 2025-10-17

module.exports = {
  apps: [
    {
      name: 'tradeframe-test-frontend',
      script: 'npm',
      args: 'run start',
      cwd: '/var/www/www-root/data/www/testTF.dataworker.ru',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      error_file: '/var/log/pm2/tradeframe-test-frontend-error.log',
      out_file: '/var/log/pm2/tradeframe-test-frontend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    },
    {
      name: 'tradeframe-test-backend',
      script: 'index.js',
      cwd: '/var/www/www-root/data/www/testTF.dataworker.ru/server',
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      error_file: '/var/log/pm2/tradeframe-test-backend-error.log',
      out_file: '/var/log/pm2/tradeframe-test-backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      merge_logs: true,
      time: true
    }
  ]
};
