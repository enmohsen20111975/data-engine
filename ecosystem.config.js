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
    // Python Backend (Scraper)
    {
      name: 'data-engine-backend',
      script: 'python3',
      args: 'backend.py --schedule',
      cwd: './mini-services/scraper-service',
      watch: false,
      autorestart: true,
      max_restarts: 10,
      interpreter: 'python3'
    }
  ]
};
