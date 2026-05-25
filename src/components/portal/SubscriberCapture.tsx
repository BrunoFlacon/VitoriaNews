import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  CheckCircle2, Send, Loader2, Sparkles, ArrowRight,
  MessageSquare, Copy, Check,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSystem } from "@/contexts/SystemContext";
import { PaymentGateway } from "@/components/portal/PaymentGateway";
import {
  PLAN_CONFIGS,
  PaymentMethod,
  PlanDuration,
  createPayment,
  PaymentCustomer,
} from "@/services/paymentService";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

interface SubscriberCaptureProps {
  planType?: "free" | "paid";
  onSuccess?: () => void;
  triggerLabel?: string;
  showTrigger?: boolean;
  showFloating?: boolean;
  triggerClassName?: string;
  children?: React.ReactNode;
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────────────────────────────────

export const SubscriberCapture = ({
  planType: initialPlan = "free",
  onSuccess,
  triggerLabel,
  showTrigger = false,
  showFloating = true,
  triggerClassName,
  children,
}: SubscriberCaptureProps) => {
  const { toast } = useToast();
  const { settings } = useSystem();

  // ── Dialog & Wizard ──────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [planType, setPlanType] = useState(initialPlan);
  const [qrcodeImage, setQrcodeImage] = useState<string | undefined>(undefined);
  const [qrcodeText, setQrcodeText] = useState<string | undefined>(undefined);
  const [txid, setTxid] = useState<string | undefined>(undefined);
  const [pixPaid, setPixPaid] = useState(false);
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [qrcodeCopied, setQrcodeCopied] = useState(false);

  // ── Step 1: dados de contato ─────────────────────────────────────────────
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [instagramUsername, setInstagramUsername] = useState("");
  const [telegramUsername, setTelegramUsername] = useState("");
  const [profilePicUrlInput, setProfilePicUrlInput] = useState("");

  const handleCheckoutImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast({
          title: "Arquivo muito grande",
          description: "O tamanho máximo é 2MB.",
          variant: "destructive"
        });
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfilePicUrlInput(reader.result as string);
        toast({
          title: "Foto carregada!",
          description: "A imagem foi carregada e convertida com sucesso."
        });
      };
      reader.readAsDataURL(file);
    }
  };

  // ── Step 2: seleção de plano e pagamento ─────────────────────────────────
  const [planDuration, setPlanDuration] = useState<PlanDuration>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [messengerPref, setMessengerPref] = useState<"whatsapp" | "telegram">("whatsapp");

  /**
   * Token gerado pelo SDK do gateway (Stripe / Mercado Pago).
   * Preenchido via `PaymentGateway.onTokenReady`.
   * Enviado ao backend pela `createPayment()`.
   */
  const [gatewayToken, setGatewayToken] = useState<string | undefined>(undefined);

  // ── Step 3: confirmação e redirecionamento ───────────────────────────────
  const [countdown, setCountdown] = useState(45);
  const [groupCopied, setGroupCopied] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────
  const currentPlan = PLAN_CONFIGS[planDuration];

  const getGroupLink = () => {
    const link =
      messengerPref === "whatsapp" ? settings?.whatsapp_link : settings?.telegram_link;
    return (
      link ||
      (messengerPref === "whatsapp"
        ? "https://chat.whatsapp.com/0029Va5QcmhISTkQc6Md6V3n"
        : "https://t.me/webradiovitoria")
    );
  };

  const getGroupName = () =>
    messengerPref === "whatsapp"
      ? "Grupo VIP — Web Rádio Vitória"
      : "Canal VIP — Telegram";

  const handleOpen = (type: "free" | "paid") => {
    setPlanType(type);
    setStep(1);
    setCountdown(45);
    setGatewayToken(undefined);
    setOpen(true);
  };

  // ── Countdown (step 4) ───────────────────────────────────────────────────
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 4 && countdown > 0 && open) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (step === 4 && countdown === 0 && open) {
      window.open(getGroupLink(), "_blank");
    }
    return () => clearTimeout(timer);
  }, [step, countdown, open, messengerPref]);

  // ── Polling de status do pagamento PIX (EFI Bank) ──
  useEffect(() => {
    let active = true;
    let timer: NodeJS.Timeout;

    const checkStatus = async () => {
      if (!txid || !active) return;
      try {
        const { data, error } = await (supabase as any)
          .from("payment_charges")
          .select("status")
          .eq("txid", txid)
          .maybeSingle();

        if (!error && data && data.status === "paid") {
          setPixPaid(true);
          setStep(4);
          toast({
            title: "Assinatura VIP Ativada!",
            description: "Seu pagamento via PIX foi confirmado com sucesso!",
          });
        }
      } catch (err) {
        // Silencioso
      }
    };

    if (step === 3 && txid && !pixPaid) {
      timer = setInterval(checkStatus, 5000);
    }

    return () => {
      active = false;
      if (timer) clearInterval(timer);
    };
  }, [step, txid, pixPaid]);

  const checkPaymentStatusManually = async () => {
    if (!txid) return;
    setCheckingPayment(true);
    try {
      const { data, error } = await (supabase as any)
        .from("payment_charges")
        .select("status")
        .eq("txid", txid)
        .maybeSingle();

      if (error) throw error;

      if (data && data.status === "paid") {
        setPixPaid(true);
        setStep(4);
        toast({
          title: "Confirmado!",
          description: "Seu pagamento foi confirmado com sucesso.",
        });
      } else {
        toast({
          title: "Aguardando pagamento",
          description: "O PIX ainda não consta como concluído. Tente novamente após pagar.",
        });
      }
    } catch (err: any) {
      toast({
        title: "Erro ao verificar",
        description: err.message || "Não foi possível consultar o status.",
        variant: "destructive",
      });
    } finally {
      setCheckingPayment(false);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 1 — Validação de dados
  // ─────────────────────────────────────────────────────────────────────────

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
    if (!whatsapp.trim() || whatsapp.replace(/\D/g, "").length < 10) {
      toast({ title: "WhatsApp inválido", description: "Por favor, digite um WhatsApp válido com DDD.", variant: "destructive" });
      return;
    }

    if (planType === "free") {
      handleFinalSubscribe();
    } else {
      setStep(2);
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STEP 2 — Processar pagamento e salvar assinante
  // ─────────────────────────────────────────────────────────────────────────

  const handleFinalSubscribe = async () => {
    setLoading(true);
    try {
      let createdPaymentId = "";
      let createdQrcodeText = "";
      let createdQrcodeImage = "";

      // ── 1. Processar pagamento (apenas para plano pago) ──────────────────
      if (planType === "paid") {
        const customer: PaymentCustomer = {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: whatsapp.trim(),
        };

        const result = await createPayment({
          customer,
          plan: currentPlan,
          method: paymentMethod,
          gatewayToken,
          metadata: {
            messenger: messengerPref,
            instagram: instagramUsername.trim().replace(/^@/, ""),
            telegram: telegramUsername.trim().replace(/^@/, ""),
          },
        });

        if (!result.success) {
          toast({
            title: "Erro ao gerar PIX",
            description: result.errorMessage || "Não foi possível gerar a cobrança PIX.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        createdPaymentId = result.paymentId || "";
        createdQrcodeText = result.pixCopyPaste || "";
        createdQrcodeImage = result.redirectUrl || "";

        setTxid(createdPaymentId);
        setQrcodeText(createdQrcodeText);
        setQrcodeImage(createdQrcodeImage);
      }

      // ── 2. Salvar assinante no banco ─────────────────────────────────────
      const cleanInsta = instagramUsername.trim().replace(/^@/, "");
      const cleanTele = telegramUsername.trim().replace(/^@/, "");

      let profilePicUrl = profilePicUrlInput.trim();
      
      if (profilePicUrl && /^\d+$/.test(profilePicUrl.replace(/\D/g, ""))) {
        const cleanNum = profilePicUrl.replace(/\D/g, "");
        profilePicUrl = `https://unavatar.io/gravatar/${cleanNum}@vitoria.net`;
      }
      
      if (!profilePicUrl) {
        profilePicUrl = cleanTele
          ? `https://unavatar.io/telegram/${cleanTele}`
          : cleanInsta
          ? `https://unavatar.io/instagram/${cleanInsta}`
          : whatsapp.trim()
          ? `https://unavatar.io/gravatar/${whatsapp.trim().replace(/\D/g, "")}@vitoria.net`
          : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
      }

      const payload = {
        email: email.trim().toLowerCase(),
        phone: whatsapp.trim(),
        full_name: name.trim(),
        plan_type: planType === "paid" ? "paid_sub" : "lead",
        metadata: {
          plan_duration: planType === "paid" ? planDuration : null,
          preferred_messenger: messengerPref,
          payment_status: planType === "paid" ? "pendente" : "gratis",
          payment_method: planType === "paid" ? paymentMethod : null,
          due_date:
            planType === "paid"
              ? new Date(
                  Date.now() + currentPlan.intervalDays * 24 * 60 * 60 * 1000
                )
                  .toISOString()
                  .split("T")[0]
              : null,
          price: planType === "paid" ? currentPlan.priceBRL : "0,00",
          currency: "BRL",
          notes:
            planType === "paid"
              ? "Cadastro público via Checkout VIP (Aguardando PIX)"
              : "Lead público cadastrado",
          profile_picture_url: profilePicUrl,
          instagram_username: cleanInsta,
          telegram_username: cleanTele,
          efi_txid: planType === "paid" ? createdPaymentId : null,
        },
      };

      const { error } = await (supabase as any)
        .from("portal_subscribers")
        .upsert(payload, { onConflict: "email" });

      if (error) throw error;

      localStorage.setItem("vitoria_messenger_pref", messengerPref);
      
      if (planType === "paid") {
        setStep(3); // Transiciona para a tela de pagamento PIX
        toast({
          title: "Cobrança PIX Gerada!",
          description: "Escaneie o QR Code para ativar seu acesso VIP.",
        });
      } else {
        setStep(4); // Transiciona para o sucesso direto
        toast({
          title: "Bem-vindo!",
          description: "Cadastro realizado com sucesso!",
        });
      }
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const copyGroupLink = () => {
    const link = getGroupLink();
    navigator.clipboard.writeText(link);
    setGroupCopied(true);
    setTimeout(() => setGroupCopied(false), 2000);
    toast({ title: "Copiado!", description: "Link do grupo copiado para a área de transferência." });
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Botão Trigger customizável */}
      {showTrigger && (
        <button
          onClick={() => handleOpen(planType)}
          className={cn(
            !children &&
              "bg-yellow-400 text-black font-black uppercase text-[10px] px-8 py-4 rounded-full transition-all hover:scale-105 active:scale-95",
            triggerClassName
          )}
        >
          {children || triggerLabel || (planType === "paid" ? "Assine Já!" : "Inscrever-se")}
        </button>
      )}

      {/* Botão Flutuante */}
      {showFloating && (
        <div className="fixed bottom-12 right-12 z-50 flex flex-col items-end gap-4">
          <button
            onClick={() => handleOpen("paid")}
            className={cn(
              "bg-yellow-400 text-black font-black uppercase text-[10px] px-6 py-3.5 rounded-xl shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:scale-105 active:scale-95 transition-all tracking-widest flex items-center gap-2 group border-b-2 border-yellow-600",
              triggerClassName
            )}
          >
            <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            {triggerLabel || "Assinar Agora"}
          </button>
        </div>
      )}

      {/* Modal Wizard */}
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
                {planType === "paid" ? "Seja um Assinante VIP" : "Alertas Web Rádio Vitória"}
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                {step === 1 && "Preencha seus dados de identificação para iniciar."}
                {step === 2 && "Escolha seu plano de assinatura VIP e forma de pagamento."}
                {step === 3 && "Parabéns! Sua assinatura VIP foi confirmada."}
              </DialogDescription>
            </DialogHeader>

            {/* ─── STEP 1: DADOS E CADASTRO ─────────────────────────────── */}
            {step === 1 && (
              <form onSubmit={validateStep1} className="space-y-4 mt-6">
                <div className="space-y-1">
                  <label htmlFor="checkout-name" className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
                    Nome Completo
                  </label>
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
                    <label htmlFor="checkout-email" className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      E-mail
                    </label>
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
                    <label htmlFor="checkout-whatsapp" className="text-[9px] font-black uppercase tracking-widest text-slate-500 ml-1">
                      WhatsApp
                    </label>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-white/5 mt-2">
                  <div className="space-y-1">
                    <label htmlFor="checkout-instagram" className="text-[9px] font-black uppercase tracking-widest text-yellow-400/80 ml-1">
                      Instagram (Opcional)
                    </label>
                    <Input
                      id="checkout-instagram"
                      name="checkout-instagram"
                      value={instagramUsername}
                      onChange={(e) => setInstagramUsername(e.target.value)}
                      placeholder="@seu.perfil"
                      className="bg-white/5 border-white/10 h-11 rounded-xl text-xs text-white"
                    />
                  </div>
                  <div className="space-y-1">
                    <label htmlFor="checkout-telegram" className="text-[9px] font-black uppercase tracking-widest text-blue-400/80 ml-1">
                      Telegram (Opcional)
                    </label>
                    <Input
                      id="checkout-telegram"
                      name="checkout-telegram"
                      value={telegramUsername}
                      onChange={(e) => setTelegramUsername(e.target.value)}
                      placeholder="@seu.usuario"
                      className="bg-white/5 border-white/10 h-11 rounded-xl text-xs text-white"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 pt-1 border-t border-white/5 mt-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Foto de Perfil (Opcional - Link ou Celular)
                  </label>
                  <div className="flex gap-2">
                    <Input 
                      value={profilePicUrlInput} 
                      onChange={e => setProfilePicUrlInput(e.target.value)} 
                      placeholder="Cole link de foto ou número de celular..." 
                      className="bg-white/5 border-white/10 rounded-xl h-11 text-xs font-medium flex-1 text-white" 
                    />
                    <div className="relative shrink-0">
                      <input
                        type="file"
                        accept="image/*"
                        id="checkout-avatar-upload"
                        className="hidden"
                        onChange={handleCheckoutImageUpload}
                      />
                      <label
                        htmlFor="checkout-avatar-upload"
                        className="flex items-center justify-center bg-white/10 hover:bg-white/20 border border-white/10 rounded-xl h-11 px-4 cursor-pointer text-[10px] font-black uppercase tracking-wider text-white select-none transition-all"
                      >
                        Upload
                      </label>
                    </div>
                  </div>
                </div>
                <p className="text-[8px] text-slate-500 mt-1 ml-1">
                  Pode fazer upload manual, colar link direto de foto, ou deixar em branco para buscar do Telegram, Instagram ou WhatsApp.
                </p>

                <Button
                  className={cn(
                    "w-full h-12 rounded-xl font-black uppercase tracking-[0.2em] text-[10px] transition-all mt-4",
                    planType === "paid"
                      ? "bg-yellow-400 text-black hover:bg-yellow-500"
                      : "bg-primary text-white hover:bg-primary/90"
                  )}
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : planType === "paid" ? (
                    "Continuar para Pagamento"
                  ) : (
                    "Confirmar Cadastro"
                  )}
                </Button>
              </form>
            )}

            {/* ─── STEP 2: PLANO & PAGAMENTO ────────────────────────────── */}
            {step === 2 && (
              <div className="space-y-5 mt-6 animate-in fade-in duration-300">

                {/* Seleção de Plano */}
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-widest text-yellow-400 ml-1">
                    Selecione seu Plano
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["monthly", "quarterly", "yearly"] as PlanDuration[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setPlanDuration(p)}
                        className={cn(
                          "py-3 rounded-xl border text-[9px] font-black uppercase transition-all flex flex-col items-center gap-1",
                          planDuration === p
                            ? "bg-yellow-400 border-yellow-400 text-black shadow-lg shadow-yellow-400/20"
                            : "bg-white/5 border-white/10 text-slate-400 hover:bg-white/10"
                        )}
                      >
                        <span>{PLAN_CONFIGS[p].label}</span>
                        <span className="text-[8px] opacity-80">R$ {PLAN_CONFIGS[p].priceBRL}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Forma de Pagamento (Foco apenas no PIX via EFI) */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Forma de Pagamento
                  </label>
                  <div className="grid grid-cols-1">
                    <div className="py-2.5 rounded-xl border border-green-500/30 bg-green-500/5 text-green-400 text-center text-[10px] font-black uppercase tracking-widest">
                      Apenas PIX é Suportado
                    </div>
                  </div>
                </div>

                {/* Componente de Gateway de Pagamento */}
                <PaymentGateway
                  method="pix"
                  plan={currentPlan}
                />

                {/* Meio de Recebimento */}
                <div className="space-y-2 pt-2 border-t border-white/5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                    Receber por onde?
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setMessengerPref("whatsapp")}
                      className={cn(
                        "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                        messengerPref === "whatsapp"
                          ? "bg-green-500/20 border-green-500 text-green-500"
                          : "bg-white/5 border-white/10 text-slate-400"
                      )}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="text-[10px] font-bold">WhatsApp</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMessengerPref("telegram")}
                      className={cn(
                        "flex items-center justify-center gap-2 p-3 rounded-xl border transition-all",
                        messengerPref === "telegram"
                          ? "bg-blue-500/20 border-blue-500 text-blue-500"
                          : "bg-white/5 border-white/10 text-slate-400"
                      )}
                    >
                      <Send className="w-4 h-4" />
                      <span className="text-[10px] font-bold">Telegram</span>
                    </button>
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="grid grid-cols-3 gap-2.5 mt-4">
                  <Button
                     type="button"
                     variant="outline"
                     onClick={() => setStep(1)}
                     className="border-white/10 rounded-xl font-bold uppercase text-[9px] h-12"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={handleFinalSubscribe}
                    className="col-span-2 h-12 rounded-xl bg-yellow-400 text-black hover:bg-yellow-500 font-black uppercase tracking-widest text-[9px] transition-all shadow-lg shadow-yellow-400/10"
                    disabled={loading}
                  >
                    {loading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Finalizar Assinatura VIP"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ─── STEP 3: QR CODE PIX (EFI BANK) ─────────────────────────── */}
            {step === 3 && (
              <div className="space-y-5 mt-6 animate-in fade-in zoom-in duration-500">
                <div className="text-center space-y-1">
                  <h3 className="text-lg font-display font-black uppercase tracking-tight text-yellow-400">
                    Aguardando Pagamento PIX
                  </h3>
                  <p className="text-slate-400 text-[10px] px-2 leading-relaxed">
                    Escaneie o QR Code abaixo no app do seu banco para ativar sua assinatura VIP.
                  </p>
                </div>

                {qrcodeImage ? (
                  <div className="w-48 h-48 mx-auto bg-white p-2 rounded-2xl flex items-center justify-center shadow-lg ring-4 ring-yellow-400/20">
                    <img src={qrcodeImage} alt="QR Code PIX" className="w-full h-full object-contain" />
                  </div>
                ) : (
                  <div className="w-48 h-48 mx-auto bg-white/5 rounded-2xl flex flex-col items-center justify-center text-slate-500 text-xs gap-2 border border-dashed border-white/10">
                    <Loader2 className="w-6 h-6 animate-spin text-yellow-400" />
                    <span>Carregando QR Code...</span>
                  </div>
                )}

                {qrcodeText && (
                  <div className="space-y-2">
                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 ml-1">
                      Código PIX Copia e Cola
                    </label>
                    <div className="flex gap-2">
                      <Input
                        value={qrcodeText}
                        readOnly
                        className="bg-black/35 border-white/5 h-11 rounded-xl text-[10px] font-mono select-all text-slate-300 flex-1"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          navigator.clipboard.writeText(qrcodeText);
                          setQrcodeCopied(true);
                          setTimeout(() => setQrcodeCopied(false), 2000);
                          toast({ title: "Copiado!", description: "Código PIX copiado para a área de transferência." });
                        }}
                        className="h-11 border-white/15 hover:bg-white/10 rounded-xl px-3"
                      >
                        {qrcodeCopied ? (
                          <Check className="w-4 h-4 text-green-500" />
                        ) : (
                          <Copy className="w-4 h-4 text-yellow-400" />
                        )}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="bg-yellow-400/5 border border-yellow-400/10 p-3.5 rounded-xl text-center">
                  <div className="text-[10px] text-yellow-400/80 font-bold uppercase tracking-wider animate-pulse flex items-center justify-center gap-2">
                    <span className="w-2 h-2 bg-yellow-400 rounded-full animate-ping" />
                    Aguardando confirmação automática...
                  </div>
                  <p className="text-[9px] text-slate-500 mt-1 leading-relaxed">
                    Assim que o pagamento for concluído, você será redirecionado para a comunidade VIP.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2.5 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setStep(2)}
                    className="border-white/10 rounded-xl font-bold uppercase text-[9px] h-12 text-slate-400 hover:text-white"
                  >
                    Voltar
                  </Button>
                  <Button
                    onClick={checkPaymentStatusManually}
                    className="h-12 rounded-xl bg-yellow-400 text-black hover:bg-yellow-500 font-black uppercase tracking-widest text-[9px] transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-400/15"
                    disabled={checkingPayment}
                  >
                    {checkingPayment ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Confirmar Pagamento
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* ─── STEP 4: AGRADECIMENTO & REDIRECIONAMENTO ─────────────── */}
            {step === 4 && (
              <div className="py-6 text-center space-y-6 animate-in fade-in zoom-in duration-500 mt-2">
                <div className="w-20 h-20 bg-yellow-400/20 rounded-full flex items-center justify-center mx-auto mb-2 border border-yellow-400/30">
                  <CheckCircle2 className="w-10 h-10 text-yellow-400" />
                </div>

                <div className="space-y-1">
                  <h3 className="text-2xl font-display font-black uppercase tracking-tighter text-white">
                    Assinatura VIP Ativa!
                  </h3>
                  <p className="text-slate-400 text-xs px-2">
                    Você foi incluído na comunidade VIP oficial da Web Rádio Vitória.
                  </p>
                </div>

                {/* Caixa de info do grupo */}
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
                      onClick={copyGroupLink}
                      className="h-10 border-white/15 hover:bg-white/10 rounded-xl"
                    >
                      {groupCopied ? (
                        <Check className="w-3.5 h-3.5 text-green-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </Button>
                  </div>

                  {countdown > 0 ? (
                    <div className="text-[10px] text-slate-400 bg-yellow-400/5 border border-yellow-400/10 p-2.5 rounded-xl text-center font-bold">
                      Redirecionando automaticamente em{" "}
                      <span className="text-yellow-400 font-black">{countdown}</span> segundos...
                    </div>
                  ) : (
                    <div className="text-[10px] text-green-400 bg-green-500/5 border border-green-500/10 p-2.5 rounded-xl text-center font-bold">
                      Redirecionando agora! Se não abrir, clique no botão abaixo.
                    </div>
                  )}
                </div>

                <Button
                  className="w-full bg-yellow-400 hover:bg-yellow-500 text-black font-black h-12 rounded-xl uppercase tracking-widest text-[10px] shadow-lg shadow-yellow-400/20 animate-bounce"
                  onClick={() => window.open(getGroupLink(), "_blank")}
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
