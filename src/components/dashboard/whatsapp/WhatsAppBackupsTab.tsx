import { Separator } from "@/components/ui/separator";
import { WhatsAppBackupTab } from "../settings/WhatsAppBackupTab";
import { WhatsAppDataTools } from "./WhatsAppDataTools";
import { Database } from "lucide-react";

/** Combined Backup & Data Management tab */
export function WhatsAppBackupsTab() {
  return (
    <div className="h-full overflow-y-auto space-y-6">
      <div className="px-4 pt-2 pb-1">
        <p className="text-xs text-muted-foreground/70">Backup e dados: exporte, importe e gerencie dados do WhatsApp.</p>
      </div>
      <div className="p-4 pb-0">
        <WhatsAppBackupTab />
      </div>

      <div className="px-4">
        <Separator />
      </div>

      <div className="p-4 pt-0">
        <h3 className="font-semibold text-sm flex items-center gap-2 mb-4">
          <Database className="h-4 w-4" />
          Gerenciamento de Dados
        </h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <WhatsAppDataTools />
        </div>
      </div>
    </div>
  );
}

export default WhatsAppBackupsTab;
