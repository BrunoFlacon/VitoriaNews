import React from "react";
import { PortalFooter } from "@/components/portal/PortalFooter";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft, Newspaper, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useSystem } from "@/contexts/SystemContext";
import { SubscriberCapture } from "@/components/portal/SubscriberCapture";

export default function PrivacyPage() {
  const navigate = useNavigate();
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

      <main className="p-4 md:p-12 flex-1 max-w-4xl mx-auto w-full">
        <Button variant="ghost" className="mb-8 gap-2 text-muted-foreground hover:text-white" onClick={() => navigate('/')}>
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Button>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#0A0F1E] rounded-[2.5rem] p-8 md:p-12 border border-white/5 shadow-2xl relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.05),transparent_50%)]" />
          
          <div className="relative z-10">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
                <ShieldCheck className="w-7 h-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl md:text-4xl font-display font-black text-white uppercase tracking-tighter leading-none">Política de Privacidade</h1>
                <p className="text-slate-500 uppercase text-[10px] font-black tracking-[0.3em] mt-2">Última atualização: Abril 2026</p>
              </div>
            </div>

            <div className="space-y-8 text-slate-400 leading-relaxed font-medium">
              <section className="space-y-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <span className="w-6 h-px bg-primary/50" /> 1. Coleta de Dados
                </h2>
                <p>Coletamos apenas as informações necessárias para o funcionamento da plataforma Web Rádio Vitória, incluindo dados de assinatura VIP e preferências de atendimento (WhatsApp/Telegram).</p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <span className="w-6 h-px bg-primary/50" /> 2. Uso das Informações
                </h2>
                <p>Seus dados são utilizados exclusivamente para gerenciar seu acesso ao conteúdo exclusivo, processar assinaturas e fornecer suporte direto via canais oficiais.</p>
              </section>

              <section className="space-y-4">
                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-3">
                  <span className="w-6 h-px bg-primary/50" /> 3. Segurança dos Assinantes
                </h2>
                <p>Implementamos protocolos de segurança de alto nível para proteger suas informações pessoais. Não compartilhamos dados de assinantes com terceiros sem consentimento explícito.</p>
              </section>
            </div>
          </div>
        </motion.div>
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
