module.exports = {
  apps: [
    {
      name: 'streambotkh-web',
      script: 'node_modules/.bin/tsx',
      args: 'server/index.ts',
      cwd: './',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G'
    },
    {
      name: 'streambotkh-telegram',
      script: 'node_modules/.bin/tsx',
      args: 'backend/src/index.ts',
      cwd: './',
      env: {
        NODE_ENV: 'production'
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M'
    }
  ]
};
