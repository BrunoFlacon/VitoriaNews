"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { getProxyUrl } from "@/lib/utils";
import {
  Phone,
  Copy,
  Check,
  User,
  Tag as TagIcon,
  DollarSign,
  StickyNote,
  Plus,
  X,
  Image,
  FileText,
  Clock,
  ShoppingBag,
  MessageSquare,
  Send,
  Timer,
  ChevronRight,
  Trash2,
  BellOff,
  Bell,
  Pencil,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ContactSidebarProps {
  chat: any;
  onClose: () => void;
}

export function ContactSidebar({ chat, onClose }: ContactSidebarProps) {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);

  // CRM data — keyed by resolved contact_id (from contacts table)
  const [resolvedContactId, setResolvedContactId] = useState<string | null>(null);
  const [deals, setDeals] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [tags, setTags] = useState<any[]>([]);
  const [media, setMedia] = useState<any[]>([]);
  const [allTags, setAllTags] = useState<any[]>([]);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");

  // Note form
  const [newNote, setNewNote] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [deletingNote, setDeletingNote] = useState<string | null>(null);

  // Deal creation
  const [showDealForm, setShowDealForm] = useState(false);
  const [newDealTitle, setNewDealTitle] = useState("");
  const [newDealValue, setNewDealValue] = useState("");
  const [dealStages, setDealStages] = useState<any[]>([]);
  const [selectedStageId, setSelectedStageId] = useState<string>("");
  const [creatingDeal, setCreatingDeal] = useState(false);

  // Edit deal
  const [editingDeal, setEditingDeal] = useState<any | null>(null);
  const [editDealTitle, setEditDealTitle] = useState("");

  // Mute & disappearing
  const [muted, setMuted] = useState(false);
  const [disappearing, setDisappearing] = useState(false);

  // ── Resolve contact_id from contacts table ──────────────────────────
  const resolveContactId = useCallback(async (): Promise<string | null> => {
    if (!user || !chat?.channelId) return null;

    const phone = chat.channelId;

    // 1. Try whatsapp_conversations.contact_id
    if (chat.id) {
      const { data: conv } = await supabase
        .from("whatsapp_conversations")
        .select("contact_id")
        .eq("id", chat.id)
        .maybeSingle();
      if (conv?.contact_id) {
        setResolvedContactId(conv.contact_id);
        return conv.contact_id;
      }
    }

    // 2. Try finding contact by phone
    const normalized = phone.replace(/\D/g, "");
    const { data: existing } = await supabase
      .from("contacts")
      .select("id")
      .eq("user_id", user.id)
      .or(`phone.eq.${phone},phone_normalized.eq.${normalized}`)
      .limit(1)
      .maybeSingle();

    if (existing?.id) {
      // Link conversation to this contact
      if (chat.id) {
        await supabase
          .from("whatsapp_conversations")
          .update({ contact_id: existing.id })
          .eq("id", chat.id);
      }
      setResolvedContactId(existing.id);
      return existing.id;
    }

    // 3. Auto-create contact from WhatsApp conversation data
    const { data: newContact } = await supabase
      .from("contacts")
      .insert({
        user_id: user.id,
        phone: phone,
        name: chat.name && chat.name !== phone ? chat.name : null,
        avatar_url: chat.photo || null,
      })
      .select("id")
      .maybeSingle();

    if (newContact?.id) {
      // Link conversation to this contact
      if (chat.id) {
        await supabase
          .from("whatsapp_conversations")
          .update({ contact_id: newContact.id })
          .eq("id", chat.id);
      }
      setResolvedContactId(newContact.id);
      return newContact.id;
    }

    return null;
  }, [user, chat?.id, chat?.channelId, chat?.name, chat?.photo]);

  // ── Fetch all CRM data ─────────────────────────────────────────────
  const fetchContactData = useCallback(async () => {
    if (!user || !chat?.channelId) return;

    const contactId = await resolveContactId();
    if (!contactId) return;

    try {
      const [dealsRes, notesRes, tagsRes, mediaRes] = await Promise.all([
        supabase
          .from("deals")
          .select("*, stage:pipeline_stages(*)")
          .eq("contact_id", contactId)
          .order("created_at", { ascending: false }),
        supabase
          .from("contact_notes")
          .select("*")
          .eq("contact_id", contactId)
          .order("created_at", { ascending: false }),
        supabase
          .from("contact_tags")
          .select("id, tag_id, tags(*)")
          .eq("contact_id", contactId),
        supabase
          .from("messages")
          .select("id, content, media_url, content_type, created_at, metadata")
          .eq("conversation_id", chat.id!)
          .not("media_url", "is", null)
          .order("created_at", { ascending: false })
          .limit(20),
      ]);

      if (dealsRes.data) {
        setDeals(Array.isArray(dealsRes.data) ? dealsRes.data : [dealsRes.data]);
      }
      if (notesRes.data) {
        setNotes(Array.isArray(notesRes.data) ? notesRes.data : [notesRes.data]);
      }
      if (tagsRes.data) {
        setTags(
          tagsRes.data
            .filter((ct: any) => ct.tags)
            .map((ct: any) => ({ ...ct.tags, contact_tag_id: ct.id }))
        );
      }
      if (mediaRes.data) {
        setMedia(mediaRes.data);
      }

      // Fetch all available tags for assignment
      const { data: allTagsData } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (allTagsData) setAllTags(allTagsData);

      // Fetch pipeline stages for deal creation
      const { data: stagesData } = await supabase
        .from("pipeline_stages")
        .select("*")
        .order("position");
      if (stagesData) {
        setDealStages(stagesData);
        if (stagesData.length > 0) {
          setSelectedStageId((prev) => prev || stagesData[0].id);
        }
      }
    } catch {
      // Tables may not exist yet
    }
  }, [user, chat?.id, chat?.channelId, resolveContactId]);

  useEffect(() => {
    fetchContactData();
  }, [fetchContactData]);

  // ── Copy phone ─────────────────────────────────────────────────────
  const handleCopyPhone = useCallback(async () => {
    if (!chat?.channelId) return;
    await navigator.clipboard.writeText(chat.channelId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [chat?.channelId]);

  // ── Add note ───────────────────────────────────────────────────────
  const handleAddNote = useCallback(async () => {
    if (!resolvedContactId || !newNote.trim() || !user) return;
    setAddingNote(true);
    try {
      const { data, error } = await supabase
        .from("contact_notes")
        .insert({
          contact_id: resolvedContactId,
          user_id: user.id,
          note_text: newNote.trim(),
        })
        .select()
        .single();

      if (!error && data) {
        setNotes((prev) => [data, ...prev]);
        setNewNote("");
        toast.success("Nota adicionada");
      } else {
        toast.error("Erro ao adicionar nota");
      }
    } catch {
      toast.error("Erro ao adicionar nota");
    }
    setAddingNote(false);
  }, [resolvedContactId, newNote, user]);

  // ── Delete note ────────────────────────────────────────────────────
  const handleDeleteNote = useCallback(async (noteId: string) => {
    setDeletingNote(noteId);
    try {
      const { error } = await supabase.from("contact_notes").delete().eq("id", noteId);
      if (!error) {
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
        toast.success("Nota removida");
      }
    } catch {
      toast.error("Erro ao remover nota");
    }
    setDeletingNote(null);
  }, []);

  // ── Toggle tag on contact ──────────────────────────────────────────
  const handleToggleTag = useCallback(
    async (tagId: string) => {
      if (!resolvedContactId) return;
      const existing = tags.find((t) => t.id === tagId);
      if (existing) {
        // Remove tag
        const { error } = await supabase
          .from("contact_tags")
          .delete()
          .eq("contact_id", resolvedContactId)
          .eq("tag_id", tagId);
        if (!error) setTags((prev) => prev.filter((t) => t.id !== tagId));
      } else {
        // Add tag
        const { data: allTags } = await supabase
          .from("tags")
          .select("*")
          .eq("user_id", user?.id)
          .eq("id", tagId)
          .maybeSingle();
        if (allTags) {
          const { error } = await supabase
            .from("contact_tags")
            .insert({ contact_id: resolvedContactId, tag_id: tagId });
          if (!error) setTags((prev) => [...prev, { ...allTags, contact_tag_id: crypto.randomUUID() }]);
        }
      }
    },
    [resolvedContactId, tags, user]
  );

  // ── Create tag ──────────────────────────────────────────────────────
  const handleCreateTag = useCallback(async () => {
    if (!newTagName.trim() || !user) return;
    const { data, error } = await supabase
      .from("tags")
      .insert({ user_id: user.id, name: newTagName.trim(), color: newTagColor })
      .select()
      .single();
    if (!error && data) {
      setNewTagName("");
      setNewTagColor("#3b82f6");
      setShowCreateTag(false);
      // Refresh all tags
      const { data: allTagsData } = await supabase
        .from("tags")
        .select("*")
        .eq("user_id", user.id)
        .order("name");
      if (allTagsData) setAllTags(allTagsData);
      toast.success(`Etiqueta "${data.name}" criada!`);
    } else {
      toast.error("Erro ao criar etiqueta");
    }
  }, [newTagName, newTagColor, user]);

  // ── Mute toggle ────────────────────────────────────────────────────
  const handleToggleMute = useCallback(async () => {
    if (!chat?.id) return;
    const newMuted = !muted;
    setMuted(newMuted);
    try {
      const { error } = await supabase
        .from("whatsapp_conversations")
        .update({ muted: newMuted } as any)
        .eq("id", chat.id);
      if (error) {
        // Column may not exist locally — revert
        setMuted(muted);
      }
    } catch {
      setMuted(muted);
    }
  }, [chat?.id, muted]);

  // ── Disappearing messages toggle ───────────────────────────────────
  const handleToggleDisappearing = useCallback(async () => {
    const newValue = !disappearing;
    setDisappearing(newValue);
    toast.success(newValue ? "Mensagens temporárias ativadas (24h)" : "Mensagens temporárias desativadas");
  }, [disappearing]);

  // ── Create deal ─────────────────────────────────────────────────────
  const handleCreateDeal = useCallback(async () => {
    if (!resolvedContactId || !newDealTitle.trim() || !selectedStageId || !user) return;
    setCreatingDeal(true);
    try {
      const { data, error } = await supabase
        .from("deals")
        .insert({
          user_id: user.id,
          contact_id: resolvedContactId,
          title: newDealTitle.trim(),
          value: newDealValue ? parseFloat(newDealValue) : 0,
          stage_id: selectedStageId,
          status: "open",
        })
        .select("*, stage:pipeline_stages(*)")
        .single();

      if (!error && data) {
        setDeals((prev) => [data, ...prev]);
        setNewDealTitle("");
        setNewDealValue("");
        setShowDealForm(false);
        toast.success("Negócio criado!");
      } else {
        toast.error("Erro ao criar negócio");
      }
    } catch {
      toast.error("Erro ao criar negócio");
    }
    setCreatingDeal(false);
  }, [resolvedContactId, newDealTitle, newDealValue, selectedStageId, user]);

  // ── Update deal title (inline edit) ─────────────────────────────────
  const handleUpdateDealTitle = useCallback(async () => {
    if (!editingDeal || !editDealTitle.trim()) return;
    try {
      const { error } = await supabase
        .from("deals")
        .update({ title: editDealTitle.trim(), updated_at: new Date().toISOString() })
        .eq("id", editingDeal.id);
      if (!error) {
        setDeals((prev) =>
          prev.map((d) => (d.id === editingDeal.id ? { ...d, title: editDealTitle.trim() } : d))
        );
        setEditingDeal(null);
        setEditDealTitle("");
        toast.success("Negócio atualizado");
      }
    } catch {
      toast.error("Erro ao atualizar negócio");
    }
  }, [editingDeal, editDealTitle]);

  const displayName = chat.name || chat.channelId || "Desconhecido";
  const avatarUrl = chat.photoUrl || chat.photo;

  return (
    <div className="w-[300px] shrink-0 border-l border-white/5 bg-[#131313] flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/5">
        <button onClick={onClose} className="text-[#BEBEBE] hover:text-white transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-bold text-[#D0D0D0]">Dados do contato</span>
      </div>

      <ScrollArea className="flex-1">
        {/* Avatar + Name */}
        <div className="flex flex-col items-center pt-8 pb-6 px-4">
          <div className="w-[100px] h-[100px] rounded-full overflow-hidden bg-[#242424] mb-4 border-2 border-white/5">
            {avatarUrl ? (
              <img
                src={getProxyUrl(avatarUrl)}
                alt={displayName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = "none";
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#25D366] to-[#128C7E]">
                <span className="text-3xl font-bold text-white">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
          </div>
          <h2 className="text-[22px] font-bold text-white text-center truncate max-w-full px-2">
            {displayName}
          </h2>
        </div>

        {/* Phone with copy */}
        <div className="px-5 py-2">
          <button
            onClick={handleCopyPhone}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[#A2A2A2] hover:bg-white/5 transition-colors"
          >
            <Phone className="h-4 w-4 shrink-0" />
            <span className="flex-1 text-left font-mono">{chat.channelId || "—"}</span>
            {copied ? (
              <Check className="h-3 w-3 text-[#25D366]" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </button>
        </div>

        {/* Call + Video buttons */}
        <div className="flex items-center justify-center gap-12 py-4 border-b border-white/5">
          <button
            className="flex flex-col items-center gap-1 text-[#B9BEC4] hover:text-white transition-colors"
            onClick={() => toast("Ligação via WhatsApp")}
          >
            <div className="w-[38px] h-[38px] rounded-full bg-[#000000] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
            </div>
            <span className="text-[10px]">Chamada</span>
          </button>
          <button
            className="flex flex-col items-center gap-1 text-[#B9BEC4] hover:text-white transition-colors"
            onClick={() => toast("Videochamada via WhatsApp")}
          >
            <div className="w-[38px] h-[38px] rounded-full bg-[#000000] flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-white">
                <polygon points="23 7 16 12 23 17 23 7" />
                <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
              </svg>
            </div>
            <span className="text-[10px]">Vídeo</span>
          </button>
        </div>

        {/* About */}
        <div className="px-5 py-4 border-b border-white/5">
          <h4 className="text-xs font-bold text-white mb-2">Sobre</h4>
          <p className="text-sm text-[#A2A2A2]">
            Olá, me chamo {displayName}
          </p>
        </div>

        {/* Media, links and docs */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-white">Mídia, links e docs</h4>
            {media.length > 0 && (
              <span className="text-[10px] text-[#6D6D6D]">{media.length} itens</span>
            )}
          </div>
          {media.length === 0 ? (
            <p className="text-xs text-[#6D6D6D]">Nenhuma mídia compartilhada</p>
          ) : (
            <div className="grid grid-cols-4 gap-1.5">
              {media.slice(0, 8).map((item) => {
                const url = item.media_url;
                const isImage = item.content_type?.startsWith("image") || url?.match(/\.(jpg|jpeg|png|gif|webp)$/i);
                return (
                  <div
                    key={item.id}
                    className="aspect-square rounded-md bg-[#242424] flex items-center justify-center overflow-hidden cursor-pointer hover:ring-1 hover:ring-primary/50 transition-all"
                    onClick={() => {
                      if (url) window.open(getProxyUrl(url), "_blank");
                    }}
                  >
                    {isImage ? (
                      <img
                        src={getProxyUrl(url)}
                        alt=""
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <FileText className="w-5 h-5 text-[#6D6D6D]" />
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tags */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <TagIcon className="h-3 w-3" />
              Etiquetas
            </div>
            {!showCreateTag && (
              <button
                onClick={() => setShowCreateTag(true)}
                className="text-[10px] text-[#25D366] hover:text-[#128C7E] transition-colors"
              >
                + Nova
              </button>
            )}
          </div>

          {/* Create tag inline form */}
          {showCreateTag && (
            <div className="mb-3 space-y-2 rounded-lg bg-[#242424] p-3">
              <input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Nome da etiqueta"
                className="w-full rounded border border-white/10 bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-white placeholder-[#6D6D6D] outline-none focus:border-[#25D366]/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateTag();
                  if (e.key === "Escape") setShowCreateTag(false);
                }}
                autoFocus
              />
              <div className="flex items-center gap-1.5">
                {["#ef4444","#f97316","#f59e0b","#10b981","#06b6d4","#3b82f6","#8b5cf6","#ec4899"].map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTagColor(color)}
                    className="w-5 h-5 rounded-full border-2 transition-all"
                    style={{
                      backgroundColor: color,
                      borderColor: newTagColor === color ? "#25D366" : "transparent",
                    }}
                  />
                ))}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowCreateTag(false); setNewTagName(""); }}
                  className="flex-1 rounded bg-[#333] px-2 py-1.5 text-[10px] text-white hover:bg-[#444] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateTag}
                  disabled={!newTagName.trim()}
                  className="flex-1 rounded bg-[#25D366] px-2 py-1.5 text-[10px] text-white hover:bg-[#128C7E] transition-colors disabled:opacity-50"
                >
                  Criar
                </button>
              </div>
            </div>
          )}

          {/* Assigned tags */}
          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-2">
              {tags.map((tag: any) => (
                <span
                  key={tag.contact_tag_id || tag.id}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium cursor-pointer hover:opacity-80 transition-opacity"
                  style={{
                    backgroundColor: `${tag.color}25`,
                    color: tag.color,
                  }}
                  onClick={() => handleToggleTag(tag.id)}
                  title="Clique para remover"
                >
                  {tag.name}
                  <X className="h-2.5 w-2.5" />
                </span>
              ))}
            </div>
          )}

          {/* Available tags (not yet assigned) */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {allTags
                .filter((t) => !tags.some((assigned) => assigned.id === t.id))
                .map((tag: any) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-medium cursor-pointer opacity-60 hover:opacity-100 transition-all"
                    style={{
                      backgroundColor: `${tag.color}15`,
                      color: tag.color,
                      border: `1px dashed ${tag.color}40`,
                    }}
                    onClick={() => handleToggleTag(tag.id)}
                    title="Clique para adicionar"
                  >
                    <Plus className="h-2 w-2" />
                    {tag.name}
                  </span>
                ))}
            </div>
          )}

          {tags.length === 0 && allTags.filter((t) => !tags.some((assigned) => assigned.id === t.id)).length === allTags.length && allTags.length > 0 && (
            <p className="text-xs text-[#6D6D6D]">Clique nas etiquetas acima para adicionar</p>
          )}
          {tags.length === 0 && allTags.length === 0 && !showCreateTag && (
            <p className="text-xs text-[#6D6D6D]">Nenhuma etiqueta. Clique em "+ Nova" para criar.</p>
          )}
        </div>

        {/* Active Deals */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <DollarSign className="h-3 w-3" />
              Negócios
            </div>
            {!showDealForm && (
              <button
                onClick={() => {
                  setShowDealForm(true);
                  setEditingDeal(null);
                }}
                className="text-[10px] text-[#25D366] hover:text-[#128C7E] transition-colors"
              >
                + Novo
              </button>
            )}
          </div>

          {/* New deal inline form */}
          {showDealForm && (
            <div className="mb-3 space-y-2 rounded-lg bg-[#242424] p-3">
              <input
                value={newDealTitle}
                onChange={(e) => setNewDealTitle(e.target.value)}
                placeholder="Título do negócio"
                className="w-full rounded border border-white/10 bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-white placeholder-[#6D6D6D] outline-none focus:border-[#25D366]/50"
                autoFocus
              />
              <input
                value={newDealValue}
                onChange={(e) => setNewDealValue(e.target.value.replace(/\D/g, ''))}
                placeholder="Valor (R$)"
                type="text"
                inputMode="numeric"
                className="w-full rounded border border-white/10 bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-white placeholder-[#6D6D6D] outline-none focus:border-[#25D366]/50"
              />
              <select
                value={selectedStageId}
                onChange={(e) => setSelectedStageId(e.target.value)}
                className="w-full rounded border border-white/10 bg-[#1a1a1a] px-2.5 py-1.5 text-xs text-white outline-none focus:border-[#25D366]/50"
              >
                {dealStages.map((s: any) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowDealForm(false); setNewDealTitle(""); setNewDealValue(""); }}
                  className="flex-1 rounded bg-[#333] px-2 py-1.5 text-[10px] text-white hover:bg-[#444] transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateDeal}
                  disabled={!newDealTitle.trim() || creatingDeal}
                  className="flex-1 rounded bg-[#25D366] px-2 py-1.5 text-[10px] text-white hover:bg-[#128C7E] transition-colors disabled:opacity-50 flex items-center justify-center gap-1"
                >
                  {creatingDeal && <Loader2 className="h-3 w-3 animate-spin" />}
                  Criar
                </button>
              </div>
            </div>
          )}

          <div className="space-y-2">
            {deals.length === 0 ? (
              <p className="text-xs text-[#6D6D6D]">Nenhum negócio</p>
            ) : (
              deals.map((deal: any) => (
                <div
                  key={deal.id}
                  className="rounded-lg bg-[#242424] px-3 py-2 cursor-pointer hover:bg-[#2a2a2a] transition-colors group"
                  onClick={() => {
                    setEditingDeal(deal);
                    setEditDealTitle(deal.title);
                    setShowDealForm(false);
                  }}
                >
                  {editingDeal?.id === deal.id ? (
                    <div className="space-y-2">
                      <input
                        value={editDealTitle}
                        onChange={(e) => setEditDealTitle(e.target.value)}
                        className="w-full rounded border border-[#25D366]/50 bg-[#1a1a1a] px-2 py-1 text-xs text-white outline-none"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleUpdateDealTitle();
                          if (e.key === 'Escape') setEditingDeal(null);
                        }}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); setEditingDeal(null); }}
                          className="text-[10px] text-[#6D6D6D] hover:text-white"
                        >
                          Cancelar
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleUpdateDealTitle(); }}
                          className="text-[10px] text-[#25D366] hover:text-[#128C7E]"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium text-white">{deal.title}</p>
                        <Pencil className="h-3 w-3 text-[#6D6D6D] opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <div className="mt-1 flex items-center justify-between text-xs text-[#A2A2A2]">
                        <span>
                          {deal.currency === "BRL" ? "R$" : "$"}
                          {Number(deal.value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                        </span>
                        {deal.stage && (
                          <span
                            className="rounded-full px-1.5 py-0.5 text-[10px]"
                            style={{
                              backgroundColor: `${deal.stage.color}20`,
                              color: deal.stage.color,
                            }}
                          >
                            {deal.stage.name}
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Notes */}
        <div className="px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-xs font-bold text-white mb-3">
            <StickyNote className="h-3 w-3" />
            Notas
          </div>
          <div className="flex gap-2 mb-3">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Adicionar uma nota..."
              rows={2}
              className="flex-1 resize-none rounded-lg border border-white/10 bg-[#242424] px-3 py-2 text-xs text-white placeholder-[#6D6D6D] outline-none focus:border-[#25D366]/50"
            />
            <Button
              size="sm"
              className="h-auto bg-[#25D366] px-2 hover:bg-[#128C7E] text-white"
              onClick={handleAddNote}
              disabled={!newNote.trim() || addingNote}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="space-y-2">
            {notes.length === 0 ? (
              <p className="text-xs text-[#6D6D6D]">Nenhuma nota</p>
            ) : (
              notes.map((note: any) => (
                <div key={note.id} className="group rounded-lg bg-[#242424] px-3 py-2 flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="whitespace-pre-wrap text-xs text-[#A2A2A2]">{note.note_text}</p>
                    <p className="mt-1 text-[10px] text-[#6D6D6D]">
                      {new Date(note.created_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <button
                    className="ml-2 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-[#6D6D6D] hover:text-[#CC3169]"
                    onClick={() => handleDeleteNote(note.id)}
                    disabled={deletingNote === note.id}
                    title="Excluir nota"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Mute notifications */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            {muted ? (
              <BellOff className="w-5 h-5 text-[#B9BEC4] shrink-0" />
            ) : (
              <Bell className="w-5 h-5 text-white shrink-0" />
            )}
            <span className="text-sm font-bold text-white">Silenciar notificações</span>
          </div>
          <button
            className={`w-[37px] h-[18px] rounded-full relative cursor-pointer transition-colors ${
              muted ? "bg-[#25D366]" : "bg-[#BEBEBE]"
            }`}
            onClick={handleToggleMute}
          >
            <div
              className={`w-[18px] h-[18px] rounded-full bg-white absolute top-0 shadow-sm transition-transform ${
                muted ? "translate-x-[19px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>

        {/* Disappearing messages */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-white shrink-0" />
            <span className="text-sm font-bold text-white">Mensagens temporárias</span>
          </div>
          <button
            className={`w-[37px] h-[18px] rounded-full relative cursor-pointer transition-colors ${
              disappearing ? "bg-[#25D366]" : "bg-[#BEBEBE]"
            }`}
            onClick={handleToggleDisappearing}
          >
            <div
              className={`w-[18px] h-[18px] rounded-full bg-white absolute top-0 shadow-sm transition-transform ${
                disappearing ? "translate-x-[19px]" : "translate-x-0"
              }`}
            />
          </button>
        </div>
        {disappearing && (
          <div className="px-5 pb-4 border-b border-white/5 -mt-2">
            <p className="text-[11px] text-[#6D6D6D]">Mensagens desaparecem após 24 horas</p>
          </div>
        )}

        {/* Business tools */}
        <div className="border-b border-white/5">
          <div className="px-5 py-3">
            <h4 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4" />
              Ferramentas de negócio
            </h4>
            <div className="space-y-1">
              <button
                className="flex items-center justify-between w-full py-2.5 text-sm text-[#A2A2A2] hover:text-white transition-colors rounded-lg"
                onClick={() => toast("Catálogo — Adicione itens com título, preço, imagens e link.")}
              >
                <div className="flex items-center gap-3">
                  <ShoppingBag className="w-4 h-4" />
                  <span>Catálogo</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                className="flex items-center justify-between w-full py-2.5 text-sm text-[#A2A2A2] hover:text-white transition-colors rounded-lg"
                onClick={() => toast("Respostas rápidas — Salve atalhos para respostas frequentes.")}
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-4 h-4" />
                  <span>Respostas rápidas</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                className="flex items-center justify-between w-full py-2.5 text-sm text-[#A2A2A2] hover:text-white transition-colors rounded-lg"
                onClick={() => toast("Etiquetas — Crie e atribua etiquetas às conversas.")}
              >
                <div className="flex items-center gap-3">
                  <TagIcon className="w-4 h-4" />
                  <span>Etiquetas</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                className="flex items-center justify-between w-full py-2.5 text-sm text-[#A2A2A2] hover:text-white transition-colors rounded-lg"
                onClick={() => toast("Mensagens automáticas — Configure saudação e mensagens fora do horário.")}
              >
                <div className="flex items-center gap-3">
                  <Timer className="w-4 h-4" />
                  <span>Mensagens automáticas</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                className="flex items-center justify-between w-full py-2.5 text-sm text-[#A2A2A2] hover:text-white transition-colors rounded-lg"
                onClick={() => toast("Transmissões — Selecione contatos para criar uma transmissão.")}
              >
                <div className="flex items-center gap-3">
                  <Send className="w-4 h-4" />
                  <span>Transmissões</span>
                </div>
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Danger items */}
        <div className="px-5 py-3 space-y-1">
          <button className="flex items-center gap-3 w-full py-2.5 text-[#CC3169] hover:bg-white/5 rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <circle cx="12" cy="12" r="10" />
              <path d="M4.93 4.93l14.14 14.14" />
            </svg>
            <span className="text-sm font-bold">Bloquear {displayName}</span>
          </button>
          <button className="flex items-center gap-3 w-full py-2.5 text-[#CC3169] hover:bg-white/5 rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3H10z" />
              <path d="M22 10.5v7a1.5 1.5 0 0 1-3 0v-7a1.5 1.5 0 0 1 3 0z" />
            </svg>
            <span className="text-sm font-bold">Denunciar {displayName}</span>
          </button>
          <button className="flex items-center gap-3 w-full py-2.5 text-[#CC3169] hover:bg-white/5 rounded-lg transition-colors">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
            </svg>
            <span className="text-sm font-bold">Excluir conversa</span>
          </button>
        </div>
      </ScrollArea>
    </div>
  );
}
