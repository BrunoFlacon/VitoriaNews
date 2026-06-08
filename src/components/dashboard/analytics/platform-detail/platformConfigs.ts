import { getPlatformDetails } from "@/components/icons/platform-metadata";

export interface KpiDefinition {
  key: string;
  label: string;
  format: "number" | "percent" | "duration";
  tooltip: string;
}

const platformKpis: Record<string, KpiDefinition[]> = {
  facebook: [
    { key: "followers", label: "Seguidores", format: "number", tooltip: "Total de seguidores da página" },
    { key: "reach", label: "Alcance", format: "number", tooltip: "Pessoas alcançadas no período" },
    { key: "engagement", label: "Engajamento", format: "number", tooltip: "Interações totais (curtidas + comentários + compartilhamentos)" },
    { key: "engagementRate", label: "Taxa de Eng.", format: "percent", tooltip: "Engajamento / Alcance × 100" },
  ],
  instagram: [
    { key: "followers", label: "Seguidores", format: "number", tooltip: "Total de seguidores" },
    { key: "reach", label: "Alcance", format: "number", tooltip: "Contas únicas alcançadas" },
    { key: "profileVisits", label: "Visitas ao Perfil", format: "number", tooltip: "Visitas ao perfil no período" },
    { key: "engagementRate", label: "Taxa de Eng.", format: "percent", tooltip: "Engajamento / Alcance × 100" },
  ],
  youtube: [
    { key: "subscribers", label: "Inscritos", format: "number", tooltip: "Total de inscritos no canal" },
    { key: "views", label: "Visualizações", format: "number", tooltip: "Total de visualizações no período" },
    { key: "watchTime", label: "Tempo Assistido", format: "duration", tooltip: "Minutos assistidos no período" },
    { key: "avgViewDuration", label: "Duração Média", format: "duration", tooltip: "Tempo médio de exibição por vídeo" },
  ],
  twitter: [
    { key: "followers", label: "Seguidores", format: "number", tooltip: "Total de seguidores" },
    { key: "tweets", label: "Posts", format: "number", tooltip: "Total de posts no período" },
    { key: "impressions", label: "Impressões", format: "number", tooltip: "Impressões totais dos posts" },
    { key: "engagementRate", label: "Taxa de Eng.", format: "percent", tooltip: "Engajamento / Impressões × 100" },
  ],
  tiktok: [
    { key: "followers", label: "Seguidores", format: "number", tooltip: "Total de seguidores" },
    { key: "views", label: "Visualizações", format: "number", tooltip: "Visualizações totais no período" },
    { key: "likes", label: "Curtidas", format: "number", tooltip: "Total de curtidas no período" },
    { key: "engagementRate", label: "Taxa de Eng.", format: "percent", tooltip: "Engajamento / Visualizações × 100" },
  ],
  linkedin: [
    { key: "followers", label: "Seguidores", format: "number", tooltip: "Total de seguidores da página" },
    { key: "impressions", label: "Impressões", format: "number", tooltip: "Impressões totais no período" },
    { key: "clicks", label: "Cliques", format: "number", tooltip: "Cliques no período" },
    { key: "engagementRate", label: "Taxa de Eng.", format: "percent", tooltip: "Engajamento / Impressões × 100" },
  ],
  threads: [
    { key: "followers", label: "Seguidores", format: "number", tooltip: "Total de seguidores" },
    { key: "posts", label: "Threads", format: "number", tooltip: "Total de threads no período" },
    { key: "likes", label: "Curtidas", format: "number", tooltip: "Total de curtidas no período" },
    { key: "engagementRate", label: "Taxa de Eng.", format: "percent", tooltip: "Engajamento por post" },
  ],
  whatsapp: [
    { key: "members", label: "Membros", format: "number", tooltip: "Total de membros nos canais/grupos" },
    { key: "messagesSent", label: "Mensagens Enviadas", format: "number", tooltip: "Mensagens enviadas no período" },
    { key: "messagesDelivered", label: "Entregues", format: "number", tooltip: "Mensagens entregues com sucesso" },
    { key: "successRate", label: "Taxa de Sucesso", format: "percent", tooltip: "Entrega / Envio × 100" },
  ],
  telegram: [
    { key: "members", label: "Membros", format: "number", tooltip: "Total de membros nos canais/grupos" },
    { key: "messagesSent", label: "Mensagens Enviadas", format: "number", tooltip: "Mensagens enviadas no período" },
    { key: "messagesDelivered", label: "Entregues", format: "number", tooltip: "Mensagens entregues com sucesso" },
    { key: "successRate", label: "Taxa de Sucesso", format: "percent", tooltip: "Entrega / Envio × 100" },
  ],
};

export function getKpisForPlatform(platformId: string): KpiDefinition[] {
  return platformKpis[platformId] || platformKpis.facebook;
}

export function getPlatformColor(platformId: string): string {
  const meta = getPlatformDetails(platformId);
  return meta?.color || "bg-primary";
}

export function getPlatformTextColor(platformId: string): string {
  const meta = getPlatformDetails(platformId);
  return meta?.textColor || "text-foreground";
}

export function getPlatformName(platformId: string): string {
  const meta = getPlatformDetails(platformId);
  return meta?.name || platformId;
}

export { getPlatformDetails };
