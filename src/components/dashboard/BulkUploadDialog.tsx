import { useState, useRef } from "react";
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface BulkUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

interface ParsedRow {
  content: string;
  platforms: string;
  scheduled_at: string;
  media_type: string;
}

interface ImportResult {
  line: number;
  success: boolean;
  error?: string;
  postId?: string;
}

function parseCSV(text: string): ParsedRow[] {
  const lines = text.split('\n').filter(l => l.trim());
  if (lines.length < 2) return [];

  const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
  
  const contentIdx = headers.findIndex(h => ['conteudo', 'content', 'texto', 'post'].includes(h));
  const platformIdx = headers.findIndex(h => ['plataformas', 'platforms', 'redes', 'platform'].includes(h));
  const dateIdx = headers.findIndex(h => ['data_agendamento', 'scheduled_at', 'data', 'date', 'agendamento'].includes(h));
  const mediaIdx = headers.findIndex(h => ['tipo_midia', 'media_type', 'tipo', 'media'].includes(h));

  if (contentIdx === -1) return [];

  return lines.slice(1).map(line => {
    // Parse CSV respecting quoted fields
    const fields: string[] = [];
    let current = '';
    let inQuotes = false;
    
    for (const char of line) {
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        fields.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    fields.push(current.trim());

    return {
      content: fields[contentIdx]?.replace(/^"|"$/g, '') || '',
      platforms: fields[platformIdx]?.replace(/^"|"$/g, '') || '',
      scheduled_at: fields[dateIdx]?.replace(/^"|"$/g, '') || '',
      media_type: fields[mediaIdx]?.replace(/^"|"$/g, '') || 'image',
    };
  }).filter(row => row.content.trim());
}

export const BulkUploadDialog = ({ open, onOpenChange, onComplete }: BulkUploadDialogProps) => {
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<ImportResult[] | null>(null);
  const [fileName, setFileName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setResults(null);

    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = parseCSV(text);
      setParsedRows(rows);

      if (rows.length === 0) {
        toast({
          title: "Arquivo inválido",
          description: "Nenhuma linha válida encontrada. Verifique o formato CSV.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (parsedRows.length === 0) return;

    setImporting(true);
    setProgress(10);

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        throw new Error("Sessão expirada");
      }

      setProgress(30);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bulk-import-posts`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ rows: parsedRows }),
        }
      );

      setProgress(80);

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro na importação");
      }

      setResults(data.results);
      setProgress(100);

      toast({
        title: "Importação concluída!",
        description: `${data.success} posts criados, ${data.failed} falharam.`,
      });

      onComplete?.();
    } catch (error) {
      toast({
        title: "Erro na importação",
        description: error instanceof Error ? error.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setParsedRows([]);
    setResults(null);
    setProgress(0);
    setFileName("");
    onOpenChange(false);
  };

  const downloadTemplate = () => {
    const csv = `conteudo,plataformas,data_agendamento,tipo_midia
"Exemplo de post para redes sociais","instagram,facebook","2026-03-01 10:00","image"
"Outro post de exemplo","twitter,linkedin","2026-03-02 14:00","text"`;
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'modelo-importacao.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-primary" />
            Importar Posts em Massa
          </DialogTitle>
          <DialogDescription>
            Faça upload de um arquivo CSV para agendar múltiplos posts de uma vez
          </DialogDescription>
        </DialogHeader>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        <div className="space-y-4 py-4">
          {/* Upload area */}
          {!fileName && (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
            >
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="font-medium">Clique para selecionar um arquivo CSV</p>
              <p className="text-sm text-muted-foreground mt-1">Máximo 500 linhas</p>
            </div>
          )}

          {/* Template download */}
          <Button variant="outline" size="sm" onClick={downloadTemplate} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Baixar modelo CSV
          </Button>

          {/* Preview */}
          {parsedRows.length > 0 && !results && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Preview ({parsedRows.length} posts)
                </p>
                <p className="text-xs text-muted-foreground">{fileName}</p>
              </div>
              <div className="max-h-48 overflow-y-auto space-y-2 border border-border rounded-lg p-3">
                {parsedRows.slice(0, 5).map((row, i) => (
                  <div key={i} className="text-xs p-2 bg-muted/30 rounded-lg">
                    <p className="font-medium line-clamp-1">{row.content}</p>
                    <div className="flex gap-2 mt-1 text-muted-foreground">
                      <span>📱 {row.platforms}</span>
                      {row.scheduled_at && <span>📅 {row.scheduled_at}</span>}
                    </div>
                  </div>
                ))}
                {parsedRows.length > 5 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{parsedRows.length - 5} mais...
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span className="text-sm">Importando...</span>
              </div>
              <Progress value={progress} />
            </div>
          )}

          {/* Results */}
          {results && (
            <div className="space-y-3">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5 text-green-500">
                  <CheckCircle2 className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {results.filter(r => r.success).length} sucesso
                  </span>
                </div>
                {results.some(r => !r.success) && (
                  <div className="flex items-center gap-1.5 text-red-500">
                    <AlertCircle className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {results.filter(r => !r.success).length} falhas
                    </span>
                  </div>
                )}
              </div>

              {results.filter(r => !r.success).length > 0 && (
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {results.filter(r => !r.success).map((r) => (
                    <div key={r.line} className="text-xs p-2 bg-red-500/10 rounded-lg text-red-500">
                      Linha {r.line}: {r.error}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            {results ? "Fechar" : "Cancelar"}
          </Button>
          {!results && (
            <Button
              onClick={handleImport}
              disabled={importing || parsedRows.length === 0}
              className="bg-gradient-to-r from-primary to-accent"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Importar {parsedRows.length} posts
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
