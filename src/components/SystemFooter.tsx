import React from "react";
import { Link } from "react-router-dom";
import { useSystem } from "@/contexts/SystemContext";

export const SystemFooter = () => {
  const { settings } = useSystem();

  return (
    <footer className="w-full py-6 bg-background border-t border-white/5 mt-auto">
      <div className="container mx-auto px-4">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-3 text-[10px] uppercase font-bold tracking-[0.15em] text-muted-foreground/50">
          <p className="flex items-center gap-1.5 order-2 md:order-1 whitespace-nowrap">
            © 2026 <span className="text-muted-foreground/70">{settings?.platform_name || "Vitória Net"}</span>
            <span className="mx-1 opacity-30">•</span>
            Desenvolvido com <span className="text-red-500 animate-pulse">❤️</span> por <Link to="/profile/bruno-flacon" className="text-muted-foreground/60 hover:text-foreground hover:underline transition-all">Bruno Flacon</Link>
          </p>
          
          <div className="flex items-center justify-center flex-wrap gap-4 md:gap-6 order-1 md:order-2">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link>
            <span className="opacity-20 hidden md:inline-block">•</span>
            <Link to="/terms" className="hover:text-primary transition-colors">Termos de Uso</Link>
            <span className="opacity-20 hidden md:inline-block">•</span>
            <Link to="/manual" className="hover:text-primary transition-colors">Manual</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};
