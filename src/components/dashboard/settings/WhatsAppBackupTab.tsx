import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  Shield, Download, Trash2, RefreshCw, Lock, Unlock, Clock, Database, FileText, Loader2, AlertCircle, CheckCircle2, Smartphone,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WhatsAppBackup {
  id: string;
  connection_id: string;
  conversation_id: string | null;
  scope: string;
  format: string;
  storage_path: string;
  checksum_sha256: string;
  encryption_key_id: string | null;
  size_bytes: number;
  message_count: number;
  retention_class: string;
  expires_at: string | null;
  created_at: string;
}

export const WhatsAppBackupTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [backups, setBackups] = useState<WhatsAppBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [decrypting, setDecrypting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [decryptModal, setDecryptModal] = useState<WhatsAppBackup | null>(null);
  const [decryptKey, setDecryptKey] = useState("");

  const fetchBackups = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("whatsapp_backups")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setBackups((data ?? []) as WhatsAppBackup[]);
    } catch (err: any) {
      toast({ title: "Erro ao carregar backups", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [user?.id, toast]);

  useEffect(() => { fetchBackups(); }, [fetchBackups]);

  const handleCreateBackup = async () => {
    if (!user?.id) return;
    setCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("backup-messages", {
        body: { userId: user.id },
      });
      if (error) throw error;
      toast({ title: "Backup criado", description: "Mensagens criptografadas com sucesso." });
      fetchBackups();
    } catch (err: any) {
      toast({ title: "Erro ao criar backup", description: err.message, variant: "destructive" });
    } finally {
      setCreating(false);
    }
  };

  const handleDownload = async (backup: WhatsAppBackup) => {
    try {
      const { data, error } = await supabase.storage
        .from("whatsapp-backups")
        .download(backup.storage_path);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement("a");
      a.href = url;
      a.download = backup.storage_path.split("/").pop() || "backup.json.encrypted";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      await supabase.from("whatsapp_backup_access_log").insert({
        backup_id: backup.id,
        user_id: user?.id,
        action: "downloaded",
      });

      toast({ title: "Download iniciado" });
    } catch (err: any) {
      toast({ title: "Erro ao baixar", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const backup = backups.find(b => b.id === id);
      if (backup?.storage_path) {
        await supabase.storage.from("whatsapp-backups").remove([backup.storage_path]);
      }
      const { error } = await supabase.from("whatsapp_backups").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Backup excluído" });
      setDeleteConfirm(null);
      fetchBackups();
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString("pt-BR", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <Card className="border-green-500/20 bg-gradient-to-br from-green-950/30 to-emerald-950/20">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Shield className="w-5 h-5 text-green-500" />
              Backups Criptografados WhatsApp
            </CardTitle>
            <CardDescription>
              Seus backups são criptografados com AES-256-GCM antes de armazenar
            </CardDescription>
          </div>
          <Button
            onClick={handleCreateBackup}
            disabled={creating}
            className="bg-green-600 hover:bg-green-700 gap-2"
          >
            {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Database className="w-4 h-4" />}
            {creating ? "Criando..." : "Criar Backup"}
          </Button>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Histórico de Backups
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="w-12 h-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum backup encontrado</p>
              <p className="text-sm">Clique em "Criar Backup" para gerar o primeiro</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Escopo</TableHead>
                  <TableHead>Formato</TableHead>
                  <TableHead>Mensagens</TableHead>
                  <TableHead>Tamanho</TableHead>
                  <TableHead>Retenção</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {backups.map((backup) => (
                  <TableRow key={backup.id}>
                    <TableCell className="font-mono text-xs">{formatDate(backup.created_at)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="capitalize">
                        {backup.scope === "full_number" ? "Número completo" : "Conversa"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="gap-1">
                        <Lock className="w-3 h-3" />
                        Criptografado
                      </Badge>
                    </TableCell>
                    <TableCell>{backup.message_count}</TableCell>
                    <TableCell>{formatBytes(backup.size_bytes)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={cn(
                        "capitalize",
                        backup.retention_class === "manual_export" && "text-green-500",
                        backup.retention_class === "daily" && "text-blue-500",
                        backup.retention_class === "monthly" && "text-purple-500",
                      )}>
                        {backup.retention_class === "manual_export" ? "Manual" : backup.retention_class}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Baixar"
                          onClick={() => handleDownload(backup)}
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Excluir"
                          onClick={() => setDeleteConfirm(backup.id)}
                          className="text-red-500 hover:text-red-400"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Backup</DialogTitle>
            <DialogDescription>
              Esta ação não pode ser desfeita. O arquivo será removido permanentemente.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>Cancelar</Button>
            <Button variant="destructive" onClick={() => deleteConfirm && handleDelete(deleteConfirm)}>
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
};
