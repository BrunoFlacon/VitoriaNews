"use client";

import { Database } from "lucide-react";
import { WhatsAppDataTools } from "./WhatsAppDataTools";

/**
 * Full-page data management tab.
 * The three tool cards (import, custom fields, export) are in WhatsAppDataTools
 * so they can be shared with the Backup tab.
 */
export function WhatsAppDataTab() {
  return (
    <div className="space-y-6 p-4 max-w-3xl">
      <div>
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <Database className="h-4 w-4" />
          Gerenciamento de Dados
        </h3>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Importe, organize e exporte dados dos seus contatos WhatsApp
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <WhatsAppDataTools />
      </div>
    </div>
  );
}

export default WhatsAppDataTab;
