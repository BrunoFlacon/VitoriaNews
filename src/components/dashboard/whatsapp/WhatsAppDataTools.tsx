"use client";

import { useState } from "react";
import { Upload, FileSpreadsheet, DatabaseIcon, Loader2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ImportContactsModal } from "./ImportContactsModal";
import { CustomFieldsManager } from "./CustomFieldsManager";

export function WhatsAppDataTools() {
  const { toast } = useToast();
  const [importOpen, setImportOpen] = useState(false);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [exporting, setExporting] = useState(false);

  async function handleExport() {
    setExporting(true);
    try {
      const { data: contacts, error } = await supabase
        .from("contacts")
        .select("*")
        .order("name", { ascending: true });

      if (error) throw error;
      if (!contacts || contacts.length === 0) {
        toast({
          title: "Nenhum contato",
          description: "Não há contatos para exportar.",
          variant: "destructive",
        });
        return;
      }

      const { data: customFields } = await supabase
        .from("custom_fields")
        .select("field_name");

      const customFieldNames = customFields?.map((f: any) => f.field_name) ?? [];

      const headers = ["Nome", "Telefone", ...customFieldNames, "Criado Em"];
      const rows = contacts.map((c: any) => {
        const customValues = customFieldNames.map((name: string) => {
          const val = c.custom_fields?.[name];
          return val != null ? String(val) : "";
        });
        return [
          c.name ?? "",
          c.phone ?? "",
          ...customValues,
          c.created_at ? new Date(c.created_at).toLocaleDateString("pt-BR") : "",
        ];
      });

      const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;
      const csv = [headers, ...rows].map((r) => r.map(escape).join(",")).join("\n");

      const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `contatos-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Exportado",
        description: `${contacts.length} contatos exportados com sucesso.`,
      });
    } catch (err) {
      toast({
        title: "Erro ao exportar",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      {/* Import Contacts */}
      <Card className="hover:bg-accent/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Upload className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-base mt-3">Importar Contatos</CardTitle>
          <CardDescription className="text-xs">
            Faça upload de um arquivo CSV com nome e telefone dos contatos.
            O sistema normaliza os números automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setImportOpen(true)}
          >
            <Upload className="h-3.5 w-3.5 mr-2" />
            Importar CSV
          </Button>
        </CardContent>
      </Card>

      {/* Custom Fields */}
      <Card className="hover:bg-accent/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <DatabaseIcon className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-base mt-3">Campos Personalizados</CardTitle>
          <CardDescription className="text-xs">
            Crie campos extras para seus contatos, como origem do lead,
            CEP, data de nascimento e muito mais.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setFieldsOpen(true)}
          >
            <DatabaseIcon className="h-3.5 w-3.5 mr-2" />
            Gerenciar Campos
          </Button>
        </CardContent>
      </Card>

      {/* Export Contacts */}
      <Card className="hover:bg-accent/30 transition-colors">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <FileSpreadsheet className="h-5 w-5" />
            </div>
          </div>
          <CardTitle className="text-base mt-3">Exportar Contatos</CardTitle>
          <CardDescription className="text-xs">
            Exporte sua lista de contatos completa em formato CSV,
            incluindo todos os campos personalizados.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={handleExport}
            disabled={exporting}
          >
            {exporting ? (
              <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
            )}
            {exporting ? "Exportando…" : "Exportar CSV"}
          </Button>
        </CardContent>
      </Card>

      {/* Modais */}
      <ImportContactsModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={() => setRefreshKey((k) => k + 1)}
      />
      <CustomFieldsManager
        open={fieldsOpen}
        onOpenChange={setFieldsOpen}
      />
    </>
  );
}
