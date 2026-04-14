/**
 * AGENTE DE IA + CHATBOT WHATSAPP
 * Backend com Express, WhatsApp Web.js, Groq AI e Socket.IO
 * QR Code aparece no navegador - sem terminal!
 */

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");
const fs = require("fs");
const QRCode = require("qrcode");
const { Client, LocalAuth } = require("whatsapp-web.js");
const OpenAI = require("openai");
const { createSilencio } = require("./silencio_whatsapp");
const silencio = createSilencio(__dirname);

// =====================================
// CONFIGURAÇÃO
// =====================================
const PORT = 3000;
const CONFIG_FILE = path.join(__dirname, "config.json");

let groqClient = null;
let whatsappClient = null;
let whatsappConectado = false;
let io = null;

// Carregar ou criar config
function loadConfig() {
  try {
    if (fs.existsSync(CONFIG_FILE)) {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, "utf8"));
    }
  } catch (e) {
    console.error("Erro ao carregar config:", e);
  }
  const defaultConfig = {
    supabaseUrl: "https://ghtkdkauseesambzqfrd.supabase.co",
    supabaseAnonKey: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdodGtka2F1c2Vlc2FtYnpxZnRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NTUwMTQsImV4cCI6MjA4OTUzMTAxNH0.X1OeIwLezATvztpzJzDJWMSUgukNXIWNQp2L1rHkLGs",
    userId: "",
    groqApiKey: "",
    useAI: true,
    botActive: true,
    model: "llama-3.1-8b-instant",
    promptSistema: "Você é o assistente virtual da empresa. Seja simpático, profissional e objetivo. Responda dúvidas sobre horário, preços e serviços. Se não souber algo, peça para a pessoa aguardar que um atendente responderá.",
    flows: [
      {
        id: "1",
        palavras: ["oi", "olá", "ola", "bom dia", "boa tarde", "boa noite", "menu"],
        resposta: "Olá! 👋 Sou o assistente virtual.\n\nComo posso ajudar?\n\n1 - Saber mais sobre nós\n2 - Falar com atendente\n3 - Horário de funcionamento\n\nDigite o número ou faça sua pergunta!",
      },
      {
        id: "2",
        palavras: ["1", "saber mais", "como funciona"],
        resposta: "Atendimento disponível! Envie sua dúvida que eu te ajudo ou repasso para um atendente.",
      },
      {
        id: "3",
        palavras: ["2", "atendente", "humano"],
        resposta: "Um atendente humano entrará em contato em breve. Por favor, aguarde.",
      },
      {
        id: "4",
        palavras: ["3", "horário", "horario", "funcionamento"],
        resposta: "Consulte nosso horário de atendimento. (Edite esta resposta na aba Fluxos com o horário da sua empresa)",
      },
    ],
  };
  saveConfig(defaultConfig);
  return defaultConfig;
}

function saveConfig(config) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), "utf8");
}

let config = loadConfig();

