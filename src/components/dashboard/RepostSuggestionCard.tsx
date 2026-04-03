import { Repeat, ChevronRight, Check, X, Pencil, Globe } from "lucide-react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { platformMetadata } from "@/components/icons/platform-metadata";
import { RepostSuggestion } from "@/lib/social-sdk/types";

interface RepostSuggestionCardProps {
  suggestion: RepostSuggestion;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onEdit: (id: string) => void;
}

export const RepostSuggestionCard = ({ suggestion, onApprove, onReject, onEdit }: RepostSuggestionCardProps) => {
  const getPlatformIcon = (platformId: string) => {
    const meta = platformMetadata[platformId.toLowerCase()];
    return meta ? <meta.icon className="w-5 h-5" style={{ color: meta.color }} /> : <Globe className="w-5 h-5" />;
  };

  return (
    <Card className="bg-card/50 border-white/5 hover:border-primary/20 transition-all group overflow-hidden relative shadow-2xl shadow-black/40">
      <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="pb-3 border-b border-white/5 relative z-10">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 rounded-xl bg-white/5 flex items-center justify-center border border-white/10 shadow-lg group-hover:bg-primary/10 transition-colors">
               <Repeat className="w-5 h-5 text-primary animate-pulse" />
             </div>
             <div>
               <CardTitle className="text-sm font-black text-white uppercase tracking-tight">Auto-Republicação</CardTitle>
               <span className="text-[10px] text-muted-foreground uppercase font-black tracking-widest flex items-center gap-1 mt-0.5">
                  Detectado post de alta performance
               </span>
             </div>
          </div>
          <Badge variant="outline" className="text-[10px] uppercase font-black border-primary/30 text-primary">IA-Auditado</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4 pb-4 relative z-10">
        <div className="space-y-4">
           <div className="flex items-center gap-3 px-4 py-2 bg-black/40 rounded-xl border border-white/5 shadow-inner">
              <div className="flex -space-x-2">
                 <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-white/10 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                 </div>
                 <div className="w-7 h-7 rounded-lg bg-primary/20 border border-white/10 flex items-center justify-center text-primary">
                    <ChevronRight className="w-4 h-4 ml-1" />
                 </div>
                 <div className="w-7 h-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center">
                    {getPlatformIcon(suggestion.target_platform)}
                 </div>
              </div>
              <span className="text-xs font-black uppercase text-white tracking-widest">
                Para: {suggestion.target_platform}
              </span>
           </div>

           <div className="bg-black/30 rounded-xl p-4 border border-indigo-500/10 italic text-sm text-indigo-50/80 leading-relaxed shadow-lg">
             "{suggestion.suggested_content}"
           </div>
        </div>
      </CardContent>
      <CardFooter className="flex gap-2 justify-end pt-2 border-t border-white/5 bg-black/20 relative z-10">
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-[10px] font-black uppercase h-8 hover:bg-red-500/10 hover:text-red-400 group/btn" 
          onClick={() => onReject(suggestion.id)}
        >
          <X className="w-3 h-3 mr-1 group-hover/btn:scale-110" /> Rejeitar
        </Button>
        <Button 
          variant="outline" 
          size="sm" 
          className="text-[10px] font-black uppercase h-8 border-white/10 hover:border-primary/50 group/btn" 
          onClick={() => onEdit(suggestion.id)}
        >
          <Pencil className="w-3 h-3 mr-1 group-hover/btn:rotate-12" /> Editar
        </Button>
        <Button 
          size="sm" 
          className="text-[10px] font-black uppercase h-8 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20 group/btn" 
          onClick={() => onApprove(suggestion.id)}
        >
          <Check className="w-3 h-3 mr-1 group-hover/btn:scale-110" /> Publicar Agora
        </Button>
      </CardFooter>
    </Card>
  );
};
