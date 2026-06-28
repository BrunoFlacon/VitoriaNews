/**
 * Silencia o bot por conversa quando o dono responde manualmente no WhatsApp,
 * integrado com o banco de dados Supabase (tabela silencio_chats) e com fallback local.
 */
const path = require("path");
const fs = require("fs");

function createSilencio(rootDir, getConfig) {
  const file = path.join(rootDir, "silencio_chats.json");
  const idsMsgBot = new Set();
  let chatsSilenciados = new Set();

  // Carrega localmente (fallback/cache inicial)
  function loadLocal() {
    try {
      if (fs.existsSync(file)) {
        const d = JSON.parse(fs.readFileSync(file, "utf8"));
        chatsSilenciados = new Set(Array.isArray(d.chats) ? d.chats : []);
      }
    } catch (e) {
      chatsSilenciados = new Set();
    }
  }

  // Salva localmente (fallback/cache persistente)
  function saveLocal() {
    try {
      fs.writeFileSync(file, JSON.stringify({ chats: [...chatsSilenciados] }, null, 2), "utf8");
    } catch (e) {
      console.error("silencio_whatsapp: erro ao salvar local", e.message);
    }
  }

  // Carrega do Supabase e atualiza cache local
  async function load() {
    loadLocal(); // Garante o cache local primeiro
    const config = getConfig ? getConfig() : null;
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey || !config.userId) {
      return;
    }

    try {
      const url = `${config.supabaseUrl}/rest/v1/silencio_chats?user_id=eq.${config.userId}&platform=eq.whatsapp`;
      const response = await fetch(url, {
        method: "GET",
        headers: {
          "apikey": config.supabaseAnonKey,
          "Authorization": `Bearer ${config.supabaseAnonKey}`,
          "Content-Type": "application/json"
        }
      });

      if (response.ok) {
        const data = await response.json();
        const activeChats = new Set();
        const now = new Date();

        for (const item of data || []) {
          // Verifica se está expirado
          if (item.expires_at && new Date(item.expires_at) < now) {
            // Expirado - Deleta do banco de forma assíncrona em background
            fetch(`${config.supabaseUrl}/rest/v1/silencio_chats?id=eq.${item.id}`, {
              method: "DELETE",
              headers: {
                "apikey": config.supabaseAnonKey,
                "Authorization": `Bearer ${config.supabaseAnonKey}`
              }
            }).catch(() => {});
          } else {
            activeChats.add(item.chat_id);
          }
        }

        chatsSilenciados = activeChats;
        saveLocal();
        console.log(`[SILÊNCIO] Sincronizado do Supabase. Chats silenciados ativos:`, [...chatsSilenciados].join(", ") || "Nenhum");
      }
    } catch (e) {
      console.warn(`[SILÊNCIO] Falha ao sincronizar com Supabase:`, e.message);
    }
  }

  // Salva silêncio no Supabase e no cache local
  async function silenciarChat(chatId) {
    if (!chatId) return;
    chatsSilenciados.add(chatId);
    saveLocal();

    const config = getConfig ? getConfig() : null;
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey || !config.userId) {
      console.log("🤫 Bot silenciado nesta conversa (apenas local):", chatId);
      return;
    }

    try {
      const durationHours = config.silenceDurationHours || 1;
      const silencedAt = new Date().toISOString();
      const expiresAt = new Date(Date.now() + durationHours * 60 * 60 * 1000).toISOString();

      const url = `${config.supabaseUrl}/rest/v1/silencio_chats`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "apikey": config.supabaseAnonKey,
          "Authorization": `Bearer ${config.supabaseAnonKey}`,
          "Content-Type": "application/json",
          "Prefer": "resolution=merge-duplicates"
        },
        body: JSON.stringify({
          user_id: config.userId,
          platform: "whatsapp",
          chat_id: chatId,
          silenced_at: silencedAt,
          expires_at: expiresAt
        })
      });

      if (response.ok) {
        console.log(`🤫 Bot silenciado no Supabase por ${durationHours}h para o chat:`, chatId);
      } else {
        console.warn(`[SILÊNCIO] Erro ao salvar silêncio no Supabase:`, await response.text());
      }
    } catch (e) {
      console.warn(`[SILÊNCIO] Falha ao enviar silêncio ao Supabase:`, e.message);
    }
  }

  // Remove silêncio no Supabase e no cache local
  async function desilenciarChat(chatId) {
    if (!chatId) return;
    chatsSilenciados.delete(chatId);
    saveLocal();

    const config = getConfig ? getConfig() : null;
    if (!config || !config.supabaseUrl || !config.supabaseAnonKey || !config.userId) {
      return;
    }

    try {
      const url = `${config.supabaseUrl}/rest/v1/silencio_chats?user_id=eq.${config.userId}&platform=eq.whatsapp&chat_id=eq.${chatId}`;
      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          "apikey": config.supabaseAnonKey,
          "Authorization": `Bearer ${config.supabaseAnonKey}`
        }
      });

      if (response.ok) {
        console.log("🔊 Bot reativado para o chat no Supabase:", chatId);
      }
    } catch (e) {
      console.warn(`[SILÊNCIO] Falha ao remover silêncio no Supabase:`, e.message);
    }
  }

  // Tenta carregar o cache inicial
  loadLocal();

  function registrarMensagemDoBot(sentMsg) {
    if (!sentMsg || !sentMsg.id) return;
    const sid = sentMsg.id._serialized || sentMsg.id.id;
    if (!sid) return;
    idsMsgBot.add(sid);
    while (idsMsgBot.size > 800) {
      const first = idsMsgBot.values().next().value;
      if (first !== undefined) idsMsgBot.delete(first);
      else break;
    }
  }

  function ehMensagemDoBot(msg) {
    if (!msg || !msg.id) return false;
    const sid = msg.id._serialized || msg.id.id;
    return !!(sid && idsMsgBot.has(sid));
  }

  function estaSilenciado(chatId) {
    return !!(chatId && chatsSilenciados.has(chatId));
  }

  function listar() {
    return [...chatsSilenciados];
  }

  function textoEhOptOut(texto) {
    const t = (texto || "").trim().toLowerCase();
    if (t.length < 3 || t.length > 40) return false;
    const opt = [
      /^#?\s*parar$/,
      /^#?\s*stop$/,
      /^parar\s+bot$/,
      /^sair\s+do\s+bot$/,
      /^nao\s+quero\s+bot$/,
      /^não\s+quero\s+bot$/,
      /^falar\s+com\s+humano$/,
      /^quero\s+humano$/,
    ];
    return opt.some((re) => re.test(t));
  }

  return {
    registrarMensagemDoBot,
    ehMensagemDoBot,
    silenciarChat,
    desilenciarChat,
    estaSilenciado,
    listar,
    textoEhOptOut,
    reload: load,
  };
}

module.exports = { createSilencio };
