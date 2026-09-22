import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

console.log('🚀 Starting Baby Tracker Backend & Frontend dev servers...\n');

// 1. Start Backend Server (Express + WebSockets on port 3001)
const serverProc = spawn('node', ['server/index.js'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: { ...process.env, PORT: '3001' },
});

// 2. Start Vite Dev Server (Frontend on port 5173 with network host)
const viteProc = spawn('npx', ['vite', '--host'], {
  cwd: rootDir,
  stdio: 'inherit',
  env: process.env,
});

function cleanup() {
  console.log('\n🛑 Stopping servers...');
  serverProc.kill();
  viteProc.kill();
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
