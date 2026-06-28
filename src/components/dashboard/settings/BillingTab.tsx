import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CreditCard, KeyRound, Save, Plus, Pencil, Trash2,
  CheckCircle, AlertCircle, Clock, Users, TrendingUp,
  MessageSquare, RefreshCw, Loader2,
  Package, BarChart3, Star, Eye, EyeOff, Wallet,
  Smartphone, DollarSign
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { SubscribersView } from "@/components/dashboard/SubscribersView";
import { MonetizationSection } from "./MonetizationSection";

// ─── Types ────────────────────────────────────────────────────────────────────
interface GatewaySettings {
  payment_gateway: string;
  efi_client_id: string;
  efi_client_secret: string;
  efi_pix_key: string;
  efi_sandbox: boolean;
  efi_certificate: string;
}

interface FoundingMember {
  id: string;
  name: string;
  email: string;
  phone: string;
  plan: 'monthly' | 'quarterly' | 'yearly';
  value_cents: number;
  status: 'paid' | 'pending' | 'expired';
  pix_proof?: string;
  registered_at: string;
  paid_at?: string;
  notes?: string;
  frozen_price: boolean;
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

// ─── 1. EFI Bank Credentials ───────────────────────────────────────────────────
const GatewaySection = () => {
  const { toast } = useToast();
  const [settings, setSettings] = useState<GatewaySettings>({
    payment_gateway: "efipay",
    efi_client_id: "",
    efi_client_secret: "",
    efi_pix_key: "",
    efi_sandbox: false,
    efi_certificate: "",
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
        if (data) {
          const d = data as any;
          setSettings(prev => ({
            ...prev,
            efi_client_id: d.efi_client_id || "",
            efi_client_secret: d.efi_client_secret || "",
            efi_pix_key: d.efi_pix_key || "",
            efi_sandbox: d.efi_sandbox === true,
            efi_certificate: d.efi_certificate || "",
          }));
        }
      } catch (e) {
        console.error("Failed to load EFI settings:", e);
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
      const payload = {
        payment_gateway: "efipay",
        efi_client_id: settings.efi_client_id,
        efi_client_secret: settings.efi_client_secret,
        efi_pix_key: settings.efi_pix_key,
        efi_sandbox: settings.efi_sandbox,
        efi_certificate: settings.efi_certificate,
      };
      const { data: existing } = await supabase.from("system_settings" as any).select("id").maybeSingle();
      if (existing) {
        await supabase.from("system_settings" as any).update(payload as any).eq("id", (existing as any).id);
      } else {
        await supabase.from("system_settings" as any).insert([payload as any]);
      }
      toast({ title: "Credenciais salvas!", description: "Configurações EFI Bank atualizadas." });
    } catch (e) {
      toast({ title: "Erro ao salvar", description: "Verifique suas permissões.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const SecretField = ({ label, fieldKey, placeholder }: { label: string; fieldKey: keyof GatewaySettings; placeholder?: string }) => (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <div>
        <input 
          type="text" 
          name="username" 
          autoComplete="username" 
          value="admin" 
          readOnly 
          className="sr-only" 
          tabIndex={-1} 
          aria-hidden="true" 
        />
        <div className="relative">
          <Input
            type={showSecrets[fieldKey] ? "text" : "password"}
            value={settings[fieldKey] as string}
            autoComplete="new-password"
            onChange={e => setSettings(prev => ({ ...prev, [fieldKey]: e.target.value }))}
            placeholder={placeholder || "••••••••••••••••••••"}
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
      </div>
    </div>
  );

  if (loading) return (
    <Section title="Credenciais EFI Bank (PIX)" subtitle="API de pagamento oficial do sistema" icon={Wallet}>
      <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando...
      </div>
    </Section>
  );

  return (
    <Section title="Credenciais EFI Bank (PIX)" subtitle="API de pagamento oficial do sistema" icon={Wallet}>
      <div className="space-y-6">
        <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
          <p className="text-xs text-muted-foreground flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-green-400 shrink-0" />
            As credenciais abaixo são salvas no banco para referência. As Edge Functions usam os secrets do Supabase.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SecretField label="Client ID" fieldKey="efi_client_id" placeholder="Client ID da EFI" />
          <SecretField label="Client Secret" fieldKey="efi_client_secret" placeholder="Client Secret da EFI" />
          <SecretField label="Chave PIX" fieldKey="efi_pix_key" placeholder="Chave PIX cadastrada" />
          <SecretField label="Certificado PFX (Base64)" fieldKey="efi_certificate" placeholder="Base64 do certificado" />
        </div>

        <div className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-border/30">
          <Label className="text-sm font-medium shrink-0">Ambiente Sandbox</Label>
          <button
            type="button"
            onClick={() => setSettings(prev => ({ ...prev, efi_sandbox: !prev.efi_sandbox }))}
            className={cn(
              "relative w-12 h-6 rounded-full transition-colors",
              settings.efi_sandbox ? "bg-yellow-500" : "bg-muted-foreground/30"
            )}
          >
            <span className={cn(
              "absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform",
              settings.efi_sandbox && "translate-x-6"
            )} />
          </button>
          <span className="text-xs text-muted-foreground">
            {settings.efi_sandbox ? "Sandbox (homologação)" : "Produção"}
          </span>
        </div>

        <div className="flex justify-end pt-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {saving ? "Salvando..." : "Salvar Credenciais"}
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

// ─── 4. Membro Fundador ────────────────────────────────────────────────────────
const FoundingMemberSection = () => {
  const { toast } = useToast();
  const [members, setMembers] = useState<FoundingMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FoundingMember | null>(null);

  const emptyMember = (): FoundingMember => ({
    id: generateId(),
    name: "",
    email: "",
    phone: "",
    plan: "monthly",
    value_cents: 2292,
    status: "pending",
    registered_at: new Date().toISOString(),
    frozen_price: true,
  });

  const planPrices: Record<string, { label: string; cents: number }> = {
    monthly: { label: "Mensal", cents: 2292 },
    quarterly: { label: "Trimestral", cents: 6992 },
    yearly: { label: "Anual", cents: 22222 },
  };

  const loadMembers = useCallback(async () => {
    try {
      const { data } = await supabase.from("system_settings" as any).select("*").maybeSingle();
      if (data && (data as any).founding_members) {
        setMembers(JSON.parse((data as any).founding_members));
      }
    } catch (e) {
      console.error("Error loading founding members:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadMembers(); }, [loadMembers]);

  const saveMembers = async (updated: FoundingMember[]) => {
    setSaving(true);
    try {
      const { data: existing } = await supabase.from("system_settings" as any).select("id").maybeSingle();
      const payload = { founding_members: JSON.stringify(updated) };
      if (existing) {
        await supabase.from("system_settings" as any).update(payload as any).eq("id", (existing as any).id);
      } else {
        await supabase.from("system_settings" as any).insert([payload as any]);
      }
      setMembers(updated);
      toast({ title: "Membros Fundadores atualizados!" });
    } catch (e) {
      toast({ title: "Erro ao salvar", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!editing) return;
    const updated = members.find(m => m.id === editing.id)
      ? members.map(m => m.id === editing.id ? editing : m)
      : [...members, editing];
    await saveMembers(updated);
    setShowForm(false);
    setEditing(null);
  };

  const handleDelete = async (id: string) => {
    await saveMembers(members.filter(m => m.id !== id));
  };

  const markAsPaid = async (id: string) => {
    const updated = members.map(m =>
      m.id === id ? { ...m, status: 'paid' as const, paid_at: new Date().toISOString() } : m
    );
    await saveMembers(updated);
  };

  const totalRaised = members
    .filter(m => m.status === 'paid')
    .reduce((acc, m) => acc + m.value_cents, 0);

  const stats = [
    { label: "Total Arrecadado", value: `R$ ${(totalRaised / 100).toFixed(2)}`, icon: DollarSign, color: "text-green-400", bg: "bg-green-500/10" },
    { label: "Membros Ativos", value: members.filter(m => m.status === 'paid').length, icon: Star, color: "text-yellow-400", bg: "bg-yellow-500/10" },
    { label: "Pendentes", value: members.filter(m => m.status === 'pending').length, icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
  ];

  return (
    <Section title="Membros Fundadores" subtitle="Gestão manual dos primeiros assinantes (Pré-lançamento)" icon={Star}>
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map(s => (
            <div key={s.label} className={cn("rounded-xl p-4 border border-border/30", s.bg)}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={cn("w-4 h-4", s.color)} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className={cn("text-xl font-bold", s.color)}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Strategy Card */}
        <div className="rounded-xl border border-yellow-500/20 bg-yellow-500/5 p-4">
          <h4 className="text-sm font-semibold text-yellow-400 flex items-center gap-2 mb-2">
            <Star className="w-4 h-4" /> Estratégia Membro Fundador
          </h4>
          <ul className="space-y-1.5 text-xs text-muted-foreground">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
              Cobrança manual via PIX (Nubank PJ) — custo zero, dinheiro na hora
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
              Preço congelado vitalício para Membros Fundadores
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
              Gestão manual nesta planilha durante o período de transição
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-3.5 h-3.5 text-green-400 shrink-0 mt-0.5" />
              Migração futura para recorrência automática via EFI Bank
            </li>
          </ul>
        </div>

        {/* Members list */}
        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground py-8 justify-center">
            <Loader2 className="w-4 h-4 animate-spin" /> Carregando membros...
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {members.map(m => {
                const plan = planPrices[m.plan] || { label: m.plan, cents: m.value_cents };
                return (
                  <div key={m.id} className={cn(
                    "rounded-xl border p-4 flex items-center gap-4 transition-all",
                    m.status === 'paid' ? "border-green-500/30 bg-green-500/5" :
                    m.status === 'expired' ? "border-red-500/20 bg-red-500/5 opacity-60" :
                    "border-border/40 bg-card/60"
                  )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{m.name || "Sem nome"}</p>
                        {m.frozen_price && (
                          <Badge variant="outline" className="text-[9px] text-yellow-400 border-yellow-400/30 bg-yellow-400/5">
                            Preço Congelado
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{m.email} • {m.phone}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-medium text-primary">
                          {plan.label} — R$ {(m.value_cents / 100).toFixed(2)}
                        </span>
                        {m.paid_at && (
                          <span className="text-[10px] text-muted-foreground">
                            Pago em {new Date(m.paid_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {m.status === 'pending' && (
                        <Button size="sm" className="h-7 text-xs gap-1 bg-green-500 hover:bg-green-600 text-white"
                          onClick={() => markAsPaid(m.id)} disabled={saving}>
                          <CheckCircle className="w-3 h-3" /> Confirmar
                        </Button>
                      )}
                      {m.status === 'paid' ? (
                        <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                          <CheckCircle className="w-3 h-3 mr-1" /> Pago
                        </Badge>
                      ) : m.status === 'expired' ? (
                        <Badge className="bg-red-500/20 text-red-400 border-red-500/30">Expirado</Badge>
                      ) : (
                        <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
                          <Clock className="w-3 h-3 mr-1" /> Pendente
                        </Badge>
                      )}
                      <Button size="sm" variant="outline" className="h-7 text-xs"
                        onClick={() => { setEditing({ ...m }); setShowForm(true); }}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button size="sm" variant="ghost" className="h-7 text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(m.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                );
              })}
              {members.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Nenhum Membro Fundador cadastrado ainda.
                </div>
              )}
            </div>

            <Button variant="outline" className="gap-2 w-full" onClick={() => { setEditing(emptyMember()); setShowForm(true); }}>
              <Plus className="w-4 h-4" /> Adicionar Membro Fundador
            </Button>

            <AnimatePresence>
              {showForm && editing && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="rounded-xl border border-yellow-400/30 bg-yellow-500/5 p-5 space-y-4"
                >
                  <h4 className="font-semibold text-sm flex items-center gap-2">
                    <Star className="w-4 h-4 text-yellow-400" />
                    {members.find(m => m.id === editing.id) ? "Editar Membro Fundador" : "Novo Membro Fundador"}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Nome Completo</Label>
                      <Input value={editing.name} onChange={e => setEditing({ ...editing, name: e.target.value })} placeholder="Nome do assinante" className="bg-background/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Email</Label>
                      <Input type="email" value={editing.email} onChange={e => setEditing({ ...editing, email: e.target.value })} placeholder="email@exemplo.com" className="bg-background/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">WhatsApp</Label>
                      <Input value={editing.phone} onChange={e => setEditing({ ...editing, phone: e.target.value })} placeholder="14997094362" className="bg-background/50" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Plano</Label>
                      <Select value={editing.plan} onValueChange={(v: 'monthly' | 'quarterly' | 'yearly') => {
                        const p = planPrices[v];
                        setEditing({ ...editing, plan: v, value_cents: p.cents });
                      }}>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(planPrices).map(([key, val]) => (
                            <SelectItem key={key} value={key}>{val.label} — R$ {(val.cents / 100).toFixed(2)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Valor (centavos)</Label>
                      <Input type="number" value={editing.value_cents} onChange={e => setEditing({ ...editing, value_cents: parseInt(e.target.value) || 0 })} className="bg-background/50" />
                      <p className="text-[10px] text-muted-foreground">R$ {(editing.value_cents / 100).toFixed(2)}</p>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Status</Label>
                      <Select value={editing.status} onValueChange={(v: 'paid' | 'pending' | 'expired') => {
                        const updates: Partial<FoundingMember> = { status: v };
                        if (v === 'paid' && !editing.paid_at) updates.paid_at = new Date().toISOString();
                        setEditing({ ...editing, ...updates });
                      }}>
                        <SelectTrigger className="bg-background/50">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pendente</SelectItem>
                          <SelectItem value="paid">Pago</SelectItem>
                          <SelectItem value="expired">Expirado</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5 flex items-center pt-6">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <button
                          type="button"
                          onClick={() => setEditing({ ...editing, frozen_price: !editing.frozen_price })}
                          className={cn(
                            "relative w-10 h-5 rounded-full transition-colors",
                            editing.frozen_price ? "bg-yellow-500" : "bg-muted-foreground/30"
                          )}
                        >
                          <span className={cn(
                            "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform",
                            editing.frozen_price && "translate-x-5"
                          )} />
                        </button>
                        <span className="text-xs text-muted-foreground">Preço congelado vitalício</span>
                      </label>
                    </div>
                    <div className="space-y-1.5 md:col-span-2">
                      <Label className="text-xs">Observações</Label>
                      <Input value={editing.notes || ""} onChange={e => setEditing({ ...editing, notes: e.target.value })} placeholder="Anotações internas..." className="bg-background/50" />
                    </div>
                  </div>
                  <div className="flex gap-3 justify-end pt-2">
                    <Button variant="outline" onClick={() => { setShowForm(false); setEditing(null); }}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Salvar
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

// ─── 5. Financial Report ──────────────────────────────────────────────────────
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
  const sanitizePrice = (val: string) => {
    const cleaned = (val || "0").replace(/[^\d,.]/g, "").replace(",", ".");
    return parseFloat(cleaned) || 0;
  };
  const mrr = subscribers
    .filter(s => getPaymentStatus(s) === "em_dia")
    .reduce((acc, s) => acc + sanitizePrice(s.metadata?.price || "0"), 0);

  const sendWhatsAppAlert = (sub: Subscriber) => {
    const name = sub.full_name?.split(" ")[0] || "Assinante";
    const plan = sub.plan_type || "seu plano";
    const msg = encodeURIComponent(
      `Olá, ${name}! 😊\n\nIdentificamos que a sua assinatura do *${plan}* está com pagamento pendente.\n\nPara continuar aproveitando todos os benefícios, clique no link abaixo para regularizar:\n\n[Link de pagamento aqui]\n\nQualquer dúvida, estamos à disposição! 🙏`
    );
    const phone = sub.phone?.replace(/\D/g, "");
    window.open(`https://wa.me/${phone}?text=${msg}`, "_blank");
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
          <TabsTrigger value="founders" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background py-2 px-4 text-yellow-400 data-[state=active]:text-yellow-400">
            <Star className="w-4 h-4" /> Membros Fundadores
          </TabsTrigger>
          <TabsTrigger value="financial" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background py-2 px-4">
            <BarChart3 className="w-4 h-4" /> Financeiro
          </TabsTrigger>
          <TabsTrigger value="monetization" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background py-2 px-4 text-emerald-400 data-[state=active]:text-emerald-400">
            <DollarSign className="w-4 h-4" /> Monetização
          </TabsTrigger>
          <TabsTrigger value="subscribers" className="flex items-center gap-2 rounded-lg data-[state=active]:bg-background py-2 px-4 text-yellow-500 data-[state=active]:text-yellow-500">
            <Users className="w-4 h-4" /> Assinantes
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gateway"><GatewaySection /></TabsContent>
        <TabsContent value="plans"><PlansSection /></TabsContent>
        <TabsContent value="services"><ServicesSection /></TabsContent>
        <TabsContent value="founders"><FoundingMemberSection /></TabsContent>
        <TabsContent value="financial"><FinancialSection /></TabsContent>
        <TabsContent value="monetization">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-border/40 bg-card/60 backdrop-blur-sm p-6"
          >
            <MonetizationSection />
          </motion.div>
        </TabsContent>
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
