import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const botDir = path.resolve(__dirname, '..', 'scripts', 'Bot_Zap');

console.log('[INSTALL] Instalando dependências em:', botDir);

try {
  execSync('npm install', { 
    cwd: botDir, 
    stdio: 'inherit',
    shell: true 
  });
  console.log('[INSTALL] Dependências instaladas com sucesso!');
} catch (err) {
  console.error('[INSTALL] Erro ao instalar:', err.message);
  process.exit(1);
}
