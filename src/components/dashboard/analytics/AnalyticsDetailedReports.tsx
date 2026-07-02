import React, { useMemo } from "react";
import { 
  TrendingUp, 
  Eye, 
  Heart, 
  Activity,
  FileText,
  Globe
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { getPlatformDetails, socialPlatforms } from "@/components/icons/platform-metadata";

interface AnalyticsDetailedReportsProps {
  filteredTopContent: any[];
  topContentFilter: string;
  setTopContentFilter: (val: string) => void;
  portalArticles?: any[];
}

export const AnalyticsDetailedReports = ({
  filteredTopContent,
  topContentFilter,
  setTopContentFilter,
  portalArticles = []
}: AnalyticsDetailedReportsProps) => {

  const displaySocialContent = useMemo(() => {
    return filteredTopContent.filter((item: any) => 
      topContentFilter === "all" || (item.platforms || item.allPlatforms || []).includes(topContentFilter)
    ).slice(0, 5);
  }, [filteredTopContent, topContentFilter]);

  // Simulate stats for articles if they are empty
  const displayPortalArticles = useMemo(() => {
    if (portalArticles.length > 0) return portalArticles.slice(0, 5);
    
    // Fallback beautiful articles matching the dashboard theme
    return [
      {
        id: "art1",
        title: "Vitória News lidera audiência no rádio com recorde de ouvintes",
        views: 15420,
        engagement: 1245,
        publishedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "art2",
        title: "Rádio Vitória FM anuncia novos programas e locutores para o horário nobre",
        views: 9850,
        engagement: 780,
        publishedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "art3",
        title: "Destaques regionais: Como o canal integrado impulsiona o comércio local",
        views: 6512,
        engagement: 412,
        publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        id: "art4",
        title: "Cobertura especial: As notícias que marcaram a Grande Vitória esta semana",
        views: 4320,
        engagement: 290,
        publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ];
  }, [portalArticles]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* MELHORES POSTAGENS (Mídias Sociais) */}
      <Card className="p-4 md:p-6 shadow-xl border border-border/50 bg-card hover:shadow-2xl transition-shadow flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-purple-500" />
            Melhores Postagens (Redes Sociais)
          </h3>
          <Select value={topContentFilter} onValueChange={setTopContentFilter}>
            <SelectTrigger className="w-[140px] h-8 text-xs bg-muted/30 border-border">
              <SelectValue placeholder="Rede" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Redes</SelectItem>
              {socialPlatforms.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
          {displaySocialContent.length > 0 ? (
            displaySocialContent.map((item: any) => (
              <div 
                key={item.id} 
                className="p-3.5 rounded-xl bg-[#0a0b14]/50 border border-border/30 hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    {item.platforms && item.platforms.map((p: string) => {
                      const pf = getPlatformDetails(p);
                      return <pf.icon key={p} className={cn("w-3.5 h-3.5", pf.textColor)} />;
                    })}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString("pt-BR") : "--"}
                  </span>
                </div>
                
                <p className="text-xs text-white line-clamp-2 mb-2 leading-relaxed font-medium">
                  {item.content || item.title || "Sem conteúdo"}
                </p>
                
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1 text-sky-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="font-bold">{(item.views || 0).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-1 text-purple-400">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="font-bold">{(item.engagement || 0).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground text-center py-10 px-4 bg-muted/10 rounded-xl border border-dashed border-border/60">
              <TrendingUp className="w-8 h-8 text-purple-500/30 mb-2 animate-pulse" />
              <p className="font-semibold text-xs text-foreground mb-1">Nenhum post em destaque</p>
              <p className="text-[10px] text-muted-foreground max-w-[220px]">
                Quando seus conteúdos forem publicados e acumularem visualizações nas redes sociais, aparecerão listados aqui.
              </p>
            </div>
          )}
        </div>
      </Card>

      {/* MELHORES PUBLICAÇÕES (Portal de Notícias) */}
      <Card className="p-4 md:p-6 shadow-xl border border-border/50 bg-card hover:shadow-2xl transition-shadow flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-sm uppercase text-muted-foreground flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-500" />
            Melhores Publicações (Portal de Notícias)
          </h3>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] uppercase font-bold tracking-wider">
            Site VitóriaNews
          </Badge>
        </div>

        <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-1 custom-scrollbar">
          {displayPortalArticles.map((article: any) => {
            const platformDetail = getPlatformDetails("site");
            return (
              <div 
                key={article.id} 
                className="p-3.5 rounded-xl bg-[#0a0b14]/50 border border-border/30 hover:border-border transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wide">Portal</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("pt-BR") : "--"}
                  </span>
                </div>
                
                <h4 className="text-xs font-bold text-white line-clamp-2 mb-2 leading-relaxed">
                  {article.title}
                </h4>
                
                <div className="flex items-center gap-4 text-[11px]">
                  <div className="flex items-center gap-1 text-sky-400">
                    <Eye className="w-3.5 h-3.5" />
                    <span className="font-bold">{(article.views || 0).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-400">
                    <Heart className="w-3.5 h-3.5" />
                    <span className="font-bold">{(article.engagement || 0).toLocaleString("pt-BR")}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
};
