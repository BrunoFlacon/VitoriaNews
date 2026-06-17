import * as XLSX from 'xlsx';

export interface ExportData {
  overview: Record<string, any>;
  engagement: Record<string, any>;
  chartData: Record<string, any>[];
  platformBreakdown: Record<string, any>;
  topContent: Record<string, any>[];
  bestTimes: Record<string, any>[];
  adsStats?: Record<string, any>;
  youtubeStats?: Record<string, any>;
  gaStats?: Record<string, any>;
  messageStats?: Record<string, any>;
  followerData: Record<string, any>[];
  demographics?: { ageGroups?: any[]; gender?: any[]; devices?: any[]; topCities?: any[]; topCountries?: any[] };
  period: string;
  platform: string;
}

function flattenRows<T extends Record<string, any>>(items: T[], label?: string): Record<string, any>[] {
  return items.map((item, i) => ({
    '#': i + 1,
    ...item,
  }));
}

function objToRows(obj: Record<string, any>, keyLabel = 'Métrica', valueLabel = 'Valor'): Record<string, any>[] {
  return Object.entries(obj).map(([key, value]) => ({
    [keyLabel]: key,
    [valueLabel]: value ?? 'N/A',
  }));
}

export function exportToXLSX(data: ExportData, filename: string) {
  const wb = XLSX.utils.book_new();

  const addSheet = (name: string, rows: Record<string, any>[]) => {
    if (rows.length === 0) return;
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, name);
  };

  addSheet('Visão Geral', objToRows(data.overview, 'Métrica', 'Valor'));
  addSheet('Engajamento', objToRows(data.engagement, 'Métrica', 'Valor'));
  addSheet('Gráfico Diário', data.chartData);
  addSheet('Redes Sociais', objToRows(data.platformBreakdown, 'Plataforma', 'Dados'));
  addSheet('Melhores Publicações', flattenRows(data.topContent, 'Publicação'));
  addSheet('Melhores Horários', flattenRows(data.bestTimes, 'Horário'));
  addSheet('Seguidores', data.followerData.map(f => ({
    Plataforma: f.platform,
    Usuário: f.username,
    Seguidores: f.currentFollowers,
    Posts: f.postsCount,
    Crescimento: f.growth,
    Conectado: f.is_connected ? 'Sim' : 'Não',
  })));

  if (data.messageStats) {
    addSheet('Mensageria', objToRows({
      'Total Enviadas': data.messageStats.totalSent,
      'Total Falhas': data.messageStats.totalFailed,
      'Taxa de Sucesso': `${data.messageStats.successRate}%`,
    }, 'Métrica', 'Valor'));
  }

  if (data.adsStats) {
    addSheet('Ads', objToRows(data.adsStats, 'Métrica', 'Valor'));
  }

  if (data.youtubeStats) {
    addSheet('YouTube', objToRows(data.youtubeStats, 'Métrica', 'Valor'));
  }

  if (data.gaStats) {
    addSheet('Google Analytics', objToRows(data.gaStats, 'Métrica', 'Valor'));
  }

  if (data.demographics) {
    const demoRows: Record<string, any>[] = [];
    if (data.demographics.ageGroups?.length) demoRows.push({ Demográfico: 'Faixa Etária', ...Object.fromEntries(data.demographics.ageGroups.map((a: any) => [a.range, a.value])) });
    if (data.demographics.gender?.length) demoRows.push({ Demográfico: 'Gênero', ...Object.fromEntries(data.demographics.gender.map((g: any) => [g.label, g.value])) });
    if (data.demographics.devices?.length) demoRows.push({ Demográfico: 'Dispositivos', ...Object.fromEntries(data.demographics.devices.map((d: any) => [d.label, d.value])) });
    if (demoRows.length) addSheet('Demografia', demoRows);
  }

  XLSX.writeFile(wb, `${filename}.xlsx`);
}

export function exportToCSVOnly(data: ExportData, filename: string) {
  const lines: string[] = [];
  const addSection = (title: string, headers: string[], rows: string[][]) => {
    if (rows.length === 0) return;
    lines.push('');
    lines.push(`"${title}"`);
    lines.push(headers.map(h => `"${h}"`).join(','));
    rows.forEach(row => lines.push(row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')));
  };

  addSection('VISÃO GERAL', ['Métrica', 'Valor'],
    Object.entries(data.overview).map(([k, v]) => [k, String(v ?? 'N/A')])
  );

  addSection('ENGAJAMENTO', ['Métrica', 'Valor'],
    Object.entries(data.engagement).map(([k, v]) => [k, String(v ?? 'N/A')])
  );

  if (data.chartData.length > 0) {
    const headers = Object.keys(data.chartData[0]);
    addSection('GRÁFICO DIÁRIO', headers,
      data.chartData.map(point => headers.map(h => String(point[h] ?? '')))
    );
  }

  if (data.topContent.length > 0) {
    const headers = ['#', 'Conteúdo', 'Engajamento', 'Visualizações'];
    addSection('MELHORES PUBLICAÇÕES', headers,
      data.topContent.map((tc, i) => [String(i + 1), tc.content, String(tc.engagement), String(tc.views)])
    );
  }

  if (data.bestTimes.length > 0) {
    const headers = ['Dia', 'Horário', 'Engajamento', 'Plataforma'];
    addSection('MELHORES HORÁRIOS', headers,
      data.bestTimes.map(bt => [bt.day, bt.time, String(bt.engagement), bt.platform || 'N/A'])
    );
  }

  if (data.followerData.length > 0) {
    const headers = ['Plataforma', 'Usuário', 'Seguidores', 'Posts', 'Crescimento'];
    addSection('SEGUIDORES', headers,
      data.followerData.map(f => [f.platform, f.username || '', String(f.currentFollowers), String(f.postsCount), String(f.growth)])
    );
  }

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
