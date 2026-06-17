import React from "react";
import { Link } from "react-router-dom";
import { useSystem } from "@/hooks/useSystem";
import { Heart } from "lucide-react";

export const SystemFooter = () => {
  const { settings } = useSystem();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full py-8 mt-auto border-t border-white/5 bg-background/30 backdrop-blur-sm px-4 md:px-6">
      <div className="max-w-7xl mx-auto">
        {/* DESKTOP FOOTER (Single Horizontal Line) */}
        <div className="hidden md:flex items-center justify-center gap-4 text-[10px] font-bold uppercase tracking-[0.15em] text-muted-foreground/40">
          <span className="whitespace-nowrap font-black">© 2026 {settings?.platform_name || "VITÓRIA NET"}</span>
          <span className="opacity-20">•</span>
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            DESENVOLVIDO COM 
            <Heart 
              className="w-2.5 h-2.5 text-red-500 fill-red-500 animate-pulse mx-0.5" 
            /> 
            POR <Link to="/profile/bruno-flacon" className="hover:text-foreground transition-colors font-black text-muted-foreground/60">BRUNO FLACON</Link>
          </div>
          <div className="flex items-center gap-4 ml-4">

            <Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link>
            <span className="opacity-20">•</span>
            <Link to="/terms" className="hover:text-primary transition-colors">Termos de Uso</Link>
            <span className="opacity-20">•</span>
            <Link to="/manual" className="hover:text-primary transition-colors">Manual</Link>
          </div>
        </div>

        {/* MOBILE FOOTER (Three Rows Refined) */}
        <div className="flex md:hidden flex-col items-center">
          {/* Row 1: Links (Increased font size) */}
          <div className="flex items-center justify-center gap-5 text-[11px] font-bold uppercase tracking-[0.12em] text-muted-foreground/50 mb-1">
            <Link to="/privacy" className="hover:text-primary transition-colors">Privacidade</Link>
            <span className="opacity-20">•</span>
            <Link to="/terms" className="hover:text-primary transition-colors">Termos</Link>
            <span className="opacity-20">•</span>
            <Link to="/manual" className="hover:text-primary transition-colors">Manual</Link>
          </div>
          
          {/* Row 2: Creator (Single Line, Perfectly Aligned) */}
          <div className="flex items-center justify-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.1em] text-muted-foreground/40">
            <span>CRIADO</span> 
            <Heart className="w-2.5 h-2.5 text-red-500 fill-red-500 animate-pulse" />
            <span>POR</span> 
            <Link 
              to="/profile/bruno-flacon" 
              className="font-black text-muted-foreground/80 hover:text-foreground transition-colors ml-0.5"
            >
              BRUNO FLACON
            </Link>
          </div>

          {/* Row 3: Brand & Year (Last line, brighter) */}
          <div className="mt-4 text-[10px] font-black uppercase tracking-[0.25em] text-white/40 drop-shadow-sm">
            {settings?.platform_name || "Vitória News"} © 2026
          </div>
        </div>
      </div>
    </footer>
  );
};
