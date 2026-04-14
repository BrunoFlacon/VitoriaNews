const FREE_MAX = 20;

let extractedData = [];

function applyBrand() {
  const cfg = window.__MAPS_FREE_BRAND__;
  if (!cfg) return;

  const nameEl = document.getElementById("brandName");
  const sloganEl = document.getElementById("brandSlogan");
  const markEl = document.getElementById("brandMark");
  const waBtn = document.getElementById("waProBtn");

  if (nameEl && cfg.nomeExibicao) nameEl.textContent = cfg.nomeExibicao;
  if (sloganEl && cfg.slogan) sloganEl.textContent = cfg.slogan;
  if (markEl && cfg.iniciaisLogo) {
    const t = String(cfg.iniciaisLogo).trim().slice(0, 4).toUpperCase();
    markEl.textContent = t || "•";
  }

  if (waBtn && cfg.whatsappNumero) {
    const num = String(cfg.whatsappNumero).replace(/\D/g, "");
    const intro = cfg.textoWhatsAppIntro || "Olá! Quero falar sobre a versão Pro.";
    const legal = cfg.avisoLegal || "";
    const txt = legal ? `${intro}\n\n${legal}` : intro;
    const url = `https://wa.me/${num}?text=${encodeURIComponent(txt)}`;
    waBtn.href = url;
  }

  const legalEl = document.getElementById("legalNote");
  if (legalEl && cfg.avisoLegal) legalEl.textContent = cfg.avisoLegal;
}

applyBrand();

document.getElementById("extractBtn").addEventListener("click", async () => {
  const status = document.getElementById("status");
  const count = document.getElementById("count");
  const downloadBtn = document.getElementById("downloadBtn");

  status.textContent = "Extraindo…";
  status.classList.remove("status--ok", "status--err");

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

  if (!tab || !tab.url || !tab.url.includes("google.com/maps")) {
    status.textContent = "Abra o Google Maps nesta aba (resultados com lista lateral).";
    status.classList.add("status--err");
    return;
  }

  try {
    chrome.tabs.sendMessage(tab.id, { action: "extractLeads" }, (response) => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({ target: { tabId: tab.id }, files: ["content.js"] }, () => {
          chrome.tabs.sendMessage(tab.id, { action: "extractLeads" }, (second) => {
            handleResponse(second, status, count, downloadBtn);
          });
        });
        return;
      }
      handleResponse(response, status, count, downloadBtn);
    });
  } catch {
    status.textContent = "Recarregue a página do Maps e tente de novo.";
    status.classList.add("status--err");
  }
});

function handleResponse(response, status, count, downloadBtn) {
  if (response && response.error) {
    status.textContent = response.error;
    status.classList.add("status--err");
    count.textContent = "0";
    downloadBtn.disabled = true;
    return;
  }

  if (response && response.data && response.data.length > 0) {
    const limited = response.data.slice(0, FREE_MAX);
    extractedData = limited;
    count.textContent = String(limited.length);
    if (response.data.length > FREE_MAX) {
      status.textContent = `Encontrados ${response.data.length}. Free exporta os primeiros ${FREE_MAX}.`;
    } else {
      status.textContent = "Extração concluída.";
    }
    status.classList.add("status--ok");
    downloadBtn.disabled = false;
  } else {
    extractedData = [];
    count.textContent = "0";
    status.textContent = "Nenhum lead na lista. Role o painel lateral e tente de novo.";
    status.classList.add("status--err");
    downloadBtn.disabled = true;
  }
}

document.getElementById("downloadBtn").addEventListener("click", () => {
  if (extractedData.length === 0) return;
  const csvContent = convertToCSV(extractedData);
  const blob = new Blob(["\ufeff" + csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const timestamp = new Date().toISOString().slice(0, 10);
  link.href = url;
  link.download = `maps_leads_free_${timestamp}.csv`;
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
});

function convertToCSV(objArray) {
  const array = typeof objArray !== "object" ? JSON.parse(objArray) : objArray;
  let str = "";
  const headers = Object.keys(array[0]);
  str += headers.join(";") + "\r\n";
  for (let i = 0; i < array.length; i++) {
    let line = "";
    for (const key of headers) {
      if (line !== "") line += ";";
      let value = array[i][key] != null ? array[i][key].toString() : "";
      value = value.replace(/"/g, '""').replace(/\n/g, " ");
      if (value.includes(";")) value = `"${value}"`;
      line += value;
    }
    str += line + "\r\n";
  }
  return str;
}
