import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, KeyRound, Eye, EyeOff, Save, Plus, Pencil, Trash2,
  CheckCircle, AlertCircle, Clock, DollarSign, Users, TrendingUp,
  MessageSquare, RefreshCw, ChevronDown, ChevronUp, Loader2, Zap,
  Package, Settings2, BarChart3, Wallet
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SubscribersView } from "@/components/dashboard/SubscribersView";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GatewaySettings {
  payment_gateway: string;
  stripe_public_key: string;
  stripe_secret_key: string;
  mercadopago_public_key: string;
  mercadopago_access_token: string;
}

interface Plan {
  id: string;
  name: string;
  price: number;
  interval: string;
  description: string;
  features: string[];
  active: boolean;
}

interface PortalService {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  active: boolean;
}

interface Subscriber {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  plan_type: string;
  created_at: string;
  metadata?: {
    payment_status?: string;
    plan_duration?: string;
    preferred_messenger?: string;
    due_date?: string;
    price?: string;
    currency?: string;
  };
}

// ─── Utility ──────────────────────────────────────────────────────────────────
const generateId = () => crypto.randomUUID();

const GATEWAY_OPTIONS = [
  { id: "none", label: "Nenhum (Desativado)", color: "text-muted-foreground" },
  { id: "stripe", label: "Stripe", color: "text-blue-400" },
  { id: "mercadopago", label: "Mercado Pago", color: "text-yellow-400" },
];

const INTERVAL_OPTIONS = [
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "yearly", label: "Anual" },
];

