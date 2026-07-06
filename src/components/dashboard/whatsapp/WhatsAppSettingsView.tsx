import { useState, useEffect } from "react";
import { Smartphone, CheckCircle, XCircle, RefreshCw, Phone, User, Clock, AtSign, MessageCircle, Bot, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { SafeImage } from "@/components/ui/SafeImage";
import { cn } from "@/lib/utils";
import { WhatsAppBotSettingsTab } from "./WhatsAppBotSettingsTab";
import { WhatsAppBackupsTab } from "./WhatsAppBackupsTab";

interface WhatsAppSettingsViewProps {
  userId?: string;
}

type SettingsTab = "general" | "bot" | "backup";

const SETTINGS_TABS: { id: SettingsTab; label: string; icon: React.ElementType }[] = [
  { id: "general", label: "Geral", icon: Smartphone },
  { id: "bot", label: "Bot", icon: Bot },
  { id: "backup", label: "Backup", icon: Database },
];

function SettingsProfile({ userId }: { userId?: string }) {
  const [connection, setConnection] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        const [{ data: conn }, { data: prof }] = await Promise.all([
          supabase
            .from('social_connections')
            .select('*')
            .eq('user_id', userId)
            .eq('platform', 'whatsapp')
            .not('phone_number_id', 'is', null)
            .limit(1)
            .then(({ data }) => ({ data: data?.[0] || null })),
          supabase
            .from('profiles')
            .select('*')
            .eq('user_id', userId)
            .maybeSingle()
            .then(({ data }) => ({ data: data || null })),
        ]);

        if (cancelled) return;

        setConnection(conn);
        setProfile(prof);
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#0B141A]">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 text-[#8696a0] animate-spin" />
          <p className="text-sm text-[#8696a0]">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Profile Header with Photo */}
      <div className="text-center py-10 px-6 border-b border-white/5">
        <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-4 ring-4 ring-[#25D366]/30">
          {connection?.avatar_url ? (
            <SafeImage
              src={connection.avatar_url}
              alt="Profile"
              className="w-full h-full object-cover"
              isWhatsAppImage
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center">
              <Smartphone className="w-10 h-10 text-white" />
            </div>
          )}
        </div>
        <h2 className="text-[22px] font-bold text-white">
          {connection?.page_name || connection?.name || profile?.full_name || "WhatsApp Business"}
        </h2>
        {profile?.username && (
          <p className="text-sm text-[#8696a0] mt-1 flex items-center justify-center gap-1">
            <AtSign className="w-3.5 h-3.5" />
            {profile.username}
          </p>
        )}
        {connection ? (
          <div className="mt-3 flex items-center justify-center gap-2">
            <span className="flex items-center gap-1 text-xs text-[#00A884] bg-[#00A884]/10 px-3 py-1 rounded-full">
              <CheckCircle className="w-3 h-3" /> Conectado
            </span>
          </div>
        ) : (
          <p className="text-sm text-[#CC3169] mt-2 flex items-center justify-center gap-1">
            <XCircle className="w-4 h-4" /> Não conectado
          </p>
        )}
        {connection?.metadata?.status && (
          <p className="text-xs text-[#8696a0] mt-2 italic">"{connection.metadata.status}"</p>
        )}
      </div>

      {/* Account Details */}
      <div className="px-6 py-6 space-y-5">
        {connection ? (
          <>
            <div className="flex items-center gap-4">
              <Phone className="w-5 h-5 text-[#8696a0]" />
              <div>
                <p className="text-xs text-[#8696a0]">Número WhatsApp</p>
                <p className="text-sm font-medium text-white">{connection.phone_number_id || connection.phone || connection.platform_user_id || "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <User className="w-5 h-5 text-[#8696a0]" />
              <div>
                <p className="text-xs text-[#8696a0]">Nome da Conta</p>
                <p className="text-sm font-medium text-white">{connection.page_name || connection.name || "WhatsApp Business"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <AtSign className="w-5 h-5 text-[#8696a0]" />
              <div>
                <p className="text-xs text-[#8696a0]">Username</p>
                <p className="text-sm font-medium text-white">{profile?.username ? `@${profile.username}` : "—"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <MessageCircle className="w-5 h-5 text-[#8696a0]" />
              <div>
                <p className="text-xs text-[#8696a0]">Status</p>
                <p className="text-sm font-medium text-white">{connection.metadata?.status || "Disponível"}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Clock className="w-5 h-5 text-[#8696a0]" />
              <div>
                <p className="text-xs text-[#8696a0]">Conectado em</p>
                <p className="text-sm font-medium text-white">
                  {connection.created_at ? new Date(connection.created_at).toLocaleDateString('pt-BR') : "—"}
                </p>
              </div>
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-[#8696a0] mb-4">Nenhuma conta WhatsApp Business conectada.</p>
            <p className="text-xs text-[#8696a0]">Conecte seu WhatsApp Business nas configurações de integrações para começar a enviar mensagens.</p>
          </div>
        )}
      </div>
    </>
  );
}

export function WhatsAppSettingsView({ userId }: WhatsAppSettingsViewProps) {
  const [subTab, setSubTab] = useState<SettingsTab>("general");

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Sub-tab navigation */}
      <div className="flex items-center gap-1 px-4 py-2 border-b border-border/50 bg-muted/30 shrink-0">
        {SETTINGS_TABS.map((t) => {
          const Icon = t.icon;
          const isCurrent = subTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setSubTab(t.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors",
                isCurrent
                  ? "bg-primary/20 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent"
              )}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* Sub-tab content */}
      <div className="flex-1 overflow-y-auto">
        {subTab === "general" && <SettingsProfile userId={userId} />}
        {subTab === "bot" && <WhatsAppBotSettingsTab />}
        {subTab === "backup" && <WhatsAppBackupsTab />}
      </div>
    </div>
  );
}
