import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

console.log('[SYSTEM] Iniciando Dashboard e Robô...');

const vite = spawn('npm', ['run', 'dev'], { 
  cwd: rootDir, 
  stdio: 'inherit',
  shell: true 
});

const bot = spawn('node', ['server.js'], { 
  cwd: path.join(rootDir, 'scripts', 'Bot_Zap'), 
  stdio: 'inherit',
  shell: true 
});

process.on('SIGINT', () => {
  vite.kill();
  bot.kill();
  process.exit();
});

vite.on('exit', (code) => {
  console.log(`[VITE] Saiu com código ${code}`);
  bot.kill();
});

bot.on('exit', (code) => {
  console.log(`[BOT] Saiu com código ${code}`);
});
