import React from "react";
import { useSystem } from "@/contexts/SystemContext";
import { Link } from "react-router-dom";
import { MessageSquare, Heart, Shield, HelpCircle, ExternalLink, Bell, FileText } from "lucide-react";
import { motion } from "framer-motion";

interface PortalFooterProps {
  variant?: 'public' | 'private';
}

export const PortalFooter = ({ variant = 'public' }: PortalFooterProps) => {
  const { settings } = useSystem();
  const currentYear = new Date().getFullYear();
  const platformName = settings?.platform_name || "Web Rádio Vitória";

  const handleSupportClick = () => {
    const pref = localStorage.getItem('vitoria_messenger_pref') || 'whatsapp';
    const link = pref === 'whatsapp' ? settings?.whatsapp_link : settings?.telegram_link;
    const fallback = pref === 'whatsapp' ? 'https://wa.me/5511999999999' : 'https://t.me/suporte_webradiovitoria';
    window.open(link || fallback, '_blank');
  };

  return (
    <footer className="w-full bg-[#020617] border-t border-white/5 py-12 px-6">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-8">
        {/* Left: Support Button */}
        <div className="flex-1 flex justify-start">
          <button 
            onClick={handleSupportClick}
            className="flex items-center gap-2.5 bg-primary/5 text-primary px-6 py-3 rounded-full hover:bg-primary/10 transition-all border border-primary/10 text-[10px] font-black uppercase tracking-widest shadow-[0_0_20px_rgba(var(--primary),0.05)]"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Suporte VIP
          </button>
        </div>

        {/* Center: Branding */}
        <div className="flex-1 flex flex-col items-center gap-2">
          <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
            <Heart className="w-3 h-3 text-red-500 fill-red-500 animate-pulse" /> 
            <span>Desde 2012 - {platformName} © {currentYear}</span>
          </div>
          <div className="text-[8px] font-bold text-slate-700 uppercase tracking-[0.2em]">
           Estratégia Digital por Bruno Flacon
          </div>
        </div>

        {/* Right: Privacy Policy */}
        <div className="flex-1 flex justify-end gap-4">
          <Link 
            to="/privacy"
            className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
          >
            Política de Privacidade
          </Link>
          <span className="text-slate-600 text-[10px]">&amp;</span>
          <Link 
            to="/terms"
            className="text-[10px] font-black text-slate-400 hover:text-white uppercase tracking-widest transition-colors"
          >
            Termos de Uso
          </Link>
        </div>
      </div>
    </footer>
  );
};
