# Resolver erros ao iniciar o chatbot

## Erro: "Execution context was destroyed" ou "Protocol error"

Esse erro aparece quando o Windows ou o antivírus atrapalha o navegador interno do chatbot. Siga os passos abaixo:

### 1. Mover para uma pasta SEM ESPAÇOS no nome

O caminho **não pode ter espaços**. Por exemplo:
- ❌ Errado: `C:\Users\NINGUEM\Downloads\AGENTE IA CHAT BOT\...`
- ✅ Correto: `C:\Chatbot\` ou `C:\AgenteIA\`

**O que fazer:** Mova a pasta inteira do chatbot para `C:\Chatbot` (crie a pasta se não existir).

### 2. Não use pasta dentro de pasta duplicada

Se você descompactou e ficou assim: `AgenteIAChatbot_PrimeiraVez\AgenteIAChatbot_PrimeiraVez\`, use a pasta de dentro (a que tem o INICIAR.bat).

### 3. Adicionar exceção no antivírus / Windows Defender

1. Abra o **Windows Security** (Segurança do Windows)
2. Vá em **Vírus e proteção** → **Configurações de proteção**
3. Em **Exclusões**, adicione a pasta do chatbot (ex: `C:\Chatbot`)

Antivírus como Avast, Norton ou Kaspersky também podem bloquear. Adicione a pasta às exceções.

### 4. Limpar e tentar de novo

1. Feche tudo (incluindo a janela preta do INICIAR.bat)
2. Apague a pasta **`.wwebjs_auth`** (fica dentro da pasta do chatbot)
3. Apague a pasta **`node_modules`**
4. Dê dois cliques no **INICIAR.bat** de novo (vai reinstalar e demorar 1–2 min)

### 5. Executar como administrador

Clique com o botão direito no **INICIAR.bat** → **Executar como administrador**.

### 6. Conferir o Node.js

1. Abra o **Prompt de Comando** (cmd)
2. Digite: `node --version`
3. Deve aparecer algo como `v20.x` ou `v18.x`

Se não aparecer, instale o Node.js: https://nodejs.org/pt (versão LTS)

---

## Erro: "Não é possível acessar esse site" / "Conexão recusada"

Significa que o servidor ainda não iniciou ou fechou.

1. Deixe a **janela preta aberta** (não feche)
2. Espere 1–2 minutos na primeira vez
3. Só depois abra o navegador em: **http://localhost:3000**

---

## Ainda com problema?

Envie uma foto da tela com o erro completo (a janela preta inteira) para o suporte no WhatsApp.
