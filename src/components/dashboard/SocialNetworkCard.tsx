import React, { forwardRef, useState, useEffect, useRef, memo } from "react";

import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Settings, Loader2, Star, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { SafeImage } from "@/components/ui/SafeImage";

interface SocialAccount {
  id: string;
  page_name: string | null;
  platform_user_id: string | null;
  profile_image_url?: string | null;
  followers_count?: number | null;
  posts_count?: number | null;
  page_id?: string | null;
  username?: string | null;
  token_expires_at?: string | null;
  isExpiringSoon?: boolean;
  daysUntilExpiry?: number | null;
  is_primary?: boolean;
}

interface SocialNetworkCardProps {
  platform: typeof socialPlatforms[number];
  isConnected: boolean;
  isConnecting?: boolean;
  pageName?: string | null;
  onConnect: () => void;
  onDisconnect: () => void;
  delay?: number;
  accounts?: SocialAccount[];
  selectedAccountId?: string | null;
  onSelectAccount?: (account: SocialAccount) => void;
  onSetPrimary?: (connectionId: string) => void;
}

export const SocialNetworkCard = memo(forwardRef<HTMLDivElement, SocialNetworkCardProps>(
  ({
    platform,
    isConnected,
    isConnecting,
    pageName,
    onConnect,
    onDisconnect,
    delay = 0,
    accounts = [],
    selectedAccountId,
    onSelectAccount,
    onSetPrimary,
  }, ref) => {
    const [gearOpen, setGearOpen] = useState(false);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, right: 0 });
    const gearBtnRef = useRef<HTMLButtonElement>(null);
    const Icon = platform.icon;

    const selectedAccount = accounts.find((a) => a.id === selectedAccountId) ?? accounts[0];

    const handleGearClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (gearBtnRef.current) {
        const rect = gearBtnRef.current.getBoundingClientRect();
        setDropdownPos({
          top: rect.bottom + window.scrollY + 6,
          right: window.innerWidth - rect.right + window.scrollX,
        });
      }
      setGearOpen((v) => !v);
    };

    const handleSelectAccount = (e: React.MouseEvent, account: SocialAccount) => {
      e.stopPropagation();
      onSelectAccount?.(account);
      setGearOpen(false);
    };

    // Close on outside click
    useEffect(() => {
      if (!gearOpen) return;
      const handler = () => setGearOpen(false);
      window.addEventListener("click", handler);
      return () => window.removeEventListener("click", handler);
    }, [gearOpen]);

    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay, duration: 0.3 }}
        whileHover={{ scale: 1.02 }}
        className={cn(
          "glass-card rounded-2xl p-5 border transition-all duration-300 cursor-pointer group relative",
          isConnected
            ? "border-green-500/30 bg-green-500/5"
            : "border-border hover:border-primary/30"
        )}
        onClick={() => (isConnected ? onDisconnect() : onConnect())}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {/* Platform icon or user avatar — rounded square, brand bg/avatar, diagonal shadow */}
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 relative",
                isConnected && !selectedAccount?.profile_image_url ? platform.color : "bg-muted/40"
              )}
              style={{
                // Strong diagonal shadow like the Snapchat reference
                boxShadow: isConnected
                  ? "5px 6px 14px rgba(0,0,0,0.55)"
                  : "4px 5px 10px rgba(0,0,0,0.35)",
              }}
            >
              {isConnected && selectedAccount?.profile_image_url ? (
                <>
                  <SafeImage
                    src={selectedAccount.profile_image_url}
                    alt={selectedAccount.page_name || platform.name}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                  <div
                    className={cn(
                      "absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center border-2 border-background shadow-md z-10",
                      platform.color
                    )}
                  >
                    <Icon className="w-3 h-3 text-white" />
                  </div>
                </>
              ) : (
                <Icon
                  className={cn("w-8 h-8", isConnected ? "text-white" : "text-muted-foreground")}
                  style={{
                    filter: "drop-shadow(3px 4px 3px rgba(0,0,0,0.50))",
                  }}
                />
              )}
            </div>

            <div>
              <h3 className="font-semibold">{platform.name}</h3>
              <p className="text-sm text-muted-foreground">
                {isConnecting
                  ? "Conectando..."
                  : isConnected
                    ? (selectedAccount?.page_name || (selectedAccount?.username ? `@${selectedAccount.username}` : pageName || "Conectado"))
                    : "Clique para conectar"}
              </p>
              {isConnected && selectedAccount && (
                <div className="flex items-center gap-3 mt-1.5">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Seguidores</span>
                    <span className="text-xs font-black font-mono text-foreground leading-none">
                      {Number(selectedAccount.followers_count || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="w-px h-5 bg-border/40" />
                  <div className="flex flex-col">
                    <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tighter">Posts</span>
                    <span className="text-xs font-black font-mono text-foreground leading-none">
                      {Number(selectedAccount.posts_count || 0).toLocaleString()}
                    </span>
                  </div>
                  {selectedAccount.isExpiringSoon && selectedAccount.daysUntilExpiry != null && (
                    <>
                      <div className="w-px h-5 bg-border/40" />
                      <span className="text-[9px] text-orange-400 uppercase font-bold whitespace-nowrap" title={selectedAccount.token_expires_at ? `Expira em: ${new Date(selectedAccount.token_expires_at).toLocaleDateString("pt-BR")}` : undefined}>
                        {selectedAccount.daysUntilExpiry <= 0 ? "Expirado" : `${selectedAccount.daysUntilExpiry}d`}
                      </span>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isConnected && (
              <button
                ref={gearBtnRef}
                onClick={handleGearClick}
                className="p-2 rounded-lg hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                title="Selecionar perfil"
              >
                <Settings className="w-4 h-4 text-muted-foreground" />
              </button>
            )}

            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center transition-all shrink-0",
              isConnecting
                ? "bg-muted text-muted-foreground"
                : isConnected
                  ? "bg-green-500 text-white"
                  : "bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground"
            )}>
              {isConnecting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isConnected ? (
                <Check className="w-4 h-4" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
            </div>
          </div>
        </div>

        {/* Profile selector rendered in portal to escape card stacking context */}
        {gearOpen && createPortal(
          <AnimatePresence>
            <motion.div
              key="profile-dropdown"
              initial={{ opacity: 0, scale: 0.95, y: -8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -8 }}
              transition={{ duration: 0.15 }}
              style={{
                position: "fixed",
                top: dropdownPos.top,
                right: dropdownPos.right,
                zIndex: 9999,
              }}
              className="min-w-[240px] bg-popover border border-border rounded-xl shadow-2xl overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-3 border-b border-border/60 flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Selecionar Perfil
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); setGearOpen(false); }}
                  className="p-0.5 rounded hover:bg-muted"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>

              <div className="p-1.5 max-h-64 overflow-y-auto">
                {accounts.length === 0 ? (
                  <p className="text-sm text-muted-foreground px-3 py-3 text-center">
                    Nenhum perfil disponível
                  </p>
                ) : (
                  accounts.map((account) => {
                    const isSelected = selectedAccountId
                      ? account.id === selectedAccountId
                      : account === accounts[0];
                    return (
                      <button
                        key={account.id}
                        onClick={(e) => handleSelectAccount(e, account)}
                        className={cn(
                          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
                          isSelected
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted text-foreground"
                        )}
                      >
                        {account.profile_image_url ? (
                          <SafeImage
                            src={account.profile_image_url}
                            alt={account.page_name || ""}
                            className="w-8 h-8 rounded-full object-cover border border-border"
                          />
                        ) : (
                          <div className={cn(
                            "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                            platform.color
                          )}>
                            <User className="w-4 h-4 text-white" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate flex items-center gap-1.5">
                            {account.page_name || (account.username ? `@${account.username}` : account.platform_user_id || "Perfil")}
                            {account.is_primary && (
                              <Star className="w-3 h-3 fill-yellow-500 text-yellow-500 shrink-0" />
                            )}
                          </p>
                            <div className="flex flex-wrap items-center gap-x-2">
                              {account.followers_count != null && !(platform.id === 'whatsapp' && account.followers_count === 0) && (
                                <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                  {(account.followers_count || 0).toLocaleString("pt-BR")} {platform.id === 'youtube' ? 'inscritos' : (platform.id === 'whatsapp' || platform.id === 'telegram' ? 'membros' : 'seguidores')}
                                </p>
                              )}
                              {account.posts_count != null && !(platform.id === 'whatsapp' && account.posts_count === 0) && !(platform.id === 'telegram' && account.posts_count === 0) && (
                                <>
                                  { account.followers_count != null && <div className="w-1 h-1 rounded-full bg-muted-foreground/30" /> }
                                  <p className="text-[10px] text-muted-foreground whitespace-nowrap">
                                    {(account.posts_count || 0).toLocaleString("pt-BR")} {platform.id === 'youtube' ? 'vídeos' : 'posts'}
                                  </p>
                                </>
                              )}
                            </div>
                        </div>
                        <div className="flex items-center gap-1">
                          {account.is_primary && (
                            <span className="text-[8px] font-black uppercase tracking-wider text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">Padrão</span>
                          )}
                          {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
              {accounts.length > 1 && onSetPrimary && (
                <div className="border-t border-border/60 p-1.5">
                  {accounts.map((account) => (
                    !account.is_primary ? (
                      <button
                        key={`set-primary-${account.id}`}
                        onClick={(e) => { e.stopPropagation(); onSetPrimary(account.id); setGearOpen(false); }}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left text-xs text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                      >
                        <Star className="w-3.5 h-3.5" />
                        Definir &ldquo;{account.page_name || (account.username ? `@${account.username}` : "este perfil")}&rdquo; como padrão
                      </button>
                    ) : null
                  ))}
                </div>
              )}
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
      </motion.div>
    );
  }
));

SocialNetworkCard.displayName = "SocialNetworkCard";
