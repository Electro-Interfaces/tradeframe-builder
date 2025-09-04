module.exports = {
  apps: [
    {
      name: 'tradeframe-prod',
      script: 'npm',
      args: 'run start:prod',
      // cwd: process.cwd(), // optional; defaults to where you run pm2
      env: {
        NODE_ENV: 'production',
        PORT: 8080,
        HOST: '0.0.0.0',
      },
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      // Set to 'max' to use all CPU cores
      instances: 1,
      exec_mode: 'fork', // or 'cluster' if instances > 1
      time: true,
      merge_logs: true,
    },
  ],
};

