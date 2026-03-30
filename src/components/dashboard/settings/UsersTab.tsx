import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Loader2, UserPlus, Search, Key, Trash2, Eye, Edit,
  ShieldX, Save, Mail, Shield, Users, UserCheck,
  Wifi, RefreshCw, Camera, Globe, Phone as PhoneIcon, FileText
} from "lucide-react";
import { motion } from "framer-motion";
import { usePermissions } from "@/hooks/usePermissions";
import { useAuth } from "@/contexts/AuthContext";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from "@/components/ui/dialog";

/* ── ROLE config ─────────────────────────────────────── */
const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  dev_master:   { label: "Dev Master",   color: "bg-purple-500/20 text-purple-400 border border-purple-500/40" },
  admin_master: { label: "Admin Master", color: "bg-blue-500/20 text-blue-400 border border-blue-500/40" },
  admin:        { label: "Admin",        color: "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" },
  jornalista:   { label: "Jornalista",   color: "bg-green-500/20 text-green-400 border border-green-500/40" },
  reporter:     { label: "Repórter",     color: "bg-teal-500/20 text-teal-400 border border-teal-500/40" },
  colunista:    { label: "Colunista",    color: "bg-yellow-500/20 text-yellow-400 border border-yellow-500/40" },
  estagiario:   { label: "Estagiário",   color: "bg-orange-500/20 text-orange-400 border border-orange-500/40" },
  visualizador: { label: "Visualizador", color: "bg-muted/50 text-muted-foreground border border-border" },
};

const STATUS_DOT: Record<string, string> = {
  ativo: "bg-green-500",
  inativo: "bg-yellow-500",
  suspenso: "bg-red-500",
};

const StatusBadge = ({ status }: { status?: string }) => {
  const s = status || "ativo";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
      <span className={`w-2 h-2 rounded-full ${STATUS_DOT[s] || "bg-muted"}`} />
      {s.charAt(0).toUpperCase() + s.slice(1)}
    </span>
  );
};

