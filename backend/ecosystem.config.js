// PM2 process definitions for GasPulse.
//
// Runs two independent processes:
//   gaspulse-api    -> FastAPI backend (uvicorn) serving the REST API
//   gaspulse-worker -> automation engine (blockchain fee catchers, scheduled)
//
// Usage (run from the backend/ directory, where this file lives):
//   pm2 start ecosystem.config.js            # start both
//   pm2 start ecosystem.config.js --only gaspulse-api
//   pm2 restart ecosystem.config.js
//   pm2 stop ecosystem.config.js
//   pm2 delete ecosystem.config.js
//   pm2 logs
//   pm2 save                                 # persist across reboots (then: pm2-start on boot)
//
// The backend reads DATABASE_URL from ./.env (Neon Postgres).
//
// NOTE: no virtualenv is assumed. If you later use a .venv, set the interpreter
//       for each app to "./.venv/Scripts/python.exe" (Windows) or
//       "./.venv/bin/python" (Linux/macOS).

const path = require("node:path");

// This config lives INSIDE backend/, so backend/ is the config's own directory.
const BACKEND_DIR = path.resolve(__dirname);
const PYTHON = "python";

module.exports = {
  apps: [
    {
      // ─── Backend API ────────────────────────────────────────────────────
      name: "gaspulse-api",
      cwd: BACKEND_DIR,
      // Run uvicorn as a plain executable (it is on PATH in this environment).
      script: "uvicorn",
      interpreter: "none",
      args: "app.main:app --host 0.0.0.0 --port 8000",
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 2000,
      // uvicorn writes its own access logs; capture stdout/stderr in PM2 logs.
      out_file: "./logs/api-out.log",
      error_file: "./logs/api-error.log",
      merge_logs: true,
      time: true,
    },
    {
      // ─── Automation worker (background catchers) ────────────────────────
      name: "gaspulse-worker",
      cwd: BACKEND_DIR,
      script: "app/worker.py",
      interpreter: PYTHON,
      // worker.py does `from app... import`, so backend/ must be on sys.path.
      env: {
        PYTHONPATH: BACKEND_DIR,
      },
      instances: 1,
      autorestart: true,
      watch: false,
      max_restarts: 10,
      restart_delay: 3000,
      out_file: "./logs/worker-out.log",
      error_file: "./logs/worker-error.log",
      merge_logs: true,
      time: true,
      // The worker already handles SIGINT/SIGTERM for graceful shutdown.
      kill_timeout: 8000,
    },
  ],
};