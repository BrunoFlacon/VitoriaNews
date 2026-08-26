import React, { useState } from "react";
import { BarChart3, TrendingUp, Eye, MousePointerClick, Award, Youtube, Instagram, Facebook, Music, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/SafeImage";
import { resolveMediaUrl } from "@/config/serverConfig";

interface CoverPerformanceItem {
  id: string;
  title: string;
  platform: string;
  coverUrl: string;
  impressions: number;
  clicks: number;
  ctr: number; // Percentage
  mediaType: "video" | "live" | "short" | "audio";
}

const MOCK_COVER_PERFORMANCE: CoverPerformanceItem[] = [
  {
    id: "1",
    title: "Entrevista Exclusiva: Eleições 2026",
    platform: "youtube",
    coverUrl: resolveMediaUrl("/storage/v1/object/public/profile-photos/facebook/106917862467761.jpg"),
    impressions: 45200,
    clicks: 5880,
    ctr: 13.01,
    mediaType: "video"
  },
  {
    id: "2",
    title: "Live ao Vivo: Cobertura Especial Tupã",
    platform: "youtube",
    coverUrl: resolveMediaUrl("/storage/v1/object/public/profile-photos/facebook/106015418265600.jpg"),
    impressions: 28900,
    clicks: 4200,
    ctr: 14.53,
    mediaType: "live"
  },
  {
    id: "3",
    title: "Podcast Web Rádio #42 - Bastidores da Notícia",
    platform: "spotify",
    coverUrl: resolveMediaUrl("/storage/v1/object/public/profile-photos/facebook/323348644425052.png"),
    impressions: 18400,
    clicks: 3100,
    ctr: 16.85,
    mediaType: "audio"
  },
  {
    id: "4",
    title: "Reels Giro de Notícias da Semana",
    platform: "instagram",
    coverUrl: resolveMediaUrl("/storage/v1/object/public/profile-photos/instagram/17841449150065487.jpg"),
    impressions: 62000,
    clicks: 7440,
    ctr: 12.00,
    mediaType: "short"
  }
];

export const CoverAnalyticsView: React.FC = () => {
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const filteredItems = MOCK_COVER_PERFORMANCE.filter((item) => {
    if (selectedFilter === "all") return true;
    return item.mediaType === selectedFilter || item.platform === selectedFilter;
  });

  const totalImpressions = filteredItems.reduce((acc, curr) => acc + curr.impressions, 0);
  const totalClicks = filteredItems.reduce((acc, curr) => acc + curr.clicks, 0);
  const avgCtr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card/60 p-6 border border-border/60">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BarChart3 className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-black tracking-tight text-foreground">
              Desempenho Visual & CTR de Capas
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Acompanhe a taxa de cliques (CTR) e o engajamento gerado por cada capa criada nas redes sociais e podcasts.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1 bg-primary/10 border-primary/20 text-primary font-bold">
            Telemetria Ativa
          </Badge>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card/50 p-5 border border-border/60 flex items-center gap-4">
          <div className="p-3 bg-blue-500/10 text-blue-500">
            <Eye className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Impressões de Capas</p>
            <p className="text-2xl font-black text-foreground font-mono">{totalImpressions.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-card/50 p-5 border border-border/60 flex items-center gap-4">
          <div className="p-3 bg-green-500/10 text-green-500">
            <MousePointerClick className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Cliques Convertidos</p>
            <p className="text-2xl font-black text-foreground font-mono">{totalClicks.toLocaleString('pt-BR')}</p>
          </div>
        </div>

        <div className="bg-card/50 p-5 border border-border/60 flex items-center gap-4">
          <div className="p-3 bg-yellow-500/10 text-yellow-500">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">Média de CTR (Taxa de Clique)</p>
            <p className="text-2xl font-black text-foreground font-mono">{avgCtr.toFixed(2)}%</p>
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 text-muted-foreground shrink-0" />
        {["all", "video", "live", "short", "audio", "spotify"].map((f) => (
          <Button
            key={f}
            variant={selectedFilter === f ? "default" : "ghost"}
            size="sm"
            onClick={() => setSelectedFilter(f)}
            className="text-xs font-bold uppercase tracking-wider h-8 px-4"
          >
            {f === "all" ? "Todas as Capas" : f}
          </Button>
        ))}
      </div>

      {/* Covers Performance Table */}
      <div className="bg-card/40 border border-border/60 overflow-hidden">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <p className="text-xs font-black uppercase tracking-wider text-muted-foreground">
            Ranking de Capas por Conversão (CTR)
          </p>
        </div>
        <div className="divide-y divide-border/60">
          {filteredItems.map((item, idx) => (
            <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4 min-w-0">
                <span className="text-xs font-black text-muted-foreground w-6 font-mono">#{idx + 1}</span>
                <div className="w-16 h-12 overflow-hidden border border-border shrink-0 bg-muted">
                  <SafeImage src={item.coverUrl} alt={item.title} className="w-full h-full object-cover" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{item.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-[9px] font-black uppercase">
                      {item.platform}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground uppercase">{item.mediaType}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-6 shrink-0">
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Impressões</p>
                  <p className="text-sm font-bold text-foreground font-mono">{item.impressions.toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-black uppercase text-muted-foreground">Cliques</p>
                  <p className="text-sm font-bold text-foreground font-mono">{item.clicks.toLocaleString('pt-BR')}</p>
                </div>
                <div className="text-right bg-primary/10 px-3 py-1.5 border border-primary/20">
                  <p className="text-[9px] font-black uppercase text-primary">CTR</p>
                  <p className="text-base font-black text-primary font-mono">{item.ctr.toFixed(2)}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