// ─── Section Wrapper ───────────────────────────────────────────────────────────
const Section = ({ title, subtitle, icon: Icon, children }: {
  title: string; subtitle: string; icon: any; children: React.ReactNode;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm overflow-hidden"
  >
    <div className="px-6 py-4 border-b border-border/30 flex items-center gap-3 bg-muted/20">
      <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <h3 className="font-semibold text-sm text-foreground">{title}</h3>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
    <div className="p-6">{children}</div>
  </motion.div>
);

// ─── 1. Gateway Settings ───────────────────────────────────────────────────────
const GatewaySection = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GatewaySettings>({
    payment_gateway: "none",
    stripe_public_key: "",
    stripe_secret_key: "",
    mercadopago_public_key: "",
    mercadopago_access_token: "",
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data } = await supabase
          .from("system_settings" as any)
          .select("*")
          .maybeSingle();
        if (data) setSettings(prev => ({ ...prev, ...(data as any) }));
      } catch (e) {
        console.error("Failed to load gateway settings:", e);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const toggleSecret = (key: string) =>
    setShowSecrets(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upsert: first check if row exists
      const { data: existing } = await supabase.from("system_settings" as any).select("id").maybeSingle();
      if (existing) {
        await supabase.from("system_settings" as any).update(settings as any).eq("id", (existing as any).id);
      } else {
        await supabase.from("system_settings" as any).insert([settings as any]);
      }
      toast({ title: "Configurações salvas!", description: "Gateway de pagamento atualizado com sucesso." });
    } catch (e) {
      toast({ title: "Erro ao salvar", description: "Verifique suas permissões e tente novamente.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const SecretField = ({ label, fieldKey }: { label: string; fieldKey: keyof GatewaySettings }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {/* form role="presentation" suprime aviso "Password not in form" sem submeter nada */}
      <form role="presentation" autoComplete="off" onSubmit={e => e.preventDefault()}>
        <div className="relative">
          <Input
            type={showSecrets[fieldKey] ? "text" : "password"}
            value={settings[fieldKey]}
            autoComplete="new-password"
            onChange={e => setSettings(prev => ({ ...prev, [fieldKey]: e.target.value }))}
            placeholder="••••••••••••••••••••"
            className="pr-10 font-mono text-sm bg-background/50"
          />
          <button
            type="button"
            onClick={() => toggleSecret(fieldKey)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showSecrets[fieldKey] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </form>
    </div>
  );

  if (loading) return (
    <Section title="Gateway de Pagamento" subtitle="Configuração de APIs e credenciais" icon={KeyRound}>
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando configurações...
      </div>
    </Section>
  );

  return (
    <Section title="Gateway de Pagamento" subtitle="Chaves de API para processamento real de pagamentos" icon={KeyRound}>
      <div className="space-y-6">
        {/* Gateway selector */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Gateway Ativo</Label>
          <div className="grid grid-cols-3 gap-3">
            {GATEWAY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setSettings(prev => ({ ...prev, payment_gateway: opt.id }))}
                className={cn(
                  "rounded-xl border-2 p-3 text-sm font-medium transition-all text-center",
                  settings.payment_gateway === opt.id
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/40 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Stripe fields */}
        {settings.payment_gateway === "stripe" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-blue-500/5 border border-blue-500/20">
            <div className="md:col-span-2 flex items-center gap-2 mb-1">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-semibold text-blue-400">Credenciais Stripe</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Chave Pública (pk_live_...)</Label>
              <Input
                value={settings.stripe_public_key}
                onChange={e => setSettings(prev => ({ ...prev, stripe_public_key: e.target.value }))}
                placeholder="pk_live_..."
                className="font-mono text-sm bg-background/50"
              />
            </div>
            <SecretField label="Chave Secreta (sk_live_...)" fieldKey="stripe_secret_key" />
          </motion.div>
        )}

        {/* Mercado Pago fields */}
        {settings.payment_gateway === "mercadopago" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-yellow-500/5 border border-yellow-500/20">
            <div className="md:col-span-2 flex items-center gap-2 mb-1">
              <Wallet className="w-4 h-4 text-yellow-400" />
              <span className="text-sm font-semibold text-yellow-400">Credenciais Mercado Pago</span>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Public Key (APP_USR-...)</Label>
              <Input
                value={settings.mercadopago_public_key}
                onChange={e => setSettings(prev => ({ ...prev, mercadopago_public_key: e.target.value }))}
                placeholder="APP_USR-..."
                className="font-mono text-sm bg-background/50"
              />
            </div>
            <SecretField label="Access Token (APP_USR-...)" fieldKey="mercadopago_access_token" />
          </motion.div>
        )}

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </Section>
  );
};

// ─── 2. Plans CRUD ────────────────────────────────────────────────────────────
const PlansSection = () => {
  const { toast } = useToast();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showForm, setShowForm] = useState(false);

  const emptyPlan = (): Plan => ({
    id: generateId(),
    name: "",
    price: 0,
    interval: "monthly",
    description: "",
    features: [""],
    active: true,
  });

  const loadPlans = useCallback(async () => {
    try {
      const { data } = await supabase.from("system_settings" as any).select("*").maybeSingle();
      if (data && (data as any).portal_plans) {
        setPlans(JSON.parse((data as any).portal_plans));
      }
    } catch (e) {
      console.error("Error loading plans:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPlans(); }, [loadPlans]);

  const savePlans = async (updatedPlans: Plan[]) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("system_settings" as any).select("id").maybeSingle();
      const payload = { portal_plans: JSON.stringify(updatedPlans) };
      if (existing) {
        await supabase.from("system_settings" as any).update(payload as any).eq("id", (existing as any).id);
      } else {
        await supabase.from("system_settings" as any).insert([payload as any]);
      }
      setPlans(updatedPlans);
      toast({ title: "Planos atualizados!" });
    } catch (e) {
      toast({ title: "Erro ao salvar planos", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSavePlan = async () => {
    if (!editingPlan) return;
    const updatedPlans = plans.find(p => p.id === editingPlan.id)
      ? plans.map(p => p.id === editingPlan.id ? editingPlan : p)
      : [...plans, editingPlan];
    await savePlans(updatedPlans);
    setShowForm(false);
    setEditingPlan(null);
  };

  const handleDeletePlan = async (id: string) => {
    const updatedPlans = plans.filter(p => p.id !== id);
    await savePlans(updatedPlans);
  };

  const handleToggleActive = async (id: string) => {
    const updatedPlans = plans.map(p => p.id === id ? { ...p, active: !p.active } : p);
    await savePlans(updatedPlans);
  };

  const updateFeature = (index: number, value: string) => {
    if (!editingPlan) return;
    const features = [...editingPlan.features];
    features[index] = value;
    setEditingPlan({ ...editingPlan, features });
  };

  return (
    <Section title="Planos de Assinatura" subtitle="Gerencie os planos exibidos no portal público" icon={CreditCard}>
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando planos...
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map(plan => (
                <motion.div
                  key={plan.id}
                  layout
                  className={cn(
                    "rounded-xl border p-4 space-y-3 transition-all",
                    plan.active ? "border-primary/30 bg-primary/5" : "border-border/30 bg-muted/10 opacity-60"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-semibold text-sm">{plan.name || "Sem nome"}</p>
                      <p className="text-2xl font-bold text-primary">
                        R$ {plan.price.toFixed(2)}
                        <span className="text-xs font-normal text-muted-foreground ml-1">
                          /{INTERVAL_OPTIONS.find(i => i.value === plan.interval)?.label || plan.interval}
                        </span>
                      </p>
                    </div>
                    <Badge variant={plan.active ? "default" : "secondary"} className="shrink-0 text-xs">
                      {plan.active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">{plan.description}</p>
                  <ul className="space-y-1">
                    {plan.features.filter(Boolean).slice(0, 3).map((f, i) => (
                      <li key={i} className="text-xs flex items-center gap-1.5 text-muted-foreground">
                        <CheckCircle className="w-3 h-3 text-green-400 shrink-0" /> {f}
                      </li>
                    ))}
                    {plan.features.filter(Boolean).length > 3 && (
                      <li className="text-xs text-muted-foreground pl-4">+{plan.features.filter(Boolean).length - 3} mais...</li>
                    )}
                  </ul>
                  <div className="flex gap-2 pt-1">
                    <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={() => { setEditingPlan({ ...plan }); setShowForm(true); }}>
                      <Pencil className="w-3 h-3" /> Editar
                    </Button>
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => handleToggleActive(plan.id)}>
                      {plan.active ? "Desativar" : "Ativar"}
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-destructive hover:text-destructive hover:bg-destructive/10" onClick={() => handleDeletePlan(plan.id)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}

              {/* Add new plan card */}
              <motion.button
                layout
                onClick={() => { setEditingPlan(emptyPlan()); setShowForm(true); }}
                className="rounded-xl border-2 border-dashed border-border/40 p-4 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all min-h-[160px]"
              >
                <Plus className="w-6 h-6" />
                <span className="text-sm font-medium">Novo Plano</span>
              </motion.button>
            </div>

            {/* Plan edit form */}
            <AnimatePresence>
              {showForm && editingPlan && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4"
                >
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Pencil className="w-4 h-4 text-primary" />
                    {plans.find(p => p.id === editingPlan.id) ? "Editar Plano" : "Novo Plano"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome do Plano</Label>
                      <Input value={editingPlan.name} onChange={e => setEditingPlan({ ...editingPlan, name: e.target.value })} placeholder="Ex: Plano Premium" className="bg-background/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Preço (R$)</Label>
                      <Input type="number" value={editingPlan.price} onChange={e => setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) || 0 })} className="bg-background/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Intervalo de Cobrança</Label>
                      <select
                        value={editingPlan.interval}
                        onChange={e => setEditingPlan({ ...editingPlan, interval: e.target.value })}
                        className="w-full h-10 rounded-md border border-input bg-background/50 px-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {INTERVAL_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Descrição</Label>
                      <Input value={editingPlan.description} onChange={e => setEditingPlan({ ...editingPlan, description: e.target.value })} placeholder="Descrição resumida do plano" className="bg-background/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Recursos / Benefícios</Label>
                    {editingPlan.features.map((f, i) => (
                      <div key={i} className="flex gap-2">
                        <Input value={f} onChange={e => updateFeature(i, e.target.value)} placeholder={`Benefício ${i + 1}`} className="bg-background/50" />
                        <Button size="sm" variant="ghost" className="text-destructive hover:bg-destructive/10 shrink-0" onClick={() => setEditingPlan({ ...editingPlan, features: editingPlan.features.filter((_, idx) => idx !== i) })}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" className="gap-1 text-xs h-7" onClick={() => setEditingPlan({ ...editingPlan, features: [...editingPlan.features, ""] })}>
                      <Plus className="w-3 h-3" /> Adicionar benefício
                    </Button>
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button variant="outline" onClick={() => { setShowForm(false); setEditingPlan(null); }}>Cancelar</Button>
                    <Button onClick={handleSavePlan} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar Plano
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </Section>
  );
};

// ─── 3. Services CRUD ─────────────────────────────────────────────────────────
const ServicesSection = () => {
  const { toast } = useToast();
  const [services, setServices] = useState<PortalService[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingService, setEditingService] = useState<PortalService | null>(null);
  const [showForm, setShowForm] = useState(false);

  const emptyService = (): PortalService => ({
    id: generateId(),
    title: "",
    description: "",
    icon: "📦",
    category: "Geral",
    active: true,
  });

  const loadServices = useCallback(async () => {
    try {
      const { data } = await supabase.from("system_settings" as any).select("*").maybeSingle();
      if (data && (data as any).portal_services) {
        setServices(JSON.parse((data as any).portal_services));
      }
    } catch (e) {
      console.error("Error loading services:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadServices(); }, [loadServices]);

  const saveServices = async (updatedServices: PortalService[]) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("system_settings" as any).select("id").maybeSingle();
      const payload = { portal_services: JSON.stringify(updatedServices) };
      if (existing) {
        await supabase.from("system_settings" as any).update(payload as any).eq("id", (existing as any).id);
      } else {
        await supabase.from("system_settings" as any).insert([payload as any]);
      }
      setServices(updatedServices);
      toast({ title: "Serviços atualizados!" });
    } catch (e) {
      toast({ title: "Erro ao salvar serviços", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveService = async () => {
    if (!editingService) return;
    const updatedServices = services.find(s => s.id === editingService.id)
      ? services.map(s => s.id === editingService.id ? editingService : s)
      : [...services, editingService];
    await saveServices(updatedServices);
    setShowForm(false);
    setEditingService(null);
  };

  return (
    <Section title="Serviços & Lançamentos Públicos" subtitle="Gerencie serviços exibidos no portal para o público" icon={Package}>
      <div className="space-y-4">
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando serviços...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {services.map(svc => (
                <motion.div
                  key={svc.id}
                  layout
                  className={cn(
                    "rounded-xl border p-4 flex items-center gap-4 transition-all",
                    svc.active ? "border-border/40 bg-card/60" : "border-border/20 bg-muted/10 opacity-60"
                  )}
                >
                  <span className="text-2xl">{svc.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{svc.title || "Sem título"}</p>
                    <p className="text-xs text-muted-foreground truncate">{svc.description}</p>
                  </div>
                  <Badge variant="outline" className="text-xs shrink-0">{svc.category}</Badge>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => { setEditingService({ ...svc }); setShowForm(true); }}>
                      <Pencil className="w-3 h-3" /> Editar
                    </Button>
                    <Button size="sm" variant="ghost" className="h-7 text-destructive hover:bg-destructive/10" onClick={() => saveServices(services.filter(s => s.id !== svc.id))}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}

              {services.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum serviço cadastrado ainda.
                </div>
              )}
            </div>

            <Button variant="outline" className="gap-2 w-full" onClick={() => { setEditingService(emptyService()); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Adicionar Serviço/Lançamento
            </Button>

            <AnimatePresence>
              {showForm && editingService && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-primary/30 bg-primary/5 p-5 space-y-4"
                >
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    {services.find(s => s.id === editingService.id) ? "Editar Serviço" : "Novo Serviço"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Emoji / Ícone</Label>
                      <Input value={editingService.icon} onChange={e => setEditingService({ ...editingService, icon: e.target.value })} placeholder="📦" className="bg-background/50 w-20" maxLength={2} />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Categoria</Label>
                      <Input value={editingService.category} onChange={e => setEditingService({ ...editingService, category: e.target.value })} placeholder="Geral, Premium, Novo..." className="bg-background/50" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Título do Serviço</Label>
                      <Input value={editingService.title} onChange={e => setEditingService({ ...editingService, title: e.target.value })} placeholder="Nome do serviço ou lançamento" className="bg-background/50" />
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Descrição</Label>
                      <textarea
                        value={editingService.description}
                        onChange={e => setEditingService({ ...editingService, description: e.target.value })}
                        placeholder="Descreva o serviço em poucas linhas..."
                        rows={3}
                        className="w-full rounded-md border border-input bg-background/50 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                      />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button variant="outline" onClick={() => { setShowForm(false); setEditingService(null); }}>Cancelar</Button>
                    <Button onClick={handleSaveService} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar Serviço
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </Section>
  );
};

// ─── 4. Financial Report ──────────────────────────────────────────────────────
const FinancialSection = () => {
  const { toast } = useToast();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const fetchSubscribers = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("portal_subscribers" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setSubscribers((data as any) || []);
    } catch (e) {
      console.error("Error fetching subscribers:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSubscribers(); }, [fetchSubscribers]);

  const getPaymentStatus = (sub: Subscriber) =>
    sub.metadata?.payment_status || "pendente";

  const filtered = subscribers.filter(s => {
    const matchSearch =
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search);
    const status = getPaymentStatus(s);
    const matchStatus = statusFilter === "all" || status === statusFilter;
    return matchSearch && matchStatus;
  });

  const activeCount = subscribers.filter(s => getPaymentStatus(s) === "em_dia").length;
  const lateCount = subscribers.filter(s => getPaymentStatus(s) === "atrasado").length;
  const pendingCount = subscribers.filter(s => getPaymentStatus(s) === "pendente").length;

  // Estimate MRR from price in metadata
  const mrr = subscribers
    .filter(s => getPaymentStatus(s) === "em_dia")
    .reduce((acc, s) => acc + parseFloat(s.metadata?.price || "0"), 0);

  const sendWhatsAppAlert = (sub: Subscriber) => {
    const name = sub.full_name?.split(" ")[0] || "Assinante";
    const plan = sub.plan_type || "seu plano";
    const msg = encodeURIComponent(
      `Olá, ${name}! 😊\n\nIdentificamos que a sua assinatura do *${plan}* está com pagamento pendente.\n\nPara continuar aproveitando todos os benefícios, clique no link abaixo para regularizar:\n\n[Link de pagamento aqui]\n\nQualquer dúvida, estamos à disposição! 🙏`
    );
    const phone = sub.phone?.replace(/\D/g, "");
    window.open(`https://wa.me/55${phone}?text=${msg}`, "_blank");
    toast({ title: "WhatsApp aberto!", description: `Mensagem preparada para ${sub.full_name}` });
  };

  const statusBadge = (status: string) => {
    switch (status) {
      case "em_dia": return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle className="w-3 h-3 mr-1" /> Em dia</Badge>;
      case "atrasado": return <Badge className="bg-red-500/20 text-red-400 border-red-500/30"><AlertCircle className="w-3 h-3 mr-1" /> Atrasado</Badge>;
      default: return <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
    }
  };

  return (
    <Section title="Relatório Financeiro" subtitle="Controle de assinantes e receita recorrente" icon={BarChart3}>
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: "MRR Estimado", value: `R$ ${mrr.toFixed(2)}`, icon: TrendingUp, color: "text-green-400", bg: "bg-green-500/10" },
            { label: "Assinantes Ativos", value: activeCount, icon: Users, color: "text-blue-400", bg: "bg-blue-500/10" },
            { label: "Em Atraso", value: lateCount, icon: AlertCircle, color: "text-red-400", bg: "bg-red-500/10" },
            { label: "Pendentes", value: pendingCount, icon: Clock, color: "text-yellow-400", bg: "bg-yellow-500/10" },
          ].map(kpi => (
            <div key={kpi.label} className={cn("rounded-xl p-4 border border-border/30", kpi.bg)}>
              <div className="flex items-center gap-2 mb-2">
                <kpi.icon className={cn("w-4 h-4", kpi.color)} />
                <span className="text-xs text-muted-foreground">{kpi.label}</span>
              </div>
              <p className={cn("text-xl font-bold", kpi.color)}>{kpi.value}</p>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Buscar por nome, email ou telefone..."
              className="w-full h-10 rounded-lg border border-input bg-background/50 pl-4 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-2">
            {["all", "em_dia", "atrasado", "pendente"].map(s => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "px-3 py-2 rounded-lg text-xs font-medium border transition-all",
                  statusFilter === s
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border/40 text-muted-foreground hover:border-primary/40"
                )}
              >
                {s === "all" ? "Todos" : s === "em_dia" ? "Em Dia" : s === "atrasado" ? "Atrasados" : "Pendentes"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchSubscribers} className="gap-1 shrink-0">
            <RefreshCw className="w-3 h-3" /> Atualizar
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando assinantes...
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground text-sm">
            Nenhum assinante encontrado.
          </div>
        ) : (
          <div className="rounded-xl border border-border/30 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/30 border-b border-border/30">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Assinante</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden md:table-cell">Plano</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground hidden lg:table-cell">Valor</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-muted-foreground">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {filtered.map(sub => (
                    <tr key={sub.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-sm">{sub.full_name}</p>
                          <p className="text-xs text-muted-foreground">{sub.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs">{sub.plan_type || "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs font-mono">
                          {sub.metadata?.currency === "usd" ? "$" : "R$"}{sub.metadata?.price || "—"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {statusBadge(getPaymentStatus(sub))}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(getPaymentStatus(sub) === "atrasado" || getPaymentStatus(sub) === "pendente") && sub.phone && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1 text-green-400 border-green-400/30 hover:bg-green-400/10"
                            onClick={() => sendWhatsAppAlert(sub)}
                          >
                            <MessageSquare className="w-3 h-3" /> WhatsApp
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Section>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
export const BillingTab = () => {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <Tabs defaultValue="gateway" className="space-y-6">
        <TabsList className="bg-muted/50 p-1 rounded-xl flex flex-wrap w-full h-auto justify-start gap-1">
          <TabsTrigger value="gateway" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background py-2 px-4">
            <KeyRound className="w-4 h-4" /> Gateway
          </TabsTrigger>
          <TabsTrigger value="plans" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background py-2 px-4">
            <CreditCard className="w-4 h-4" /> Planos
          </TabsTrigger>
          <TabsTrigger value="services" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background py-2 px-4">
            <Package className="w-4 h-4" /> Serviços
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background py-2 px-4">
            <BarChart3 className="w-4 h-4" /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background py-2 px-4 text-yellow-500 data-[state=active]:text-yellow-500">
            <Users className="w-4 h-4" /> Assinantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gateway"><GatewaySection /></TabsContent>
        <TabsContent value="plans"><PlansSection /></TabsContent>
        <TabsContent value="services"><ServicesSection /></TabsContent>
        <TabsContent value="financial"><FinancialSection /></TabsContent>
        <TabsContent value="subscribers">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6"
          >
            <SubscribersView />
          </motion.div>
        </TabsContent>
      </Tabs>
    </motion.div>
  );
};
