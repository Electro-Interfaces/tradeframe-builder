import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..', '..');
const distDir = path.join(rootDir, 'dist');
const viteBin = path.join(rootDir, 'node_modules', 'vite', 'bin', 'vite.js');
const port = String(process.env.PORT || 4173);

if (!existsSync(viteBin)) {
  console.error('[start] Не найден Vite CLI. Сначала выполните npm install.');
  process.exit(1);
}

if (!existsSync(distDir)) {
  console.error('[start] Не найдена директория dist. Сначала выполните сборку.');
  process.exit(1);
}

const child = spawn(
  process.execPath,
  [viteBin, 'preview', '--host', '0.0.0.0', '--port', port],
  {
    cwd: rootDir,
    env: process.env,
    stdio: 'inherit',
  }
);

child.on('error', (error) => {
  console.error(`[start] Не удалось запустить vite preview: ${error.message}`);
  process.exit(1);
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 0);
});
