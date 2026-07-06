import { useState, useEffect, useCallback, useRef } from "react";
import { cn } from "@/lib/utils";
import { SafeImage } from "@/components/ui/SafeImage";
import { X, ChevronLeft, ChevronRight, Plus, User, Camera, Smile, Send, ImageIcon } from "lucide-react";

interface StatusEntry {
  url?: string;
  text?: string;
  timestamp: string;
}

interface StatusContact {
  id: string;
  name: string;
  photoUrl?: string | null;
  timestamp: string;
  viewed: boolean;
  statuses: StatusEntry[];
}

const MOCK_STATUSES: StatusContact[] = [
  {
    id: "1",
    name: "Aliza",
    timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
    viewed: false,
    statuses: [{ text: "Bom dia! 🌅", timestamp: new Date(Date.now() - 1000 * 60 * 15).toISOString() }],
  },
  {
    id: "2",
    name: "Tahir",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
    viewed: false,
    statuses: [{ text: "Trabalhando no novo projeto 🚀", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() }],
  },
  {
    id: "3",
    name: "Smantha",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(),
    viewed: true,
    statuses: [{ text: "Vamos marcar um café? ☕", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString() }],
  },
  {
    id: "4",
    name: "Bruno",
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
    viewed: true,
    statuses: [{ text: "Novo artigo publicado! 📝", timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() }],
  },
];

