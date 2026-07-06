import { useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { parseContactCsv, type ParsedContactRow } from "@/lib/contacts/parse-contact-csv";
import { normalizePhone } from "@/lib/contacts/dedupe";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, FileText, Loader2, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

const PREVIEW_LIMIT = 5;

function truncateFilename(name: string, max = 48): string {
  if (name.length <= max) return name;
  const ext = name.includes(".") ? name.slice(name.lastIndexOf(".")) : "";
  const base = name.slice(0, name.length - ext.length);
  const keep = max - ext.length - 1;
  return `${base.slice(0, Math.max(keep, 12))}…${ext}`;
}

interface ImportContactsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImported: () => void;
}

export function ImportContactsModal({ open, onOpenChange, onImported }: ImportContactsModalProps) {
  const { user } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedContactRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    skipped: number;
    failed: number;
  } | null>(null);

  function reset() {
    setFile(null);
    setParsedRows([]);
    setResult(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset();
    onOpenChange(next);
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setResult(null);

    const text = await selected.text();
    const { rows } = parseContactCsv(text);

    if (rows.length === 0) {
      toast.error('No valid rows found. Ensure CSV has a "phone" column header.');
      setParsedRows([]);
      return;
    }
    setParsedRows(rows);
  }

  async function handleImport() {
    if (parsedRows.length === 0 || !user) return;
    setImporting(true);

    try {
      let imported = 0;
      let skipped = 0;
      let failed = 0;

      // De-dupe within the file
      const seen = new Map<string, boolean>();
      const unique: ParsedContactRow[] = [];
      for (const row of parsedRows) {
        const key = normalizePhone(row.phone);
        if (!seen.has(key)) {
          seen.set(key, true);
          unique.push(row);
        } else {
          skipped++;
        }
      }

      // Check existing contacts
      const { data: existingRows } = await supabase
        .from("contacts")
        .select("phone_normalized")
        .eq("user_id", user.id);
      const existing = new Set(
        (existingRows ?? [])
          .map((r: any) => r.phone_normalized)
          .filter(Boolean)
      );

      const toInsert = unique.filter((row) => {
        if (existing.has(normalizePhone(row.phone))) {
          skipped++;
          return false;
        }
        return true;
      });

      // Batch insert in chunks of 50
      for (let i = 0; i < toInsert.length; i += 50) {
        const chunk = toInsert.slice(i, i + 50);
        const rows = chunk.map((row) => ({
          user_id: user.id,
          phone: row.phone,
          name: row.name || null,
          email: row.email || null,
          company: row.company || null,
        }));

        const { data, error } = await supabase
          .from("contacts")
          .insert(rows)
          .select("id");

        if (error) {
          for (const row of rows) {
            const { data: singleData, error: singleErr } = await supabase
              .from("contacts")
              .insert(row)
              .select("id")
              .single();
            if (!singleErr && singleData) imported++;
            else skipped++;
          }
        } else {
          imported += (data ?? []).length;
        }
      }

      setResult({ imported, skipped, failed });
      if (imported > 0) {
        toast.success(`${imported} contact${imported !== 1 ? "s" : ""} imported`);
        onImported();
      }
      if (skipped > 0) {
        toast.info(`${skipped} duplicate${skipped !== 1 ? "s" : ""} skipped`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Import failed";
      toast.error(msg);
    } finally {
      setImporting(false);
    }
  }

  const preview = parsedRows.slice(0, PREVIEW_LIMIT);

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,720px)] flex-col gap-0 overflow-hidden border-border/80 bg-popover p-0 text-popover-foreground sm:max-w-2xl">
        <div className="shrink-0 space-y-4 border-b border-border/80 px-6 pt-6 pb-5">
          <DialogHeader className="gap-1.5">
            <DialogTitle className="text-lg text-popover-foreground">
              Import Contacts
            </DialogTitle>
            <DialogDescription className="leading-relaxed text-muted-foreground">
              Upload a CSV with a required{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">phone</code>{" "}
              column. Optional:{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">name</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">email</code>,{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-[11px]">company</code>.
            </DialogDescription>
          </DialogHeader>

          <div
            role="button"
            tabIndex={0}
            onClick={() => fileInputRef.current?.click()}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") fileInputRef.current?.click(); }}
            className={`group flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed p-5 transition-all ${
              file
                ? "border-primary/35 bg-primary/[0.04]"
                : "hover:border-primary/40 border-border/80 bg-background/40 hover:bg-background/70"
            }`}
          >
            {file ? (
              <>
                <div className="bg-primary/15 ring-primary/25 flex size-10 items-center justify-center rounded-lg ring-1">
                  <FileText className="text-primary size-5" />
                </div>
                <p className="max-w-full truncate px-2 text-sm font-medium" title={file.name}>
                  {truncateFilename(file.name)}
                </p>
                <span className="rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                  {parsedRows.length} row{parsedRows.length !== 1 ? "s" : ""} ready
                </span>
              </>
            ) : (
              <>
                <div className="flex size-10 items-center justify-center rounded-lg bg-muted/80 ring-1 ring-border/80 transition-colors group-hover:bg-muted">
                  <Upload className="size-5 text-muted-foreground group-hover:text-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">Click to choose a CSV file</p>
                <p className="text-[11px] text-muted-foreground">.csv up to your browser limit</p>
              </>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-4">
          {preview.length > 0 && !result && (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Preview · first {preview.length}
              </p>
              <div className="overflow-hidden rounded-xl border border-border ring-1 ring-border/50">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-border bg-background/60">
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Phone</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Name</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Email</th>
                      <th className="px-3 py-2 text-left font-medium text-muted-foreground">Company</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/70">
                    {preview.map((row, i) => (
                      <tr key={i} className="bg-popover/40 transition-colors hover:bg-muted/30">
                        <td className="px-3 py-2 font-mono text-[11px] text-muted-foreground">{row.phone}</td>
                        <td className="px-3 py-2 text-popover-foreground">{row.name || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.email || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">{row.company || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedRows.length > PREVIEW_LIMIT && (
                <p className="text-center text-[11px] text-muted-foreground">
                  + {parsedRows.length - PREVIEW_LIMIT} more row{parsedRows.length - PREVIEW_LIMIT !== 1 ? "s" : ""} not shown
                </p>
              )}
            </div>
          )}

          {result && (
            <div className="rounded-xl border border-border bg-background/50 p-4">
              <p className="text-sm font-medium">Import complete</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {result.imported > 0 && (
                  <div className="text-primary flex items-center gap-1.5 text-sm">
                    <CheckCircle className="size-4 shrink-0" />
                    {result.imported} imported
                  </div>
                )}
                {result.skipped > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-amber-400">
                    <AlertTriangle className="size-4 shrink-0" />
                    {result.skipped} skipped
                  </div>
                )}
                {result.failed > 0 && (
                  <div className="flex items-center gap-1.5 text-sm text-red-400">
                    <XCircle className="size-4 shrink-0" />
                    {result.failed} failed
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-0 shrink-0 gap-2 border-t border-border/80 bg-background/50 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
            className="border-border text-muted-foreground hover:bg-muted"
          >
            {result ? "Close" : "Cancel"}
          </Button>
          {!result && (
            <Button
              type="button"
              disabled={parsedRows.length === 0 || importing}
              onClick={handleImport}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {importing && <Loader2 className="size-4 animate-spin" />}
              Import {parsedRows.length > 0 ? parsedRows.length : ""} contact{parsedRows.length !== 1 ? "s" : ""}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
