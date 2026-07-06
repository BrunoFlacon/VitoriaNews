import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { MessageCircle, Circle, Megaphone, Users, Settings, User, Pencil, LogOut, Smartphone, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { SafeImage } from "@/components/ui/SafeImage";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

interface WhatsAppNavIconsProps {
  activeNav: string;
  onNavChange: (nav: string) => void;
}

const TOP_NAV = [
  { key: "chats", icon: MessageCircle, label: "Chats" },
  { key: "status", icon: Circle, label: "Status" },
  { key: "newsletter", icon: Megaphone, label: "Novidades" },
  { key: "communities", icon: Users, label: "Comunidades" },
];

interface ConnectionProfile {
  id: string;
  name: string;
  phone: string;
  avatar_url: string | null;
  is_connected: boolean;
}

export function WhatsAppNavIcons({ activeNav, onNavChange }: WhatsAppNavIconsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [profileName, setProfileName] = useState<string>("");
  const [connections, setConnections] = useState<ConnectionProfile[]>([]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;

    const fetchData = async () => {
      try {
        // Fetch all WhatsApp connections for multi-profile menu
        const { data: conns } = await supabase
          .from('social_connections')
          .select('id, page_name, username, profile_image_url, profile_picture, metadata, is_connected')
          .eq('user_id', user.id)
          .eq('platform', 'whatsapp')
          .order('created_at', { ascending: false });

        if (!cancelled && conns && conns.length > 0) {
          const profiles: ConnectionProfile[] = conns.map(c => ({
            id: c.id,
            name: c.page_name || c.username || (c.metadata as Record<string,any>)?.business_name || "WhatsApp",
            phone: c.username || (c.metadata as Record<string,any>)?.phone || "",
            avatar_url: c.profile_image_url || c.profile_picture || (c.metadata as Record<string,any>)?.avatar_url || null,
            is_connected: c.is_connected || false,
          }));
          setConnections(profiles);

          // Set avatar from first connected connection or first connection
          const activeProfile = profiles.find(p => p.is_connected) || profiles[0];
          if (!cancelled && activeProfile) {
            if (activeProfile.avatar_url) setAvatarUrl(activeProfile.avatar_url);
            setProfileName(activeProfile.name);
          }
          return;
        }

        // Fallback to user profile if no WhatsApp connections
        const { data: profile } = await supabase
          .from('profiles')
          .select('avatar_url, name')
          .eq('user_id', user.id)
          .maybeSingle();
        if (!cancelled) {
          if (profile?.avatar_url) setAvatarUrl(profile.avatar_url);
          setProfileName(profile?.name || user.email?.split('@')[0] || "Usuário");
        }
      } catch {
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [user?.id]);

  return (
    <div className="w-[68px] shrink-0 bg-[#1f2c33] flex flex-col items-center py-3 border-r border-white/5">
      <div className="flex flex-col items-center gap-1 flex-1">
        {TOP_NAV.map(({ key, icon: Icon, label }) => {
          const isActive = activeNav === key;
          return (
            <button
              key={key}
              onClick={() => onNavChange(key)}
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center transition-all relative group",
                isActive ? "bg-[#2a3942]" : "hover:bg-[#2a3942]"
              )}
              title={label}
            >
              <Icon className={cn("w-6 h-6", isActive ? "text-[#A0B4BC]" : "text-[#8696a0]")} />
            </button>
          );
        })}
      </div>

      {/* Profile + Settings merged */}
      <div className="flex flex-col items-center pt-3 w-full px-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex flex-col items-center gap-0.5 group relative"
              title="Perfil e configurações"
            >
              <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center overflow-hidden ring-2 ring-[#25D366]/30 cursor-pointer hover:ring-[#25D366]/60 transition-all group-hover:scale-105">
                {avatarUrl ? (
                  <SafeImage src={avatarUrl} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-[#8696a0]" />
                )}
                <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/20 transition-colors" />
              </div>
              <div className="flex items-center gap-0.5 mt-0.5">
                <Settings className="w-3.5 h-3.5 text-[#8696a0] group-hover:text-[#A0B4BC] transition-colors" />
                <span className="text-[8px] text-[#8696a0] group-hover:text-[#A0B4BC] font-medium transition-colors">PERFIL</span>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" side="right" sideOffset={8} className="w-64">
            <DropdownMenuLabel className="font-normal">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#2a3942] overflow-hidden shrink-0 ring-2 ring-[#25D366]/30">
                  {avatarUrl ? (
                    <SafeImage src={avatarUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-5 h-5 m-2.5 text-[#8696a0]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{profileName}</p>
                  <p className="text-xs text-[#8696a0] truncate">{user?.email || ""}</p>
                </div>
              </div>
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer py-2" onClick={() => onNavChange("settings")}>
              <Pencil className="w-4 h-4 mr-3 text-[#00A884]" /> Editar perfil
            </DropdownMenuItem>
            <DropdownMenuItem className="cursor-pointer py-2" onClick={() => onNavChange("settings")}>
              <Settings className="w-4 h-4 mr-3" /> Configurações
            </DropdownMenuItem>

            {connections.length > 1 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-[11px] text-[#8696a0] uppercase tracking-wider font-semibold">
                  Contas WhatsApp
                </DropdownMenuLabel>
                {connections.map((conn) => (
                  <DropdownMenuItem
                    key={conn.id}
                    className={cn("cursor-pointer py-2", conn.is_connected && "bg-[#00A884]/10")}
                    onClick={async () => {
                      try {
                        await supabase
                          .from('social_connections')
                          .update({ is_connected: false })
                          .eq('user_id', user?.id)
                          .eq('platform', 'whatsapp');
                        await supabase
                          .from('social_connections')
                          .update({ is_connected: true })
                          .eq('id', conn.id);
                        toast({ title: `Alternando para ${conn.name}` });
                        // Re-fetch to update UI
                        window.location.reload();
                      } catch {
                        toast({ title: "Erro ao alternar conta", variant: "destructive" });
                      }
                    }}
                  >
                    <div className="relative mr-3">
                      <div className="w-7 h-7 rounded-full bg-[#2a3942] overflow-hidden">
                        {conn.avatar_url ? (
                          <SafeImage src={conn.avatar_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Smartphone className="w-3.5 h-3.5 m-1.5 text-[#8696a0]" />
                        )}
                      </div>
                      {conn.is_connected && (
                        <CheckCircle className="w-3 h-3 text-[#00A884] absolute -bottom-0.5 -right-0.5" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{conn.name}</p>
                      <p className="text-xs text-[#8696a0] truncate">+{conn.phone}</p>
                    </div>
                    {conn.is_connected && (
                      <span className="text-[10px] font-bold text-[#00A884] bg-[#00A884]/10 px-1.5 py-0.5 rounded">CONECTADO</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem className="cursor-pointer py-2 text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={async () => {
              try {
                await supabase
                  .from('social_connections')
                  .update({ is_connected: false, access_token: null, refresh_token: null })
                  .eq('user_id', user?.id)
                  .eq('platform', 'whatsapp');
                toast({ title: "WhatsApp desconectado", description: "Você foi desconectado com sucesso." });
              } catch {
                toast({ title: "Erro ao desconectar", variant: "destructive" });
              }
            }}>
              <LogOut className="w-4 h-4 mr-3" /> Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}

export default WhatsAppNavIcons;