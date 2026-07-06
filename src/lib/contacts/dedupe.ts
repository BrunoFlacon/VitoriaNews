export interface ExistingContact {
  id: string;
  name: string | null;
  phone: string | null;
  phone_normalized: string | null;
}

export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '');
}

export function isExactMatch(existing: ExistingContact, phone: string): boolean {
  const norm = normalizePhone(phone);
  return existing.phone_normalized === norm || existing.phone === phone.trim();
}

export function isUniqueViolation(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  const e = err as Record<string, unknown>;
  return e.code === '23505' || (typeof e.message === 'string' && e.message.includes('unique'));
}

export async function findExistingContact(
  supabase: any,
  userId: string,
  phone: string
): Promise<ExistingContact | null> {
  const norm = normalizePhone(phone);
  const { data } = await supabase
    .from('contacts')
    .select('id, name, phone, phone_normalized')
    .eq('user_id', userId)
    .or(`phone_normalized.eq.${norm},phone.eq.${phone.trim()}`)
    .limit(1)
    .maybeSingle();
  return data ?? null;
}

export interface ParsedRow {
  phone: string;
  name: string;
  email: string;
  company: string;
  tagNames: string[];
}

export function dedupeByPhone(rows: ParsedRow[]): { unique: ParsedRow[]; duplicates: number } {
  const seen = new Map<string, number>();
  const unique: ParsedRow[] = [];
  let duplicates = 0;
  for (const row of rows) {
    const key = normalizePhone(row.phone);
    if (seen.has(key)) {
      duplicates++;
    } else {
      seen.set(key, 1);
      unique.push(row);
    }
  }
  return { unique, duplicates };
}
