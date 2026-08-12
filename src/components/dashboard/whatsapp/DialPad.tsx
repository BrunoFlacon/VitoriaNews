import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/SafeImage";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  X, Phone, Search, ArrowLeft, Users, MessageCircle,
  Delete, Hash, UserPlus, Contact, Loader2
} from "lucide-react";

interface DialPadProps {
  open: boolean;
  onClose: () => void;
  onStartConversation: (phone: string) => void;
  onStartGroup?: () => void;
}

interface ContactItem {
  id: string;
  name: string;
  phone: string;
  avatar_url?: string | null;
  isGroup?: boolean;
}

const KEYPAD_KEYS = [
  ["1", "", "2", "ABC", "3", "DEF"],
  ["4", "GHI", "5", "JKL", "6", "MNO"],
  ["7", "PQRS", "8", "TUV", "9", "WXYZ"],
  ["*", "", "0", "+", "#", ""],
];

function normalizePhone(phone: string): string {
  return phone ? phone.replace(/\D/g, "") : "";
}

function formatPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

export function DialPad({ open, onClose, onStartConversation, onStartGroup }: DialPadProps) {
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [showKeypad, setShowKeypad] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [contacts, setContacts] = useState<ContactItem[]>([]);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load contacts from Supabase when dialpad opens
  const loadContacts = useCallback(async () => {
    if (!user) return;
    setLoadingContacts(true);
    try {
      const { data: dbContacts, error } = await supabase
        .from("contacts")
        .select("id, name, phone, avatar_url")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (error) {
        console.error("Error loading contacts:", error);
        setContacts([]);
        return;
      }

      if (dbContacts && dbContacts.length > 0) {
        const mapped: ContactItem[] = dbContacts.map((c: any) => ({
          id: c.id,
          name: c.name || "Sem nome",
          phone: normalizePhone(c.phone || ""),
          avatar_url: c.avatar_url,
          isGroup: false,
        }));
        setContacts(mapped);
        return;
      }

      // Fallback: load from whatsapp_conversations
      const { data: conversations } = await supabase
        .from("whatsapp_conversations")
        .select("id, contact_wa_id, contact_name")
        .eq("user_id", user.id)
        .order("last_message_at", { ascending: false });

      if (conversations && conversations.length > 0) {
        const mapped: ContactItem[] = conversations
          .filter((c: any) => c.contact_wa_id)
          .map((c: any) => ({
            id: c.id,
            name: c.contact_name || c.contact_wa_id,
            phone: normalizePhone(c.contact_wa_id),
            avatar_url: null,
            isGroup: false,
          }));
        setContacts(mapped);
      } else {
        setContacts([]);
      }
    } catch (err) {
      console.error("Error loading contacts for dial pad:", err);
      setContacts([]);
    } finally {
      setLoadingContacts(false);
    }
  }, [user]);

  useEffect(() => {
    if (open) {
      loadContacts();
    }
  }, [open, loadContacts]);

  // Focus input when opening
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setPhone("");
      setSearchQuery("");
    }
  }, [open]);

  const handleKeyPress = (key: string) => {
    setPhone(prev => prev + key);
    setShowKeypad(true);
  };

  const handleBackspace = () => {
    setPhone(prev => prev.slice(0, -1));
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, "");
    setPhone(digits);
    setShowKeypad(false);
  };

  const handleInputFocus = () => {
    setShowKeypad(true);
  };

  const handleStart = () => {
    const digits = phone.replace(/\D/g, "");
    if (digits.length >= 10) {
      onStartConversation(digits);
      onClose();
    }
  };

  // Filter contacts
  const filteredContacts = useMemo(() => {
    const q = searchQuery.toLowerCase().trim() || phone.toLowerCase();
    if (!q) return [];
    return contacts.filter(c => {
      if (c.isGroup) return c.name.toLowerCase().includes(q);
      return c.name.toLowerCase().includes(q) || c.phone.includes(q);
    });
  }, [searchQuery, phone, contacts]);

  const showResults = searchQuery || phone.length > 0;

  if (!open) return null;

  return (
    <div className="absolute inset-0 z-40 bg-[#111B21] flex flex-col animate-in fade-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2.5 border-b border-white/5 bg-[#1f2c33]">
        <button onClick={onClose} className="text-[#8696a0] hover:text-white transition-colors p-1">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="font-bold text-sm text-white">Nova conversa</span>
      </div>

      {/* Input area */}
      <div className="px-4 pt-3 pb-2">
        <div className="flex items-center gap-2 bg-[#202C33] rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-[#8696a0] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={phone ? formatPhone(phone) : searchQuery}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, "");
              if (val !== phone) {
                setPhone(val);
                setSearchQuery("");
                setShowKeypad(true);
              }
            }}
            onFocus={handleInputFocus}
            placeholder="Pesquisar ou digitar número..."
            className="flex-1 bg-transparent border-0 outline-none text-sm text-white placeholder:text-[#8696a0]"
          />
          {phone && (
            <button onClick={() => setPhone("")} className="text-[#8696a0] hover:text-white p-0.5">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            onClick={() => setShowKeypad(!showKeypad)}
            className={cn(
              "text-xs font-bold px-2 py-1 rounded transition-colors",
              showKeypad
                ? "bg-[#00A884] text-white"
                : "bg-[#2a3942] text-[#8696a0] hover:bg-[#364147]"
            )}
          >
            {showKeypad ? "Contatos" : "Teclado"}
          </button>
        </div>
      </div>

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {showKeypad && phone.length <= 12 ? (
          /* ── Keypad ── */
          <div className="h-full flex flex-col justify-between">
            {/* Results de busca numérica */}
            {showResults && (
              <div className="max-h-[120px] overflow-y-auto border-b border-white/5">
                {loadingContacts ? (
                  <div className="flex items-center justify-center py-3">
                    <Loader2 className="h-4 w-4 animate-spin text-[#8696a0]" />
                  </div>
                ) : filteredContacts.length > 0 && (
                  <div className="px-4 py-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-[#6D6D6D]">CONTATOS</span>
                  </div>
                )}
                {filteredContacts.map(c => (
                  <div
                    key={c.id}
                    onClick={() => {
                      if (c.isGroup) {
                        onStartGroup?.();
                      } else {
                        onStartConversation(c.phone);
                      }
                      onClose();
                    }}
                    className="flex items-center gap-3 px-4 py-2 hover:bg-[#202C33] transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center text-xs font-bold text-white shrink-0">
                      {c.isGroup ? <Hash className="w-4 h-4 text-[#8696a0]" /> : c.name[0]}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-white truncate">{c.name}</p>
                      {c.phone && (
                        <p className="text-[11px] text-[#8696a0] font-mono">{formatPhone(c.phone)}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Número digitado */}
            {phone && (
              <div className="px-4 py-3 text-center">
                <p className="text-xl font-bold text-white tracking-wider font-mono">{formatPhone(phone)}</p>
              </div>
            )}

            {/* Keypad grid */}
            <div className="px-4 pb-2">
              <div className="grid grid-cols-3 gap-2 max-w-[280px] mx-auto">
                {KEYPAD_KEYS.map((row, ri) => {
                  const items: { key: string; sub: string; span?: boolean }[] = [];
                  for (let i = 0; i < row.length; i += 2) {
                    items.push({ key: row[i], sub: row[i + 1] || "" });
                  }
                  if (ri === 3) {
                    // Special row: *, 0, +, #
                    return (
                      <div key={ri} className="contents">
                        <KeypadButton keyChar="*" sub="" onClick={() => handleKeyPress("*")} />
                        <KeypadButton keyChar="0" sub="+" onClick={() => handleKeyPress("0")} />
                        <KeypadButton keyChar="#" sub="" onClick={() => handleKeyPress("#")} />
                      </div>
                    );
                  }
                  return (
                    <div key={ri} className="contents">
                      {items.map((item, ii) => (
                        <KeypadButton
                          key={`${ri}-${ii}`}
                          keyChar={item.key}
                          sub={item.sub}
                          onClick={() => handleKeyPress(item.key)}
                        />
                      ))}
                    </div>
                  );
                })}
                {/* Backspace */}
                <div className="flex items-center justify-center">
                  <button
                    onClick={handleBackspace}
                    className="w-12 h-12 rounded-full bg-[#2a3942] hover:bg-[#364147] flex items-center justify-center transition-colors"
                    disabled={!phone}
                  >
                    <Delete className="w-5 h-5 text-[#8696a0]" />
                  </button>
                </div>
              </div>
            </div>

            {/* Bottom actions */}
            <div className="px-4 pb-4 space-y-1.5">
              <button
                onClick={handleStart}
                disabled={phone.replace(/\D/g, "").length < 10}
                className="w-full py-2.5 rounded-full bg-[#00A884] hover:bg-[#06CF9C] disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Phone className="w-4 h-4" /> Iniciar conversa
              </button>
              <button
                onClick={() => { onStartGroup?.(); onClose(); }}
                className="w-full py-2 rounded-full bg-[#2a3942] hover:bg-[#364147] text-[#8696a0] text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <Users className="w-4 h-4" /> Criar grupo
              </button>
            </div>
          </div>
        ) : (
          /* ── Contact list ── */
          <div className="h-full flex flex-col">
            <div className="px-4 py-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-[#6D6D6D]">CONTATOS</span>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loadingContacts ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-5 w-5 animate-spin text-[#8696a0]" />
                </div>
              ) : contacts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Contact className="h-8 w-8 text-[#8696a0]/40 mb-2" />
                  <p className="text-xs text-[#8696a0]">Nenhum contato encontrado</p>
                  <p className="text-[10px] text-[#8696a0]/60 mt-1">Adicione contatos na aba de contatos</p>
                </div>
              ) : contacts.map(c => (
                <div
                  key={c.id}
                  onClick={() => {
                    if (c.isGroup) {
                      onStartGroup?.();
                    } else {
                      onStartConversation(c.phone);
                    }
                    onClose();
                  }}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#202C33] transition-colors cursor-pointer"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0",
                    c.isGroup ? "bg-[#2a3942]" : "bg-[#2a3942]"
                  )}>
                    {c.isGroup ? (
                      <Hash className="w-5 h-5 text-[#8696a0]" />
                    ) : (
                      c.avatar_url ? (
                        <SafeImage src={c.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                      ) : (
                        c.name[0]
                      )
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-white font-bold truncate">{c.name}</p>
                    {c.phone && (
                      <p className="text-[11px] text-[#8696a0] font-mono">{formatPhone(c.phone)}</p>
                    )}
                    {c.isGroup && (
                      <p className="text-[11px] text-[#8696a0]">Grupo</p>
                    )}
                  </div>
                </div>
              ))}
              <div
                onClick={() => { onClose(); }}
                className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#202C33] transition-colors cursor-pointer border-t border-white/5"
              >
                <div className="w-10 h-10 rounded-full bg-[#00A884]/20 flex items-center justify-center shrink-0">
                  <UserPlus className="w-5 h-5 text-[#00A884]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-white font-bold">Adicionar contato</p>
                  <p className="text-[11px] text-[#8696a0]">Novo contato na agenda</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function KeypadButton({ keyChar, sub, onClick }: { keyChar: string; sub: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-12 h-12 rounded-full bg-[#2a3942] hover:bg-[#364147] flex flex-col items-center justify-center transition-colors"
    >
      <span className="text-base font-bold text-white leading-none">{keyChar}</span>
      {sub && <span className="text-[7px] text-[#8696a0] tracking-wider leading-none mt-0.5">{sub}</span>}
    </button>
  );
}

export default DialPad;
