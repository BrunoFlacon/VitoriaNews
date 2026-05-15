import { motion } from "framer-motion";
import { 
  LayoutDashboard, 
  PenSquare, 
  BarChart3, 
  MessageCircle, 
  Share2 
} from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const MobileNav = ({ activeTab, setActiveTab }: MobileNavProps) => {
  const navItems = [
    { id: "dashboard", icon: LayoutDashboard, label: "Home" },
    { id: "networks", icon: Share2, label: "Redes" },
    { id: "create", icon: PenSquare, label: "Criar", isCenter: true },
    { id: "analytics", icon: BarChart3, label: "Stats" },
    { id: "messaging", icon: MessageCircle, label: "Chat" },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] md:hidden px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-background via-background/80 to-transparent">
      <motion.nav 
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="glass-card border border-white/20 rounded-2xl h-16 flex items-center justify-around px-2 shadow-2xl relative overflow-hidden"
      >
        {/* Glow effect */}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/5 to-transparent pointer-events-none" />

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          if (item.isCenter) {
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className="relative -top-6 flex flex-col items-center group"
              >
                <div className={cn(
                  "w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg transition-all duration-300 transform group-active:scale-95",
                  isActive 
                    ? "bg-primary text-primary-foreground rotate-0 scale-110 shadow-primary/40" 
                    : "bg-gradient-to-br from-primary to-accent text-white rotate-45 group-hover:rotate-0"
                )}>
                  <Icon className={cn(
                    "w-6 h-6 transition-transform",
                    !isActive && "-rotate-45 group-hover:rotate-0"
                  )} />
                </div>
                <span className={cn(
                  "text-[10px] font-bold mt-1 transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  {item.label}
                </span>
              </button>
            );
          }

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className="flex flex-col items-center justify-center flex-1 h-full relative group"
            >
              <div className={cn(
                "p-2 rounded-xl transition-all duration-300",
                isActive ? "text-primary scale-110" : "text-muted-foreground group-active:scale-90"
              )}>
                <Icon className="w-6 h-6" />
              </div>
              <span className={cn(
                "text-[10px] font-medium transition-colors",
                isActive ? "text-primary font-bold" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
              
              {isActive && (
                <motion.div 
                  layoutId="mobileActiveIndicator"
                  className="absolute -bottom-1 w-1 h-1 rounded-full bg-primary"
                />
              )}
            </button>
          );
        })}
      </motion.nav>
    </div>
  );
};
