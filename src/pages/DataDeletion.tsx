import React from "react";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";
import { motion } from "framer-motion";
import { Trash2, ArrowLeft, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function DataDeletion() {
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
              <div className="w-12 h-12 rounded-2xl bg-destructive/20 flex items-center justify-center">
                <ShieldAlert className="w-6 h-6 text-destructive" />
              </div>
              <div>
                <h1 className="text-3xl font-black italic tracking-tight">Exclusão de Dados do Usuário</h1>
                <p className="text-muted-foreground uppercase text-[10px] font-bold tracking-[0.2em]">Instruções para Meta / Facebook / Threads</p>
              </div>
            </div>

            <div className="space-y-6 text-slate-300 leading-relaxed">
              <p className="text-lg">
                Se você deseja excluir suas informações do aplicativo e remover nossa permissão de acesso aos seus dados das redes sociais, você possui duas opções:
              </p>

              <section className="space-y-3 p-6 rounded-2xl bg-card border border-border shadow-md">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-primary" />
                  Opção 1: Exclusão via Plataforma (Recomendado)
                </h2>
                <p>A maneira mais rápida de remover seus dados é diretamente pelo nosso painel:</p>
                <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                  <li>Faça login na plataforma.</li>
                  <li>Acesse as <strong>Configurações de API</strong> ou <strong>Conexões</strong> no menu lateral.</li>
                  <li>Clique no botão "Desconectar" ao lado da rede social desejada.</li>
                  <li>Neste momento, todos os seus tokens de acesso, identificadores e métricas cacheadas serão deletados definitivamente dos nossos servidores.</li>
                </ol>
              </section>

              <section className="space-y-3 p-6 rounded-2xl bg-card border border-border shadow-md">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Trash2 className="w-5 h-5 text-destructive" />
                  Opção 2: Exclusão via Facebook / Meta
                </h2>
                <p>Se não quiser acessar nossa plataforma, você pode remover os privilégios diretamente pela sua conta da Meta (Facebook / Instagram):</p>
                <ol className="list-decimal pl-5 space-y-2 text-muted-foreground">
                  <li>Acesse o seu perfil do Facebook e vá em <strong>Configurações e privacidade</strong> {">"} <strong>Configurações</strong>.</li>
                  <li>No menu esquerdo, encontre a seção <strong>Segurança e login</strong> e clique em <strong>Aplicativos e sites</strong>.</li>
                  <li>Encontre o aplicativo do painel na lista, clique em <strong>Remover</strong> e confirme a exclusão.</li>
                  <li>Quando a Meta nos notificar sobre essa remoção, nosso sistema acionará a rotina de exclusão e removerá seus dados do nosso banco de dados.</li>
                </ol>
              </section>

              <section className="mt-8 pt-6 border-t border-border">
                <h3 className="font-bold text-white mb-2">Exclusão completa da conta</h3>
                <p className="text-sm text-muted-foreground">
                  Caso deseje excluir totalmente a sua conta de usuário no nosso sistema, entre em contato com o suporte ou utilize o botão "Excluir Minha Conta" localizado na aba Perfil do Dashboard.
                </p>
              </section>
            </div>
          </motion.div>
        </main>
      </div>
    </div>
  );
}
