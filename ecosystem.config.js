module.exports = {
  apps: [
    // Next.js Frontend
    {
      name: 'data-engine-frontend',
      script: 'bun',
      args: 'run dev',
      cwd: './',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      env: {
        NODE_ENV: 'development',
        PORT: 3000
      }
    },
    // Python Backend (Scraper) - using venv
    {
      name: 'data-engine-backend',
      script: 'backend.py',
      args: '--schedule',
      cwd: './mini-services/scraper-service',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      interpreter: './venv/bin/python',
      env: {
        PYTHONUNBUFFERED: '1'
      }
    }
  ]
};
