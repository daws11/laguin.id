const path = require('node:path')

/**
 * PM2 ecosystem for production.
 *
 * Prerequisites:
 * - `npm ci`
 * - `npm run build`
 * - `docker compose -f infra/docker-compose.yml up -d`
 * - `apps/api/.env` is configured (see `apps/api/.env.example`)
 */
module.exports = {
  apps: [
    {
      name: 'valentine-api',
      cwd: path.resolve(__dirname, '../apps/api'),
      script: 'dist/index.js',
      node_args: '--enable-source-maps',
      env: {
        NODE_ENV: 'production',
        HOST: '0.0.0.0',
        PORT: '3001',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      exp_backoff_restart_delay: 200,
      time: true,
    },
    {
      name: 'valentine-worker',
      cwd: path.resolve(__dirname, '../apps/api'),
      script: 'dist/worker.js',
      node_args: '--enable-source-maps',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      exp_backoff_restart_delay: 200,
      time: true,
    },
    {
      // Serves `apps/web/dist` via Vite preview.
      // If you prefer a "real" static server + reverse proxy (recommended),
      // keep this as-is for simplicity or replace with nginx.
      name: 'valentine-web',
      cwd: path.resolve(__dirname, '../apps/web'),
      script: 'npm',
      args: 'run preview -- --host 0.0.0.0 --port 3000 --strictPort',
      interpreter: 'none',
      env: {
        NODE_ENV: 'production',
      },
      watch: false,
      autorestart: true,
      max_restarts: 10,
      exp_backoff_restart_delay: 200,
      time: true,
    },
  ],
}

