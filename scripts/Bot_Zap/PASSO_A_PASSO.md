# 📱 Guia Completo: Agente de IA + Chatbot WhatsApp

## Para pessoas que nunca instalaram nada no computador

Este guia foi feito para que **qualquer pessoa**, mesmo sem conhecimento técnico, consiga instalar e usar o chatbot. O bot já vem respondendo a "oi" e "olá" assim que conectar o WhatsApp — sem configurar nada!

---

## ✅ O que você vai precisar

- Um computador com Windows
- Conexão com a internet
- Um celular com WhatsApp
- Cerca de 15 minutos

---

## PASSO 1: Baixar e instalar o Node.js

O Node.js é um programa necessário para o chatbot funcionar.

1. Acesse: **https://nodejs.org/**
2. Clique no botão verde **"LTS"** (versão recomendada)
3. Após o download, abra o arquivo e clique em **"Next"** em todas as etapas
4. Marque a opção **"Automatically install necessary tools"** se aparecer
5. Clique em **"Install"** e aguarde terminar
6. Clique em **"Finish"**

✅ **Pronto!** O Node.js está instalado.

---

## PASSO 2: Copiar a pasta do projeto

1. Localize a pasta **"AgenteIAChatbot"** (pode estar na área de trabalho ou onde você salvou)
2. **NÃO** apague, renomeie ou mova os arquivos de dentro da pasta
3. A pasta deve conter estes arquivos:
   - `INICIAR.bat`
   - `server.js`
   - `package.json`
   - Pasta `public`
   - Pasta `node_modules` (será criada automaticamente na primeira execução)

---

## PASSO 3: Iniciar o chatbot

1. Dê **dois cliques** no arquivo **`INICIAR.bat`**
2. Se aparecer uma janela perguntando se deseja executar, clique em **"Sim"**
3. Na primeira vez, a instalação das dependências pode levar **1 a 2 minutos** — aguarde
4. Quando aparecer a mensagem **"Abra seu navegador em: http://localhost:3000"**, está pronto!
5. **Deixe essa janela aberta** — fechar ela desliga o chatbot

---

## PASSO 4: Abrir no navegador

1. Abra o **Google Chrome**, **Edge** ou outro navegador
2. Na barra de endereço, digite: **http://localhost:3000**
3. Pressione **Enter**
4. A página do chatbot vai abrir

---

## PASSO 5: Conectar o WhatsApp

1. Na tela que abriu, você verá a área **"Conectar WhatsApp"**
2. **Aguarde 30-60 segundos** — o QR Code aparece automaticamente (o sistema está iniciando)
3. Se demorar ou não aparecer, clique em **"Gerar novo QR Code"**
4. No seu **celular**, abra o WhatsApp → **Aparelhos conectados** → **Conectar um aparelho**
5. **Aponte a câmera** para o QR Code na tela
6. Quando aparecer **"WhatsApp conectado!"**, está pronto! (Use **Desconectar** se quiser trocar de número)

---

## PASSO 6: Configurar a IA (Groq) — opcional

O bot já responde a "oi", "olá", "menu" etc. Para a IA responder perguntas livres (ex: "qual o horário?", "quanto custa?"):

1. Na página do chatbot, clique na aba **"Chave Groq (IA)"**
2. Clique no botão **"Obter chave GRÁTIS no Groq"** (abre o site)
3. Crie uma conta gratuita no Groq
4. Vá em **API Keys** → **Create API Key** → copie a chave
5. Volte ao chatbot, cole a chave e clique em **"Salvar configuração"**

✅ Pronto! Perguntas que não estão nos fluxos serão respondidas pela IA.

---

## PASSO 7: Personalizar fluxos e prompt (opcional)

O bot já vem com fluxos prontos. Para adaptar à sua empresa:

1. **Fluxos:** aba **"Fluxos do Bot"** — edite as respostas, troque pelo nome da sua empresa, horários, preços
2. **Prompt da IA:** aba **"Modelo e Prompt"** — edite o texto substituindo "[SUA EMPRESA]" pelo nome real
3. Clique em **"Salvar"** após alterar

---

## PASSO 8: Testar

1. Use **outro número de WhatsApp** (não o que está conectado) para enviar mensagem
2. Envie algo como **"oi"** ou **"bom dia"**
3. O bot deve responder automaticamente!

---

## 🆘 Problemas comuns

| Problema | Solução |
|----------|---------|
| "Node.js não encontrado" | Instale o Node.js (Passo 1) e reinicie o computador |
| QR Code não aparece | Aguarde 1-2 minutos. Se não aparecer, clique em "Limpar sessão e tentar" |
| Não conecta ao escanear | Use "Limpar sessão e tentar" e escaneie o novo QR Code |
| Bot não responde | Verifique se o WhatsApp está conectado (deve aparecer "WhatsApp conectado!") |
| Porta 3000 em uso | Feche outros programas que usam a porta ou altere no `server.js` a variável `PORT` |
| Janela fecha sozinha | Execute `INICIAR.bat` como administrador (botão direito → Executar como administrador) |

---

## 📌 Resumo ultra rápido

1. **Instalar Node.js** (nodejs.org)  
2. **Baixar e descompactar** a pasta  
3. **Dois cliques** no `INICIAR.bat`  
4. **Copiar** o link http://localhost:3000 que aparece e **colar no navegador**  
5. **Conectar** o WhatsApp escaneando o QR Code  
6. **Testar:** envie "oi" de outro celular — o bot já responde!  
7. **Configurar depois:** chave Groq (IA gratuita), fluxos, prompt — tudo na própria tela  

---

**Pronto!** Seu chatbot com IA está funcionando. Mantenha o computador ligado e a janela do `INICIAR.bat` aberta para o bot continuar ativo.
