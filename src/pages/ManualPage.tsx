import React from "react";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { ManualView } from "@/components/dashboard/ManualView";
import { Newspaper, Bell } from "lucide-react";
import { Link } from "react-router-dom";
import { useSystem } from "@/contexts/SystemContext";
import { SubscriberCapture } from "@/components/portal/SubscriberCapture";
import { motion } from "framer-motion";

export default function ManualPage() {
  const { settings } = useSystem();

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {settings?.portal_header_visible !== false && (
        <header className="border-b border-white/5 bg-[#0A0F1E]/80 backdrop-blur-md sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-8">
            <Link to="/" className="flex items-center gap-4 group shrink-0">
              <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-primary to-blue-600 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-105 transition-transform">
                {(settings?.portal_logo_url || settings?.logo_url) ? (
                  <img src={settings.portal_logo_url || settings.logo_url} alt="Logo" className="w-7 h-7 object-contain" />
                ) : (
                  <Newspaper className="w-6 h-6 text-white" />
                )}
              </div>
              <h1 className="font-display font-black text-xl text-white tracking-tight hidden sm:block">
                Web Rádio Vitória
              </h1>
            </Link>

            <div className="flex items-center gap-4">
              <SubscriberCapture 
                planType="free"
                showTrigger={true}
                triggerLabel=""
                triggerClassName="p-0 bg-transparent hover:bg-transparent shadow-none border-none scale-100 hover:scale-100"
                showFloating={false}
              >
                <div className="relative group cursor-pointer">
                  <motion.div 
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 group-hover:bg-primary/20 group-hover:border-primary/40 transition-all shadow-[0_0_20px_rgba(var(--primary),0.1)]"
                  >
                    <Bell className="w-6 h-6 text-primary fill-primary/10" />
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 rounded-full border-2 border-[#0A0F1E] flex items-center justify-center text-[10px] font-black text-white shadow-lg animate-pulse">
                      1
                    </span>
                  </motion.div>
                </div>
              </SubscriberCapture>
            </div>
          </div>
        </header>
      )}

      <main className="flex-1 max-w-7xl mx-auto w-full p-4 md:p-12">
        <div className="bg-[#0A0F1E] rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_50%)]" />
          <div className="relative z-10">
            <ManualView />
          </div>
        </div>
      </main>

      <SubscriberCapture 
        planType="free" 
        showFloating={true}
        triggerLabel="Assinar Agora"
        triggerClassName="fixed bottom-12 right-12 z-50 shadow-[0_0_40px_rgba(250,204,21,0.2)]"
      />
      
      {settings?.portal_footer_visible !== false && <PortalFooter variant="public" />}
    </div>
  );
}
