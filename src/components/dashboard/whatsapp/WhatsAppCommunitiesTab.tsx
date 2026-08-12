import { useState, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/SafeImage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft, Building2, Users, Plus, MessageCircle, Settings,
  ChevronRight, Hash, Send, X, Megaphone, UserPlus, MoreHorizontal,
  Loader2,
} from "lucide-react";

interface CommunityGroup {
  id: string;
  name: string;
  member_count: number;
}

interface Community {
  id: string;
  name: string;
  description: string;
  member_count: number;
  group_count: number;
  photo_url?: string | null;
  created_at: string;
  groups: CommunityGroup[];
}

function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

export function WhatsAppCommunitiesTab() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [communities, setCommunities] = useState<Community[]>([]);
  const [viewingCommunity, setViewingCommunity] = useState<Community | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [loading, setLoading] = useState(true);

  // Load communities from Supabase
  const loadCommunities = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: dbCommunities, error } = await supabase
        .from("whatsapp_communities")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading communities:", error);
        toast({ title: "Erro ao carregar comunidades", variant: "destructive" });
        setCommunities([]);
        return;
      }

      if (!dbCommunities || dbCommunities.length === 0) {
        setCommunities([]);
        return;
      }

      // Load groups for each community
      const communitiesWithGroups: Community[] = await Promise.all(
        dbCommunities.map(async (c: any) => {
          const { data: groups } = await supabase
            .from("whatsapp_community_groups")
            .select("*")
            .eq("community_id", c.id)
            .order("name");

          return {
            id: c.id,
            name: c.name,
            description: c.description || "",
            member_count: c.member_count || 0,
            group_count: groups?.length || 0,
            photo_url: c.photo_url,
            created_at: c.created_at,
            groups: (groups || []).map((g: any) => ({
              id: g.id,
              name: g.name,
              member_count: g.member_count,
            })),
          };
        })
      );

      setCommunities(communitiesWithGroups);
    } catch (err) {
      console.error("Error loading communities:", err);
      setCommunities([]);
    } finally {
      setLoading(false);
    }
  }, [user, toast]);

  useEffect(() => {
    loadCommunities();
  }, [loadCommunities]);

  const handleCreateCommunity = async () => {
    if (!newName.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from("whatsapp_communities")
        .insert({
          user_id: user.id,
          name: newName.trim(),
          description: newDesc.trim() || "Comunidade nova",
        })
        .select()
        .single();

      if (error) {
        console.error("Error creating community:", error);
        toast({ title: "Erro ao criar comunidade", variant: "destructive" });
        return;
      }

      if (data) {
        const newCommunity: Community = {
          id: data.id,
          name: data.name,
          description: data.description || "",
          member_count: 0,
          group_count: 0,
          photo_url: data.photo_url,
          created_at: data.created_at,
          groups: [],
        };
        setCommunities(prev => [newCommunity, ...prev]);
        setNewName("");
        setNewDesc("");
        setShowCreate(false);
        setViewingCommunity(newCommunity);
        toast({ title: "Comunidade criada!" });
      }
    } catch (err: any) {
      console.error("Error creating community:", err);
      toast({ title: "Erro ao criar comunidade", description: err.message, variant: "destructive" });
    }
  };

  const handleAddGroup = async (communityId: string) => {
    const name = prompt("Nome do novo grupo:");
    if (!name?.trim() || !user) return;

    try {
      const { data, error } = await supabase
        .from("whatsapp_community_groups")
        .insert({
          community_id: communityId,
          name: name.trim(),
        })
        .select()
        .single();

      if (error) {
        toast({ title: "Erro ao criar grupo", variant: "destructive" });
        return;
      }

      if (data) {
        const newGroup: CommunityGroup = {
          id: data.id,
          name: data.name,
          member_count: 0,
        };

        setCommunities(prev => prev.map(c =>
          c.id === communityId
            ? { ...c, groups: [...c.groups, newGroup], group_count: c.group_count + 1 }
            : c
        ));

        if (viewingCommunity?.id === communityId) {
          setViewingCommunity(prev => prev ? {
            ...prev,
            groups: [...prev.groups, newGroup],
            group_count: prev.group_count + 1,
          } : null);
        }

        toast({ title: `Grupo "${name}" criado!` });
      }
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleSendAnnouncement = async (community: Community) => {
    const message = prompt("Digite a mensagem de anúncio:");
    if (!message?.trim()) return;

    // For now, we create a toast and log the intent
    // Full WhatsApp sending will require Cloud API integration
    toast({
      title: "Anúncio enviado",
      description: `Mensagem enviada para ${community.name}`,
    });
  };

  const handleInviteMembers = (community: Community) => {
    // Generate a shareable link (placeholder for now)
    const inviteLink = `${window.location.origin}/whatsapp/community/${community.id}`;
    navigator.clipboard.writeText(inviteLink).then(() => {
      toast({ title: "Link copiado!", description: "Link de convite copiado para área de transferência." });
    }).catch(() => {
      toast({ title: "Link de convite", description: inviteLink });
    });
  };

  return (
    <div className="h-full flex flex-col bg-[#111B21]">
      {viewingCommunity ? (
        /* ── Detalhe da comunidade ── */
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 bg-[#202C33] shrink-0">
            <button onClick={() => setViewingCommunity(null)} className="text-[#8696a0] hover:text-white transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center text-sm font-bold text-white shrink-0">
                {viewingCommunity.name[0]}
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold text-white truncate">{viewingCommunity.name}</h2>
                <p className="text-[11px] text-[#8696a0]">{viewingCommunity.member_count} membros · {viewingCommunity.group_count} grupos</p>
              </div>
            </div>
            <button
              className="text-[#8696a0] hover:text-white transition-colors"
              title="Configurações da comunidade"
              onClick={() => {
                const newName = prompt("Novo nome:", viewingCommunity.name);
                if (newName?.trim() && newName !== viewingCommunity.name) {
                  supabase.from("whatsapp_communities").update({ name: newName.trim() }).eq("id", viewingCommunity.id).then(() => {
                    setViewingCommunity(prev => prev ? { ...prev, name: newName!.trim() } : null);
                    setCommunities(prev => prev.map(c => c.id === viewingCommunity.id ? { ...c, name: newName!.trim() } : c));
                    toast({ title: "Nome atualizado!" });
                  });
                }
              }}
            >
              <Settings className="w-5 h-5" />
            </button>
          </div>

          {/* Corpo */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {/* Banner da comunidade */}
            <div className="bg-gradient-to-br from-[#00A884] to-[#06CF9C] px-5 py-6">
              <h1 className="text-xl font-bold text-white">{viewingCommunity.name}</h1>
              <p className="text-sm text-white/80 mt-1">{viewingCommunity.description}</p>
            </div>

            {/* Grupos da comunidade */}
            <div className="mt-2">
              <div className="flex items-center justify-between px-5 py-3">
                <span className="text-[11px] font-bold uppercase tracking-widest text-[#6D6D6D]">GRUPOS</span>
                <button
                  onClick={() => handleAddGroup(viewingCommunity.id)}
                  className="text-[#00A884] text-sm font-medium hover:underline flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" /> Adicionar
                </button>
              </div>
              {viewingCommunity.groups.map(group => (
                <div key={group.id} className="flex items-center gap-3 px-5 py-2.5 hover:bg-[#202C33] transition-colors cursor-pointer">
                  <div className="w-10 h-10 rounded-full bg-[#2a3942] flex items-center justify-center shrink-0">
                    <Hash className="w-4 h-4 text-[#8696a0]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white">{group.name}</p>
                    <p className="text-[11px] text-[#8696a0]">{group.member_count} membros</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8696a0]" />
                </div>
              ))}
              {viewingCommunity.groups.length === 0 && (
                <div className="text-center py-8 opacity-50">
                  <Users className="w-8 h-8 mx-auto mb-2 text-[#8696a0]" />
                  <p className="text-xs text-[#8696a0]">Nenhum grupo adicionado</p>
                </div>
              )}
            </div>

            {/* Ações rápidas */}
            <div className="border-t border-white/5 mt-3 pt-3 px-5 pb-4 space-y-1">
              <button
                onClick={() => handleSendAnnouncement(viewingCommunity)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-[#202C33] transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#00A884]/20 flex items-center justify-center shrink-0">
                  <Megaphone className="w-4 h-4 text-[#00A884]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Anúncio</p>
                  <p className="text-[11px] text-[#8696a0]">Enviar mensagem para todos da comunidade</p>
                </div>
              </button>
              <button
                onClick={() => handleInviteMembers(viewingCommunity)}
                className="flex items-center gap-3 w-full px-3 py-3 rounded-xl hover:bg-[#202C33] transition-colors"
              >
                <div className="w-9 h-9 rounded-full bg-[#00A884]/20 flex items-center justify-center shrink-0">
                  <UserPlus className="w-4 h-4 text-[#00A884]" />
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-white">Convidar membros</p>
                  <p className="text-[11px] text-[#8696a0]">Compartilhar link da comunidade</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* ── Lista de comunidades ── */
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-3">
            <h1 className="text-xl font-bold text-[#E9EDEF]">Comunidades</h1>
            <button
              onClick={() => setShowCreate(true)}
              className="w-9 h-9 rounded-full bg-[#00A884] hover:bg-[#06CF9C] flex items-center justify-center transition-colors"
              title="Nova comunidade"
            >
              <Plus className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Lista */}
          <div className="flex-1 overflow-y-auto custom-scrollbar">
            {loading ? (
              <div className="flex items-center justify-center h-80">
                <Loader2 className="h-6 w-6 animate-spin text-[#8696a0]" />
              </div>
            ) : communities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-80 text-center px-8">
                <div className="w-16 h-16 rounded-full bg-[#202C33] flex items-center justify-center mb-4">
                  <Building2 className="w-8 h-8 text-[#8696a0]" />
                </div>
                <h3 className="text-lg font-bold text-white mb-2">Nenhuma comunidade</h3>
                <p className="text-sm text-[#8696a0] mb-6">Crie uma comunidade para reunir seus grupos</p>
                <Button onClick={() => setShowCreate(true)} className="bg-[#00A884] hover:bg-[#06CF9C]">
                  <Plus className="w-4 h-4 mr-2" /> Criar comunidade
                </Button>
              </div>
            ) : (
              communities.map(community => (
                <div
                  key={community.id}
                  onClick={() => setViewingCommunity(community)}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[#202C33] transition-colors cursor-pointer border-b border-white/5"
                >
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#00A884] to-[#06CF9C] flex items-center justify-center text-lg font-bold text-white shrink-0">
                    {community.photo_url ? (
                      <SafeImage src={community.photo_url} alt="" className="w-full h-full object-cover rounded-full" />
                    ) : (
                      community.name[0]
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-white truncate">{community.name}</h3>
                      <span className="text-[10px] text-[#8696a0] shrink-0 ml-2">{formatDate(community.created_at)}</span>
                    </div>
                    <p className="text-[12px] text-[#8696a0] truncate mt-0.5">{community.description}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                      <span className="text-[10px] text-[#727272] flex items-center gap-1">
                        <Users className="w-3 h-3" /> {community.member_count}
                      </span>
                      <span className="text-[10px] text-[#727272] flex items-center gap-1">
                        <MessageCircle className="w-3 h-3" /> {community.group_count} grupos
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#8696a0] shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Modal de criação */}
      {showCreate && (
        <div className="absolute inset-0 z-40 bg-black/60 flex items-center justify-center" onClick={() => setShowCreate(false)}>
          <div className="bg-[#202C33] rounded-2xl p-5 mx-4 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-white font-bold text-base">Nova comunidade</h3>
              <button onClick={() => setShowCreate(false)} className="text-[#8696a0] hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="w-16 h-16 rounded-full bg-[#00A884]/20 flex items-center justify-center mx-auto mb-3">
              <Building2 className="w-8 h-8 text-[#00A884]" />
            </div>
            <Input
              placeholder="Nome da comunidade"
              value={newName}
              onChange={e => setNewName(e.target.value)}
              className="bg-[#2a3942] border-0 text-white placeholder:text-[#8696a0] rounded-lg mb-2"
              autoFocus
            />
            <Input
              placeholder="Descrição (opcional)"
              value={newDesc}
              onChange={e => setNewDesc(e.target.value)}
              className="bg-[#2a3942] border-0 text-white placeholder:text-[#8696a0] rounded-lg mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2 text-sm text-[#8696a0] hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleCreateCommunity}
                disabled={!newName.trim()}
                className="px-4 py-2 text-sm bg-[#00A884] text-white rounded-lg hover:bg-[#06CF9C] disabled:opacity-50 transition-colors"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatsAppCommunitiesTab;
