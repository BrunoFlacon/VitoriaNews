import { forwardRef, useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Plus, Settings, Loader2, User, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";

interface SocialAccount {
  id: string;
  page_name: string | null;
  platform_user_id: string | null;
  profile_image_url?: string | null;
  followers_count?: number | null;
  page_id?: string | null;
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
}

export const SocialNetworkCard = forwardRef<HTMLDivElement, SocialNetworkCardProps>(
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
            {/* Platform icon — rounded square, brand bg, diagonal shadow */}
            <div
              className={cn(
                "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0",
                isConnected ? platform.color : "bg-muted/40"
              )}
              style={{
                // Strong diagonal shadow like the Snapchat reference
                boxShadow: isConnected
                  ? "5px 6px 14px rgba(0,0,0,0.55)"
                  : "4px 5px 10px rgba(0,0,0,0.35)",
              }}
            >
              <Icon
                className={cn("w-8 h-8", isConnected ? "text-white" : "text-muted-foreground")}
                style={{
                  filter: "drop-shadow(3px 4px 3px rgba(0,0,0,0.50))",
                }}
              />
            </div>

            <div>
              <h3 className="font-semibold">{platform.name}</h3>
              <p className="text-sm text-muted-foreground">
                {isConnecting
                  ? "Conectando..."
                  : isConnected
                    ? selectedAccount?.page_name || pageName || "Conectado"
                    : "Clique para conectar"}
              </p>
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
                          <img
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
                          <p className="text-sm font-medium truncate">
                            {account.page_name || account.platform_user_id || "Perfil"}
                          </p>
                          {account.followers_count != null && (
                            <p className="text-xs text-muted-foreground">
                              {account.followers_count.toLocaleString("pt-BR")} seguidores
                            </p>
                          )}
                        </div>
                        {isSelected && <Check className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </motion.div>
          </AnimatePresence>,
          document.body
        )}
      </motion.div>
    );
  }
);

SocialNetworkCard.displayName = "SocialNetworkCard";
