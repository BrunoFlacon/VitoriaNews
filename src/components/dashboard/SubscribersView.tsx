import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, Search, Download, MessageSquare, Send, Calendar, Star, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Subscriber {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string;
  tier: string;
  created_at: string;
  metadata?: {
    plan_duration?: string;
    preferred_messenger?: string;
  };
}

export const SubscribersView = () => {
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('portal_subscribers' as any)
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setSubscribers(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const filtered = subscribers.filter(s => 
    s.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    s.whatsapp?.includes(search) ||
    s.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-display font-black uppercase tracking-tighter">Gestão de Assinantes</h2>
          <p className="text-muted-foreground">Controle interno da comunidade VIP e leads.</p>
        </div>
        <Button variant="outline" className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2">
          <Download className="w-4 h-4" /> Exportar CSV
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input 
          placeholder="Pesquisar por nome, telefone ou email..." 
          className="pl-12 h-12 rounded-2xl bg-white/5 border-white/10"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading ? (
          <div className="text-center py-20 animate-pulse">Carregando assinantes...</div>
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
              className="group flex items-center justify-between p-4 bg-white/[0.02] border border-white/5 rounded-2xl hover:bg-white/[0.05] transition-all"
            >
              <div className="flex items-center gap-4">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center border",
                  sub.tier === 'paid_sub' ? "bg-yellow-400/10 border-yellow-400/20 text-yellow-400" : "bg-primary/10 border-primary/20 text-primary"
                )}>
                  {sub.tier === 'paid_sub' ? <Star className="w-6 h-6" /> : <Users className="w-6 h-6" />}
                </div>
                <div>
                  <h4 className="font-bold text-white uppercase tracking-tight">{sub.full_name}</h4>
                  <div className="flex items-center gap-3 text-[10px] font-medium text-slate-400 uppercase tracking-widest mt-1">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(sub.created_at).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1"><MessageSquare className="w-3 h-3" /> {sub.whatsapp}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right pr-4 border-r border-white/5 hidden md:block">
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Preferencia</div>
                  <div className="flex items-center justify-end gap-2">
                    {sub.metadata?.preferred_messenger === 'whatsapp' ? <MessageSquare className="w-3 h-3 text-green-500" /> : <Send className="w-3 h-3 text-blue-500" />}
                    <span className="text-[10px] font-bold text-white uppercase">{sub.metadata?.preferred_messenger || 'WhatsApp'}</span>
                  </div>
                </div>
                
                <div className="flex flex-col items-end gap-2">
                  <Badge className={cn(
                    "uppercase text-[9px] font-black tracking-widest py-1",
                    sub.tier === 'paid_sub' ? "bg-yellow-400 text-black hover:bg-yellow-400" : "bg-primary text-white"
                  )}>
                    {sub.tier === 'paid_sub' ? "VIP " + (sub.metadata?.plan_duration || '') : "Gratuito"}
                  </Badge>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 text-[9px] font-black uppercase text-slate-400 hover:text-white"
                      onClick={() => {
                        const phone = sub.whatsapp.replace(/\D/g, '');
                        window.open(`https://wa.me/${phone.startsWith('55') ? phone : '55' + phone}`, '_blank');
                      }}
                    >
                      <MessageSquare className="w-3 h-3 mr-1" /> WhatsApp
                    </Button>
                    <Button variant="ghost" size="sm" className="h-7 text-[9px] font-black uppercase text-slate-400 hover:text-white">
                      Ver Detalhes
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