const RoleBadge = ({ role }: { role?: string }) => {
  const info = ROLE_LABELS[role || "visualizador"] || ROLE_LABELS.visualizador;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${info.color}`}>
      <Shield className="w-3 h-3" /> {info.label}
    </span>
  );
};

const TwoFaBadge = ({ enabled }: { enabled?: boolean }) => (
  <span className={`inline-flex items-center gap-1 text-xs font-medium ${enabled ? "text-green-400" : "text-muted-foreground"}`}>
    <ShieldX className="w-4 h-4" />
    {enabled ? "Ativado" : "Desativado"}
  </span>
);

/* ── Avatar com dot de online ────────────────────────── */
const UserAvatar = ({ user, size = "sm", isDevMaster = false, isOnlineFromPresence = false }: { 
  user: any; 
  size?: "sm" | "lg"; 
  isDevMaster?: boolean;
  isOnlineFromPresence?: boolean;
}) => {
  const dim = size === "lg" ? "w-28 h-28 text-4xl" : "w-9 h-9 text-sm";
  const dotSz = size === "lg" ? "w-5 h-5 bottom-1 right-1" : "w-3 h-3 bottom-0 right-0";
  
  // A lógica de "Online" real para o sistema
  const isIncognito = user.online_status === 'offline';
  const showGreen = isOnlineFromPresence && !isIncognito;
  const showGray = isOnlineFromPresence && isIncognito && isDevMaster;

  return (
    <div className="relative flex-shrink-0">
      <div className={`${dim} rounded-full bg-muted/50 border-2 border-border/30 flex items-center justify-center overflow-hidden font-bold text-muted-foreground transition-all duration-300`}>
        {user.avatar_url
          ? <img src={user.avatar_url} alt={user.name} className="w-full h-full object-cover" />
          : user.name?.charAt(0)?.toUpperCase() || "U"}
      </div>
      {showGreen ? (
        <span className={`absolute ${dotSz} rounded-full bg-green-500 ring-2 ring-background animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]`} />
      ) : showGray ? (
        <span className={`absolute ${dotSz} rounded-full bg-muted-foreground/40 ring-2 ring-background shadow-inner`} />
      ) : null}
    </div>
  );
};

/* ── COMPONENT ───────────────────────────────────────── */
export const UsersTab = () => {
  const { toast } = useToast();
  const { can } = usePermissions();
  const { profile: myProfile } = useAuth();
  const isDevMaster = myProfile?.role === 'dev_master' || myProfile?.role === 'admin_master';
  const avatarInputRef = useRef<HTMLInputElement>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");

  // View dialog
  const [viewUser, setViewUser] = useState<any | null>(null);
  const [viewStats, setViewStats] = useState({ posts: 0, social: 0 });
  const [loadingStats, setLoadingStats] = useState(false);

  // Edit dialog
  const [editUser, setEditUser] = useState<any | null>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingEmail, setChangingEmail] = useState(false);

  // Invite dialog
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("visualizador");
  const [inviteName, setInviteName] = useState("");
  const [inviting, setInviting] = useState(false);

  // Realtime Presence tracking
  const { onlineUsersMap } = useAuth();

  /* ── fetch ── */
  const fetchUsers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setUsers(data || []);
    } catch {
      toast({ title: "Erro ao carregar usuários", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);



  const getKey = (u: any) => u.user_id ? "user_id" : "id";
  const getVal = (u: any) => u.user_id || u.id;

  /* ── computed stats ── */
  const onlineUsers   = Object.keys(onlineUsersMap).length;
  const totalUsers    = users.length;
  const activeUsers   = users.filter(u => (u.status || "ativo") === "ativo").length;
  const adminUsers    = users.filter(u => ["admin", "admin_master", "dev_master"].includes(u.role)).length;

  /* ── filtered list ── */
  const filtered = users.filter(u => {
    const name   = (u.name  || "").toLowerCase();
    const email  = (u.email || "").toLowerCase();
    const term   = searchTerm.toLowerCase();
    return (name.includes(term) || email.includes(term))
      && (filterRole   === "all" || u.role  === filterRole)
      && (filterStatus === "all" || (u.status || "ativo") === filterStatus);
  });

  /* ── actions ── */
  const handleUpdateRole = async (u: any, newRole: string) => {
    if (u.role === "dev_master") return toast({ title: "Não permitido", variant: "destructive" });
    const { error } = await (supabase as any).from("profiles").update({ role: newRole }).eq(getKey(u), getVal(u));
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Cargo atualizado" }); fetchUsers();
  };

  const handleUpdateStatus = async (u: any, newStatus: string) => {
    if (u.role === "dev_master") return toast({ title: "Não permitido", variant: "destructive" });
    const { error } = await (supabase as any).from("profiles").update({ status: newStatus }).eq(getKey(u), getVal(u));
    if (error) return toast({ title: "Erro", description: error.message, variant: "destructive" });
    toast({ title: "Status atualizado" }); fetchUsers();
  };

  const handleResetPassword = async (email: string) => {
    if (!email) return;
    try {
      const res = await fetch(`https://ghtkdkauseesambzqfrd.supabase.co/auth/v1/recover`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_ANON_KEY || "",
        },
        body: JSON.stringify({ email }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast({ title: "Link enviado", description: `Verifique ${email}` });
    } catch {
      toast({
        title: "Configure o Supabase",
        description: "Authentication > URL Configuration > Redirect URLs > adicione localhost:8081",
        variant: "destructive",
      });
    }
  };

  const handleReset2FA = async (u: any) => {
    const { error } = await (supabase as any).from("profiles").update({ two_factor_enabled: false }).eq(getKey(u), getVal(u));
    if (error) return toast({ title: "Erro ao resetar 2FA", description: error.message, variant: "destructive" });
    toast({ title: "2FA Resetado" }); fetchUsers();
  };

  const handleDelete = async (u: any) => {
    if (u.role === "dev_master") return toast({ title: "Negado", variant: "destructive" });
    if (!window.confirm(`Suspender ${u.name || u.email}?`)) return;
    handleUpdateStatus(u, "suspenso");
  };

  /* ── view ── */
  const handleViewUser = async (u: any) => {
    setViewUser(u);
    setLoadingStats(true);
    const uid = u.user_id || u.id;
    try {
      const [{ count: posts }, { count: social }] = await Promise.all([
        (supabase as any).from("articles").select("id", { count: "exact", head: true }).eq("user_id", uid),
        (supabase as any).from("social_posts").select("id", { count: "exact", head: true }).eq("user_id", uid),
      ]);
      setViewStats({ posts: posts ?? 0, social: social ?? 0 });
    } catch {
      setViewStats({ posts: 0, social: 0 });
    } finally {
      setLoadingStats(false);
    }
  };

  /* ── edit ── */
  const handleEditUser = (u: any) => {
    setEditUser(u);
    setEditForm({
      name:       u.name    || "",
      email:      u.email   || "",
      phone:      u.phone   || "",
      bio:        u.bio     || "",
      website:    u.website || "",
      role:       u.role    || "visualizador",
      status:     u.status  || "ativo",
      avatar_url: u.avatar_url || "",
    });
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !editUser) return;
    setUploadingAvatar(true);
    try {
      const ext  = file.name.split(".").pop();
      const path = `avatars/${getVal(editUser)}_${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("media").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("media").getPublicUrl(path);
      setEditForm((f: any) => ({ ...f, avatar_url: data.publicUrl }));
    } catch (e: any) {
      toast({ title: "Erro no upload", description: e.message, variant: "destructive" });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangeEmail = async () => {
    if (!editUser || !editForm.email) return;
    setChangingEmail(true);
    try {
      const { error } = await supabase.functions.invoke("admin-update-user", {
        body: { userId: getVal(editUser), email: editForm.email },
      });
      if (error) throw error;
      toast({ title: "Email atualizado", description: "O usuário receberá uma confirmação no novo endereço." });
    } catch (e: any) {
      toast({
        title: "Erro ao alterar email",
        description: "Requer Edge Function 'admin-update-user' com Service Role Key.",
        variant: "destructive",
      });
    } finally {
      setChangingEmail(false);
    }
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    setSaving(true);
    const payload: Record<string, any> = {
      name:       editForm.name    || null,
      role:       editForm.role,
      status:     editForm.status,
      avatar_url: editForm.avatar_url || null,
    };
    if (editForm.phone   !== undefined) payload.phone   = editForm.phone   || null;
    if (editForm.bio     !== undefined) payload.bio     = editForm.bio     || null;
    if (editForm.website !== undefined) payload.website = editForm.website || null;

    const { error } = await supabase.from("profiles").update(payload).eq(getKey(editUser), getVal(editUser));
    setSaving(false);
    if (error) {
      console.error("Profile update error:", error);
      return toast({ title: "Erro ao salvar", description: error.message, variant: "destructive" });
    }
    toast({ title: "Perfil atualizado!" });
    setEditUser(null);
    fetchUsers();
  };

  /* ── invite ── */
  const handleInvite = async () => {
    if (!inviteEmail) return toast({ title: "Email obrigatório", variant: "destructive" });
    setInviting(true);
    try {
      const { error } = await supabase.functions.invoke("create-user-invite", {
        body: { email: inviteEmail, name: inviteName, role: inviteRole },
      });
      if (error) throw error;
      toast({ title: "Convite enviado!", description: `Email enviado para ${inviteEmail}` });
      setIsInviteOpen(false);
      setInviteEmail(""); setInviteName(""); setInviteRole("visualizador");
      fetchUsers();
    } catch (e: any) {
      toast({ title: "Falha ao convidar", description: e.message, variant: "destructive" });
    } finally {
      setInviting(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center items-center py-16">
      <Loader2 className="w-6 h-6 animate-spin text-primary" />
    </div>
  );

  /* ── RENDER ── */
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-xl font-bold text-foreground">Gerenciamento de Usuários</h2>
          <p className="text-sm text-muted-foreground mt-0.5">Gerencie permissões e acesso ao sistema</p>
        </div>
        {can("user.create") && (
          <Button onClick={() => setIsInviteOpen(true)} className="bg-primary hover:bg-primary/90 gap-2">
            <UserPlus className="w-4 h-4" /> Novo Usuário
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { icon: Users,     label: "Total de Usuários",  value: totalUsers,  color: "text-primary",    bg: "bg-primary/10" },
          { icon: UserCheck, label: "Usuários Ativos",    value: activeUsers, color: "text-green-400",  bg: "bg-green-500/10", highlight: true },
          { icon: Wifi,      label: "Online Agora",       value: onlineUsers, color: "text-emerald-400",bg: "bg-emerald-500/10" },
          { icon: Shield,    label: "Administradores",    value: adminUsers,  color: "text-blue-400",   bg: "bg-blue-500/10" },
        ].map(({ icon: Icon, label, value, color, bg, highlight }) => (
          <div key={label} className={`glass-card rounded-xl border p-4 flex items-center gap-3 ${highlight ? "border-green-500/30 ring-1 ring-green-500/20" : "border-border/20"}`}>
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center flex-shrink-0`}>
              <Icon className={`w-5 h-5 ${color}`} />
            </div>
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wider leading-tight">{label}</div>
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="glass-card rounded-xl border border-border/20 p-4 flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Role</label>
          <select value={filterRole} onChange={(e) => setFilterRole(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">Todas</option>
            {Object.entries(ROLE_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground font-medium">Status</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}
            className="h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring">
            <option value="all">Todos</option>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
            <option value="suspenso">Suspenso</option>
          </select>
        </div>
        <div className="space-y-1 flex-1 min-w-40">
          <label className="text-xs text-muted-foreground font-medium">Buscar</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nome ou email..." className="pl-9 h-9 bg-muted/20" />
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => { setSearchTerm(""); setFilterRole("all"); setFilterStatus("all"); }} className="h-9 gap-2">
          <RefreshCw className="w-3.5 h-3.5" /> Limpar
        </Button>
      </div>

      {/* Table */}
      <div className="glass-card rounded-xl border border-border/20 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/20 border-b border-border/20">
              <tr>
                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Usuário</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Role</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">2FA</th>
                <th className="px-5 py-3.5 text-left text-xs font-bold uppercase tracking-wider text-muted-foreground">Último Acesso</th>
                <th className="px-5 py-3.5 text-right text-xs font-bold uppercase tracking-wider text-muted-foreground">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/10">
              {filtered.map((u) => (
                <tr key={u.id} className="hover:bg-muted/10 transition-colors group">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <UserAvatar 
                        user={u} 
                        isOnlineFromPresence={!!onlineUsersMap[u.user_id || u.id]} 
                        isDevMaster={isDevMaster} 
                      />
                      <div>
                        <div className="font-semibold text-foreground group-hover:text-primary transition-colors">{u.name || "Sem Nome"}</div>
                        <div className="text-xs text-muted-foreground">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5"><RoleBadge role={u.role} /></td>
                  <td className="px-5 py-3.5"><StatusBadge status={u.status} /></td>
                  <td className="px-5 py-3.5"><TwoFaBadge enabled={u.two_factor_enabled} /></td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">
                    {u.updated_at ? new Date(u.updated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                  </td>
                  <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Ver — azul */}
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500/20 hover:text-blue-300 transition-all shadow-[0_0_10px_rgba(59,130,246,0.1)] hover:shadow-[0_0_15px_rgba(59,130,246,0.3)]" title="Ver Perfil" onClick={() => handleViewUser(u)}>
                          <Eye className="w-4 h-4" />
                        </Button>
                        {/* Editar — verde */}
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20 hover:text-green-300 transition-all shadow-[0_0_10px_rgba(34,197,94,0.1)] hover:shadow-[0_0_15px_rgba(34,197,94,0.3)]" title="Editar" onClick={() => handleEditUser(u)} disabled={!can("user.edit")}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        {/* Reset 2FA — amarelo */}
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-yellow-500/10 text-yellow-400 border-yellow-500/30 hover:bg-yellow-500/20 hover:text-yellow-300 transition-all shadow-[0_0_10px_rgba(234,179,8,0.1)] hover:shadow-[0_0_15px_rgba(234,179,8,0.3)]" title="Resetar 2FA" onClick={() => handleReset2FA(u)} disabled={!can("user.edit") || u.role === "dev_master"}>
                          <ShieldX className="w-4 h-4" />
                        </Button>
                        {/* Suspender — vermelho */}
                        <Button variant="outline" size="icon" className="h-8 w-8 bg-red-500/10 text-red-500 border-red-500/30 hover:bg-red-500/20 hover:text-red-400 transition-all shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]" title="Suspender" onClick={() => handleDelete(u)} disabled={!can("user.delete") || u.role === "dev_master"}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── DIALOG: VER ── */}
      <Dialog open={!!viewUser} onOpenChange={(o) => !o && setViewUser(null)}>
        <DialogContent className="sm:max-w-md w-[95vw] max-h-[85vh] overflow-y-auto">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle>Perfil do Usuário</DialogTitle>
            <DialogDescription>Visualização completa do integrante.</DialogDescription>
          </DialogHeader>
          {viewUser && (
            <div className="space-y-4 py-1">
              {/* Avatar + info */}
              <div className="flex flex-col items-center gap-2 py-2">
                <UserAvatar 
                  user={viewUser} 
                  isOnlineFromPresence={!!onlineUsersMap[viewUser.user_id || viewUser.id]} 
                  size="lg" 
                  isDevMaster={isDevMaster} 
                />
                <div className="text-center">
                  <h3 className="text-lg font-bold">{viewUser.name || "Sem Nome"}</h3>
                  <p className="text-sm text-muted-foreground">{viewUser.email}</p>
                  <div className="mt-1.5 flex items-center justify-center gap-2 flex-wrap">
                    <RoleBadge role={viewUser.role} />
                    {(() => {
                      const present = !!onlineUsersMap[viewUser.user_id || viewUser.id];
                      const incognito = viewUser.online_status === 'offline';
                      if (present && !incognito) {
                        return (
                          <span className="inline-flex items-center gap-1 text-xs text-green-400 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                            Online
                          </span>
                        );
                      }
                      if (present && incognito && isDevMaster) {
                        return (
                          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-semibold bg-muted/20 px-2 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50" />
                            Logado (Oculto)
                          </span>
                        );
                      }
                      return null;
                    })()}
                  </div>
                </div>
              </div>

              {/* Status + 2FA cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-muted/20 rounded-xl border border-border/20 p-3 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">Status</div>
                  <StatusBadge status={viewUser.status} />
                </div>
                <div className="bg-muted/20 rounded-xl border border-border/20 p-3 text-center">
                  <div className="text-xs text-muted-foreground uppercase tracking-wider mb-1">2FA</div>
                  <TwoFaBadge enabled={viewUser.two_factor_enabled} />
                </div>
              </div>

              {/* Datas */}
              <div className="space-y-1.5 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <span>📅</span>
                  Criado em {viewUser.created_at ? new Date(viewUser.created_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                </div>
                <div className="flex items-center gap-2">
                  <span>🕐</span>
                  Último acesso {viewUser.updated_at ? new Date(viewUser.updated_at).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" }) : "—"}
                </div>
                {viewUser.phone && (
                  <div className="flex items-center gap-2"><PhoneIcon className="w-4 h-4" /> {viewUser.phone}</div>
                )}
                {viewUser.website && (
                  <div className="flex items-center gap-2"><Globe className="w-4 h-4" /> {viewUser.website}</div>
                )}
              </div>

              {viewUser.bio && (
                <div className="p-3 bg-muted/10 rounded-lg border border-border/10 text-sm">
                  <div className="text-xs text-muted-foreground mb-1">Bio</div>
                  {viewUser.bio}
                </div>
              )}

              {/* Estatísticas reais */}
              <div className="border-t border-border/20 pt-3">
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Estatísticas</div>
                {loadingStats ? (
                  <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-muted/10 rounded-lg p-3 text-center border border-border/10">
                      <div className="text-2xl font-bold text-primary">{viewStats.posts}</div>
                      <div className="text-xs text-muted-foreground mt-0.5 flex items-center justify-center gap-1">
                        <FileText className="w-3 h-3" /> Posts
                      </div>
                    </div>
                    <div className="bg-muted/10 rounded-lg p-3 text-center border border-border/10">
                      <div className="text-2xl font-bold text-primary">{viewStats.social}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">Publicações Sociais</div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-between pt-1">
                <Button variant="outline" onClick={() => setViewUser(null)}>Fechar</Button>
                {can("user.edit") && (
                  <Button className="bg-primary gap-2" onClick={() => { setViewUser(null); handleEditUser(viewUser); }}>
                    <Edit className="w-4 h-4" /> Editar
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: EDITAR ── */}
      <Dialog open={!!editUser} onOpenChange={(o) => (!o && !saving) && setEditUser(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar: {editUser?.name || editUser?.email}</DialogTitle>
            <DialogDescription>Altere as informações do integrante.</DialogDescription>
          </DialogHeader>
          {editUser && (
            <div className="space-y-4 py-2">
              {/* Avatar */}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className="relative w-20 h-20 rounded-full bg-muted/50 border-2 border-dashed border-border overflow-hidden cursor-pointer group"
                  onClick={() => avatarInputRef.current?.click()}
                >
                  {editForm.avatar_url
                    ? <img src={editForm.avatar_url} alt="avatar" className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center text-2xl font-bold text-muted-foreground">
                        {editForm.name?.charAt(0)?.toUpperCase() || "U"}
                      </div>}
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    {uploadingAvatar ? <Loader2 className="w-5 h-5 animate-spin text-white" /> : <Camera className="w-5 h-5 text-white" />}
                  </div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 bg-primary rounded-full flex items-center justify-center shadow-lg">
                    <Camera className="w-3 h-3 text-white" />
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">Clique no ícone para trocar a foto</p>
                <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>

              {/* Nome completo */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">👤 Nome Completo *</label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} placeholder="Nome completo" className="bg-muted/20" />
              </div>

              {/* Email — editável com aviso */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">✉️ Email</label>
                <div className="flex gap-2 items-center">
                  <Input
                    value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                    placeholder="email@exemplo.com"
                    type="email"
                    className="bg-muted/20 flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleChangeEmail}
                    disabled={changingEmail || editForm.email === editUser.email}
                    className="shrink-0"
                  >
                    {changingEmail ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Mail className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground/60">Alterar email envia uma confirmação ao novo endereço via Admin API.</p>
              </div>

              {/* Role + Status */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">🛡 Cargo (Role)</label>
                  <select
                    value={editForm.role}
                    onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                    disabled={editUser.role === "dev_master"}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="visualizador">Visualizador</option>
                    <option value="estagiario">Estagiário</option>
                    <option value="reporter">Repórter</option>
                    <option value="jornalista">Jornalista</option>
                    <option value="colunista">Colunista</option>
                    <option value="admin">Admin</option>
                    <option value="admin_master">Admin Master</option>
                    {editUser.role === "dev_master" && <option value="dev_master">Dev Master</option>}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">⚙ Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    disabled={editUser.role === "dev_master"}
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="ativo">Ativo</option>
                    <option value="inativo">Inativo</option>
                    <option value="suspenso">Suspenso</option>
                  </select>
                </div>
              </div>

              {/* Telefone */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">📞 Telefone</label>
                <Input value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="+55 (00) 00000-0000" className="bg-muted/20" />
              </div>

              {/* Email */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">✉️ Email Corporativo</label>
                <div className="flex items-center gap-2">
                  <Input value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className="bg-muted/20" />
                  {editForm.email !== editUser?.email && (
                    <Button type="button" size="sm" variant="secondary" onClick={handleChangeEmail} disabled={changingEmail}>
                      {changingEmail ? <Loader2 className="w-4 h-4 animate-spin" /> : "Atualizar Email"}
                    </Button>
                  )}
                </div>
              </div>

              {/* Website / Localização */}
              <div className="space-y-1.5 pt-2">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">🌐 Website / Localização</label>
                <Input value={editForm.website} onChange={(e) => setEditForm({ ...editForm, website: e.target.value })} placeholder="https://... ou Cidade, Estado" className="bg-muted/20" />
              </div>

              {/* Bio */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">≡ Bio</label>
                <textarea
                  value={editForm.bio}
                  onChange={(e) => setEditForm({ ...editForm, bio: e.target.value })}
                  placeholder="Breve descrição..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-md border border-input bg-muted/20 text-sm focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>

              {/* Reset senha */}
              <div className="flex items-center gap-2 p-3 bg-muted/10 rounded-lg border border-border/10">
                <Key className="w-4 h-4 text-primary flex-shrink-0" />
                <span className="text-xs text-muted-foreground flex-1">Enviar link de redefinição de senha para {editUser.email}</span>
                <Button type="button" variant="outline" size="sm" onClick={() => handleResetPassword(editUser.email)}>
                  Enviar
                </Button>
              </div>

              <div className="flex justify-between pt-1">
                <Button variant="outline" onClick={() => setEditUser(null)}>Cancelar</Button>
                <Button onClick={handleSaveEdit} disabled={saving} className="bg-primary gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Salvar
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── DIALOG: CONVIDAR ── */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Convidar Novo Usuário</DialogTitle>
            <DialogDescription>Um magic link será enviado via Supabase Auth.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nome (opcional)</label>
              <Input value={inviteName} onChange={(e) => setInviteName(e.target.value)} placeholder="João Silva" className="bg-muted/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">E-mail *</label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} type="email" placeholder="email@exemplo.com" className="bg-muted/20" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Nível de Acesso</label>
              <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring">
                <option value="visualizador">Visualizador</option>
                <option value="estagiario">Estagiário</option>
                <option value="reporter">Repórter</option>
                <option value="jornalista">Jornalista</option>
                <option value="colunista">Colunista</option>
                <option value="admin">Administrador</option>
                <option value="admin_master">Admin Master</option>
              </select>
            </div>
            <Button onClick={handleInvite} disabled={inviting} className="w-full bg-primary gap-2">
              {inviting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
              {inviting ? "Enviando..." : "Enviar Convite"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

    </motion.div>
  );
};
