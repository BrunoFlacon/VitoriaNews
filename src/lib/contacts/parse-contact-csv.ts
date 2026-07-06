export interface ParsedContactRow {
  phone: string;
  name: string;
  email: string;
  company: string;
  tagNames: string[];
}

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ',') {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
  }
  result.push(current.trim());
  return result;
}

export function parseContactCsv(text: string): {
  rows: ParsedContactRow[];
  hasTagsColumn: boolean;
  hasCompanyColumn: boolean;
} {
  const lines = text.split(/\r?\n/).filter(l => l.trim());
  if (lines.length < 2) return { rows: [], hasTagsColumn: false, hasCompanyColumn: false };

  const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().replace(/\s+/g, '_'));
  const phoneIdx = headers.findIndex(h => h === 'phone' || h === 'telefone' || h === 'celular' || h === 'whatsapp');
  if (phoneIdx === -1) return { rows: [], hasTagsColumn: false, hasCompanyColumn: false };

  const nameIdx = headers.findIndex(h => h === 'name' || h === 'nome');
  const emailIdx = headers.findIndex(h => h === 'email' || h === 'e-mail');
  const companyIdx = headers.findIndex(h => h === 'company' || h === 'empresa' || h === 'organizacao');
  const tagsIdx = headers.findIndex(h => h === 'tags' || h === 'etiquetas' || h === 'labels');
  const hasCompanyColumn = companyIdx !== -1;
  const hasTagsColumn = tagsIdx !== -1;

  const rows: ParsedContactRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const phone = cols[phoneIdx]?.trim();
    if (!phone) continue;

    rows.push({
      phone,
      name: nameIdx !== -1 ? cols[nameIdx]?.trim() || '' : '',
      email: emailIdx !== -1 ? cols[emailIdx]?.trim() || '' : '',
      company: companyIdx !== -1 ? cols[companyIdx]?.trim() || '' : '',
      tagNames: tagsIdx !== -1
        ? cols[tagsIdx]?.split(',').map(t => t.trim()).filter(Boolean) ?? []
        : [],
    });
  }

  return { rows, hasTagsColumn, hasCompanyColumn };
}
