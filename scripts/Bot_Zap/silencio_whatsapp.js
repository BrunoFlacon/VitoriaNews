/**
 * Silencia o bot por conversa quando o dono responde manualmente no WhatsApp,
 * ignorando mensagens automáticas do próprio bot (tracking de id).
 * Persistência: silencio_chats.json na pasta do agente.
 */
const path = require("path");
const fs = require("fs");

function createSilencio(rootDir) {
  const file = path.join(rootDir, "silencio_chats.json");
  const idsMsgBot = new Set();
  let chatsSilenciados = new Set();

  function load() {
    try {
      if (fs.existsSync(file)) {
        const d = JSON.parse(fs.readFileSync(file, "utf8"));
        chatsSilenciados = new Set(Array.isArray(d.chats) ? d.chats : []);
      }
    } catch (e) {
      chatsSilenciados = new Set();
    }
  }

  function save() {
    try {
      fs.writeFileSync(file, JSON.stringify({ chats: [...chatsSilenciados] }, null, 2), "utf8");
    } catch (e) {
      console.error("silencio_whatsapp: erro ao salvar", e.message);
    }
  }

  load();

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

  function silenciarChat(chatId) {
    if (!chatId || chatsSilenciados.has(chatId)) return;
    chatsSilenciados.add(chatId);
    save();
    console.log("🤫 Bot silenciado nesta conversa (humano atendeu pelo WhatsApp):", chatId);
  }

  function desilenciarChat(chatId) {
    if (!chatId) return;
    chatsSilenciados.delete(chatId);
    save();
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
