import React, { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter 
} from "@/components/ui/dialog";
import { 
  Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger 
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell, Mail, Phone, Sparkles, CheckCircle2, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface SubscriberCaptureProps {
  articleSlug?: string;
  sourcePlatform?: string;
}

export const SubscriberCapture: React.FC<SubscriberCaptureProps> = ({ articleSlug, sourcePlatform }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [viewType, setViewType] = useState<'drawer' | 'modal'>('drawer');
  const [planType, setPlanType] = useState<'free' | 'paid'>('free');
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const { toast } = useToast();

  // Auto-show after 15 seconds as per user request
  useEffect(() => {
    const timer = setTimeout(() => {
      handleOpen('free');
    }, 15000);
    return () => clearTimeout(timer);
  }, []);

  const handleOpen = (type: 'free' | 'paid') => {
    setPlanType(type);
    setViewType(type === 'free' ? 'drawer' : 'modal');
    setIsOpen(true);
    setSuccess(false);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await (supabase as any).from('portal_subscribers').insert([{
        email: email || null,
        phone: whatsapp || null,
        full_name: name || null,
        plan_type: planType,
        source_platform: sourcePlatform || 'web_portal',
        source_content_id: articleSlug || null
      }]);

      if (error) throw error;

      setSuccess(true);
      toast({ title: "Assinatura confirmada!", description: "Você receberá nossos alertas em breve." });
      
      // Reset form after a few seconds and close
      setTimeout(() => {
        setIsOpen(false);
        setEmail("");
        setWhatsapp("");
        setName("");
      }, 3000);

    } catch (e: any) {
      toast({ 
        title: "Erro ao assinar", 
        description: e.message?.includes('unique') ? "Este contato já está cadastrado!" : "Tente novamente em instantes.", 
        variant: "destructive" 
      });
    } finally {
      setLoading(false);
    }
  };

  const FormContent = () => (
    <form onSubmit={handleSubscribe} className="space-y-4 mt-6">
      {!success ? (
        <>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nome Completo</label>
            <Input 
              required 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Como podemos te chamar?" 
              className="bg-muted/50 border-white/10 h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail</label>
            <Input 
              type="email" 
              required 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="seu@email.com" 
              className="bg-muted/50 border-white/10 h-10 rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">WhatsApp / Celular</label>
            <Input 
              type="tel" 
              value={whatsapp} 
              onChange={(e) => setWhatsapp(e.target.value)} 
              placeholder="(00) 00000-0000" 
              className="bg-muted/50 border-white/10 h-10 rounded-xl"
            />
          </div>
          <Button 
            className={cn(
              "w-full h-12 rounded-xl font-bold gap-2 text-sm transition-all",
              planType === 'paid' ? "bg-primary hover:bg-primary/90" : "bg-slate-900 hover:bg-slate-800"
            )}
            disabled={loading}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            {planType === 'paid' ? "Confirmar Assinatura Premium" : "Quero Receber Alertas Grátis"}
          </Button>
          <p className="text-[9px] text-center text-muted-foreground uppercase tracking-tighter">
            Ao assinar, você concorda com nossos termos e política de privacidade.
          </p>
        </>
      ) : (
        <div className="py-10 text-center flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center animate-bounce">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
          </div>
          <div className="space-y-1">
            <h3 className="font-bold text-lg">Tudo certo, {name.split(' ')[0]}!</h3>
            <p className="text-sm text-muted-foreground">Sua assinatura foi confirmada com sucesso.</p>
          </div>
        </div>
      )}
    </form>
  );

  return (
    <>
      {/* Floating Sino (Bell) Trigger */}
      <div className="fixed bottom-8 left-8 z-50 group">
        <button
          onClick={() => handleOpen('free')}
          className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 flex items-center justify-center hover:scale-110 active:scale-95 transition-all relative"
        >
          <Bell className="w-6 h-6 group-hover:rotate-12 transition-transform" />
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-[10px] font-black flex items-center justify-center rounded-full border-2 border-primary-foreground animate-pulse">
            1
          </span>
        </button>
        <div className="absolute bottom-full left-0 mb-4 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none translate-y-2 group-hover:translate-y-0 duration-300">
          <div className="bg-popover border border-border p-3 rounded-2xl shadow-xl whitespace-nowrap">
            <p className="text-xs font-bold">Ativar Alertas de Inteligência 🚀</p>
          </div>
        </div>
      </div>

      {/* Free Subscription Drawer (Right) */}
      <Sheet open={isOpen && viewType === 'drawer'} onOpenChange={setIsOpen}>
        <SheetContent side="right" className="sm:max-w-md bg-card">
          <SheetHeader className="text-left">
            <div className="p-3 w-fit rounded-2xl bg-primary/10 mb-4">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <SheetTitle className="text-2xl font-black font-display uppercase tracking-tight">Newsletter Gratuita</SheetTitle>
            <SheetDescription className="text-sm">
              Fique por dentro das maiores tendências e escândalos políticos detectados pela nossa IA antes de todo mundo.
            </SheetDescription>
          </SheetHeader>
          <FormContent />
        </SheetContent>
      </Sheet>

      {/* Paid Subscription Modal (Center) */}
      <Dialog open={isOpen && viewType === 'modal'} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md bg-card border-white/5 shadow-2xl">
          <DialogHeader className="text-center flex flex-col items-center">
            <div className="p-4 rounded-[24px] bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/30 mb-4">
              <Sparkles className="w-8 h-8 text-primary-foreground" />
            </div>
            <DialogTitle className="text-2xl font-black font-display uppercase tracking-tight">Acesso Exclusivo Premium</DialogTitle>
            <DialogDescription className="text-sm text-center">
              Receba furos de reportagem, o Radar de Poder e análises de ataques em tempo real diretamente no seu WhatsApp e E-mail.
            </DialogDescription>
          </DialogHeader>
          <FormContent />
        </DialogContent>
      </Dialog>
    </>
  );
};
