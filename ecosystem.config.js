export default {
  apps: [{
    name: 'tradeframe-dev',
    script: 'npm',
    args: 'run dev',
    cwd: '/home/user/webapp',
    env: {
      PORT: 3000,
      HOST: '0.0.0.0'
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }, {
    name: 'tradeframe-prod',
    script: 'server.js',
    cwd: '/home/user/webapp',
    env: {
      PORT: 8080,
      HOST: '0.0.0.0',
      NODE_ENV: 'production'
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    instances: 1,
    exec_mode: 'cluster'
  }]
}