const WebSocket = require('ws');
const fs = require('fs');
const ws = new WebSocket('ws://127.0.0.1:9222/devtools/page/D1BA4F605F4F17E6E5E4DE7CCA96EE46');

function send(method, params = {}) {
  return new Promise((resolve) => {
    const id = Math.floor(Math.random() * 1000000);
    const handler = (data) => {
      const msg = JSON.parse(data.toString());
      if (msg.id === id) {
        ws.off('message', handler);
        resolve(msg.result);
      }
    };
    ws.on('message', handler);
    ws.send(JSON.stringify({ id, method, params }));
  });
}

ws.on('open', async () => {
  console.log('Conectado a aba do Chrome.');
  
  // 1. Clicar no menu lateral Configurações
  console.log('Clicando em Configurações...');
  await send('Runtime.evaluate', {
    expression: `
      (() => {
        const els = Array.from(document.querySelectorAll('*'));
        const configBtn = els.find(el => el.innerText && el.innerText.trim() === 'Configurações');
        if (configBtn) {
          configBtn.click();
          return 'Configurações clicado!';
        }
        return 'Botao de configuracoes nao encontrado';
      })()
    `
  });
  
  await new Promise(r => setTimeout(r, 2000));
  
  // 2. Clicar na aba APIs Sociais & Dev
  console.log('Clicando na aba APIs...');
  const res = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const els = Array.from(document.querySelectorAll('*'));
        const apiTab = els.find(el => el.innerText && el.innerText.includes('APIs Sociais'));
        if (apiTab) {
          apiTab.click();
          return 'Aba APIs clicada: ' + apiTab.tagName;
        }
        return 'Aba APIs nao encontrada';
      })()
    `
  });
  console.log('Resposta aba APIs:', res);
  
  await new Promise(r => setTimeout(r, 3000));

  // 3. Expandir WhatsApp Business Cloud API
  console.log('Expandindo WhatsApp...');
  const resWa = await send('Runtime.evaluate', {
    expression: `
      (() => {
        const els = Array.from(document.querySelectorAll('*'));
        const waHeader = els.find(el => el.innerText && el.innerText.includes('WhatsApp Business Cloud API'));
        if (waHeader) {
          waHeader.click();
          return 'WhatsApp expandido: ' + waHeader.tagName;
        }
        return 'Header WhatsApp nao encontrado';
      })()
    `
  });
  console.log('Resposta WhatsApp:', resWa);

  await new Promise(r => setTimeout(r, 3000));

  // 4. Capturar screenshot
  console.log('Tirando screenshot...');
  const screenshot = await send('Page.captureScreenshot', { format: 'png' });
  if (screenshot && screenshot.data) {
    const buffer = Buffer.from(screenshot.data, 'base64');
    fs.writeFileSync('C:/Users/Servidor/.gemini/antigravity-ide/brain/9877ca62-df2a-4fca-89b5-c8fc992bf719/actual_whatsapp_configs.png', buffer);
    console.log('Screenshot de configurações salvo com sucesso!');
  }
  
  ws.close();
});
