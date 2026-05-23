import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription 
} from "@/components/ui/dialog";
import { CheckCircle2, Send, Loader2, Sparkles, ArrowRight, MessageSquare, Copy, Check, CreditCard, Receipt, Users, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSystem } from "@/contexts/SystemContext";

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
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [planType, setPlanType] = useState(initialPlan);
  
  // Step 1 Form States
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  
  // Step 2 Form States
  const [planDuration, setPlanDuration] = useState<'monthly' | 'quarterly' | 'yearly'>('monthly');
  const [paymentMethod, setPaymentMethod] = useState<'pix' | 'card' | 'boleto'>('pix');
  const [messengerPref, setMessengerPref] = useState<'whatsapp' | 'telegram'>('whatsapp');
  
  // Payment Details
  const [pixVerification, setPixVerification] = useState("");
  const [cardNumber, setCardNumber] = useState("");
  const [cardName, setCardName] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvv, setCardCvv] = useState("");
  const [boletoCopied, setBoletoCopied] = useState(false);
  const [pixCopied, setPixCopied] = useState(false);

  // Step 3 States
  const [countdown, setCountdown] = useState(45);
  const [groupCopied, setGroupCopied] = useState(false);

  const pixKey = "contato@webradiovitoria.com.br";
  const boletoBarcode = "34191.79001 01043.513184 91020.150008 7 98760000002200";

  const getPlanPrice = () => {
    if (planDuration === 'monthly') return '22.00';
    if (planDuration === 'quarterly') return '59.00';
    return '199.00';
  };

  const getPlanLabel = () => {
    if (planDuration === 'monthly') return 'Mensal';
    if (planDuration === 'quarterly') return 'Trimestral';
    return 'Anual';
  };

  const getGroupLink = () => {
    const link = messengerPref === 'whatsapp' ? settings?.whatsapp_link : settings?.telegram_link;
    return link || (messengerPref === 'whatsapp' ? 'https://chat.whatsapp.com/0029Va5QcmhISTkQc6Md6V3n' : 'https://t.me/webradiovitoria');
  };

  const getGroupName = () => {
    return messengerPref === 'whatsapp' ? 'Grupo VIP - Web Rádio Vitória' : 'Canal VIP - Telegram';
  };

  const handleOpen = (type: 'free' | 'paid') => {
    setPlanType(type);
    setStep(1);
    setCountdown(45);
    setOpen(true);
  };

  // Countdown timer for step 3
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 3 && countdown > 0 && open) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    } else if (step === 3 && countdown === 0 && open) {
      // Auto-redirect
      const link = getGroupLink();
      window.open(link, '_blank');
    }
    return () => clearTimeout(timer);
  }, [step, countdown, open, messengerPref]);

  const validateStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", description: "Por favor, digite seu nome completo.", variant: "destructive" });
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "E-mail inválido", description: "Por favor, digite um e-mail válido.", variant: "destructive" });
      return;
    }
    if (!whatsapp.trim() || whatsapp.replace(/\D/g, '').length < 10) {
      toast({ title: "WhatsApp inválido", description: "Por favor, digite um WhatsApp válido com DDD.", variant: "destructive" });
      return;
    }
    
    // Se for plano gratuito, já salva aqui direto. Se for pago, vai para a tela de faturamento
    if (planType === 'free') {
      handleFinalSubscribe();
    } else {
      setStep(2);
    }
  };

  const handleFinalSubscribe = async () => {
    setLoading(true);
    try {
      const profilePicUrl = instagramUsername 
        ? `https://unavatar.io/instagram/${instagramUsername.trim().replace(/^@/, "")}`
        : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;

      const payload = {
        email: email.trim().toLowerCase(),
        phone: whatsapp.trim(),
        full_name: name.trim(),
        plan_type: planType === 'paid' ? 'paid_sub' : 'lead',
        metadata: {
          plan_duration: planType === 'paid' ? planDuration : null,
          preferred_messenger: messengerPref,
          payment_status: planType === 'paid' ? 'em_dia' : 'gratis',
          payment_method: planType === 'paid' ? paymentMethod : null,
          due_date: planType === 'paid' 
            ? new Date(Date.now() + (planDuration === 'monthly' ? 30 : planDuration === 'quarterly' ? 90 : 365) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            : null,
          price: planType === 'paid' ? getPlanPrice() : '0.00',
          currency: 'BRL',
          notes: planType === 'paid' ? 'Cadastro público via Checkout VIP' : 'Lead público cadastrado',
          profile_picture_url: profilePicUrl,
          instagram_username: instagramUsername.trim().replace(/^@/, ""),
          pix_verification: paymentMethod === 'pix' ? pixVerification : null,
          card_info: paymentMethod === 'card' ? { holder: cardName, number: cardNumber.slice(-4) } : null
        }
      };

      // Usando upsert para resolver o erro 'portal_subscribers_email_key' caso o email já exista
      const { error } = await (supabase as any)
        .from('portal_subscribers')
        .upsert(payload, { onConflict: 'email' });

      if (error) throw error;
      
      // Salva preferência local
      localStorage.setItem('vitoria_messenger_pref', messengerPref);

      setStep(3);
      toast({ title: "Bem-vindo!", description: planType === 'paid' ? "Sua assinatura VIP foi confirmada!" : "Pré-cadastro realizado com sucesso!" });
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = (text: string, type: 'pix' | 'boleto' | 'group') => {
    navigator.clipboard.writeText(text);
    if (type === 'pix') {
      setPixCopied(true);
      setTimeout(() => setPixCopied(false), 2000);
    } else if (type === 'boleto') {
      setBoletoCopied(true);
      setTimeout(() => setBoletoCopied(false), 2000);
    } else {
      setGroupCopied(true);
      setTimeout(() => setGroupCopied(false), 2000);
    }
    toast({ title: "Copiado!", description: "Link ou código copiado para a área de transferência." });
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
        <DialogContent className="sm:max-w-md bg-[#0A0F1E] border-white/5 rounded-[2.5rem] shadow-2xl p-0 overflow-hidden text-white">
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow-400 via-primary to-yellow-400" />
          <div className="p-8">
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2 text-yellow-400 mb-1">
                <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20 text-[9px] uppercase font-black tracking-widest px-2.5 py-1">
                  Passo {step} de 3
                </Badge>
              </div>
              <DialogTitle className="text-2xl font-display font-black uppercase tracking-tighter">
                {planType === 'paid' ? "Seja um Assinante VIP" : "Alertas Web Rádio Vitória"}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                {step === 1 && "Preencha seus dados de identificação para iniciar."}
                {step === 2 && "Escolha seu plano de assinatura VIP e forma de pagamento."}
                {step === 3 && "Parabéns! Sua assinatura VIP foi confirmada."}
              </DialogDescription>
            </DialogHeader>

            {/* STEP 1: DADOS E CADASTRO */}
            {step === 1 && (
              <form onSubmit={validateStep1} className="space-y-4 mt-6">
                <div className="space-y-1">
                  <label htmlFor="checkout-name" className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">Nome Completo</label>
                  <Input 
                    id="checkout-name"
                    name="checkout-name"
                    autoComplete="name"
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    required 
                    placeholder="Seu nome"
                    className="bg-white/5 border-white/10 h-11 rounded-xl text-xs" 
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label htmlFor="checkout-email" className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">E-mail</label>
                    <Input 
                      id="checkout-email"
                      name="checkout-email"
                      type="email"
                      autoComplete="email"
                      value={email} 
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                      placeholder="seu@email.com"
                      className="bg-white/5 border-white/10 h-11 rounded-xl text-xs" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="checkout-whatsapp" className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">WhatsApp</label>
                    <Input 
                      id="checkout-whatsapp"
                      name="checkout-whatsapp"
                      type="tel"
                      autoComplete="tel"
                      value={whatsapp} 
                      onChange={(e) => setWhatsapp(e.target.value)} 
                      required 
                      placeholder="14997094362"
                      className="bg-white/5 border-white/10 h-11 rounded-xl text-xs" 
                    />
                  </div>
                </div>

                <div className="space-y-1 pt-1 border-t border-white/5 mt-2">
                  <label htmlFor="checkout-instagram" className="text-[9px] font-black uppercase tracking-widest text-yellow-400/80 ml-1">Usuário do Instagram (Opcional)</label>
                  <Input 
                    id="checkout-instagram"
                    name="checkout-instagram"
                    value={instagramUsername} 
                    onChange={(e) => setInstagramUsername(e.target.value)} 
                    placeholder="@seu.perfil (para carregar sua foto)"
                    className="bg-white/5 border-white/10 h-11 rounded-xl text-xs" 
                  />
                  <p className="text-[8px] text-slate-500 mt-1 ml-1">Usaremos para buscar sua foto de perfil na administração do portal.</p>
                </div>

                <Button 
                  className={cn(
                    "w-full h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all mt-4",
                    planType === 'paid' ? "bg-yellow-400 text-black hover:bg-yellow-500" : "bg-primary text-white hover:bg-primary/90"
                  )}
                  disabled={loading}
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : planType === 'paid' ? "Continuar para Pagamento" : "Confirmar Cadastro"}
                </Button>
              </form>
            )}

            {/* STEP 2: PLANO & FATURAMENTO */}
            {step === 2 && (
              <div className="space-y-5 mt-6 animate-in fade-in duration-300">
                {/* Seleção do Plano */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-yellow-400 ml-1">Selecione seu Plano</label>
                  <div className="grid grid-cols-3 gap-2">
                    {['monthly', 'quarterly', 'yearly'].map((p) => (
                      <button
                        key={p} type="button"
                        onClick={() => setPlanDuration(p as any)}
                        className={cn(
                          "py-3 rounded-xl border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1",
                          planDuration === p ? "bg-yellow-400 border-yellow-400 text-black shadow-lg shadow-yellow-400/20" : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                        )}
                      >
                        <span>{p === 'monthly' ? 'Mensal' : p === 'quarterly' ? 'Trimestral' : 'Anual'}</span>
                        <span className="text-[8px] opacity-80">{p === 'monthly' ? 'R$ 22' : p === 'quarterly' ? 'R$ 59' : 'R$ 199'}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Forma de Pagamento */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Forma de Pagamento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'pix', label: 'PIX' },
                      { id: 'card', label: 'Cartão' },
                      { id: 'boleto', label: 'Boleto' }
                    ].map((m) => (
                      <button
                        key={m.id} type="button"
                        onClick={() => setPaymentMethod(m.id as any)}
                        className={cn(
                          "py-2 rounded-lg border text-[9px] font-bold uppercase transition-all",
                          paymentMethod === m.id ? "bg-white text-black border-white" : "bg-white/5 border-white/10 text-slate-400"
                        )}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Detalhes de Pagamento Fictício */}
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl space-y-3">
                  {paymentMethod === 'pix' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                        <span>Chave PIX (E-mail)</span>
                        <button 
                          onClick={() => copyToClipboard(pixKey, 'pix')} 
                          className="text-yellow-400 hover:underline flex items-center gap-1 text-[9px]"
                        >
                          {pixCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />} Copiar Chave
                        </button>
                      </div>
                      <div className="bg-black/35 p-2.5 rounded-xl text-center font-mono text-xs select-all break-all border border-white/5">
                        {pixKey}
                      </div>
                      <p className="text-[9px] text-slate-500">Transfira o valor de <strong>R$ {getPlanPrice()}</strong> e insira o código ou nome do titular abaixo:</p>
                      <Input
                        value={pixVerification}
                        onChange={(e) => setPixVerification(e.target.value)}
                        placeholder="Nome do pagador ou código da transação"
                        className="bg-white/5 border-white/10 h-9 rounded-lg text-[10px]"
                      />
                    </div>
                  )}

                  {paymentMethod === 'card' && (
                    <div className="space-y-2">
                      <div className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1.5"><CreditCard className="w-3.5 h-3.5" /> Cartão de Crédito (Simulação)</div>
                      <Input
                        value={cardNumber}
                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').slice(0, 16))}
                        placeholder="Número do Cartão"
                        className="bg-white/5 border-white/10 h-9 rounded-lg text-[10px]"
                      />
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          value={cardName}
                          onChange={(e) => setCardName(e.target.value.toUpperCase())}
                          placeholder="Nome no Cartão"
                          className="bg-white/5 border-white/10 h-9 rounded-lg text-[10px] col-span-2"
                        />
                        <Input
                          value={cardExpiry}
                          onChange={(e) => setCardExpiry(e.target.value)}
                          placeholder="MM/AA"
                          className="bg-white/5 border-white/10 h-9 rounded-lg text-[10px]"
                        />
                      </div>
                    </div>
                  )}

                  {paymentMethod === 'boleto' && (
                    <div className="space-y-2">
                      <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                        <span>Código de Barras do Boleto</span>
                        <button 
                          onClick={() => copyToClipboard(boletoBarcode, 'boleto')} 
                          className="text-yellow-400 hover:underline flex items-center gap-1 text-[9px]"
                        >
                          {boletoCopied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />} Copiar Código
                        </button>
                      </div>
                      <div className="bg-black/35 p-2 rounded-xl text-center font-mono text-[9px] break-all border border-white/5 select-all leading-tight">
                        {boletoBarcode}
                      </div>
                      <p className="text-[8px] text-slate-500 text-center">Vencimento em 3 dias úteis. Compensação em até 24 horas.</p>
                    </div>
                  )}
                </div>

                {/* Meio Preferido de Envio */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">Receber por onde?</label>
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

                {/* Botões de Ação */}
                <div className="grid grid-cols-3 gap-2.5 mt-4">
                  <Button 
                    type="button" variant="outline" onClick={() => setStep(1)} 
                    className="border-white/10 rounded-xl font-bold uppercase text-[9px] h-12"
                  >
                    Voltar
                  </Button>
                  <Button 
                    onClick={handleFinalSubscribe}
                    className="col-span-2 h-12 rounded-xl bg-yellow-400 text-black hover:bg-yellow-500 font-black uppercase tracking-widest text-[9px] transition-all shadow-lg shadow-yellow-400/10"
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Finalizar Assinatura VIP`}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: AGRADECIMENTO & REDIRECIONAMENTO */}
            {step === 3 && (
              <div className="py-6 text-center space-y-6 animate-in fade-in zoom-in duration-500 mt-2">
                <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-yellow-400/30">
                  <CheckCircle2 className="w-10 h-10 text-yellow-400" />
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-2xl font-display font-black uppercase tracking-tighter">Assinatura VIP Ativa!</h3>
                  <p className="text-slate-400 text-xs px-2">Você foi incluído na comunidade VIP oficial da Web Rádio Vitória.</p>
                </div>

                {/* Group Box Info */}
                <div className="bg-white/5 border border-white/10 p-4 rounded-2xl space-y-3 text-left">
                  <div className="flex justify-between items-center text-[10px] font-bold uppercase text-slate-400">
                    <span>Nome do Grupo</span>
                    <span className="text-yellow-400 font-black">Link de Acesso</span>
                  </div>
                  <div className="text-sm font-bold text-white uppercase tracking-tight">
                    {getGroupName()}
                  </div>
                  
                  <div className="flex gap-2">
                    <Input 
                      value={getGroupLink()} 
                      readOnly 
                      className="bg-black/35 border-white/5 h-10 rounded-xl text-[10px] font-mono select-all text-slate-300" 
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => copyToClipboard(getGroupLink(), 'group')}
                      className="h-10 border-white/15 hover:bg-white/10 rounded-xl"
                    >
                      {groupCopied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </Button>
                  </div>

                  {countdown > 0 ? (
                    <div className="text-[10px] text-slate-400 bg-yellow-400/5 border border-yellow-400/10 p-2.5 rounded-xl text-center font-bold">
                      Redirecionando automaticamente em <span className="text-yellow-400 font-black">{countdown}</span> segundos...
                    </div>
                  ) : (
                    <div className="text-[10px] text-green-400 bg-green-500/5 border border-green-500/10 p-2.5 rounded-xl text-center font-bold">
                      Redirecionando agora! Se não abrir, clique no botão abaixo.
                    </div>
                  )}
                </div>

                <Button 
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black h-12 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-yellow-400/20"
                  onClick={() => {
                    window.open(getGroupLink(), '_blank');
                  }}
                >
                  Entrar no Grupo de Assinantes <ArrowRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
