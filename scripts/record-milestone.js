import fs from 'fs';
import { execSync } from 'child_process';
import { createClient } from '@supabase/supabase-js';
import path from 'path';

// Leitura manual do .env pois o Node.js puro não acessa o import.meta.env do Vite
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (!fs.existsSync(envPath)) {
    console.error('Arquivo .env não localizado. Milestone não pode ser gravado.');
    process.exit(0);
  }

  const envFile = fs.readFileSync(envPath, 'utf-8');
  const envVars = envFile.split('\n').reduce((acc, line) => {
    const match = line.match(/^([^=]+)=(.*)$/);
    if (match) {
      acc[match[1].trim()] = match[2].trim().replace(/^"|"$/g, '').replace(/\r$/, '');
    }
    return acc;
  }, {});

  const supabaseUrl = envVars['VITE_SUPABASE_URL'];
  const supabaseKey = envVars['VITE_SUPABASE_ANON_KEY']; // Chave Pública/Anon já basta se RLS permitir Insert

  if (!supabaseUrl || !supabaseKey) {
    console.warn('Variáveis do Supabase incompletas no .env para gerar Histórico.');
    process.exit(0);
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  // Parse Commit Data
  const commitMsg = execSync('git log -1 --pretty=%B').toString().trim();
  const commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  const date = new Date().toISOString();

  const title = `Atualização de Sistema: ${commitHash}`;
  const description = `Registro automático: O código fonte foi alterado.\nMensagem do Commit:\n"${commitMsg}"`;
  const tech_details = `> git commit -m "${commitMsg}"\n\n// Action trigger: post-commit git hook\n// Origin: Bruno Flacon (Dev_Master Environment)`;

  const runInsert = async () => {
    const { error } = await supabase.from('platform_evolution_milestones').insert([
      {
        title,
        phase: 'Update',
        description,
        tech_details,
        is_major_milestone: false,
        version: `auto-${commitHash}`,
        date
      }
    ]);

    if (error) {
      // Se RLS bloquear o insert com a váriavel Anon, mostraremos o erro
      console.error('❌ Falha ao tentar injetar milestone no Supabase (Checar RLS):', error.message);
    } else {
      console.log('✅ Milestone de evolução gravado com sucesso no Vitória Net (Supabase)!');
    }
  };

  runInsert();
} catch (error) {
  console.error('❌ Erro inesperado na execução do Hook:', error.message);
}
