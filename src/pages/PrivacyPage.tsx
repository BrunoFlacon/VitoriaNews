import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { SystemFooter } from "@/components/SystemFooter";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(false);

  return (
    <div className="min-h-screen bg-background flex">
      <Sidebar 
        activeTab="" 
        setActiveTab={() => navigate("/dashboard")} 
        isCollapsed={isSidebarCollapsed}
        setIsCollapsed={setIsSidebarCollapsed}
      />
      <div className={`flex-1 transition-all duration-300 min-w-0 flex flex-col min-h-screen ${isSidebarCollapsed ? "md:pl-20" : "md:pl-64"}`}>
        <Header onNotificationsClick={() => {}} onNavigate={() => {}} />
        <main className="p-4 md:p-8 flex-1 max-w-4xl mx-auto w-full">
          <Button variant="ghost" className="mb-8 gap-2" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>

          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card rounded-3xl p-8 border border-border"
          >
            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-black italic tracking-tight">Política de Privacidade</h1>
                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-[0.2em]">Última atualização: Março 2026</p>
              </div>
            </div>

            <div className="space-y-6 text-slate-300 leading-relaxed">
              <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">1. Coleta de Dados</h2>
                <p>Coletamos apenas as informações necessárias para o funcionamento da plataforma Vitória Net, incluindo dados de autenticação e conexões com redes sociais via API oficial.</p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">2. Uso das Informações</h2>
                <p>Seus dados são utilizados exclusivamente para gerenciar agendamentos, publicações e fornecer análises de desempenho consolidadas.</p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-bold text-white">3. Segurança</h2>
                <p>Implementamos protocolos de segurança de última geração para proteger suas chaves de API e informações pessoais contra acesso não autorizado.</p>
              </section>
            </div>
          </motion.div>
        </main>
        <SystemFooter />
      </div>
    </div>
  );
}
