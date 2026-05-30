import { useState, useEffect, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { Users, Search, Download, MessageSquare, Send, Calendar, Star, ShieldCheck, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SubscriberModal } from "./subscribers/SubscriberModal";
import { useAuth } from "@/contexts/AuthContext";
import { SafeImage } from "@/components/ui/SafeImage";

export interface Subscriber {
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
    receipt_url?: string;
    profile_picture_url?: string;
    instagram_username?: string;
    telegram_username?: string;
  };
}

// ─── SubscriberAvatar Helper Component ───────────────────────────────────────
export const SubscriberAvatar = ({
  fullName,
  email,
  phone,
  profilePictureUrl,
  instagramUsername,
  telegramUsername,
  className
}: {
  fullName: string;
  email?: string;
  phone?: string;
  profilePictureUrl?: string;
  instagramUsername?: string;
  telegramUsername?: string;
  className?: string;
}) => {
  const initials = fullName
    ? fullName.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()
    : "??";

  // Use the profile picture URL if available, otherwise try common fallbacks
  const src = profilePictureUrl || 
              (instagramUsername ? `https://unavatar.io/instagram/${instagramUsername.replace("@", "")}` : "") ||
              (telegramUsername ? `https://unavatar.io/telegram/${telegramUsername.replace("@", "")}` : "") ||
              (email ? `https://unavatar.io/gravatar/${email.toLowerCase()}` : "");

  return (
    <SafeImage
      src={src}
      alt={fullName}
      className={cn("w-full h-full", className)}
      placeholderIcon={
        <div className={cn(
          "w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-600/40 to-pink-500/40",
          className
        )}>
          <span className="text-white/60 font-bold text-sm tracking-tighter">{initials}</span>
        </div>
      }
    />
  );
};

const ALLOWED_ROLES = ["dev_master", "admin_master", "admin", "dev", "contador"];

export const SubscribersView = () => {
  const { profile } = useAuth();
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedSubscriber, setSelectedSubscriber] = useState<Subscriber | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const userRole = profile?.role || 'user';
  const isAuthorized = ALLOWED_ROLES.includes(userRole);

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('portal_subscribers' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSubscribers((data as any) || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const filtered = useMemo(() => 
    subscribers.filter(s => 
      s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
      s.phone?.includes(search) ||
      s.email?.toLowerCase().includes(search.toLowerCase())
    ),
    [subscribers, search]
  );

  const translateDuration = (dur?: string) => {
    if (!dur) return 'MENSAL';
    switch (dur.toLowerCase()) {
      case 'monthly': return 'MENSAL';
      case 'quarterly': return 'TRIMESTRAL';
      case 'semiannual': return 'SEMESTRAL';
      case 'yearly': return 'ANUAL';
      default: return dur.toUpperCase();
    }
  };

  if (!isAuthorized) {
    return (
      <div className="text-center py-20 border border-dashed border-red-500/20 rounded-3xl">
        <Lock className="w-12 h-12 mx-auto text-red-400/40 mb-4" />
        <p className="text-red-400 font-bold uppercase text-[10px] tracking-widest">Acesso restrito</p>
        <p className="text-muted-foreground text-sm mt-2">Apenas administradores podem gerenciar assinantes.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p className="text-[10px] font-black uppercase text-amber-500 tracking-wider">
            Total da Base: {filtered.length} {filtered.length === 1 ? 'assinante' : 'assinantes'}
          </p>
        </div>
        <Button variant="outline" className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2 bg-white/5 border-white/10 text-white">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          id="subscribers-search"
          name="subscribers-search"
          autoComplete="off"
          placeholder="Pesquisar por nome, telefone ou email..." 
          className="pl-12 h-12 rounded-2xl bg-white/5 border-white/10 text-white"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20 animate-pulse text-muted-foreground">Carregando assinantes...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 border border-dashed border-white/10 rounded-3xl">
            <Users className="w-12 h-12 mx-auto text-muted-foreground/20 mb-4" />
            <p className="text-muted-foreground font-bold uppercase text-[10px] tracking-widest">Nenhum assinante encontrado</p>
          </div>
        ) : (
          filtered.map((sub, i) => (
            <motion.div
              key={sub.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.02 }}
              className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all gap-4"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center border overflow-hidden shrink-0 bg-white/5",
                  sub.plan_type === 'paid_sub' ? "border-yellow-400/30 text-yellow-400" : "border-primary/30 text-primary"
                )}>
                  <SubscriberAvatar
                    fullName={sub.full_name}
                    email={sub.email}
                    phone={sub.phone}
                    profilePictureUrl={sub.metadata?.profile_picture_url}
                    instagramUsername={sub.metadata?.instagram_username}
                    telegramUsername={sub.metadata?.telegram_username}
                  />
                </div>
                <div>
                  <h4 className="font-bold text-white uppercase tracking-tight flex items-center gap-1.5">
                    {sub.plan_type === 'paid_sub' && <Star className="w-4 h-4 text-yellow-400 fill-yellow-400 shrink-0 inline-block" />}
                    <span>{sub.full_name}</span>
                  </h4>
                  <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-500" /> {new Date(sub.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3 text-green-500" /> {sub.phone}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-4">
                <Badge className={cn(
                  "uppercase text-[9px] font-black tracking-widest py-1 px-3 shadow",
                  sub.plan_type === 'paid_sub' ? "bg-yellow-400 text-black hover:bg-yellow-400" : "bg-primary text-white"
                )}>
                  {sub.plan_type === 'paid_sub' ? "VIP " + translateDuration(sub.metadata?.plan_duration) : "Gratuito"}
                </Badge>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 bg-[#25D366]/10 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366] hover:text-black font-black uppercase text-[10px] tracking-widest px-3 flex items-center gap-1.5 transition-all shadow-md"
                    onClick={() => {
                      const phoneNum = sub.phone ? sub.phone.replace(/\D/g, '') : '';
                      const text = encodeURIComponent(`Olá ${sub.full_name || 'Assinante'}, aqui é do portal Web Rádio Vitória!`);
                      window.open(`https://wa.me/${phoneNum.startsWith('55') ? phoneNum : '55' + phoneNum}?text=${text}`, '_blank');
                    }}
                  >
                    <MessageSquare className="w-3.5 h-3.5 fill-current" /> Conversar
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="h-8 text-[10px] font-black uppercase tracking-widest text-yellow-400 border-yellow-400/30 bg-yellow-400/5 hover:bg-yellow-400 hover:text-black transition-all shadow-md"
                    onClick={() => {
                      setSelectedSubscriber(sub);
                      setModalOpen(true);
                    }}
                  >
                    Detalhes
                  </Button>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>

      <SubscriberModal 
        subscriber={selectedSubscriber}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onUpdated={fetchSubscribers}
      />
    </div>
  );
};
