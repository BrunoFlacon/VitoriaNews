chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "extractLeads") {
    try {
      const leads = extractData();
      sendResponse({ data: leads });
    } catch (error) {
      console.error("Erro na extração:", error);
      sendResponse({ data: [], error: error.message });
    }
  }
  return true;
});

function extractData() {
  const results = Array.from(document.querySelectorAll('div[role="article"]'));

  return results
    .map((el) => {
      const nameEl = el.querySelector('.qBF1Pd, .fontHeadlineSmall');
      const name = nameEl ? nameEl.innerText.trim() : "N/A";

      const fullText = el.innerText;
      const lines = fullText.split("\n");

      const phoneRegex = /(\+55\s?)?\(?\d{2}\)?\s?9?\d{4}-?\d{4}/g;
      const phones = fullText.match(phoneRegex);
      const phone = phones ? phones[0] : "N/A";

      const address =
        lines.find((line) => {
          const isRating = /^\d,\d\(/.test(line.trim());
          const hasAddressMarkers = /Rua|Av\.|Avenida|Rod\.|Praça|Al\.|Bairro|Centro/i.test(line);
          const hasComma = line.includes(",");
          return !isRating && (hasAddressMarkers || (hasComma && line.length > 10));
        }) || "N/A";

      const websiteEl = el.querySelector('a[data-value="Website"]');
      const website = websiteEl ? websiteEl.href : "N/A";

      let hasWhatsApp = "Não";
      if (phone !== "N/A") {
        const cleanPhone = phone.replace(/\D/g, "");
        if (
          (cleanPhone.length === 11 && cleanPhone[2] === "9") ||
          (cleanPhone.length === 13 && cleanPhone[4] === "9")
        ) {
          hasWhatsApp = "Sim";
        }
      }

      return {
        Nome: name,
        Telefone: phone,
        WhatsApp: hasWhatsApp,
        Endereço: address,
        Website: website,
      };
    })
    .filter((lead) => lead.Nome !== "N/A");
}
