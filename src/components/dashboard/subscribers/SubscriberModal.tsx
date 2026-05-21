import React, { useState, useEffect } from "react";
import { 
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { 
  User, CreditCard, DollarSign, Calendar, Tag, Trash2, Check, AlertTriangle, Send, Receipt, FileText, Plus, X, MessageSquare, Star 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Subscriber {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  plan_type: string;
  created_at: string;
  metadata?: {
    plan_duration?: string;
    preferred_messenger?: string;
    payment_status?: string;
    payment_method?: string;
    due_date?: string;
    price?: string;
    currency?: string;
    notes?: string;
    products?: string[];
    free_services?: string[];
    receipt_url?: string;
    profile_picture_url?: string;
  };
}

interface SubscriberModalProps {
  subscriber: Subscriber | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: () => void;
}

const AVAILABLE_PRODUCTS = [
  "Radar de Notícias Pro",
  "Mentoria VIP de Comunicação",
  "Acesso Ilimitado ao Bot de Vendas",
  "Comunidade Bastidores do Poder",
  "Newsletter Exclusiva em Áudio"
];

const FREE_SERVICES = [
  "Newsletter Gratuita (Área Pública)",
  "Notícias e Comunicados Urgentes",
  "Alertas de Lives e Transmissões Ao Vivo",
  "Alertas de Novas Publicações nas Redes Sociais"
];

export const SubscriberModal: React.FC<SubscriberModalProps> = ({
  subscriber, open, onOpenChange, onUpdated
}) => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<'geral' | 'plano' | 'financeiro'>('geral');
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [planType, setPlanType] = useState("lead");
  const [planDuration, setPlanDuration] = useState("monthly");
  const [preferredMessenger, setPreferredMessenger] = useState("whatsapp");
  const [paymentStatus, setPaymentStatus] = useState("em_dia");
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [dueDate, setDueDate] = useState("");
  const [price, setPrice] = useState("22.00");
  const [currency, setCurrency] = useState("BRL");
  const [notes, setNotes] = useState("");
  const [products, setProducts] = useState<string[]>([]);
  const [freeServices, setFreeServices] = useState<string[]>([]);
  const [receiptUrl, setReceiptUrl] = useState("");
  const [profilePictureUrl, setProfilePictureUrl] = useState("");

  useEffect(() => {
    if (subscriber) {
      setFullName(subscriber.full_name || "");
      setEmail(subscriber.email || "");
      setPhone(subscriber.phone || "");
      setPlanType(subscriber.plan_type || "lead");
      setPlanDuration(subscriber.metadata?.plan_duration || "monthly");
      setPreferredMessenger(subscriber.metadata?.preferred_messenger || "whatsapp");
      setPaymentStatus(subscriber.metadata?.payment_status || "em_dia");
      setPaymentMethod(subscriber.metadata?.payment_method || "pix");
      setDueDate(subscriber.metadata?.due_date || new Date().toISOString().split('T')[0]);
      setPrice(subscriber.metadata?.price || "22.00");
      setCurrency(subscriber.metadata?.currency || "BRL");
      setNotes(subscriber.metadata?.notes || "");
      setProducts(subscriber.metadata?.products || ["Radar de Notícias Pro"]);
      setFreeServices(subscriber.metadata?.free_services || [
        "Newsletter Gratuita (Área Pública)",
        "Notícias e Comunicados Urgentes",
        "Alertas de Lives e Transmissões Ao Vivo",
        "Alertas de Novas Publicações nas Redes Sociais"
      ]);
      setReceiptUrl(subscriber.metadata?.receipt_url || "");
      setProfilePictureUrl(subscriber.metadata?.profile_picture_url || "");
    }
  }, [subscriber]);

  if (!subscriber) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      const updatedMetadata = {
        ...(subscriber.metadata || {}),
        plan_duration: planDuration,
        preferred_messenger: preferredMessenger,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        due_date: dueDate,
        price,
        currency,
        notes,
        products,
        free_services: freeServices,
        receipt_url: receiptUrl,
        profile_picture_url: profilePictureUrl
      };

      const { error } = await supabase
        .from('portal_subscribers' as any)
        .update({
          full_name: fullName,
          email,
          phone,
          plan_type: planType,
          metadata: updatedMetadata
        })
        .eq('id', subscriber.id);

      if (error) throw error;

      toast({
        title: "Cadastro Atualizado!",
        description: "Todas as informações e relatórios contábeis foram salvos.",
      });
      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Tem certeza absoluta que deseja excluir o assinante ${fullName}? Esta ação não pode ser desfeita.`)) {
      return;
    }
    setDeleting(true);
    try {
      const { error } = await supabase
        .from('portal_subscribers' as any)
        .delete()
        .eq('id', subscriber.id);

      if (error) throw error;

      toast({
        title: "Assinante Excluído",
        description: "O cadastro foi permanentemente apagado da base.",
      });
      onUpdated();
      onOpenChange(false);
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive"
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleSendBillingAlert = () => {
    const phoneNumber = phone ? phone.replace(/\D/g, '') : '';
    if (!phoneNumber) {
      toast({ title: "Erro", description: "Telefone do assinante inválido.", variant: "destructive" });
      return;
    }
    const message = `Olá ${fullName || 'Assinante'}, notamos que sua assinatura VIP no portal Web Rádio Vitória está com status [${paymentStatus === 'atrasado' ? 'Em Atraso' : 'Pendente'}]. Valor da fatura: R$ ${price}. Chave PIX oficial: contato@webradiovitoria.com.br. Caso já tenha efetuado o pagamento, por favor ignore esta mensagem ou envie o comprovante!`;
    const encoded = encodeURIComponent(message);
    window.open(`https://wa.me/${phoneNumber.startsWith('55') ? phoneNumber : '55' + phoneNumber}?text=${encoded}`, '_blank');
  };

  const toggleProduct = (prod: string) => {
    if (products.includes(prod)) {
      setProducts(products.filter(p => p !== prod));
    } else {
      setProducts([...products, prod]);
    }
  };

  const toggleFreeService = (srv: string) => {
    if (freeServices.includes(srv)) {
      setFreeServices(freeServices.filter(s => s !== srv));
    } else {
      setFreeServices([...freeServices, srv]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-4xl bg-[#0A0F1E] border-white/10 rounded-3xl shadow-2xl overflow-hidden text-white p-0 max-h-[90vh] flex flex-col">
        <div className="h-2 w-full shrink-0 bg-gradient-to-r from-yellow-400 via-primary to-yellow-400" />
        
        <div className="p-6 sm:p-10 space-y-6 overflow-y-auto flex-1 custom-scrollbar">
          {/* Header & Badges */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-white/5 pb-6 gap-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-white/10 overflow-hidden shrink-0 bg-white/5 flex items-center justify-center">
                {profilePictureUrl ? (
                  <img src={profilePictureUrl} alt={fullName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-8 h-8 text-slate-500" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <DialogTitle className="text-xl sm:text-2xl font-display font-black uppercase tracking-tighter flex items-center gap-2 truncate">
                  {planType === 'paid_sub' && <Star className="w-5 h-5 text-yellow-400 fill-yellow-400 shrink-0" />}
                  <span className="truncate">{fullName || "Assinante VIP"}</span>
                </DialogTitle>
                <DialogDescription className="text-slate-400 font-medium text-[11px] sm:text-xs uppercase tracking-widest mt-1 truncate">
                  ID: {subscriber.id}
                </DialogDescription>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Badge className={cn(
                "uppercase font-black text-[10px] tracking-widest py-1.5 px-3 rounded-lg shadow",
                planType === 'paid_sub' ? "bg-yellow-400 text-black" : "bg-primary text-white"
              )}>
                {planType === 'paid_sub' ? `VIP ${planDuration === 'monthly' ? 'MENSAL' : planDuration === 'quarterly' ? 'TRIMESTRAL' : 'ANUAL'}` : "Gratuito"}
              </Badge>
              <Badge className={cn(
                "uppercase font-black text-[10px] tracking-widest py-1.5 px-3 rounded-lg shadow border",
                paymentStatus === 'em_dia' ? "bg-green-500/20 text-green-400 border-green-500/30" : 
                paymentStatus === 'atrasado' ? "bg-red-500/20 text-red-400 border-red-500/30" : 
                "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
              )}>
                {paymentStatus === 'em_dia' ? "Em Dia" : paymentStatus === 'atrasado' ? "Atrasado" : "Pendente"}
              </Badge>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5 bg-white/5 p-1.5 rounded-2xl">
            {(['geral', 'plano', 'financeiro'] as const).map((t) => (
              <button
                key={t} type="button"
                onClick={() => setActiveTab(t)}
                className={cn(
                  "w-full py-2.5 px-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all text-center truncate",
                  activeTab === t ? "bg-yellow-400 text-black shadow-lg" : "text-slate-400 hover:text-white hover:bg-white/5"
                )}
              >
                {t === 'geral' ? "1. Dados & Cadastro" : t === 'plano' ? "2. Plano & Produtos" : "3. Contábil & Cobrança"}
              </button>
            ))}
          </div>

          {/* Tab 1: Dados & Cadastro */}
          {activeTab === 'geral' && (
            <div className="space-y-4 animate-in fade-in duration-300">
              <div className="space-y-1.5 border-b border-white/5 pb-4">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">URL da Foto do Perfil (Avatar)</label>
                <Input value={profilePictureUrl} onChange={e => setProfilePictureUrl(e.target.value)} placeholder="https://exemplo.com/foto.jpg ou link da imagem..." className="bg-white/5 border-white/10 rounded-xl h-11 text-white text-xs font-medium" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Nome Completo</label>
                  <Input value={fullName} onChange={e => setFullName(e.target.value)} className="bg-white/5 border-white/10 rounded-xl h-11 text-white font-medium" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">WhatsApp / Celular</label>
                  <Input value={phone} onChange={e => setPhone(e.target.value)} className="bg-white/5 border-white/10 rounded-xl h-11 text-white font-medium" placeholder="5511999999999" />
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">E-mail</label>
                  <Input type="email" value={email} onChange={e => setEmail(e.target.value)} className="bg-white/5 border-white/10 rounded-xl h-11 text-white font-medium" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Canal Preferido</label>
                  <select
                    value={preferredMessenger}
                    onChange={e => setPreferredMessenger(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl h-11 px-3 text-white text-sm font-medium focus:outline-none focus:border-yellow-400"
                  >
                    <option value="whatsapp" className="bg-[#0A0F1E]">WhatsApp</option>
                    <option value="telegram" className="bg-[#0A0F1E]">Telegram</option>
                  </select>
                </div>
              </div>
              <div className="space-y-1.5 pt-2">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Anotações Internas do Cliente</label>
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="Histórico de atendimento, observações, acordos..."
                  className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-yellow-400 min-h-[100px]"
                />
              </div>
            </div>
          )}

          {/* Tab 2: Plano & Produtos */}
          {activeTab === 'plano' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-yellow-400 tracking-wider ml-1">Tipo de Assinatura</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button" onClick={() => setPlanType('lead')}
                      className={cn("py-3 px-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all text-center truncate", planType === 'lead' ? "bg-primary border-primary text-white shadow-lg" : "bg-white/5 border-white/10 text-slate-400")}
                    >
                      Gratuito (Lead)
                    </button>
                    <button
                      type="button" onClick={() => setPlanType('paid_sub')}
                      className={cn("py-3 px-2 rounded-xl border text-[10px] font-black uppercase tracking-wider transition-all text-center truncate", planType === 'paid_sub' ? "bg-yellow-400 border-yellow-400 text-black shadow-lg" : "bg-white/5 border-white/10 text-slate-400")}
                    >
                      VIP Premium
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-yellow-400 tracking-wider ml-1">Ciclo de Renovação</label>
                  <select
                    value={planDuration}
                    onChange={e => setPlanDuration(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl h-12 px-3 text-white text-sm font-bold uppercase tracking-wider focus:outline-none focus:border-yellow-400"
                  >
                    <option value="monthly" className="bg-[#0A0F1E]">Mensal</option>
                    <option value="quarterly" className="bg-[#0A0F1E]">Trimestral</option>
                    <option value="semiannual" className="bg-[#0A0F1E]">Semestral</option>
                    <option value="yearly" className="bg-[#0A0F1E]">Anual</option>
                  </select>
                </div>
              </div>

              {/* Serviços de Cadastro Gratuito / Base */}
              <div className="space-y-3 pt-1 border-t border-white/5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <span>Serviços de Acesso Gratuito (Área Pública & Alertas)</span>
                  <span className="text-[9px] text-primary font-bold uppercase tracking-wider">Incluso em todos os níveis</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {FREE_SERVICES.map((srv) => {
                    const isActive = freeServices.includes(srv);
                    return (
                      <div
                        key={srv}
                        onClick={() => toggleFreeService(srv)}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all hover:border-primary/50 gap-2",
                          isActive ? "bg-primary/10 border-primary/30 text-primary font-bold" : "bg-white/5 border-white/10 text-slate-400"
                        )}
                      >
                        <span className="text-xs leading-tight">{srv}</span>
                        <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all", isActive ? "bg-primary border-primary text-white" : "border-white/20")}>
                          {isActive && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Serviços VIP Premium */}
              <div className="space-y-3 pt-2 border-t border-white/5">
                <label className="text-[10px] font-black uppercase text-yellow-400 tracking-wider ml-1 flex items-center justify-between">
                  <span>Produtos & Serviços VIP Exclusivos</span>
                  <span className="text-[9px] text-yellow-400 font-bold">{products.length} ativos</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {AVAILABLE_PRODUCTS.map((prod) => {
                    const isActive = products.includes(prod);
                    return (
                      <div
                        key={prod}
                        onClick={() => toggleProduct(prod)}
                        className={cn(
                          "flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all hover:border-yellow-400/50 gap-2",
                          isActive ? "bg-yellow-400/10 border-yellow-400/30 text-yellow-400 font-bold" : "bg-white/5 border-white/10 text-slate-400"
                        )}
                      >
                        <span className="text-xs leading-tight uppercase tracking-wider">{prod}</span>
                        <div className={cn("w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all", isActive ? "bg-yellow-400 border-yellow-400 text-black" : "border-white/20")}>
                          {isActive && <Check className="w-3.5 h-3.5" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Tab 3: Financeiro & Contábil */}
          {activeTab === 'financeiro' && (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Status Contábil do Pagamento</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { val: 'em_dia', label: 'Em Dia', cl: 'bg-green-500 border-green-500 text-black font-black' },
                      { val: 'pendente', label: 'Pendente', cl: 'bg-yellow-500 border-yellow-500 text-black font-black' },
                      { val: 'atrasado', label: 'Atrasado', cl: 'bg-red-500 border-red-500 text-white font-black' }
                    ].map((st) => (
                      <button
                        key={st.val} type="button" onClick={() => setPaymentStatus(st.val)}
                        className={cn("py-2.5 px-2 rounded-xl border text-[9px] font-black uppercase tracking-wider transition-all text-center truncate", paymentStatus === st.val ? st.cl + " shadow-lg shadow-black/50" : "bg-white/5 border-white/10 text-slate-400")}
                      >
                        {st.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Próximo Vencimento</label>
                  <Input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} className="bg-white/5 border-white/10 rounded-xl h-11 text-white font-bold" />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Valor</label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="bg-white/5 border-white/10 rounded-xl h-11 text-white font-bold pl-9 text-lg text-yellow-400" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Moeda</label>
                  <select value={currency} onChange={e => setCurrency(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl h-11 px-3 text-white text-sm font-bold uppercase focus:outline-none">
                    <option value="BRL" className="bg-[#0A0F1E]">BRL (R$)</option>
                    <option value="USD" className="bg-[#0A0F1E]">USD ($)</option>
                    <option value="BTC" className="bg-[#0A0F1E]">Bitcoin (BTC)</option>
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">Modalidade</label>
                  <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="w-full bg-white/5 border border-white/10 rounded-xl h-11 px-3 text-white text-sm font-bold uppercase focus:outline-none">
                    <option value="pix" className="bg-[#0A0F1E]">PIX</option>
                    <option value="credit_card" className="bg-[#0A0F1E]">Cartão de Crédito</option>
                    <option value="boleto" className="bg-[#0A0F1E]">Boleto</option>
                    <option value="crypto" className="bg-[#0A0F1E]">Criptomoeda / Bitcoin</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider ml-1">URL ou Link do Comprovante de Pagamento</label>
                <div className="flex gap-2">
                  <Input value={receiptUrl} onChange={e => setReceiptUrl(e.target.value)} placeholder="https://drive.google.com/file/d/comprovante.pdf ou link do banco..." className="bg-white/5 border-white/10 rounded-xl h-11 text-white text-xs" />
                  {receiptUrl && (
                    <Button type="button" variant="outline" onClick={() => window.open(receiptUrl, '_blank')} className="h-11 px-4 rounded-xl border-white/20 text-xs font-bold uppercase shrink-0">
                      Abrir
                    </Button>
                  )}
                </div>
              </div>

              {/* Billing Action Box */}
              <div className="p-4 sm:p-5 bg-yellow-400/5 border border-yellow-400/20 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 text-left">
                  <h5 className="text-xs font-bold text-yellow-400 uppercase tracking-wider flex items-center gap-1.5"><AlertTriangle className="w-4 h-4 shrink-0" /> Notificação de Cobrança Automática</h5>
                  <p className="text-[11px] text-slate-400">Gera um alerta de cobrança profissional com chave PIX e valor atualizado para o WhatsApp do cliente.</p>
                </div>
                <Button onClick={handleSendBillingAlert} className="w-full sm:w-auto bg-green-500 hover:bg-green-600 text-black font-black uppercase text-[10px] tracking-widest px-5 h-11 sm:h-10 rounded-xl flex items-center justify-center gap-2 shrink-0 shadow-lg shadow-green-500/20">
                  <MessageSquare className="w-4 h-4" /> Enviar Alerta
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <DialogFooter className="bg-white/5 px-6 sm:px-10 py-5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between border-t border-white/10 gap-3 shrink-0">
          <Button
            type="button" variant="ghost" onClick={handleDelete} disabled={deleting}
            className="text-red-400 hover:text-red-300 hover:bg-red-500/10 font-bold text-xs uppercase tracking-wider px-4 h-11 rounded-xl w-full sm:w-auto justify-center"
          >
            <Trash2 className="w-4 h-4 mr-2" /> {deleting ? "Excluindo..." : "Excluir Cadastro"}
          </Button>
          <div className="flex flex-col sm:flex-row gap-2.5 w-full sm:w-auto">
            <Button
              type="button" variant="outline" onClick={() => onOpenChange(false)}
              className="border-white/10 text-white font-bold text-xs uppercase tracking-wider px-6 h-11 rounded-xl hover:bg-white/10 w-full sm:w-auto"
            >
              Cancelar
            </Button>
            <Button
              type="button" onClick={handleSave} disabled={loading}
              className="bg-yellow-400 hover:bg-yellow-500 text-black font-black text-xs uppercase tracking-widest px-8 h-11 rounded-xl shadow-lg shadow-yellow-400/20 w-full sm:w-auto justify-center"
            >
              <Check className="w-4 h-4 mr-2" /> {loading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
