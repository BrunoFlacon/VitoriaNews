

# Plano: Reverter modificações de hoje (limpeza de dados)

Você quer desfazer as alterações de hoje relacionadas à **limpeza de dados** (remoção das ~313k linhas zeradas em `post_metrics`, alterações em funções de coleta, normalização de plataforma no banco, etc.).

## Como reverter

No Lovable, eu **não devo** escrever código para desfazer alterações. A forma correta e segura é usar o histórico nativo do projeto:

### Opção 1 — Reverter pelo chat
Role até a mensagem **anterior** ao plano de auditoria/limpeza de hoje e clique no botão **Revert** abaixo da mensagem da IA. Isso restaura o projeto exatamente para aquele estado (código + migrations).

### Opção 2 — Aba History
Abra a aba **History** no topo do chat e selecione a versão imediatamente **anterior** às mudanças de limpeza de dados de hoje.

<lov-actions>
  <lov-open-history>Abrir Histórico</lov-open-history>
</lov-actions>

## Importante sobre dados já apagados

O revert restaura **código, migrations e funções do banco**, mas **não recria linhas que foram deletadas** do `post_metrics`. As ~313k linhas zeradas removidas hoje **não voltam automaticamente** — apenas a estrutura e as funções (`collect_post_analytics`, `collect_social_analytics`, normalização `x → twitter`, índice criado) são revertidas conforme o ponto escolhido.

Se você precisa também recuperar as linhas deletadas, me avise depois do revert para verificarmos se existe backup point-in-time disponível no Lovable Cloud.

## O que fazer depois do revert

Se após reverter você quiser que eu refaça apenas **parte** da auditoria (por exemplo, manter só a correção do `BulkUploadDialog` e do cron, sem deletar métricas), me diga quais itens manter e eu monto um plano novo focado.

