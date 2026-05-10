import { memo } from "react";
import { motion } from "framer-motion";
import { Switch } from "@/components/ui/switch";

interface NotificationTabProps {
  notifications: any;
  handleNotificationToggle: (key: string, checked: boolean) => void;
}

export const NotificationTab = memo(({ notifications, handleNotificationToggle }: NotificationTabProps) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="glass-card rounded-2xl border border-border p-6"
    >
      <h3 className="font-display font-bold text-lg mb-6">PreferÃªncias de NotificaÃ§Ã£o</h3>
      <div className="space-y-6">
        <div>
          <h4 className="font-medium mb-4">NotificaÃ§Ãµes por Email</h4>
          <div className="space-y-4">
            {[
              { key: 'emailPosts', title: 'Posts publicados', desc: 'Receba confirmaÃ§Ã£o quando posts forem publicados' },
              { key: 'emailEngagement', title: 'Engajamento', desc: 'Alertas de likes, comentÃ¡rios e compartilhamentos' },
              { key: 'weeklyReport', title: 'RelatÃ³rio semanal', desc: 'Resumo de performance das suas redes' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch 
                  checked={notifications[item.key as keyof typeof notifications] || false} 
                  onCheckedChange={(checked) => handleNotificationToggle(item.key, checked)} 
                />
              </div>
            ))}
          </div>
        </div>
        <div className="border-t border-border pt-6">
          <h4 className="font-medium mb-4">NotificaÃ§Ãµes Push</h4>
          <div className="space-y-4">
            {[
              { key: 'pushPosts', title: 'Posts publicados', desc: 'NotificaÃ§Ã£o instantÃ¢nea de publicaÃ§Ãµes' },
              { key: 'pushEngagement', title: 'Engajamento em tempo real', desc: 'Alertas instantÃ¢neos de interaÃ§Ãµes' },
              { key: 'pushSchedule', title: 'Lembretes de agendamento', desc: 'Aviso antes de posts agendados' },
            ].map(item => (
              <div key={item.key} className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-sm">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
                <Switch 
                  checked={notifications[item.key as keyof typeof notifications] || false} 
                  onCheckedChange={(checked) => handleNotificationToggle(item.key, checked)} 
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
});

NotificationTab.displayName = "NotificationTab";
