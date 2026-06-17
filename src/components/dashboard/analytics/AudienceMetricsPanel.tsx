import React from "react";
import {
  Users,
  MessageCircle,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  Globe,
  BarChart3,
  Activity,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";

interface PostStatusCounts {
  published: number;
  draft: number;
  scheduled: number;
  failed: number;
}

interface AudienceMetricsPanelProps {
  totalSocialFollowers: number;
  totalMessagingMembers: number;
  totalPosts: number;
  connectedPlatforms: string[];
  postStatusCounts: PostStatusCounts | null;
  messageSuccessRate: number;
  messageTotalSent: number;
  messageTotalFailed: number;
}

export const AudienceMetricsPanel = ({
  totalSocialFollowers,
  totalMessagingMembers,
  totalPosts,
  connectedPlatforms,
  postStatusCounts,
  messageSuccessRate,
  messageTotalSent,
  messageTotalFailed,
}: AudienceMetricsPanelProps) => {
  const knownPlatformIds = new Set(socialPlatforms.map(p => p.id));
  const validPlatforms = connectedPlatforms.filter(p => knownPlatformIds.has(p));
  const hasData = totalSocialFollowers > 0 || totalMessagingMembers > 0 || validPlatforms.length > 0;
  if (!hasData) {
    return (
      <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow mb-6 min-h-[120px] flex items-center justify-center">
        <div className="text-center">
          <BarChart3 className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Nenhum dado de audiência disponível</p>
          <p className="text-xs text-muted-foreground/50 mt-1">Conecte plataformas para ver métricas</p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow mb-6 min-h-[120px]">
      <div className="flex items-center gap-3 mb-4">
        <BarChart3 className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-display font-bold text-lg md:text-xl text-white">Métricas da Audiência</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Dados consolidados de todas as plataformas conectadas</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <MetricCard
          icon={Users}
          label="Seguidores Redes"
          value={totalSocialFollowers.toLocaleString()}
          sublabel="Redes sociais"
        />
        <MetricCard
          icon={MessageCircle}
          label="Membros Mensageria"
          value={totalMessagingMembers.toLocaleString()}
          sublabel="Canais e grupos"
        />
        <MetricCard
          icon={Globe}
          label="Plataformas"
          value={String(validPlatforms.length)}
          sublabel={validPlatforms.length > 0 ? validPlatforms.map(p => p.charAt(0).toUpperCase() + p.slice(1)).join(", ") : "Nenhuma"}
        />
        <MetricCard
          icon={FileText}
          label="Total de Posts"
          value={totalPosts.toLocaleString()}
          sublabel="Conteúdo publicado"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <div className="p-4 rounded-xl bg-card border border-border/50">
          <h4 className="text-xs text-muted-foreground uppercase font-bold mb-3 flex items-center gap-2">
            <Activity className="w-3 h-3 text-primary" />
            Status das Mensagens
          </h4>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-green-400" />
                <span className="text-xs text-muted-foreground">Enviadas</span>
              </div>
              <span className="text-sm font-bold text-white">{messageTotalSent.toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <XCircle className="w-3.5 h-3.5 text-red-400" />
                <span className="text-xs text-muted-foreground">Falhas</span>
              </div>
              <span className="text-sm font-bold text-white">{messageTotalFailed.toLocaleString()}</span>
            </div>
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">Taxa de Sucesso</span>
                <Badge variant="outline" className={cn(
                  "text-xs font-bold px-2 py-0.5",
                  messageSuccessRate >= 80 ? "border-green-500/30 text-green-400" :
                  messageSuccessRate >= 50 ? "border-yellow-500/30 text-yellow-400" :
                  "border-red-500/30 text-red-400"
                )}>
                  {messageSuccessRate.toFixed(1)}%
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-card border border-border/50">
          <h4 className="text-xs text-muted-foreground uppercase font-bold mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3 text-primary" />
            Status dos Posts
          </h4>
          <div className="grid grid-cols-2 gap-2">
            <StatusBox label="Publicados" value={postStatusCounts?.published ?? 0} color="text-green-400" bg="bg-green-500/10" />
            <StatusBox label="Rascunhos" value={postStatusCounts?.draft ?? 0} color="text-yellow-400" bg="bg-yellow-500/10" />
            <StatusBox label="Agendados" value={postStatusCounts?.scheduled ?? 0} color="text-blue-400" bg="bg-blue-500/10" />
            <StatusBox label="Falhas" value={postStatusCounts?.failed ?? 0} color="text-red-400" bg="bg-red-500/10" />
          </div>
        </div>
      </div>
    </Card>
  );
};

const MetricCard = ({ icon: Icon, label, value, sublabel }: { icon: any; label: string; value: string; sublabel: string }) => (
  <div className="p-4 rounded-xl bg-card border border-border/50 hover:bg-muted/20 transition-colors group">
    <div className="flex items-start justify-between mb-2">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
    </div>
    <p className="text-xl font-bold text-white mb-0.5">{value}</p>
    <p className="text-[10px] font-bold text-muted-foreground uppercase">{label}</p>
    {sublabel && (
      <p className="text-[8px] text-muted-foreground/50 mt-1 truncate">{sublabel}</p>
    )}
  </div>
);

const StatusBox = ({ label, value, color, bg }: { label: string; value: number; color: string; bg: string }) => (
  <div className={`p-3 rounded-xl ${bg} border border-border/50 text-center`}>
    <p className={`text-lg font-bold ${color}`}>{value.toLocaleString()}</p>
    <p className="text-[8px] font-bold text-muted-foreground mt-0.5 uppercase">{label}</p>
  </div>
);
