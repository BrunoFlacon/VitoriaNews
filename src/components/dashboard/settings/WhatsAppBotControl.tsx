import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { FileText, MessageSquare, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppBotControlProps {
  waMetadata: any;
  localBotActive: boolean | null;
  handleToggleBot: (checked: boolean) => void;
  botPosts: number;
  botAnswers: number;
}

export const WhatsAppBotControl = ({
  waMetadata,
  localBotActive,
  handleToggleBot,
  botPosts,
  botAnswers
}: WhatsAppBotControlProps) => {
  const isBotOn = localBotActive !== null ? localBotActive : waMetadata.is_active === true;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-green-500/5 p-5 rounded-[22px] border border-green-500/10 shadow-xl transition-all hover:bg-green-500/10 group animate-in fade-in slide-in-from-top-2">
      <div className="flex items-center gap-6 flex-1 min-w-0">
        <div className="relative">
          <Avatar className="w-16 h-16 rounded-2xl border-[3px] border-[#151726]/30 shadow-xl flex-shrink-0 transition-transform group-hover:scale-105 bg-green-500/20">
            <AvatarImage src="/bot-avatar.png" alt="Perfil do RobÃ´" className="object-cover" />
            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 text-xl font-bold text-green-500">
              RT
            </AvatarFallback>
          </Avatar>
          <div className="absolute -bottom-1 -right-1 bg-green-500 w-3 h-3 rounded-full border-2 border-[#151726] shadow-sm animate-pulse" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2">
            <p className="font-black text-[17px] text-white tracking-tight">RobÃ´ Bot_Zap</p>
            <Badge className={cn(
              "text-[8px] font-black uppercase tracking-tighter",
              isBotOn ? "bg-green-500/20 text-green-500 border-green-500/30" : "bg-red-500/20 text-red-500 border-red-500/30"
            )}>
              {isBotOn ? "Ativo" : "Pausado"}
            </Badge>
          </div>

          <div className="flex items-center gap-10">
            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Posts do Bot
              </span>
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-green-500/80" />
                <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{botPosts.toLocaleString('pt-BR', { minimumIntegerDigits: 2 })}</span>
              </div>
            </div>

            <div className="w-px h-8 bg-white/5" />

            <div className="flex flex-col gap-0.5">
              <span className="text-[8px] font-black uppercase tracking-[0.2em] text-slate-500">
                Total de Respostas
              </span>
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-green-500/80" />
                <span className="text-[17px] font-black text-white/90 font-mono tracking-tighter">{botAnswers.toLocaleString('pt-BR', { minimumIntegerDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2 items-center justify-center p-2 bg-[#151726]/40 rounded-2xl border border-white/5 min-w-[100px]">
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{isBotOn ? 'LIGADO' : 'DESLIGADO'}</span>
        <Switch
          checked={isBotOn}
          onCheckedChange={handleToggleBot}
          className="data-[state=checked]:bg-green-500"
        />
      </div>
    </div>
  );
};
