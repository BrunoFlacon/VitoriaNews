# Plano de Evolução: Robô Integrado & Alertas Inteligentes (v4)

Este plano expande a migração do Bot_Zap com recursos avançados de UX, garantindo que o sistema seja produtivo, estável e amigável.

## Fase 1: Segurança Máxima (Backup e Reparo)
- **Executar Backup**: Rodar `scripts/db_backup_final.cjs` (corrigido para as variáveis do seu `.env`) para salvar o estado atual em `supabase/backups/`.
- **Limpeza de Duplicatas**: Script SQL para manter apenas 1 registro por chave na tabela `system_settings`.
- **Restrição UNIQUE**: Aplicar `ALTER TABLE` para garantir que o erro `42P10` não ocorra mais e a navegação fique estável.

## Fase 2: Motor do Robô (Edge Function)
- **Silenciamento (Mute)**: Se uma mensagem enviada por um humano (você) for detectada, o robô silencia automaticamente por 1 hora naquela conversa específica.
- **Opt-Out**: Suporte para palavras-chave como "parar" ou "cancelar" diretamente na lógica da Edge Function.

## Fase 3: UX & Interface (Floating Button 2.0)
- **Visibilidade Dinâmica**: O botão flutuante aparecerá **apenas** quando houver mensagens pendentes de resposta no seu inbox (monitorando em tempo real).
- **Notificações Sonoras**: 
    - Implementar alerta sonoro suave (estilo WhatsApp). Vou usar um som em Base64 ou carregar um arquivo `ding.mp3` leve.
- **Controles no RobotBuilder**:
    - [x] Toggle: Ativar/Desativar Botão Flutuante.
    - [x] Toggle: Ativar/Desativar Alerta Sonoro.
    - [x] Botão de "Limpar Notificações" (Marcar como lidas) para recolher o botão flutuante.

## Fase 4: Refinamento de UX (Máscaras e Bandeiras)
- Integrar a máscara de telefone (BR) e o ícone de bandeira nos formulários de configuração do robô.

## Fase 5: Finalização e Limpeza de Código
- Mover scripts legados para `docs/archive/legacy_botzap`.
- Excluir arquivos redundantes do `scripts/Bot_Zap` para liberar espaço e evitar confusão.

---
## Questões Abertas
> [!NOTE]
> Vou usar um som de notificação padrão "Soft Ping". Caso prefira um arquivo específico, basta me avisar.

> [!IMPORTANT]
> A limpeza de duplicatas no banco é segura: detectamos que apenas configurações de menu (como `dashboard`, `analytics`) estão duplicadas. Nenhuma senha ou conexão de rede social será perdida.
