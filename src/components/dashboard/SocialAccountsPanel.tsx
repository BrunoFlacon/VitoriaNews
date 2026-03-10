import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Users, RefreshCw, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface SocialAccount {
  id: string;
  platform: string;
  username: string | null;
  profile_picture: string | null;
  followers: number;
  following: number;
  posts_count: number;
  engagement_rate: number;
  last_synced_at: string | null;
}

export const SocialAccountsPanel = () => {
  const { user } = useAuth();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetch = async () => {
      const { data } = await supabase
        .from("social_accounts")
        .select("*")
        .eq("user_id", user.id)
        .order("platform");
      setAccounts((data as SocialAccount[]) || []);
      setLoading(false);
    };
    fetch();
  }, [user]);

  const formatNumber = (n: number) => {
    if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
    if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
    return n.toString();
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="font-display font-bold text-3xl mb-1">Contas Sociais</h1>
          <p className="text-muted-foreground">Perfis conectados e estatísticas</p>
        </div>
        <Button variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" /> Sincronizar
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16">
          <Users className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">Nenhuma conta sincronizada</h3>
          <p className="text-muted-foreground">Conecte redes sociais em Configurações para ver perfis aqui</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((account, i) => (
            <motion.div
              key={account.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="p-5 rounded-2xl border border-border bg-card"
            >
              <div className="flex items-center gap-3 mb-4">
                <Avatar className="w-12 h-12">
                  {account.profile_picture ? (
                    <AvatarImage src={account.profile_picture} />
                  ) : null}
                  <AvatarFallback>{account.platform[0].toUpperCase()}</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">{account.username || account.platform}</h3>
                  <Badge variant="secondary">{account.platform}</Badge>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-lg font-bold">{formatNumber(account.followers)}</p>
                  <p className="text-xs text-muted-foreground">Seguidores</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{formatNumber(account.posts_count)}</p>
                  <p className="text-xs text-muted-foreground">Posts</p>
                </div>
                <div>
                  <p className="text-lg font-bold">{account.engagement_rate}%</p>
                  <p className="text-xs text-muted-foreground">Engajamento</p>
                </div>
              </div>
              {account.last_synced_at && (
                <p className="text-xs text-muted-foreground mt-3 text-center">
                  Sincronizado: {new Date(account.last_synced_at).toLocaleString("pt-BR")}
                </p>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SocialAccountsPanel;
