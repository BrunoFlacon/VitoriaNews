import { AlertTriangle, Check, X, ShieldAlert, Zap, Globe } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { platformMetadata } from "@/components/icons/platform-metadata";

interface RepostConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  onEdit: () => void;
  platform: string;
  content: string;
}

export const RepostConfirmationModal = ({ isOpen, onClose, onConfirm, onEdit, platform, content }: RepostConfirmationModalProps) => {
  const meta = platformMetadata[platform.toLowerCase()];
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#0a0a0b] border-white/10 shadow-2xl overflow-hidden glassmorphism">
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent" />
        
        <DialogHeader className="pt-4 pb-2">
           <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
                 <ShieldAlert className="w-5 h-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-black text-white uppercase tracking-tight">Confirmar Publicação Cruzada</DialogTitle>
           </div>
           <DialogDescription className="text-muted-foreground text-sm font-medium uppercase tracking-widest leading-relaxed">
             O sistema detectou uma oportunidade de crescimento viral. Deseja publicar este conteúdo agora?
           </DialogDescription>
        </DialogHeader>

        <div className="py-6 space-y-6">
           <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <Globe className="w-3 h-3" /> Plataforma de Destino
              </span>
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/10 shadow-inner group transition-all hover:bg-white/10">
                 <div className="p-2 rounded-lg bg-black/40 border border-white/5">
                   {meta ? <meta.icon className="w-5 h-5" style={{ color: meta.color }} /> : <Zap className="w-5 h-5" />}
                 </div>
                 <div>
                    <span className="text-sm font-black text-white uppercase tracking-tighter">{platform} Account</span>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Conexão Ativa & Validada</p>
                 </div>
              </div>
           </div>

           <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2">
                <Zap className="w-3 h-3 text-yellow-500" /> Prévia do Conteúdo
              </span>
              <div className="bg-black/60 rounded-xl p-4 border border-white/5 shadow-2xl relative">
                 <div className="absolute -top-2 -right-2">
                    <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30 text-[9px] font-black uppercase tracking-widest">IA Sugestão</Badge>
                 </div>
                 <p className="text-sm text-white/90 leading-relaxed italic border-l-2 border-primary/30 pl-4">
                   "{content}"
                 </p>
              </div>
           </div>

           <div className="flex items-start gap-3 p-3 bg-red-500/5 border border-red-500/20 rounded-xl">
              <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
              <p className="text-[10px] text-red-100 font-bold uppercase tracking-widest leading-relaxed">
                Aviso: Esta ação é irreversível após a publicação. Certifique-se de que o conteúdo condiz com a voz da sua marca.
              </p>
           </div>
        </div>

        <DialogFooter className="grid grid-cols-3 gap-2 pb-2">
           <Button variant="ghost" className="text-xs font-black uppercase tracking-widest border border-white/5 hover:bg-red-500/10 hover:text-red-400 group h-12" onClick={onClose}>
             <X className="w-3 h-3 mr-1 group-hover:scale-110" /> Rejeitar
           </Button>
           <Button variant="outline" className="text-xs font-black uppercase tracking-widest border-white/10 hover:border-primary/50 group h-12" onClick={onEdit}>
             <ShieldAlert className="w-3 h-3 mr-1 group-hover:rotate-12" /> Editar
           </Button>
           <Button className="text-xs font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 group h-12" onClick={onConfirm}>
             <Check className="w-3 h-3 mr-1 group-hover:scale-110" /> Publicar
           </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
