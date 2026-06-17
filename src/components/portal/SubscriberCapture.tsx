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
import { cn, sanitizeHtml } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { useSystem } from "@/hooks/useSystem";
import { PaymentGateway } from "@/components/portal/PaymentGateway";
import {
  PLAN_CONFIGS,
  PaymentMethod,
  PlanDuration,
  createPayment,
  PaymentCustomer,
} from "@/services/paymentService";
import { motion } from "framer-motion";
import { z } from "zod";

interface SubscriberCaptureProps {
  planType?: "free" | "paid";
  onSuccess?: () => void;
  triggerLabel?: string;
  showTrigger?: boolean;
  showFloating?: boolean;
  triggerClassName?: string;
  children?: React.ReactNode;
}

const subscriberSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100, "Nome muito longo"),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  whatsapp: z.string().trim().min(8, "WhatsApp inválido").max(20, "WhatsApp muito longo"),
});

export const SubscriberCapture = ({ 
  planType: initialPlan = 'free', 
  onSuccess, 
  triggerLabel, 
  showTrigger = false, 
  showFloating = true,
  triggerClassName,
  children,
}: SubscriberCaptureProps) => {
  const { toast } = useToast();
  const { settings } = useSystem();

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

  const [planDuration, setPlanDuration] = useState<PlanDuration>("monthly");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("pix");
  const [messengerPref, setMessengerPref] = useState<"whatsapp" | "telegram">("whatsapp");
  const [gatewayToken, setGatewayToken] = useState<string | undefined>(undefined);
  const [countdown, setCountdown] = useState(45);
  const [groupCopied, setGroupCopied] = useState(false);

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

  const handleOpen = (type: "free" | "paid") => {
    setPlanType(type);
    setStep(1);
    setCountdown(45);
    setGatewayToken(undefined);
    setOpen(true);
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 4 && countdown > 0 && open) {
      timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    } else if (step === 4 && countdown === 0 && open) {
      window.open(getGroupLink(), "_blank");
    }
    return () => clearTimeout(timer);
  }, [step, countdown, open, messengerPref]);

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
      } catch (err) {}
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
        toast({ title: "Confirmado!", description: "Seu pagamento foi confirmado com sucesso." });
      } else {
        toast({ title: "Aguardando pagamento", description: "O PIX ainda não consta como concluído." });
      }
    } catch (err: any) {
      toast({ title: "Erro ao verificar", description: err.message, variant: "destructive" });
    } finally {
      setCheckingPayment(false);
    }
  };

  const validateStep1 = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast({ title: "Nome obrigatório", variant: "destructive" });
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast({ title: "E-mail inválido", variant: "destructive" });
      return;
    }
    if (!whatsapp.trim() || whatsapp.replace(/\D/g, "").length < 10) {
      toast({ title: "WhatsApp inválido", variant: "destructive" });
      return;
    }
    if (planType === "free") handleFinalSubscribe();
    else setStep(2);
  };

  const handleFinalSubscribe = async () => {
    setLoading(true);
    try {
      let createdPaymentId = "";
      let createdQrcodeText = "";
      let createdQrcodeImage = "";

      if (planType === "paid") {
        const result = await createPayment({
          customer: { name: name.trim(), email: email.trim().toLowerCase(), phone: whatsapp.trim() },
          plan: currentPlan,
          method: paymentMethod,
          gatewayToken,
          metadata: { messenger: messengerPref, instagram: instagramUsername.trim().replace(/^@/, ""), telegram: telegramUsername.trim().replace(/^@/, "") },
        });

        if (!result.success) {
          toast({ title: "Erro ao gerar PIX", description: result.errorMessage, variant: "destructive" });
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

      const cleanInsta = instagramUsername.trim().replace(/^@/, "");
      const cleanTele = telegramUsername.trim().replace(/^@/, "");
      let profilePicUrl = profilePicUrlInput.trim();
      if (!profilePicUrl) {
        profilePicUrl = cleanTele ? `https://unavatar.io/telegram/${cleanTele}` : cleanInsta ? `https://unavatar.io/instagram/${cleanInsta}` : `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(name)}`;
      }

      const { error } = await (supabase as any).from("portal_subscribers").upsert({
        email: email.trim().toLowerCase(),
        phone: whatsapp.trim(),
        full_name: name.trim(),
        plan_type: planType === "paid" ? "paid_sub" : "lead",
        metadata: {
          plan_duration: planType === "paid" ? planDuration : null,
          preferred_messenger: messengerPref,
          payment_status: planType === "paid" ? "pendente" : "gratis",
          profile_picture_url: profilePicUrl,
          instagram_username: cleanInsta,
          telegram_username: cleanTele,
          efi_txid: planType === "paid" ? createdPaymentId : null,
        },
      }, { onConflict: "email" });

      if (error) throw error;
      if (planType === "paid") setStep(3);
      else setStep(4);
      if (onSuccess) onSuccess();
    } catch (error: any) {
      toast({ title: "Erro no cadastro", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {showTrigger && (
        <button onClick={() => handleOpen(planType)} className={cn(!children && "bg-yellow-400 text-black font-black uppercase text-[10px] px-8 py-4 rounded-full transition-all hover:scale-105 active:scale-95", triggerClassName)}>
          {children || triggerLabel || (planType === "paid" ? "Assine Já!" : "Inscrever-se")}
        </button>
      )}

      {showFloating && (
        <div className="fixed bottom-12 right-12 z-50 flex flex-col items-end gap-4">
          <button onClick={() => handleOpen("paid")} className={cn("bg-yellow-400 text-black font-black uppercase text-[10px] px-6 py-3.5 rounded-xl shadow-[0_0_30px_rgba(250,204,21,0.3)] hover:scale-105 active:scale-95 transition-all tracking-widest flex items-center gap-2 group border-b-2 border-yellow-600", triggerClassName)}>
            <Sparkles className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform" />
            {triggerLabel || "Assinar Agora"}
          </button>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md bg-[#0A0F1E] border-white/5 rounded-[2.5rem] shadow-2xl p-0 overflow-hidden text-white">
          <div className="h-1.5 w-full bg-gradient-to-r from-yellow-400 via-primary to-yellow-400" />
          <div className="p-8">
            <DialogHeader className="space-y-2">
              <Badge className="bg-yellow-400/10 text-yellow-400 border-yellow-400/20 text-[9px] uppercase font-black tracking-widest px-2.5 py-1 w-fit">Passo {step} de 3</Badge>
              <DialogTitle className="text-2xl font-display font-black uppercase tracking-tighter">{planType === "paid" ? "Seja um Assinante VIP" : "Alertas Web Rádio Vitória"}</DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                {step === 1 && "Preencha seus dados de identificação."}
                {step === 2 && "Escolha seu plano e forma de pagamento."}
                {step === 3 && "Parabéns! Sua assinatura foi confirmada."}
              </DialogDescription>
            </DialogHeader>

            {step === 1 && (
              <form onSubmit={validateStep1} className="space-y-4 mt-6">
                <Input placeholder="Nome Completo" value={name} onChange={e => setName(e.target.value)} required className="bg-white/5 border-white/10 h-11 rounded-xl text-xs" />
                <div className="grid grid-cols-2 gap-3">
                  <Input type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required className="bg-white/5 border-white/10 h-11 rounded-xl text-xs" />
                  <Input type="tel" placeholder="WhatsApp" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} required className="bg-white/5 border-white/10 h-11 rounded-xl text-xs" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input placeholder="Instagram" value={instagramUsername} onChange={e => setInstagramUsername(e.target.value)} className="bg-white/5 border-white/10 h-11 rounded-xl text-xs" />
                  <Input placeholder="Telegram" value={telegramUsername} onChange={e => setTelegramUsername(e.target.value)} className="bg-white/5 border-white/10 h-11 rounded-xl text-xs" />
                </div>
                <Input value={profilePicUrlInput} onChange={e => setProfilePicUrlInput(e.target.value)} placeholder="Link da foto de perfil..." className="bg-white/5 border-white/10 h-11 rounded-xl text-xs" />
                <Button className={cn("w-full h-12 rounded-xl font-black uppercase tracking-widest text-[10px] mt-4", planType === "paid" ? "bg-yellow-400 text-black" : "bg-primary text-white")} disabled={loading}>
                  {loading ? <Loader2 className="animate-spin" /> : "Continuar"}
                </Button>
              </form>
            )}

            {step === 2 && (
              <div className="space-y-4 mt-6">
                <div className="grid grid-cols-3 gap-2">
                  {(["monthly", "quarterly", "yearly"] as PlanDuration[]).map(p => (
                    <button key={p} onClick={() => setPlanDuration(p)} className={cn("py-3 rounded-xl border text-[9px] font-black uppercase transition-all", planDuration === p ? "bg-yellow-400 text-black" : "bg-white/5 text-slate-400")}>
                      {PLAN_CONFIGS[p].label}
                    </button>
                  ))}
                </div>
                <PaymentGateway method="pix" plan={currentPlan} />
                <div className="grid grid-cols-2 gap-3">
                  <Button onClick={() => setMessengerPref("whatsapp")} className={cn("h-11 rounded-xl border", messengerPref === "whatsapp" ? "bg-green-500/10 border-green-500 text-green-500" : "bg-white/5")}>WhatsApp</Button>
                  <Button onClick={() => setMessengerPref("telegram")} className={cn("h-11 rounded-xl border", messengerPref === "telegram" ? "bg-blue-500/10 border-blue-500 text-blue-500" : "bg-white/5")}>Telegram</Button>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" onClick={() => setStep(1)} className="h-12 flex-1">Voltar</Button>
                  <Button onClick={handleFinalSubscribe} className="h-12 flex-[2] bg-yellow-400 text-black font-black uppercase text-[10px]">Pagar Agora</Button>
                </div>
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4 mt-6 text-center">
                <h3 className="text-yellow-400 font-black uppercase">Pague via PIX</h3>
                {qrcodeImage && <img src={qrcodeImage} className="w-40 h-40 mx-auto bg-white p-2 rounded-xl" />}
                <Input value={qrcodeText} readOnly className="bg-black/40 text-[10px]" />
                <Button onClick={checkPaymentStatusManually} className="w-full bg-yellow-400 text-black">Já paguei</Button>
              </div>
            )}

            {step === 4 && (
              <div className="text-center space-y-4 mt-6">
                <CheckCircle2 className="w-16 h-16 text-yellow-400 mx-auto" />
                <h3 className="text-xl font-black uppercase">Sucesso!</h3>
                <p className="text-xs text-slate-400">Você será redirecionado para o grupo em {countdown}s.</p>
                <Button asChild className="w-full bg-yellow-400 text-black"><a href={getGroupLink()} target="_blank">Entrar Agora</a></Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default SubscriberCapture;
