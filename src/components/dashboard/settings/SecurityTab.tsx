import { memo } from "react";
import { motion } from "framer-motion";
import { Shield, Mail, Laptop, LogOut, AlertCircle, Key } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

interface SecurityTabProps {
  profile: any;
  profileData: any;
  setProfileData: (data: any) => void;
}

export const SecurityTab = memo(({ profile, profileData, setProfileData }: SecurityTabProps) => {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      {/* Password Section */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl border border-border p-6 pb-2">
        <h3 className="font-display font-bold text-lg mb-4">Segurança da Conta</h3>

        <div className="glass-card rounded-2xl border border-border/50 p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2.5 bg-primary/10 rounded-xl"><Mail className="w-5 h-5 text-primary" /></div>
            <div>
              <h4 className="font-bold text-base">Alterar E-mail</h4>
              <p className="text-sm text-muted-foreground">Atualize seu endereço de e-mail cadastrado</p>
            </div>
          </div>
          <div className="space-y-4 pl-14">
            <div className="space-y-1.5">
              <Input type="email" placeholder="Novo endereço de e-mail" className="bg-background max-w-md" />
            </div>
            <Button type="button" variant="secondary" onClick={() => toast({ title: 'Atenção', description: 'Por motivos de segurança, a troca de e-mail requer confirmação por link enviado ao endereço atual.' })}>
              Solicitar Alteração
            </Button>
          </div>
        </div>

        <div className="glass-card rounded-2xl border border-border/50 p-6 mb-6">
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2.5 bg-primary/10 rounded-xl"><Shield className="w-5 h-5 text-primary" /></div>
            <div>
              <h4 className="font-bold text-base">Alterar senha</h4>
              <p className="text-sm text-muted-foreground">Mantenha sua conta segura alterando sua senha periodicamente</p>
            </div>
          </div>
          <form className="space-y-4 pl-14" autoComplete="on">
            <input type="text" name="username" value={profileData.email || ""} readOnly autoComplete="username" className="hidden" aria-hidden="true" />
            <div className="space-y-1.5">
              <Input type="password" placeholder="Senha atual" autoComplete="current-password" className="bg-background max-w-md" />
            </div>
            <div className="space-y-1.5">
              <Input type="password" placeholder="Nova senha" autoComplete="new-password" className="bg-background max-w-md" />
            </div>
            <Button type="button" variant="secondary" onClick={() => toast({ title: 'Recurso Indisponível', description: 'Por favor, recupere sua senha na tela de login caso precise alterá-la no momento.', variant: 'destructive' })}>
              Atualizar Senha
            </Button>
          </form>
        </div>

        <div className="border border-border rounded-xl p-5 bg-background/50 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2.5 bg-primary/10 rounded-xl"><Key className="w-5 h-5 text-primary" /></div>
              <div>
                <h4 className="font-bold text-base">Autenticação de dois fatores</h4>
                <p className="text-sm text-muted-foreground">Adicione uma camada extra de segurança à sua conta</p>
              </div>
            </div>
            <Switch
              checked={profileData.two_factor_enabled || false}
              onCheckedChange={(checked) => {
                if (!profileData.phone) {
                  toast({
                    title: "Telefone Necessário",
                    description: "Adicione um número de celular na aba Perfil antes de ativar o 2FA.",
                    variant: "destructive"
                  });
                  return;
                }
                setProfileData({ ...profileData, two_factor_enabled: checked });
              }}
            />
          </div>
        </div>
      </motion.div>

      {/* Active Sessions Panel */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }} className="glass-card rounded-2xl border border-border p-6 mt-6">
        <div className="flex items-start gap-4 mb-5">
          <div className="p-2.5 bg-primary/10 rounded-xl"><Laptop className="w-5 h-5 text-primary" /></div>
          <div>
            <h4 className="font-bold text-base">Sessões Ativas</h4>
            <p className="text-sm text-muted-foreground">Gerencie os dispositivos conectados à sua conta</p>
          </div>
        </div>
        <div className="space-y-3 pl-14">
          <div className="flex items-center justify-between p-4 rounded-xl bg-primary/5 border border-primary/20">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Laptop className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">Este dispositivo <span className="text-[10px] bg-green-500/20 text-green-500 border border-green-500/30 rounded px-1.5 py-0.5 ml-1 font-normal">Sessão Atual</span></p>
                <p className="text-xs text-muted-foreground mt-0.5">Navegador Web · {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
            <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]" />
          </div>
          <Button variant="outline" size="sm" className="gap-2 text-red-500 border-red-500/30 hover:bg-red-500/5 hover:text-red-600 mt-2" onClick={() => toast({ title: 'Sessões Encerradas', description: 'Todas as outras sessões foram desconectadas.' })}>
            <LogOut className="w-4 h-4" /> Encerrar outras sessões
          </Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="glass-card rounded-2xl border border-red-500/20 bg-red-500/5 p-6 flex flex-col items-start mt-6">
        <div className="flex items-start gap-4 mb-4">
          <div className="p-2.5 bg-red-500/10 rounded-xl"><AlertCircle className="w-5 h-5 text-red-500" /></div>
          <div>
            <h4 className="font-bold text-base text-red-500">Excluir conta</h4>
            <p className="text-sm text-red-400/80">Esta ação é irreversível. Todos os seus dados serão permanentemente removidos.</p>
          </div>
        </div>
        <Button variant="destructive" className="ml-14 bg-red-500/90 hover:bg-red-500 text-white font-medium" onClick={() => toast({ title: 'Atenção', description: 'Para excluir sua conta, entre em contato com o suporte.' })}>
          Excluir minha conta
        </Button>
      </motion.div>
    </div>
  );
});

SecurityTab.displayName = "SecurityTab";
