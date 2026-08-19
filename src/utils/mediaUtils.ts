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

export const encodeStoragePath = (path: string): string => {
  if (!path) return "";
  return path
    .split('/')
    .map(seg => encodeURIComponent(decodeURIComponent(seg)))
    .join('/');
};

export const getMediaUrl = (raw: string, defaultBucket: string = "media") => {
  if (!raw) return "";

  // 1. Tratar imediatamente URLs /object/sign/ ou /object/authenticated/ e converter para /object/public/ sem token expirado
  if (raw.includes("/object/sign/") || raw.includes("/object/authenticated/")) {
    return raw
      .replace("/object/sign/", "/object/public/")
      .replace("/object/authenticated/", "/object/public/")
      .split('?')[0];
  }

  // 2. URLs com token= em buckets públicos -> remover o parâmetro ?token=... expirado
  if (raw.includes("supabase.co/storage/") && raw.includes("token=")) {
    return raw.replace("/object/sign/", "/object/public/").split('?')[0];
  }

  // URLs absolutas, blobs, data URIs e proxies
  if (
    raw.startsWith("http://") || 
    raw.startsWith("https://") || 
    raw.startsWith("blob:") || 
    raw.startsWith("data:") || 
    raw.startsWith("/api/")
  ) {
    try {
      const url = new URL(raw);
      url.pathname = url.pathname.split('/').map(s => encodeURIComponent(decodeURIComponent(s))).join('/');
      return url.toString();
    } catch {
      return raw;
    }
  }

  // Caminhos de proxy local já formatados
  if (raw.startsWith("/supabase/") || raw.startsWith("/storage/")) {
    return raw;
  }

  // Tratar URLs /object/public/
  if (raw.includes("/object/public/")) {
    return raw.split('?')[0];
  }

  // Remover prefixo de bucket duplicado se já estiver no início do caminho
  let cleanPath = raw.trim();
  let targetBucket = defaultBucket;

  if (cleanPath.startsWith("media/")) {
    cleanPath = cleanPath.slice(6);
    targetBucket = "media";
  } else if (cleanPath.startsWith("documents/")) {
    cleanPath = cleanPath.slice(10);
    targetBucket = "documents";
  }

  const encodedPath = encodeStoragePath(cleanPath);

  try {
    const { data } = supabase.storage.from(targetBucket).getPublicUrl(encodedPath);
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

export const fileOrUrlToBase64 = async (fileObj?: File, url?: string): Promise<string> => {
  if (fileObj) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(fileObj);
    });
  }
  if (url) {
    if (url.startsWith("data:image")) return url;
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
        reader.readAsDataURL(blob);
      });
    } catch {
      return url;
    }
  }
  return "";
};
