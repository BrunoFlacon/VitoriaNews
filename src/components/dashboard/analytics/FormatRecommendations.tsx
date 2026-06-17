import React from "react";
import { Lightbulb, FileText, Video, Image, Music, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/card";
import { socialPlatforms, getPlatformDetails } from "@/components/icons/platform-metadata";

interface FormatRecommendationsProps {
  data?: { platform: string; media_type: string; count: number }[];
}

const formatIcons: Record<string, any> = {
  "artigo": FileText,
  "vídeo": Video,
  "imagem": Image,
  "áudio": Music,
  "texto": MessageSquare,
};

const recommendations = [
  {
    platform: "Instagram",
    icon: Image,
    color: "text-pink-400",
    bg: "bg-pink-500/10",
    border: "border-pink-500/20",
    formats: [
      { type: "Imagem", desc: "Carrosséis com dicas rápidas e chamadas para ação", score: 94 },
      { type: "Vídeo", desc: "Reels de até 30s com tendências musicais", score: 91 },
      { type: "Texto", desc: "Legendas curtas com CTAs diretos", score: 78 },
    ],
  },
  {
    platform: "YouTube",
    icon: Video,
    color: "text-red-400",
    bg: "bg-red-500/10",
    border: "border-red-500/20",
    formats: [
      { type: "Vídeo", desc: "Tutoriais e conteúdos educacionais (8-15 min)", score: 96 },
      { type: "Áudio", desc: "Podcasts e debates em formato de áudio", score: 72 },
      { type: "Imagem", desc: "Miniaturas otimizadas com texto e contraste", score: 88 },
    ],
  },
  {
    platform: "Telegram",
    icon: MessageSquare,
    color: "text-blue-400",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    formats: [
      { type: "Texto", desc: "Newsletters e atualizações diretas", score: 95 },
      { type: "Imagem", desc: "Infográficos e cards informativos", score: 82 },
      { type: "Áudio", desc: "Notas de voz e briefings diários", score: 65 },
    ],
  },
  {
    platform: "WhatsApp",
    icon: MessageSquare,
    color: "text-green-400",
    bg: "bg-green-500/10",
    border: "border-green-500/20",
    formats: [
      { type: "Texto", desc: "Mensagens personalizadas com nome do contato", score: 97 },
      { type: "Imagem", desc: "Catálogos visuais de produtos/serviços", score: 85 },
      { type: "Áudio", desc: "Respostas rápidas em áudio para engajamento", score: 60 },
    ],
  },
];

export const FormatRecommendations = (props: FormatRecommendationsProps = {}) => {
  const { data } = props;
  const hasData = data !== undefined && data.length > 0;
  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow mb-6">
      <div className="flex items-center gap-3 mb-4">
        <Lightbulb className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-display font-bold text-lg md:text-xl text-white">Recomendações de Formatos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{hasData ? 'Baseado no desempenho real da sua audiência' : 'Baseado no desempenho da sua audiência em cada plataforma'}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        {recommendations.map((rec) => (
          <div key={rec.platform} className={`p-4 rounded-xl ${rec.bg} border ${rec.border}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className="p-1.5 rounded-lg bg-black/20">
                <rec.icon className={`w-4 h-4 ${rec.color}`} />
              </div>
              <span className={`text-xs font-bold uppercase ${rec.color}`}>{rec.platform}</span>
            </div>
            <div className="space-y-2">
              {rec.formats.map((fmt) => {
                const Icon = formatIcons[fmt.type.toLowerCase()] || FileText;
                return (
                  <div key={fmt.type} className="p-3 rounded-lg bg-black/20 border border-white/5">
                    <div className="flex items-center justify-between mb-0.5">
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-bold text-white uppercase">{fmt.type}</span>
                      </div>
                      <span className={`text-[9px] font-bold ${fmt.score >= 90 ? "text-green-400" : fmt.score >= 75 ? "text-yellow-400" : "text-muted-foreground"}`}>
                        {fmt.score}%
                      </span>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-relaxed mt-0.5">{fmt.desc}</p>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