function formatStatusTime(timestamp: string): string {
  const diff = Date.now() - new Date(timestamp).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Há ${mins} min`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `Há ${hours}h`;
  const days = Math.floor(hours / 24);
  return `Há ${days}d`;
}

interface WhatsAppStatusViewProps {
  initialContact?: string;
}

export function WhatsAppStatusView({ initialContact }: WhatsAppStatusViewProps) {
  const [myStatuses, setMyStatuses] = useState<StatusContact[]>([
    {
      id: "me",
      name: "Meu status",
      timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(),
      viewed: false,
      statuses: [],
    },
  ]);
  const [viewingContact, setViewingContact] = useState<StatusContact | null>(null);
  const [currentStatusIndex, setCurrentStatusIndex] = useState(0);
  const [creatingText, setCreatingText] = useState(false);
  const [textInput, setTextInput] = useState("");
  const autoAdvanceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceRef.current) {
      clearTimeout(autoAdvanceRef.current);
      autoAdvanceRef.current = null;
    }
  }, []);

  const handleViewStatus = useCallback((contact: StatusContact) => {
    setViewingContact(contact);
    setCurrentStatusIndex(0);
    clearAutoAdvance();
  }, [clearAutoAdvance]);

  const handleClose = useCallback(() => {
    setViewingContact(null);
    clearAutoAdvance();
  }, [clearAutoAdvance]);

  const handleNext = useCallback(() => {
    if (!viewingContact) return;
    if (currentStatusIndex < viewingContact.statuses.length - 1) {
      setCurrentStatusIndex(i => i + 1);
    } else {
      const allContacts = [...myStatuses, ...MOCK_STATUSES];
      const currentIdx = allContacts.findIndex(s => s.id === viewingContact.id);
      if (currentIdx < allContacts.length - 1) {
        handleViewStatus(allContacts[currentIdx + 1]);
      } else {
        handleClose();
      }
    }
  }, [viewingContact, currentStatusIndex, myStatuses, handleViewStatus, handleClose]);

  const handlePrev = useCallback(() => {
    if (!viewingContact) return;
    clearAutoAdvance();
    if (currentStatusIndex > 0) {
      setCurrentStatusIndex(i => i - 1);
    } else {
      const allContacts = [...myStatuses, ...MOCK_STATUSES];
      const currentIdx = allContacts.findIndex(s => s.id === viewingContact.id);
      if (currentIdx > 0) {
        const prevContact = allContacts[currentIdx - 1];
        handleViewStatus(prevContact);
        setCurrentStatusIndex(prevContact.statuses.length - 1);
      }
    }
  }, [viewingContact, currentStatusIndex, myStatuses, clearAutoAdvance, handleViewStatus]);

  // Auto-advance every 5 seconds
  useEffect(() => {
    if (!viewingContact) return;
    clearAutoAdvance();
    autoAdvanceRef.current = setTimeout(handleNext, 5000);
    return clearAutoAdvance;
  }, [viewingContact, currentStatusIndex, handleNext, clearAutoAdvance]);

  // Auto-view initialContact if provided
  useEffect(() => {
    if (!initialContact) return;
    if (initialContact === "Meu status") {
      setCreatingText(true);
    } else {
      const found = MOCK_STATUSES.find(s => s.name === initialContact);
      if (found) handleViewStatus(found);
    }
  }, [initialContact, handleViewStatus]);

  // Create a text status
  const handleCreateTextStatus = () => {
    if (!textInput.trim()) return;
    const newStatus = {
      text: textInput.trim(),
      timestamp: new Date().toISOString(),
    };
    setMyStatuses(prev => prev.map(s =>
      s.id === "me" ? { ...s, statuses: [...s.statuses, newStatus], timestamp: newStatus.timestamp } : s
    ));
    setTextInput("");
    setCreatingText(false);
  };

  // Handle camera/file selection
  const handleCameraFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const newStatus = {
      url,
      text: "📸 Novo status",
      timestamp: new Date().toISOString(),
    };
    setMyStatuses(prev => prev.map(s =>
      s.id === "me" ? { ...s, statuses: [...s.statuses, newStatus], timestamp: newStatus.timestamp } : s
    ));
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const allContacts = [...myStatuses, ...MOCK_STATUSES];
  const hasMyStatus = myStatuses[0]?.statuses.length > 0;

  return (
    <div className="h-full flex flex-col bg-[#111B21]">
      {/* Header com gradiente sutil */}
      <div className="bg-gradient-to-b from-[#202C33] to-transparent px-6 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-[#E9EDEF]">Status</h1>
        </div>
      </div>

      {/* Seu status — funcional */}
      <div
        onClick={() => {
          if (hasMyStatus) {
            handleViewStatus(myStatuses[0]);
          } else {
            setCreatingText(true);
          }
        }}
        className="mx-4 mb-3 rounded-xl bg-[#202C33]/60 hover:bg-[#202C33] transition-colors border border-white/5 overflow-hidden cursor-pointer"
      >
        <div className="flex items-center gap-4 p-3">
          <div className="relative shrink-0">
            <div className={cn(
              "w-12 h-12 rounded-full flex items-center justify-center",
              hasMyStatus
                ? "ring-2 ring-[#00A884] ring-offset-2 ring-offset-[#111B21] bg-[#2a3942]"
                : "ring-2 ring-[#364147] ring-offset-2 ring-offset-[#111B21] bg-[#2a3942]"
            )}>
              <User className="w-5 h-5 text-[#8696a0]" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 rounded-full bg-[#00A884] flex items-center justify-center border-2 border-[#111B21]">
              <Plus className="w-3 h-3 text-white" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white">Meu status</p>
            <p className="text-[11px] text-[#8696a0]">
              {hasMyStatus
                ? `Toque para ver (${myStatuses[0].statuses.length} atualizações)`
                : "Toque para adicionar uma atualização de status"}
            </p>
          </div>
          <div className="flex gap-1.5" onClick={e => e.stopPropagation()}>
            <button
              className="w-9 h-9 rounded-full bg-[#2a3942] hover:bg-[#364147] flex items-center justify-center transition-colors"
              title="Câmera"
              onClick={() => fileInputRef.current?.click()}
            >
              <Camera className="w-4 h-4 text-[#8696a0]" />
            </button>
            <button
              className="w-9 h-9 rounded-full bg-[#2a3942] hover:bg-[#364147] flex items-center justify-center transition-colors"
              title="Texto"
              onClick={() => setCreatingText(true)}
            >
              <Smile className="w-4 h-4 text-[#8696a0]" />
            </button>
          </div>
        </div>
      </div>

      {/* Input oculto para câmera */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleCameraFile}
      />

      {/* Modal de criação de status textual — estilo WhatsApp Web */}
      {creatingText && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={() => setCreatingText(false)}>
          {/* Barra superior escura */}
          <div className="flex items-center justify-between px-4 py-3">
            <button onClick={() => setCreatingText(false)} className="text-white hover:text-[#8696a0] transition-colors">
              <X className="w-6 h-6" />
            </button>
            <span className="text-sm font-bold text-white">Meu status</span>
            <div className="w-6" />
          </div>

          {/* Área de texto — fundo escuro */}
          <div className="flex-1 flex items-center justify-center px-6 pb-20" onClick={e => e.stopPropagation()}>
            <div className="w-full max-w-md">
              <textarea
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                placeholder="Digite seu status..."
                className="w-full bg-transparent text-white text-2xl text-center resize-none outline-none placeholder:text-white/30 leading-relaxed min-h-[120px]"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleCreateTextStatus();
                  }
                }}
              />
              <div className="flex items-center justify-center gap-2 mt-4">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                  title="Adicionar imagem"
                >
                  <ImageIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Botão enviar — fixo na parte inferior */}
          <div className="px-4 pb-6">
            <button
              onClick={handleCreateTextStatus}
              disabled={!textInput.trim()}
              className="w-full py-3 rounded-full bg-[#00A884] text-white font-bold text-sm hover:bg-[#06CF9C] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" /> Enviar
            </button>
          </div>
        </div>
      )}

      {/* Status dos contatos */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="px-6 pt-3 pb-1">
          <span className="text-[11px] font-bold uppercase tracking-widest text-[#6D6D6D]">ATUALIZAÇÕES RECENTES</span>
        </div>
        {allContacts.map((contact) => (
          <div
            key={contact.id}
            onClick={() => {
              if (contact.id === "me" && contact.statuses.length > 0) {
                handleViewStatus(contact);
              } else if (contact.id !== "me") {
                handleViewStatus(contact);
              } else {
                setCreatingText(true);
              }
            }}
            className="flex items-center gap-3 mx-2 px-3 py-2.5 rounded-xl hover:bg-[#202C33] transition-colors cursor-pointer"
          >
            <div className="relative shrink-0">
              <div className={cn(
                "w-12 h-12 rounded-full bg-[#2a3942] flex items-center justify-center text-sm font-bold text-white overflow-hidden",
                contact.viewed
                  ? "ring-2 ring-[#364147] ring-offset-2 ring-offset-[#111B21]"
                  : "ring-2 ring-[#00A884] ring-offset-2 ring-offset-[#111B21]"
              )}>
                {contact.photoUrl ? (
                  <SafeImage src={contact.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="bg-gradient-to-br from-[#364147] to-[#2a3942] w-full h-full flex items-center justify-center">
                    {contact.name[0]}
                  </div>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm truncate", contact.viewed ? "text-[#B8B8B8]" : "text-white font-bold")}>
                {contact.name}
              </p>
              <p className="text-[11px] text-[#8696a0]">
                {contact.id === "me"
                  ? contact.statuses.length > 0
                    ? formatStatusTime(contact.timestamp)
                    : "Nenhum status"
                  : formatStatusTime(contact.timestamp)}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Visualizador de stories em tela cheia */}
      {viewingContact && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col" onClick={handleClose}>
          {/* Barra de progresso */}
          <div className="flex gap-1 px-4 pt-3 pb-2">
            {viewingContact.statuses.map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex-1 h-[2px] rounded-full transition-all",
                  i < currentStatusIndex ? "bg-white" : i === currentStatusIndex ? "bg-white" : "bg-white/30"
                )}
              />
            ))}
          </div>

          {/* Header do visualizador */}
          <div className="flex items-center justify-between px-4 py-3 z-10">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2a3942] flex items-center justify-center text-xs font-bold text-white overflow-hidden ring-2 ring-white/20">
                {viewingContact.photoUrl ? (
                  <SafeImage src={viewingContact.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  viewingContact.name[0]
                )}
              </div>
              <div>
                <p className="text-sm font-bold text-white">{viewingContact.name}</p>
                <p className="text-[10px] text-white/60">{formatStatusTime(viewingContact.statuses[currentStatusIndex]?.timestamp || viewingContact.timestamp)}</p>
              </div>
            </div>
            <button onClick={(e) => { e.stopPropagation(); handleClose(); }} className="hover:bg-white/10 rounded-full p-1 transition-colors">
              <X className="w-5 h-5 text-white" />
            </button>
          </div>

          {/* Navegação lateral */}
          <div className="flex-1 flex items-center relative" onClick={(e) => e.stopPropagation()}>
            {/* Área de clique — anterior */}
            <div className="absolute left-0 top-0 bottom-0 w-1/3 z-10 flex items-center justify-start pl-2" onClick={handlePrev}>
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity backdrop-blur-sm">
                <ChevronLeft className="w-5 h-5 text-white" />
              </div>
            </div>

            {/* Conteúdo do status */}
            <div className="w-full flex flex-col items-center justify-center px-8">
              {viewingContact.statuses[currentStatusIndex]?.text && !viewingContact.statuses[currentStatusIndex]?.url && (
                <div className="bg-black/50 backdrop-blur-md rounded-2xl px-6 py-5 max-w-[380px] w-full shadow-xl">
                  <p className="text-white text-base text-center leading-relaxed">
                    {viewingContact.statuses[currentStatusIndex].text}
                  </p>
                </div>
              )}
              {viewingContact.statuses[currentStatusIndex]?.url && (
                <SafeImage
                  src={viewingContact.statuses[currentStatusIndex].url!}
                  alt=""
                  className="max-h-[55vh] rounded-2xl shadow-xl object-contain"
                />
              )}
            </div>

            {/* Área de clique — próximo */}
            <div className="absolute right-0 top-0 bottom-0 w-1/3 z-10 flex items-center justify-end pr-2" onClick={handleNext}>
              <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity backdrop-blur-sm">
                <ChevronRight className="w-5 h-5 text-white" />
              </div>
            </div>
          </div>

          {/* Footer — responder */}
          <div className="px-4 py-3 flex items-center gap-3">
            <div className="flex-1 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2.5 flex items-center gap-2">
              <input
                type="text"
                placeholder="Responder ao status..."
                className="flex-1 bg-transparent border-0 outline-none text-sm text-white placeholder:text-white/40"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WhatsAppStatusView;
