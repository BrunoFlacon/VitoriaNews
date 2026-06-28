import { supabase } from "@/integrations/supabase/client";

const SELECTED_ACCOUNTS_KEY = "dashboard_selected_accounts";

export const saveSelectedAccounts = (platforms: string[]) => {
  try {
    const map: Record<string, string> = {};
    platforms.forEach(p => {
      const [pid, accId] = p.split("|");
      map[pid] = accId || "all";
    });
    localStorage.setItem(SELECTED_ACCOUNTS_KEY, JSON.stringify(map));
  } catch { /* localStorage may be full */ }
};

export const loadSelectedAccounts = (): string[] => {
  try {
    const saved = localStorage.getItem(SELECTED_ACCOUNTS_KEY);
    if (saved) {
      const selected = JSON.parse(saved) as Record<string, string>;
      return Object.entries(selected)
        .filter(([_, accountId]) => accountId && accountId !== "all")
        .map(([platform, accountId]) => `${platform}|${accountId}`);
    }
  } catch { /* ignore */ }
  return [];
};

export const getMediaUrl = (raw: string) => {
  if (!raw) return "";

  // Signed URLs expiradas — extrair o path e gerar public URL fresca
  if (raw.includes("/object/sign/")) {
    try {
      const url = new URL(raw);
      const m = url.pathname.match(/\/object\/sign\/([^/]+)\/(.+)/);
      if (m) {
        const { data } = supabase.storage.from(m[1]).getPublicUrl(m[2]);
        return data.publicUrl;
      }
    } catch { /* fall through */ }
  }

  if (raw.startsWith("http") || raw.startsWith("blob:") || raw.startsWith("data:")) return raw;

  try {
    const { data } = supabase.storage.from("media").getPublicUrl(raw);
    return data.publicUrl;
  } catch {
    return raw;
  }
};

export const formatNum = (num: number) => {
  if (!num && num !== 0) return "0";
  if (num >= 1000000) return (num / 1000000).toFixed(1) + "M";
  if (num >= 1000) return (num / 1000).toFixed(1) + "K";
  return num.toString();
};
