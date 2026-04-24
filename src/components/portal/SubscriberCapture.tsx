import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { CheckCircle2, Send, Loader2, Bell, Sparkles, ArrowRight, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { useSystem } from "@/contexts/SystemContext";
import { motion } from "framer-motion";

interface SubscriberCaptureProps {
  planType?: 'free' | 'paid';
  onSuccess?: () => void;
  triggerLabel?: string;
  showTrigger?: boolean;
  showFloating?: boolean;
  triggerClassName?: string;
  children?: React.ReactNode;
}

export const SubscriberCapture = ({ 
  planType: initialPlan = 'free', 
  onSuccess, 
  triggerLabel, 
  showTrigger = false, 
  showFloating = true,
  triggerClassName,
  children
}: SubscriberCaptureProps) => {
  const { toast } = useToast();
  const { settings } = useSystem();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [planType, setPlanType] = useState(initialPlan);
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  
  const [planDuration, setPlanDuration] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [messengerPref, setMessengerPref] = useState<'whatsapp' | 'telegram'>('whatsapp');

  const handleOpen = (type: 'free' | 'paid') => {
    setPlanType(type);
    setOpen(true);
  };

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const { error } = await (supabase as any).from('portal_subscribers').insert([{
        email: email || `${whatsapp}@vitoria.net`,
        phone: whatsapp || null,
        full_name: name || null,
        plan_type: planType === 'paid' ? 'paid_sub' : 'lead',
        metadata: { plan_duration: planDuration, preferred_messenger: messengerPref }
      }]);

      if (error) throw error;
      
      // Save preference to localStorage for Footer/Support access
      localStorage.setItem('vitoria_messenger_pref', messengerPref);

      setSuccess(true);
      toast({ title: "Bem-vindo à Elite!", description: "Sua assinatura foi confirmada." });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({ title: "Erro na assinatura", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showTrigger && (
        <button
          onClick={() => handleOpen(planType)}
          className={cn(
            !children && "bg-yellow-400 text-black font-black uppercase text-[10px] px-8 py-4 rounded-full transition-all hover:scale-105 active:scale-95",
            triggerClassName
          )}
        >
          {children || triggerLabel || (planType === 'paid' ? 'Assine Já!' : 'Inscrever-se')}
        </button>
      )}

      {showFloating && (
        <div className="fixed bottom-12 right-12 z-50 flex flex-col items-end gap-4">
          <button
            onClick={() => handleOpen('paid')}
            className={cn(
              "bg-yellow-400 text-black font-black uppercase text-[10px] px-6 py-3.5 rounded-xl shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:scale-105 active:scale-95 transition-all tracking-widest flex items-center gap-2 group border-b-2 border-yellow-600",
              triggerClassName
            )}
          >
            <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" /> {triggerLabel || "Assinar Agora"}
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-[#0A0F1E] border-white/5 rounded-[2rem] shadow-2xl p-0 overflow-hidden text-white">
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow-400 via-primary to-yellow-400" />
          <div className="p-8">
            <DialogHeader className="space-y-2">
              <DialogTitle className="text-2xl font-display font-black uppercase tracking-tighter">
                {planType === 'paid' ? "Seja um Assinante VIP" : "Alertas Web Rádio Vitória"}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                {planType === 'paid' ? "Escolha seu plano e tenha acesso total ao ecossistema." : "Receba notícias e alertas importantes gratuitamente."}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubscribe} className="space-y-5 mt-6">
              {success ? (
                <div className="py-8 text-center space-y-6 animate-in fade-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-4 border border-yellow-400/30">
                    <CheckCircle2 className="w-10 h-10 text-yellow-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-xl font-bold uppercase tracking-tighter">Assinatura Ativa!</h3>
                    <p className="text-sm text-slate-400">Você será redirecionado para o {messengerPref === 'whatsapp' ? 'WhatsApp' : 'Telegram'}.</p>
                  </div>
                  <Button 
                    className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black h-12 rounded-xl uppercase tracking-widest text-[10px]"
                    onClick={() => {
                      const link = messengerPref === 'whatsapp' ? settings?.whatsapp_link : settings?.telegram_link;
                      window.open(link || (messengerPref === 'whatsapp' ? 'https://wa.me/suporte' : 'https://t.me/suporte'), '_blank');
                    }}
                  >
                    Entrar no Grupo de Assinantes <ArrowRight className="ml-2 w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome</label>
                      <Input value={name} onChange={(e) => setName(e.target.value)} required className="bg-white/5 border-white/10 h-10 rounded-xl" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">WhatsApp</label>
                      <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} required className="bg-white/5 border-white/10 h-10 rounded-xl" />
                    </div>
                  </div>

                  {planType === 'paid' && (
                    <div className="space-y-3">
                      <label className="text-[9px] font-black uppercase tracking-widest text-yellow-400 ml-1">Selecione seu Plano</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['monthly', 'quarterly', 'yearly'].map((p) => (
                          <button
                            key={p} type="button"
                            onClick={() => setPlanDuration(p as any)}
                            className={cn(
                              "py-3 rounded-xl border text-[9px] font-black uppercase transition-all",
                              planDuration === p ? "bg-yellow-400 border-yellow-400 text-black shadow-lg shadow-yellow-400/20" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                            )}
                          >
                            {p === 'monthly' ? 'Mensal' : p === 'quarterly' ? 'Trimestral' : 'Anual'}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Receber por onde?</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button" onClick={() => setMessengerPref('whatsapp')}
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                          messengerPref === 'whatsapp' ? "bg-green-500/20 border-green-500 text-green-500" : "bg-white/5 border-white/10 text-slate-400"
                        )}
                      >
                        <MessageSquare className="w-4 h-4" /> <span className="text-[10px] font-bold">WhatsApp</span>
                      </button>
                      <button
                        type="button" onClick={() => setMessengerPref('telegram')}
                        className={cn(
                          "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                          messengerPref === 'telegram' ? "bg-blue-500/20 border-blue-500 text-blue-500" : "bg-white/5 border-white/10 text-slate-400"
                        )}
                      >
                        <Send className="w-4 h-4" /> <span className="text-[10px] font-bold">Telegram</span>
                      </button>
                    </div>
                  </div>

                  <Button 
                    className={cn(
                      "w-full h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all mt-4",
                      planType === 'paid' ? "bg-yellow-400 text-black hover:bg-yellow-500" : "bg-primary text-white hover:bg-primary/90"
                    )}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirmar Assinatura"}
                  </Button>
                </>
              )}
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