// =====================================
// SUPABASE BRIDGE
// =====================================
async function syncToSupabase(endpoint, data) {
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.userId) return;
  try {
    const response = await fetch(`${config.supabaseUrl}/rest/v1/${endpoint}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": config.supabaseAnonKey,
        "Authorization": `Bearer ${config.supabaseAnonKey}`,
        "Prefer": "return=minimal"
      },
      body: JSON.stringify({
        ...data,
        user_id: config.userId
      })
    });
    if (!response.ok) {
      console.warn(`[SYNC] Error syncing to ${endpoint}:`, await response.text());
    }
  } catch (e) {
    console.warn(`[SYNC] Failed to connect to Supabase:`, e.message);
  }
}

async function updateBotStatus(online = true) {
  if (!config.userId) return;
  
  // We use upsert on messaging_channels for the bot record
  const data = {
    user_id: config.userId,
    platform: "whatsapp",
    channel_type: "bot", // Identifying this is the bot
    full_name: "Robô Bot_Zap",
    is_online: online,
    last_seen: new Date().toISOString(),
    is_active: config.botActive ?? true
  };

  try {
    await fetch(`${config.supabaseUrl}/rest/v1/messaging_channels`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "apikey": config.supabaseAnonKey,
        "Authorization": `Bearer ${config.supabaseAnonKey}`,
        "Prefer": "resolution=merge-duplicates"
      },
      body: JSON.stringify(data)
    });
  } catch (e) {
    console.warn("[SYNC] Bot status sync failed:", e.message);
  }
}

// Inicializar Groq se tiver API key
if (config.groqApiKey && config.groqApiKey.trim()) {
  groqClient = new OpenAI({
    apiKey: config.groqApiKey,
    baseURL: "https://api.groq.com/openai/v1",
  });
}

// =====================================
// EXPRESS + SOCKET.IO
// =====================================
const app = express();
const server = http.createServer(app);
io = new Server(server);

app.use(express.json());
app.use(express.static(__dirname));

// Rota para a interface do robô
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// API: Salvar config
app.post("/api/config", (req, res) => {
  config = { ...config, ...req.body };
  saveConfig(config);
  if (config.groqApiKey && config.groqApiKey.trim()) {
    groqClient = new OpenAI({
      apiKey: config.groqApiKey,
      baseURL: "https://api.groq.com/openai/v1",
    });
  }
  res.json({ ok: true });
});

// API: Toggle Bot Status
app.get('/api/bot/ping', (req, res) => {
  res.json({ status: 'online', botActive: config.botActive });
});

app.post("/api/bot/toggle", (req, res) => {
  const { active } = req.body;
  config.botActive = !!active;
  saveConfig(config);
  console.log(`[BOT] Bot is now ${config.botActive ? 'ACTIVE' : 'INACTIVE'}`);
  io.emit("status", { 
    conectado: whatsappConectado, 
    botActive: config.botActive,
    mensagem: `Bot ${config.botActive ? 'Ativado' : 'Desativado'}` 
  });
  updateBotStatus(whatsappConectado); // Sync to Supabase
  res.json({ ok: true, active: config.botActive });
});

// API: Obter config (sem expor a chave completa por segurança no log)
app.get("/api/config", (req, res) => {
  const safe = { ...config };
  if (safe.groqApiKey) safe.groqApiKey = safe.groqApiKey.substring(0, 8) + "***";
  if (safe.supabaseAnonKey) safe.supabaseAnonKey = safe.supabaseAnonKey.substring(0, 8) + "***";
  res.json(safe);
});

// API: Config completa para edição (front envia só se usuário editar)
app.get("/api/config/full", (req, res) => {
  res.json(config);
});

app.get("/api/silencio-chats", (req, res) => {
  res.json({ ok: true, chats: silencio.listar() });
});
app.post("/api/silencio-chats", (req, res) => {
  const chatId = (req.body && req.body.chatId) ? String(req.body.chatId).trim() : "";
  const remover = !!(req.body && req.body.remover);
  if (!chatId) return res.status(400).json({ ok: false, erro: "chatId obrigatório" });
  if (remover) silencio.desilenciarChat(chatId);
  res.json({ ok: true, chats: silencio.listar() });
});

// Rota principal
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// API: Desconectar WhatsApp
app.post("/api/whatsapp/disconnect", async (req, res) => {
  try {
    if (whatsappClient) {
      whatsappConectado = false;
      await updateBotStatus(false);
      try { await whatsappClient.destroy(); } catch (e) {}
      whatsappClient = null;
      io.emit("status", { conectado: false, mensagem: "Desconectado. Clique em Gerar novo QR Code para conectar novamente." });
    }
    res.json({ ok: true });
  } catch (e) {
    whatsappClient = null;
    res.json({ ok: true });
  }
});

// API: Gerar novo QR Code (reinicia o WhatsApp)
app.post("/api/whatsapp/restart", async (req, res) => {
  try {
    if (whatsappClient) {
      try { await whatsappClient.destroy(); } catch (e) {}
      whatsappClient = null;
    }
    whatsappConectado = false;

    // Limpar sessão se solicitado (resolve "não conecta" ou travamentos)
    if (req.query.limpar === "1") {
      const authPath = path.join(__dirname, ".wwebjs_auth");
      if (fs.existsSync(authPath)) {
        try {
          fs.rmSync(authPath, { recursive: true });
          console.log("Sessão limpa. Iniciando do zero.");
        } catch (e) {
          console.error("Erro ao limpar sessão:", e);
        }
      }
    }

    io.emit("qr", "loading");
    io.emit("status", { conectado: false, mensagem: "Gerando QR Code... Pode levar 1-2 minutos na primeira vez." });
    initWhatsApp(true);
    res.json({ ok: true });
  } catch (e) {
    console.error("Erro ao reiniciar:", e);
    io.emit("status", { conectado: false, mensagem: "Erro. Clique em 'Limpar sessão e tentar' para recomeçar." });
    res.json({ ok: false, erro: e.message });
  }
});

// =====================================
// WHATSAPP
// =====================================
function initWhatsApp(force = false) {
  if (whatsappClient && !force) return;
  if (whatsappClient && force) {
    whatsappClient = null;
  }
  
  whatsappClient = new Client({
    authStrategy: new LocalAuth({ clientId: "agente-ia" }),
    authTimeoutMs: 180000, 
    puppeteer: {
      headless: true,
      timeout: 120000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--disable-software-rasterizer",
        "--disable-extensions",
        "--no-first-run",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=VizDisplayCompositor",
      ],
    },
  });

  whatsappClient.on("qr", async (qr) => {
    try {
      const qrDataUrl = await QRCode.toDataURL(qr, { width: 300 });
      io.emit("qr", qrDataUrl);
      io.emit("status", { conectado: false, mensagem: "Escaneie o QR Code com seu WhatsApp" });
    } catch (e) {
      console.error("Erro ao gerar QR:", e);
    }
  });

  whatsappClient.on("ready", () => {
    whatsappConectado = true;
    updateBotStatus(true);
    io.emit("qr", null); 
    io.emit("status", { conectado: true, mensagem: "WhatsApp conectado!" });
    console.log("✅ WhatsApp conectado.");
  });

  whatsappClient.on("disconnected", () => {
    whatsappConectado = false;
    updateBotStatus(false);
    io.emit("status", { conectado: false, mensagem: "WhatsApp desconectado" });
  });

  whatsappClient.on("auth_failure", (msg) => {
    console.error("Falha na autenticação:", msg);
    io.emit("status", { conectado: false, mensagem: "Falha ao conectar. Clique em 'Limpar sessão e tentar'." });
  });

  whatsappClient.on("message", handleMessage);

  whatsappClient.initialize().catch((err) => {
    console.error("Erro ao inicializar WhatsApp:", err);
    whatsappClient = null;
    io.emit("status", { conectado: false, mensagem: "Erro ao iniciar. Feche outros programas e clique em 'Limpar sessão e tentar'." });
  });
}

// =====================================
// LÓGICA DE MENSAGENS
// =====================================
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

async function respostaPorFluxo(texto) {
  config = loadConfig();
  const txt = texto.trim().toLowerCase();
  for (const flow of config.flows || []) {
    for (const p of flow.palavras || []) {
      if (txt.includes(p.toLowerCase()) || txt === p.toLowerCase()) {
        return flow.resposta;
      }
    }
  }
  return null;
}

async function respostaPorIA(texto, contexto = "") {
  if (!groqClient || !config.groqApiKey) return null;
  try {
    const completion = await groqClient.chat.completions.create({
      model: config.model || "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: config.promptSistema || "Você é um assistente prestativo." },
        ...(contexto ? [{ role: "user", content: contexto }] : []),
        { role: "user", content: texto },
      ],
      max_tokens: 500,
      temperature: 0.7,
    });
    const res = completion.choices?.[0]?.message?.content;
    return res ? res.trim() : null;
  } catch (e) {
    console.error("Erro Groq:", e.message);
    return null;
  }
}

async function handleMessage(msg) {
  try {
    config = loadConfig();
    const from = (msg.from || "").toString();
    if (from.includes("status") || from.includes("broadcast") || msg.broadcast || msg.isStatus) return;
    
    // Check if bot is globally active
    if (config.botActive === false) return;

    const chat = await msg.getChat();
    const chatId = chat.id._serialized;
    const texto = msg.body ? msg.body.trim() : "";

    // Sync Incoming Message to Supabase
    if (!msg.fromMe && texto) {
      await syncToSupabase("messages", {
        content: texto,
        platform: "whatsapp",
        recipient_phone: from,
        status: "received",
        metadata: { integration_type: "bot", bot_role: "agent" }
      });
    }

    if (msg.fromMe) {
      if (silencio.ehMensagemDoBot(msg)) return;
      silencio.silenciarChat(chatId);
      return;
    }

    if (config.humanoAtendeu) return;
    if (silencio.estaSilenciado(chatId)) return;

    const MAX_IDADE_SEGUNDOS = 300;
    const agora = Math.floor(Date.now() / 1000);
    const ts = msg.timestamp || 0;
    if (ts > 0 && (agora - ts) > MAX_IDADE_SEGUNDOS) return;

    if (silencio.textoEhOptOut(texto)) {
      silencio.silenciarChat(chatId);
      const r = await msg.reply("Ok! Pausamos o assistente automático nesta conversa. Quando precisar, é só chamar no suporte.");
      silencio.registrarMensagemDoBot(r);
      return;
    }
    if (!texto) return;

    const typing = async () => {
      await delay(800);
      await chat.sendStateTyping();
      await delay(1200);
    };

    config = loadConfig();

    let resposta = await respostaPorFluxo(texto);
    if (!resposta && config.useAI) {
      resposta = await respostaPorIA(texto);
    }
    if (!resposta) {
      resposta = "Desculpe, não entendi. Digite 'menu' para ver as opções.";
    }

    await typing();
    const r = await msg.reply(resposta);
    silencio.registrarMensagemDoBot(r);

    // Sync Bot Answer to Supabase
    await syncToSupabase("messages", {
      content: resposta,
      platform: "whatsapp",
      recipient_phone: from,
      status: "sent",
      sent_at: new Date().toISOString(),
      metadata: { 
        integration_type: "bot", 
        bot_role: "answer",
        original_msg: texto.substring(0, 100)
      }
    });

  } catch (error) {
    console.error("❌ Erro ao processar mensagem:", error);
    try {
      const r = await msg.reply("Ocorreu um erro. Tente novamente em instantes.");
      silencio.registrarMensagemDoBot(r);
    } catch (e) {}
  }
}

// =====================================
// SOCKET.IO - broadcast de status
// =====================================
io.on("connection", (socket) => {
  socket.emit("status", {
    conectado: whatsappConectado,
    mensagem: whatsappConectado ? "WhatsApp conectado!" : "Conecte escaneando o QR Code",
  });
  if (!whatsappConectado) {
    socket.emit("qr", "loading");
  }
});

// =====================================
// INICIAR
// =====================================
  server.listen(PORT, () => {
  console.log(`
╔══════════════════════════════════════════════════════════╗
║  🤖 AGENTE DE IA + CHATBOT WHATSAPP                      ║
║                                                          ║
║  Abra no navegador:  http://localhost:${PORT}             ║
║                                                          ║
║  O QR Code aparecerá na tela - escaneie com o WhatsApp!  ║
╚══════════════════════════════════════════════════════════╝
  `);
  io.emit("qr", "loading");
  initWhatsApp();
});
