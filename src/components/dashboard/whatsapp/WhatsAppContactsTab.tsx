import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Search,
  Plus,
  Upload,
  MoreHorizontal,
  Pencil,
  Trash2,
  Loader2,
  Users,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
  RefreshCw,
  Check,
  Download,
  StickyNote,
  MessageCircle,
} from "lucide-react";
import { getProxyUrl } from "@/lib/utils";
import { ContactForm } from "./ContactForm";
import { ImportContactsModal } from "./ImportContactsModal";
import { CustomFieldsManager } from "./CustomFieldsManager";
import { useIsMobile } from "@/hooks/use-mobile";

const PAGE_SIZE = 25;

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ContactRow {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  company: string | null;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
  tags?: Tag[];
  wa_conversation_id?: string | null;
  google_contact_id?: string | null;
  notes_count?: number;
}

export function WhatsAppContactsTab({ onNavigateToChat }: { onNavigateToChat?: (phone: string) => void }) {
  const { user } = useAuth();
  const isMobile = useIsMobile();

  const [contacts, setContacts] = useState<ContactRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);

  // Tag filter
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);
  const [allTags, setAllTags] = useState<Tag[]>([]);

  // Modals
  const [formOpen, setFormOpen] = useState(false);
  const [editContact, setEditContact] = useState<ContactRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [customFieldsOpen, setCustomFieldsOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<ContactRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  // Google sync
  const [syncingGoogle, setSyncingGoogle] = useState(false);
  const [pullingGoogle, setPullingGoogle] = useState(false);

  const fetchSeq = useRef(0);

  const fetchTags = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    if (data) setAllTags(data);
  }, [user]);

  const fetchContacts = useCallback(async () => {
    if (!user) return;
    const seq = ++fetchSeq.current;
    setLoading(true);
    setSelected(new Set());

    const term = search.trim();

    // ALWAYS fetch from whatsapp_conversations first - these are the real contacts
    const { data: convos, error: convoError } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("user_id", user.id)
      .order("last_message_at", { ascending: false, nullsFirst: false });

    if (seq !== fetchSeq.current) return;

    if (convoError) {
      console.error("[ContactsTab] Error fetching conversations:", convoError);
    }

    // Build contact list from conversations
    let allContacts: ContactRow[] = [];
    const phoneSet = new Set<string>();

    for (const convo of convos ?? []) {
      const phone = convo.contact_wa_id;
      if (!phone || phoneSet.has(phone)) continue;
      phoneSet.add(phone);

      allContacts.push({
        id: convo.contact_id || convo.id,
        name: convo.contact_name,
        phone: phone,
        email: null,
        company: null,
        avatar_url: convo.avatar_url,
        created_at: convo.created_at,
        updated_at: convo.updated_at || convo.created_at,
        tags: [],
        wa_conversation_id: convo.id,
        google_contact_id: null,
      });
    }

    // Also add contacts from contacts table that aren't already in the list
    const { data: dbContacts } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id);

    if (seq !== fetchSeq.current) return;

    for (const c of dbContacts ?? []) {
      if (c.phone && phoneSet.has(c.phone)) continue;
      if (c.phone) phoneSet.add(c.phone);

      allContacts.push({
        id: c.id,
        name: c.name,
        phone: c.phone,
        email: c.email,
        company: c.company,
        avatar_url: c.avatar_url,
        created_at: c.created_at,
        updated_at: c.updated_at || c.created_at,
        tags: [],
        wa_conversation_id: null,
        google_contact_id: c.google_contact_id,
      });
    }

    // Apply search filter
    if (term) {
      const q = term.toLowerCase();
      allContacts = allContacts.filter(
        (c) =>
          (c.name || "").toLowerCase().includes(q) ||
          (c.phone || "").includes(q) ||
          (c.email || "").toLowerCase().includes(q)
      );
    }

    // Apply tag filter
    if (selectedTagIds.length > 0) {
      const realIds = allContacts.map((c) => c.id).filter((id) => !String(id).startsWith("conv-"));
      if (realIds.length > 0) {
        const { data: tagLinks } = await supabase
          .from("contact_tags")
          .select("contact_id")
          .in("tag_id", selectedTagIds)
          .in("contact_id", realIds);
        const tagContactIds = new Set((tagLinks ?? []).map((tl: any) => tl.contact_id));
        allContacts = allContacts.filter(
          (c) => tagContactIds.has(c.id) || String(c.id).startsWith("conv-")
        );
      } else {
        allContacts = [];
      }
    }

    // Fetch tags for real contacts
    const realIds = allContacts.map((c) => c.id).filter((id) => !String(id).startsWith("conv-"));
    if (realIds.length > 0) {
      const { data: tagLinks } = await supabase
        .from("contact_tags")
        .select("contact_id, tag_id, tags(id, name, color)")
        .in("contact_id", realIds);

      const tagMap = new Map<string, Tag[]>();
      for (const link of tagLinks ?? []) {
        const tag = (link as any).tags;
        if (tag) {
          const existing = tagMap.get(link.contact_id) ?? [];
          existing.push(tag);
          tagMap.set(link.contact_id, existing);
        }
      }

      allContacts = allContacts.map((c) => ({
        ...c,
        tags: tagMap.get(c.id) ?? [],
      }));

      // Fetch notes count for real contacts
      const { data: notesCounts } = await supabase
        .from("contact_notes")
        .select("contact_id")
        .in("contact_id", realIds);
      
      const notesCountMap = new Map<string, number>();
      for (const nc of notesCounts ?? []) {
        notesCountMap.set(nc.contact_id, (notesCountMap.get(nc.contact_id) || 0) + 1);
      }

      allContacts = allContacts.map((c) => ({
        ...c,
        notes_count: notesCountMap.get(c.id) || 0,
      }));
    }

    // Pagination
    const total = allContacts.length;
    const paginated = allContacts.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    setTotalCount(total);
    setContacts(paginated);
    setLoading(false);
  }, [user, page, search, selectedTagIds]);

  useEffect(() => { fetchTags(); }, [fetchTags]);
  useEffect(() => { fetchContacts(); }, [fetchContacts]);

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  function toggleTagFilter(tagId: string) {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
    setPage(0);
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === contacts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(contacts.map(c => c.id)));
    }
  }

  async function handleDelete(contact: ContactRow) {
    setDeleting(true);
    try {
      await supabase.from("contact_tags").delete().eq("contact_id", contact.id);
      await supabase.from("contact_notes").delete().eq("contact_id", contact.id);
      const { error } = await supabase.from("contacts").delete().eq("id", contact.id);
      if (error) throw error;
      toast.success("Contact deleted");
      setDeleteConfirm(null);
      await fetchContacts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setDeleting(false);
    }
  }

  async function handleBulkDelete() {
    setBulkDeleting(true);
    try {
      const ids = [...selected];
      await supabase.from("contact_tags").delete().in("contact_id", ids);
      await supabase.from("contact_notes").delete().in("contact_id", ids);
      const { error } = await supabase.from("contacts").delete().in("id", ids);
      if (error) throw error;
      toast.success(`${ids.length} contact${ids.length !== 1 ? "s" : ""} deleted`);
      setBulkDeleteOpen(false);
      setSelected(new Set());
      await fetchContacts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to delete");
    } finally {
      setBulkDeleting(false);
    }
  }

  function handleEdit(contact: ContactRow) {
    setEditContact(contact);
    setFormOpen(true);
  }

  function handleAddNew() {
    setEditContact(null);
    setFormOpen(true);
  }

  async function handleSyncToGoogle() {
    if (!user || contacts.length === 0) return;
    setSyncingGoogle(true);
    try {
      const { data, error } = await supabase.functions.invoke("sync-google-contacts", {
        body: { contacts: contacts.map(c => ({
          id: c.id,
          name: c.name,
          phone: c.phone,
          email: c.email,
          company: c.company,
          google_contact_id: c.google_contact_id,
        })), table: "contacts" },
      });
      if (error) throw error;
      const result = data as any;
      toast.success(`${result.count || 0} contatos sincronizados com Google`);
      await fetchContacts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao sincronizar com Google");
    } finally {
      setSyncingGoogle(false);
    }
  }

  async function handlePullFromGoogle() {
    if (!user) return;
    setPullingGoogle(true);
    try {
      const { data, error } = await supabase.functions.invoke("pull-google-contacts", {
        body: {},
      });
      if (error) throw error;
      const result = data as any;
      toast.success(result.message || `${result.imported || 0} contatos importados do Google`);
      await fetchContacts();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Falha ao importar do Google");
    } finally {
      setPullingGoogle(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      <div className="px-4 pt-2 pb-1">
        <p className="text-xs text-muted-foreground/70">Gerencie seus contatos do WhatsApp: visualize, filtre e navegue para o chat direto.</p>
      </div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={handleAddNew} className="bg-[#25D366] hover:bg-[#128C7E] text-white">
          <Plus className="w-4 h-4 mr-1" />
          Adicionar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="w-4 h-4 mr-1" />
          Importar
        </Button>
        <Button size="sm" variant="outline" onClick={() => setCustomFieldsOpen(true)}>
          <SlidersHorizontal className="w-4 h-4 mr-1" />
          Campos
        </Button>

        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

        <Button
          size="sm"
          variant="outline"
          onClick={handleSyncToGoogle}
          disabled={syncingGoogle || contacts.length === 0}
          title="Enviar contatos para Google Contacts"
        >
          {syncingGoogle ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <RefreshCw className="w-4 h-4 mr-1" />
          )}
          Sincronizar Google
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handlePullFromGoogle}
          disabled={pullingGoogle}
          title="Importar contatos do Google Contacts"
        >
          {pullingGoogle ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Download className="w-4 h-4 mr-1" />
          )}
          Importar do Google
        </Button>

        {/* Tag Filter Popover */}
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" className={selectedTagIds.length > 0 ? "border-primary text-primary" : ""}>
              <X className="w-4 h-4 mr-1" />
              Filtro{selectedTagIds.length > 0 ? ` (${selectedTagIds.length})` : ""}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2" align="start">
            <div className="space-y-1 max-h-60 overflow-y-auto">
              {allTags.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">No tags created yet</p>
              ) : (
                allTags.map(tag => (
                  <label
                    key={tag.id}
                    className="flex items-center gap-2 px-2 py-1 rounded hover:bg-muted cursor-pointer text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedTagIds.includes(tag.id)}
                      onChange={() => toggleTagFilter(tag.id)}
                      className="rounded border-border"
                    />
                    <span
                      className="inline-block w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: tag.color }}
                    />
                    {tag.name}
                  </label>
                ))
              )}
            </div>
            {selectedTagIds.length > 0 && (
              <div className="border-t mt-1 pt-1">
                <button
                  onClick={() => { setSelectedTagIds([]); setPage(0); }}
                  className="text-xs text-muted-foreground hover:text-foreground w-full text-center py-1"
                >
                  Clear all filters
                </button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <div className="relative flex-1 max-w-sm ml-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, telefone ou email..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pl-9"
          />
        </div>

        <Badge variant="outline" className="text-xs">
          {totalCount} contato{totalCount !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* Active tag filter chips */}
      {selectedTagIds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTagIds.map(tagId => {
            const tag = allTags.find(t => t.id === tagId);
            if (!tag) return null;
            return (
              <Badge
                key={tagId}
                variant="secondary"
                className="gap-1 cursor-pointer hover:bg-destructive/20"
                style={{ backgroundColor: tag.color + "20", color: tag.color, borderColor: tag.color + "40" }}
                onClick={() => toggleTagFilter(tagId)}
              >
                {tag.name}
                <X className="w-3 h-3" />
              </Badge>
            );
          })}
          <button
            onClick={() => { setSelectedTagIds([]); setPage(0); }}
            className="text-xs text-muted-foreground hover:text-foreground underline"
          >
            Limpar tudo
          </button>
        </div>
      )}

      {/* Bulk action bar */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 rounded-lg border border-primary/30 bg-primary/5 px-4 py-2">
          <span className="text-sm font-medium">{selected.size} selecionado{selected.size !== 1 ? "s" : ""}</span>
          <Button size="sm" variant="destructive" onClick={() => setBulkDeleteOpen(true)}>
            <Trash2 className="w-4 h-4 mr-1" />
            Excluir seleção
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Cancelar
          </Button>
        </div>
      )}

      {/* Contact Table */}
      {contacts.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">
          <Users className="w-16 h-16 mx-auto mb-4 opacity-20" />
          <p className="text-lg font-medium">Nenhum contato encontrado</p>
          <p className="text-sm mt-1">
            {search || selectedTagIds.length > 0
              ? "Tente outro termo de busca"
              : "Clique em 'Adicionar' para criar um novo contato"}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]">
                  <input
                    type="checkbox"
                    checked={selected.size === contacts.length && contacts.length > 0}
                    onChange={toggleSelectAll}
                    className="rounded border-border"
                  />
                </TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Telefone</TableHead>
                <TableHead className="hidden md:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Empresa</TableHead>
                <TableHead>Tags</TableHead>
                <TableHead className="hidden md:table-cell w-[60px]">
                  <StickyNote className="w-3.5 h-3.5" />
                </TableHead>
                <TableHead className="hidden md:table-cell w-[80px]">Google</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contacts.map((contact) => (
                <TableRow key={contact.id} className="hover:bg-muted/30">
                  <TableCell>
                    <input
                      type="checkbox"
                      checked={selected.has(contact.id)}
                      onChange={() => toggleSelect(contact.id)}
                      className="rounded border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {contact.avatar_url ? (
                        <img
                          src={getProxyUrl(contact.avatar_url)}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover shrink-0"
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = "none";
                            (e.target as HTMLImageElement).nextElementSibling?.classList.remove("hidden");
                          }}
                        />
                      ) : null}
                      <div
                        className={`w-8 h-8 rounded-full bg-gradient-to-br from-[#25D366] to-[#128C7E] flex items-center justify-center text-white font-bold text-xs shrink-0 ${
                          contact.avatar_url ? "hidden" : ""
                        }`}
                      >
                        {(contact.name || contact.phone || "?").charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <span className="font-medium text-sm truncate block">{contact.name || "—"}</span>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground font-mono">{contact.phone || "—"}</span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-sm text-muted-foreground">{contact.email || "—"}</span>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="text-sm text-muted-foreground">{contact.company || "—"}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {(contact.tags ?? []).slice(0, 3).map(tag => (
                        <Badge
                          key={tag.id}
                          variant="secondary"
                          className="text-[10px] px-1.5 py-0"
                          style={{ backgroundColor: tag.color + "20", color: tag.color }}
                        >
                          {tag.name}
                        </Badge>
                      ))}
                      {(contact.tags ?? []).length > 3 && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          +{(contact.tags ?? []).length - 3}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(contact.notes_count ?? 0) > 0 ? (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 gap-1">
                        <StickyNote className="w-2.5 h-2.5" />
                        {contact.notes_count}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {contact.google_contact_id ? (
                      <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-green-500/10 text-green-500 border-green-500/20">
                        <Check className="w-3 h-3 mr-0.5" />
                        Sync
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground/40">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(contact)}>
                          <Pencil className="w-4 h-4 mr-2" />
                          Editar
                        </DropdownMenuItem>
                        {onNavigateToChat && contact.phone && (
                          <DropdownMenuItem onClick={() => onNavigateToChat(contact.phone!)}>
                            <MessageCircle className="w-4 h-4 mr-2 text-[#25D366]" />
                            Abrir conversa
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => setDeleteConfirm(contact)}
                          className="text-destructive focus:text-destructive"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Página {page + 1} de {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Modals */}
      <ContactForm
        open={formOpen}
        onOpenChange={(open) => { setFormOpen(open); if (!open) setEditContact(null); }}
        contact={editContact}
        onSaved={fetchContacts}
      />

      <ImportContactsModal
        open={importOpen}
        onOpenChange={setImportOpen}
        onImported={fetchContacts}
      />

      <CustomFieldsManager
        open={customFieldsOpen}
        onOpenChange={setCustomFieldsOpen}
      />

      {/* Single Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-popover border border-border rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Excluir contato</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tem certeza que deseja excluir <strong>{deleteConfirm.name || deleteConfirm.phone}</strong>?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={deleting}
                onClick={() => handleDelete(deleteConfirm)}
              >
                {deleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation */}
      {bulkDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-popover border border-border rounded-lg p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-2">Excluir contatos selecionados</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Tem certeza que deseja excluir <strong>{selected.size}</strong> contato{selected.size !== 1 ? "s" : ""}?
              Esta ação não pode ser desfeita.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setBulkDeleteOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                disabled={bulkDeleting}
                onClick={handleBulkDelete}
              >
                {bulkDeleting && <Loader2 className="w-4 h-4 animate-spin mr-1" />}
                Excluir {selected.size}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatsAppContactsTab;
