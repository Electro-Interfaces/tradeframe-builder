module.exports = {
  apps: [{
    name: 'tradeframe',
    script: 'npm',
    args: 'run preview',
    cwd: '/home/user/webapp',
    env: {
      PORT: 3000
    },
    autorestart: true,
    watch: false,
    max_memory_restart: '500M'
  }]
}