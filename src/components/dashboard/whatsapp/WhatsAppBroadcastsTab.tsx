"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Send,
  Plus,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  MessageSquare,
} from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { BroadcastWizard } from "./broadcasts/broadcast-wizard";

interface Broadcast {
  id: string;
  name: string;
  template_name: string;
  status: "draft" | "scheduled" | "sending" | "sent" | "failed";
  total_recipients: number;
  delivered_count: number;
  read_count: number;
  failed_count: number;
  created_at: string;
}

interface WhatsAppBroadcastsTabProps {
  onViewDetail?: (broadcastId: string) => void;
}

export function WhatsAppBroadcastsTab({ onViewDetail }: WhatsAppBroadcastsTabProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [wizardOpen, setWizardOpen] = useState(false);

  const fetchBroadcasts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("broadcasts")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setBroadcasts(data ?? []);
    } catch (err: unknown) {
      // Table doesn't exist or other schema issue → show empty state quietly
      if (
        err instanceof Error &&
        (err.message?.includes("relation") ||
         err.message?.includes("does not exist") ||
         err.message?.includes("Could not find") ||
         err.message?.includes("404"))
      ) {
        setBroadcasts([]);
        console.info("Broadcasts table not available yet — showing empty state.");
        return;
      }
      toast({
        title: "Erro ao carregar transmissões",
        description: err instanceof Error ? err.message : "Erro desconhecido",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    fetchBroadcasts();
  }, [fetchBroadcasts]);

  const getStatusIcon = (status: Broadcast["status"]) => {
    switch (status) {
      case "sent":
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case "sending":
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case "failed":
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Clock className="h-4 w-4 text-yellow-500" />;
    }
  };

  const statusLabel = (status: Broadcast["status"]) => {
    switch (status) {
      case "sent": return "Enviado";
      case "sending": return "Enviando";
      case "failed": return "Falhou";
      case "draft": return "Rascunho";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="px-4 pt-2 pb-1">
        <p className="text-xs text-muted-foreground/70">Transmissões: envie mensagens em massa para listas de contatos.</p>
      </div>
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-sm flex items-center gap-2">
            <Send className="h-4 w-4" />
            Campanhas de Transmissão
          </h3>
          <p className="text-xs text-muted-foreground/70 mt-0.5">
            Envie mensagens em massa para seus contatos WhatsApp usando templates
          </p>
        </div>
        <Button size={isMobile ? "sm" : "default"} onClick={() => setWizardOpen(true)}>
          <Plus className="h-4 w-4 mr-1.5" />
          Nova Transmissão
        </Button>
      </div>

      {/* Broadcasts list */}
      {broadcasts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Send className="h-16 w-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhuma transmissão</p>
          <p className="text-sm text-muted-foreground/60 mt-1">
            Crie sua primeira campanha de transmissão WhatsApp
          </p>
          <Button variant="outline" className="mt-4" onClick={() => setWizardOpen(true)}>
            <Plus className="h-4 w-4 mr-2" /> Nova Transmissão
          </Button>
        </div>
      ) : isMobile ? (
        <div className="space-y-2">
          {broadcasts.map((b) => (
            <Card
              key={b.id}
              className="overflow-hidden cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => onViewDetail?.(b.id)}
            >
              <CardContent className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(b.status)}
                      <p className="font-medium text-sm truncate">{b.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground/70 truncate mt-1">
                      Template: {b.template_name}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-[10px] text-muted-foreground/50">
                      <span>{b.total_recipients ?? 0} destinatário(s)</span>
                      <span>{b.delivered_count ?? 0} entregue(s)</span>
                      {b.read_count ? <span>{b.read_count} lida(s)</span> : null}
                    </div>
                  </div>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                    b.status === "sent" ? "bg-green-500/10 text-green-400" :
                    b.status === "draft" ? "bg-yellow-500/10 text-yellow-400" :
                    b.status === "failed" ? "bg-red-500/10 text-red-400" :
                    "bg-blue-500/10 text-blue-400"
                  }`}>
                    {statusLabel(b.status)}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-sm font-medium">Histórico</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Status</TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead className="text-right">Destinatários</TableHead>
                  <TableHead className="text-right">Entregues</TableHead>
                  <TableHead className="text-right">Lidas</TableHead>
                  <TableHead className="text-right">Data</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {broadcasts.map((b) => (
                  <TableRow
                    key={b.id}
                    className="cursor-pointer hover:bg-accent/50 transition-colors"
                    onClick={() => onViewDetail?.(b.id)}
                  >
                    <TableCell>{getStatusIcon(b.status)}</TableCell>
                    <TableCell className="font-medium text-sm">{b.name}</TableCell>
                    <TableCell className="text-sm text-muted-foreground/70">
                      {b.template_name}
                    </TableCell>
                    <TableCell className="text-right text-sm">{b.total_recipients ?? 0}</TableCell>
                    <TableCell className="text-right text-sm text-green-600">
                      {b.delivered_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right text-sm text-blue-600">
                      {b.read_count ?? 0}
                    </TableCell>
                    <TableCell className="text-right text-xs text-muted-foreground/70">
                      {new Date(b.created_at).toLocaleDateString("pt-BR")}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <BroadcastWizard
        open={wizardOpen}
        onClose={() => setWizardOpen(false)}
        onComplete={fetchBroadcasts}
      />
    </div>
  );
}

export default WhatsAppBroadcastsTab;
