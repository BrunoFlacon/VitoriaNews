import { useState, useRef, useMemo, useCallback } from "react";
import { cn, getWhatsAppMediaUrl } from "@/lib/utils";
import {
  Send, MoreHorizontal, Search, RefreshCw, X, Trash2, MessageCircle,
  User, Paperclip, Mic, MapPin, Check, CheckCheck, ChevronLeft,
  FileText, Music, Download, Play, Smile, Info, Clock, AlertCircle,
  Camera, Image as ImageIcon, File, Reply, Forward, Star, ChevronDown,
  Archive, LogOut, Video, LayoutTemplate
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { SafeImage } from "@/components/ui/SafeImage";
import { useToast } from "@/hooks/use-toast";
import { toast as sonnerToast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { MessageActions } from "./MessageActions";
import { MessageReactions } from "./MessageReactions";
import { ReplyQuote, buildReplyPreview } from "./ReplyQuote";
import { TemplatePicker } from "./TemplatePicker";

const msgStatusIcon = (status?: string) => {
  switch (status) {
    case "sending": return <Clock className="w-[14px] h-[14px] text-[#8696a0]" />;
    case "sent": return <Check className="w-[14px] h-[14px] text-[#8696a0]" />;
    case "delivered": return <CheckCheck className="w-[14px] h-[14px] text-[#8696a0]" />;
    case "read": return <CheckCheck className="w-[14px] h-[14px] text-[#53BDEB]" />;
    case "failed": return <AlertCircle className="w-[14px] h-[14px] text-red-500" />;
    default: return <CheckCheck className="w-[14px] h-[14px] text-[#8696a0]" />;
  }
};

const formatDateSeparator = (date: Date): string => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const msgDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  if (msgDate.getTime() === today.getTime()) return "Hoje";
  if (msgDate.getTime() === yesterday.getTime()) return "Ontem";
  return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

interface WhatsAppChatWindowProps {
  activeChat: any;
  messages: any[];
  onSendMessage: (content: string, attachments: any[]) => void;
  onDeleteConversation: (id: string) => void;
  onDeleteMessage?: (messageId: string) => Promise<boolean>;
  onSync: (platform: string) => void;
  user: any;
  loading?: boolean;
  onBack?: () => void;
  onOpenInfo?: () => void;
}

const WA = {
  accent: "text-[#25D366]",
  bg: "bg-[#25D366]",
  softBg: "bg-[#0b141a]/60 backdrop-blur-md",
  bubbleSelf: "bg-[#005C4B] text-[#E9EDEF] shadow-lg border border-white/5",
  bubbleOther: "bg-[#202C33] text-[#E9EDEF] shadow-lg border border-white/5",
  chatBg: "bg-[#0b141a]",
};

function getFileIcon(mediaType?: string) {
  if (mediaType === "video") return <Video className="w-4 h-4 text-blue-500" />;
  if (mediaType === "audio") return <Music className="w-4 h-4 text-purple-500" />;
  if (mediaType === "voice") return <Mic className="w-4 h-4 text-purple-500" />;
  if (mediaType === "document") return <FileText className="w-4 h-4 text-amber-500" />;
  if (mediaType === "sticker") return <Smile className="w-4 h-4 text-pink-500" />;
  if (mediaType === "location") return <MapPin className="w-4 h-4 text-red-500" />;
  if (mediaType === "contact") return <User className="w-4 h-4 text-blue-500" />;
  return <Paperclip className="w-4 h-4 text-muted-foreground" />;
}

function MediaRenderer({ msg, userId }: { msg: any; userId: string }) {
  const mediaType = msg.metadata?.media_type || "text";
  const mediaId = msg.metadata?.media_id;
  const mediaUrl = msg.media_url || (mediaId ? getWhatsAppMediaUrl(mediaId, userId) : null);
  const mimeType = msg.metadata?.mime_type || "";
  const filename = msg.metadata?.filename || "arquivo";
  const location = msg.metadata?.location;

  if (mediaType === "sticker") {
    return mediaUrl ? (
      <SafeImage src={mediaUrl} alt="Sticker" className="max-w-[200px] max-h-[200px]" />
    ) : (
      <div className="p-2 text-sm italic opacity-60">Sticker</div>
    );
  }

  if (mediaType === "location" || location) {
    const lat = location?.lat || msg.content?.split(",")?.[0];
    const lng = location?.lng || msg.content?.split(",")?.[1];
    const mapUrl = lat && lng ? `https://maps.google.com/maps?q=${lat},${lng}&z=15&output=embed` : null;
    return mapUrl ? (
      <div className="mt-2 rounded-lg overflow-hidden border border-white/10">
        <iframe
          src={mapUrl}
          className="w-full h-[200px]"
          style={{ border: 0 }}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="Localização"
        />
        <div className="p-2 text-xs opacity-70 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          <a href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer" className="underline">Ver no Google Maps</a>
        </div>
      </div>
    ) : null;
  }

  if (mediaType === "contact") {
    const contact = msg.metadata?.contact || {};
    return (
      <div className="mt-2 rounded-lg border border-white/10 bg-black/20 p-3 flex items-center gap-3">
        <User className="w-8 h-8 text-blue-400" />
        <div>
          <p className="font-bold text-sm">{contact.name || msg.content}</p>
          {contact.phone && <p className="text-xs opacity-70">{contact.phone}</p>}
        </div>
      </div>
    );
  }

  if (mediaType === "image" && mediaUrl) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/20">
        <SafeImage
          src={mediaUrl}
          alt={msg.content || "Imagem"}
          className="max-h-[300px] w-full object-contain"
          isWhatsAppImage
        />
      </div>
    );
  }

  if (mediaType === "video" && mediaUrl) {
    return (
      <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/20">
        <video src={mediaUrl} controls preload="metadata" className="max-h-[300px] w-full" style={{ aspectRatio: "16/9" }}>
          Seu navegador não suporta vídeo.
        </video>
      </div>
    );
  }

  if (mediaType === "audio" || mediaType === "voice") {
    return (
      <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/20 p-3">
        <audio src={mediaUrl} controls preload="metadata" className="w-full h-10">
          Seu navegador não suporta áudio.
        </audio>
        {msg.metadata?.duration && (
          <p className="text-xs opacity-50 mt-1">{Math.round(msg.metadata.duration)}s</p>
        )}
      </div>
    );
  }

  if (mediaType === "document" && mediaUrl) {
    const isPDF = filename?.endsWith(".pdf") || mimeType?.includes("pdf");
    const isImage = mimeType?.startsWith("image/");
    return (
      <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/20">
        {isImage ? (
          <SafeImage src={mediaUrl} alt={filename} className="max-h-[300px] w-full object-contain" />
        ) : (
          <div className="p-4 flex items-center gap-3">
            <FileText className="w-10 h-10 text-amber-400 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold truncate">{filename}</p>
              {mimeType && <p className="text-[10px] opacity-50">{mimeType}</p>}
            </div>
            {isPDF && (
              <a href={mediaUrl} target="_blank" rel="noopener noreferrer" download={filename}>
                <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full">
                  <Download className="w-4 h-4" />
                </Button>
              </a>
            )}
          </div>
        )}
        {msg.content && <p className="px-4 pb-3 text-xs opacity-70">{msg.content}</p>}
      </div>
    );
  }

  return null;
}

export const WhatsAppChatWindow = ({
  activeChat,
  messages,
  onSendMessage,
  onDeleteConversation,
  onDeleteMessage,
  onSync,
  user,
  loading,
  onBack,
  onOpenInfo
}: WhatsAppChatWindowProps) => {
  const [chatSearchOpen, setChatSearchOpen] = useState(false);
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [replyMessage, setReplyMessage] = useState("");
  const [attachments, setAttachments] = useState<any[]>([]);
  const [previewImageUrl, setPreviewImageUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const [fileAccept, setFileAccept] = useState("*/*");

  const filteredMessages = useMemo(() => {
    if (!chatSearchQuery.trim()) return messages;
    return messages.filter(m => m.content?.toLowerCase().includes(chatSearchQuery.toLowerCase()));
  }, [messages, chatSearchQuery]);

  const { toast } = useToast();

  const [emojiPickerOpen, setEmojiPickerOpen] = useState(false);

  const [replyTo, setReplyTo] = useState<{id: string; authorLabel: string; preview: string} | null>(null);
  const parentMessageMap = useMemo(() => {
    const map = new Map<string, any>();
    filteredMessages.forEach(m => map.set(m.id, m));
    return map;
  }, [filteredMessages]);
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const [messageReactions, setMessageReactions] = useState<Map<string, any[]>>(new Map());
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerIntervalRef = useRef<number | null>(null);

  const EMOJIS = ["😀","😁","😂","🤣","😃","😄","😅","😆","😉","😊","😋","😎","😍","😘","🥰","😗","😙","😚","🙂","🤗","🤩","🤔","🤨","😐","😑","😶","🙄","😏","😣","😥","😮","🤐","😯","😪","😫","😴","😌","😛","😜","😝","🤤","😒","😓","😔","😕","🙃","🤑","😲","☹️","🙁","😖","😞","😟","😤","😢","😭","😦","😧","😨","😩","🤯","😬","😰","😱","🥵","🥶","😳","🤪","😵","😡","😠","🤬","👍","👎","👌","✌️","🤞","🤟","🤘","🤙","👋","🤚","🖐","✋","🖖","👏","🙌","🤲","🤝","🙏","💪","❤️","🧡","💛","💚","💙","💜","🖤","💔","💯","🔥","✨","⭐","🌟","💫","🎉","🎊","🎈","🎁","💝","💖","💗","💓"];

  const insertEmoji = (emoji: string) => {
    setReplyMessage(prev => prev + emoji);
    setEmojiPickerOpen(false);
    textareaRef.current?.focus();
  };

  const handleSend = () => {
    if (!replyMessage.trim() && attachments.length === 0) return;
    onSendMessage(replyMessage, attachments);
    setReplyMessage("");
    setAttachments([]);
  };

  const openFileDialog = (accept: string) => {
    setFileAccept(accept);
    requestAnimationFrame(() => fileInputRef.current?.click());
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const type = file.type.startsWith("image") ? "image" : file.type.startsWith("video") ? "video" : file.type.startsWith("audio") ? "audio" : "file";
    setAttachments(prev => [...prev, { url, type, name: file.name, file }]);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (idx: number) => {
    const att = attachments[idx];
    if (att?.url?.startsWith("blob:")) URL.revokeObjectURL(att.url);
    setAttachments(prev => prev.filter((_, i) => i !== idx));
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm;codecs=opus' });
        const url = URL.createObjectURL(blob);
        setAttachments(prev => [...prev, { url, type: 'audio', name: `Voice_${Date.now()}.webm`, file: blob }]);
        stream.getTracks().forEach(t => t.stop());
      };

      recorder.onerror = () => {
        stream.getTracks().forEach(t => t.stop());
        setIsRecording(false);
        setRecordingTime(0);
        if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
      };

      recorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerIntervalRef.current = window.setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      sonnerToast.error("Microphone access denied. Please allow microphone permissions.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setRecordingTime(0);
  };

  const cancelRecording = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
    }
    const stream = mediaRecorderRef.current?.stream;
    if (stream) stream.getTracks().forEach(t => t.stop());
    audioChunksRef.current = [];
    setIsRecording(false);
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    setRecordingTime(0);
  };

  const formatRecordingTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setReplyMessage(e.target.value);
    requestAnimationFrame(() => {
      e.target.style.height = 'auto';
      e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`;
    });
  };

  const handleStartReply = useCallback((msg: any) => {
    const isSelf = msg.status !== "received";
    setReplyTo({
      id: msg.id,
      authorLabel: isSelf ? "Você" : (activeChat?.name || "Contato"),
      preview: buildReplyPreview(msg),
    });
  }, [activeChat]);

  const handleClearReply = useCallback(() => {
    setReplyTo(null);
  }, []);

  const handleReact = useCallback((messageId: string, emoji: string) => {
    setMessageReactions(prev => {
      const next = new Map(prev);
      const existing = next.get(messageId) || [];
      const own = existing.find((r: any) => r.actor_type === "agent");
      if (own) {
        if (own.emoji === emoji) {
          next.set(messageId, existing.filter((r: any) => r !== own));
        } else {
          next.set(messageId, existing.map((r: any) => r === own ? { ...own, emoji } : r));
        }
      } else {
        next.set(messageId, [...existing, {
          id: `temp-${Date.now()}`,
          message_id: messageId,
          conversation_id: activeChat?.id,
          actor_type: "agent",
          actor_id: user?.id,
          emoji,
          created_at: new Date().toISOString(),
        }]);
      }
      return next;
    });
    sonnerToast(`Reaction: ${emoji}`);
  }, [activeChat?.id, user?.id]);

  const handleShareLocation = useCallback(() => {
    if (!navigator.geolocation) {
      sonnerToast.error("Geolocalização não suportada no navegador.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const locationText = `📍 Localização: https://www.google.com/maps?q=${latitude},${longitude}`;
        setReplyMessage(prev => prev ? `${prev}\n${locationText}` : locationText);
        sonnerToast.success("Localização adicionada!");
      },
      () => {
        sonnerToast.error("Não foi possível obter sua localização. Verifique as permissões.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  const handleShareContact = useCallback(() => {
    if (!activeChat) return;
    const name = activeChat.name || "Contato";
    const phone = activeChat.channelId || "";
    const vcard = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${name}`,
      `TEL;TYPE=CELL:${phone}`,
      "END:VCARD"
    ].join("\n");
    const blob = new Blob([vcard], { type: "text/vcard;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    setAttachments(prev => [...prev, {
      url,
      type: "file",
      name: `${name}.vcf`,
      file: blob
    }]);
    sonnerToast.success(`Contato "${name}" adicionado como anexo!`);
  }, [activeChat]);

  const handleSendTemplate = useCallback(async (template: any, values: { body: string[]; headerText?: string; buttonParams?: Record<number, string> }) => {
    if (!template || !user || !activeChat) return;
    setTemplatePickerOpen(false);
    try {
      // Build template variables for the edge function
      const templateVariables: Record<string, { type: string; value: string }> = {};
      // Body variables
      for (let i = 0; i < values.body.length; i++) {
        templateVariables[String(i + 1)] = { type: "static", value: values.body[i] };
      }
      // Header text variable (if any)
      if (values.headerText) {
        const headerVarIndex = values.body.length + 1;
        templateVariables[String(headerVarIndex)] = { type: "static", value: values.headerText };
      }
      // Button params (URL buttons with {{1}})
      if (values.buttonParams) {
        for (const [btnIdx, val] of Object.entries(values.buttonParams)) {
          const varIdx = Object.keys(templateVariables).length + 1;
          templateVariables[String(varIdx)] = { type: "static", value: val };
        }
      }

      // Save message locally first
      const { data: msg, error: msgErr } = await supabase.from("messages").insert({
        user_id: user.id,
        conversation_id: activeChat.id,
        content: `[Template: ${template.name}]`,
        status: "sending",
        platform: "whatsapp",
        recipient_phone: activeChat.channelId,
        recipient_name: activeChat.name,
        metadata: { template_name: template.name, template_language: template.language, template_variables: templateVariables },
      } as any).select().single();

      if (msgErr) throw msgErr;

      // Send via WhatsApp API
      const { error: invokeErr } = await supabase.functions.invoke("publish-post", {
        body: {
          content: template.body_text,
          postType: "message",
          platforms: ["whatsapp"],
          recipientPhone: activeChat.channelId,
          templateName: template.name,
          templateLanguage: template.language || "pt_BR",
          templateVariables,
          postId: msg.id,
        },
      });

      if (invokeErr) {
        await supabase.from("messages").update({ status: "failed" }).eq("id", msg.id);
        sonnerToast.error("Template enviado localmente, mas falhou na entrega WhatsApp");
        return;
      }

      await supabase.from("messages").update({ status: "sent", sent_at: new Date().toISOString() }).eq("id", msg.id);
      sonnerToast.success("Template enviado!");
    } catch (e: any) {
      sonnerToast.error("Erro ao enviar template: " + e.message);
    }
  }, [user, activeChat]);

  return (
    <div className="h-full flex flex-col relative bg-[#0B141A]">
      {/* Header — WhatsApp Web style */}
      <div className="px-2 md:px-4 py-2.5 flex items-center justify-between z-10 shrink-0 bg-[#202C33]">
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="md:hidden rounded-xl shrink-0" onClick={onBack}>
            <ChevronLeft className="w-5 h-5 text-[#8696a0]" />
          </Button>

          <div
            className="w-10 h-10 md:w-10 md:h-10 rounded-full flex items-center justify-center overflow-hidden shadow-xl cursor-pointer hover:ring-2 hover:ring-[#00A884]/50 transition-all shrink-0 bg-[#2a3942]"
            onClick={onOpenInfo}
          >
            {activeChat.photoUrl ? (
              <SafeImage
                src={activeChat.photoUrl}
                alt={activeChat.name}
                className="w-full h-full object-cover"
                isWhatsAppImage
              />
            ) : <User className="w-5 h-5 text-[#8696a0]" />}
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-base leading-tight truncate max-w-[120px] md:max-w-none text-white cursor-pointer hover:underline" onClick={onOpenInfo}>
              {activeChat.name}
            </h3>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#00A884]" />
                <span className="text-[11px] text-[#8696a0]">online</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {/* Call + Video buttons (Figma style) */}
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5 w-9 h-9 hidden md:flex" title="Ligar">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#8696a0]">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5 w-9 h-9 hidden md:flex" title="Videochamada">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#8696a0]">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5 w-9 h-9" disabled={loading} onClick={() => onSync("whatsapp")}>
            <RefreshCw className={cn("w-5 h-5 text-[#8696a0]", loading && "animate-spin")} />
          </Button>
          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5 w-9 h-9" onClick={() => setChatSearchOpen(!chatSearchOpen)}>
            <Search className="w-5 h-5 text-[#8696a0]" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/5 w-9 h-9">
                <MoreHorizontal className="w-5 h-5 text-[#8696a0]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuItem onClick={onOpenInfo} className="cursor-pointer">
                <Info className="w-4 h-4 mr-2" /> Dados da conversa
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => toast({ title: "Selecionar mensagens" })}>
                <MessageCircle className="w-4 h-4 mr-2" /> Selecionar mensagens
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => toast({ title: "Notificações silenciadas", description: "Duração: 8 horas." })}>
                <X className="w-4 h-4 mr-2" /> Silenciar notificações
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => toast({ title: "Mensagens temporárias", description: "Ativado por 24 horas." })}>
                <Clock className="w-4 h-4 mr-2" /> Mensagens temporárias
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => toast({ title: "Conversa arquivada" })}>
                <Archive className="w-4 h-4 mr-2" /> Arquivar conversa
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="cursor-pointer" onClick={() => toast({ title: "Conversa limpa", description: "Todas as mensagens foram removidas." })}>
                <Trash2 className="w-4 h-4 mr-2" /> Limpar conversa
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDeleteConversation(activeChat.id)} className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                <Trash2 className="w-4 h-4 mr-2" /> Excluir Histórico
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => toast({ title: "Saindo do grupo...", variant: "destructive" })}>
                <LogOut className="w-4 h-4 mr-2" /> Sair do grupo
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Search Bar */}
      {chatSearchOpen && (
        <div className="px-4 py-2 bg-[#202C33] border-b border-white/5 z-10">
          <div className="flex items-center gap-2">
            <Input
              value={chatSearchQuery}
              onChange={e => setChatSearchQuery(e.target.value)}
              placeholder="Pesquisar nesta conversa..."
              className="h-8 text-sm bg-[#2a3942] border-0 rounded-lg placeholder:text-[#8696a0] text-white"
              autoFocus
            />
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg shrink-0" onClick={() => { setChatSearchOpen(false); setChatSearchQuery(""); }}>
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Messages area */}
      <div className="flex-1 min-h-0 overflow-y-auto pt-3.5 px-8 md:px-16 pb-4 relative z-0 flex flex-col">
        {/* Background pattern overlay */}
        <div
          className="absolute inset-0 pointer-events-none z-0 opacity-[0.015]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='24' height='24' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='12' cy='12' r='1' fill='%23ffffff' /%3E%3C/svg%3E")`,
            backgroundSize: '24px 24px',
          }}
        />

        {/* Messages container — max-width centered */}
        <div className="relative z-1 w-full max-w-[800px] mx-auto mt-auto">
          {filteredMessages.length === 0 && chatSearchQuery ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Search className="w-10 h-10 text-[#8696a0] mb-2" />
              <p className="text-sm text-[#8696a0]">Nenhuma mensagem encontrada</p>
            </div>
          ) : filteredMessages.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <MessageCircle className="w-10 h-10 text-[#8696a0] mb-2" />
              <p className="text-sm text-[#8696a0]">Início da conversa</p>
            </div>
          ) : (
            (() => {
              let lastDate: string | null = null;
              return filteredMessages.map((msg) => {
                const isSelf = msg.status !== "received";
                const mediaType = msg.metadata?.media_type || "text";
                const msgDate = new Date(msg.created_at || msg.sent_at || "");
                const dateLabel = formatDateSeparator(msgDate);
                const showDateSep = dateLabel !== lastDate;
                lastDate = dateLabel;
                const shouldShowTail = false;
                return (
                  <div key={msg.id}>
                    {showDateSep && (
                      <div className="flex items-center gap-3 my-3">
                        <div className="flex-1 h-px bg-white/10" />
                        <span className="text-[11px] text-[#8696a0] font-medium bg-[#182229] px-3 py-1 rounded-md">{dateLabel}</span>
                        <div className="flex-1 h-px bg-white/10" />
                      </div>
                    )}
                    <MessageActions
                      message={{ ...msg, content_text: msg.content, sender_type: msg.status !== "received" ? "agent" : "customer" }}
                      onReply={() => handleStartReply(msg)}
                      onReact={(emoji) => handleReact(msg.id, emoji)}
                    >
                      <div className={cn("flex flex-col", isSelf ? "items-end" : "items-start")}>
                        <div className={cn(
                          "max-w-[95%] sm:max-w-[85%] px-3 md:px-4 py-2.5 rounded-2xl text-[14px] relative shadow-xl group/msg transition-opacity duration-150",
                          isSelf
                            ? "bg-[#005C4B] text-[#E9EDEF] rounded-tr-sm shadow-lg border border-white/5"
                            : "bg-[#202C33] text-[#E9EDEF] rounded-tl-sm shadow-lg border border-white/5"
                        )}>
                          {/* Reply quote inside bubble — only for messages that are themselves replies */}
                          {msg.reply_to_message_id && (() => {
                            const parentMsg = parentMessageMap.get(msg.reply_to_message_id);
                            if (!parentMsg) return null;
                            const parentIsSelf = parentMsg.status !== "received";
                            return (
                              <ReplyQuote
                                authorLabel={parentIsSelf ? "Você" : (activeChat?.name || "Contato")}
                                preview={buildReplyPreview(parentMsg)}
                                onPrimary={isSelf}
                              />
                            );
                          })()}

                          {mediaType === "sticker" ? (
                            <MediaRenderer msg={msg} userId={user?.id} />
                          ) : (
                            <>
                              {msg.content && <p className="leading-relaxed font-medium whitespace-pre-wrap break-words">{msg.content}</p>}
                              {msg.metadata?.media_id && msg.platform === 'whatsapp' && !msg.media_url && (
                                <div className="mt-2 rounded-lg overflow-hidden border border-white/10 bg-black/20">
                                  <MediaRenderer msg={msg} userId={user?.id} />
                                </div>
                              )}
                              {msg.media_url && (
                                <MediaRenderer msg={msg} userId={user?.id} />
                              )}
                              {msg.content?.includes("maps.google.com") && (
                                <div className="mt-2">
                                  <a href={msg.content} target="_blank" rel="noopener noreferrer" className="text-xs underline flex items-center gap-1 opacity-70">
                                    <MapPin className="w-3 h-3" /> Localização compartilhada
                                  </a>
                                </div>
                              )}
                            </>
                          )}

                          <div className="flex items-center justify-end gap-1 mt-1 opacity-50 text-[10px]">
                            <span className="text-[#8696a0]">{msgDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            {isSelf && msg.status !== "sending" && (
                              <span className="ml-0.5">{msgStatusIcon(msg.status)}</span>
                            )}
                            {isSelf && msg.status === "sending" && (
                              <span className="ml-0.5">{msgStatusIcon("sending")}</span>
                            )}
                          </div>

                          {/* Keep existing ChevronDown context menu */}
                          <div className="absolute top-0.5 right-0.5 opacity-0 group-hover/msg:opacity-100 transition-opacity">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white/10 text-[#8696a0]">
                                  <ChevronDown className="w-3.5 h-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-44">
                                <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleStartReply(msg)}>
                                  <Reply className="w-3.5 h-3.5 mr-2" /> Responder
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => sonnerToast("Encaminhar — Selecione um contato para encaminhar.")}>
                                  <Forward className="w-3.5 h-3.5 mr-2" /> Encaminhar
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => sonnerToast("Favoritado! ⭐")}>
                                  <Star className="w-3.5 h-3.5 mr-2" /> Favoritar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => sonnerToast(`Info da mensagem — Enviada em ${msgDate.toLocaleString('pt-BR')}`)}>
                                  <Info className="w-3.5 h-3.5 mr-2" /> Info da mensagem
                                </DropdownMenuItem>
                                <DropdownMenuItem className="cursor-pointer text-xs text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={async () => {
                                  if (onDeleteMessage) {
                                    const success = await onDeleteMessage(msg.id);
                                    if (success) {
                                      sonnerToast("Mensagem excluída");
                                    } else {
                                      sonnerToast.error("Erro ao excluir");
                                    }
                                  }
                                }}>
                                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Excluir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>

                        {/* Reaction pills */}
                        <MessageReactions
                          reactions={messageReactions.get(msg.id) || []}
                          currentUserId={user?.id}
                          onToggle={(emoji: string) => handleReact(msg.id, emoji)}
                        />
                      </div>
                    </MessageActions>
                  </div>
                );
              });
            })()
          )}
        </div>
      </div>

      {/* Attachment previews — WhatsApp-style media rendering */}
      {attachments.length > 0 && (
        <div className="px-4 py-3 bg-[#0B141A] border-t border-white/5 z-10">
          <div className="flex items-center gap-3 overflow-x-auto">
            {attachments.map((att, i) => (
              <div key={i} className="relative group shrink-0">
                {att.type === 'image' && (
                  <div
                    className="w-[150px] h-[200px] rounded-xl overflow-hidden bg-[#1F2C33] border border-white/5 cursor-pointer"
                    onClick={() => setPreviewImageUrl(att.url)}
                  >
                    <img src={att.url} alt="" className="w-full h-full object-cover" />
                  </div>
                )}
                {att.type === 'video' && (
                  <div
                    className="w-[170px] h-[200px] rounded-xl overflow-hidden bg-black relative border border-white/5 cursor-pointer"
                    onClick={() => setPreviewImageUrl(att.url)}
                  >
                    <video src={att.url} className="w-full h-full object-cover" preload="metadata" />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <div className="w-12 h-12 rounded-full bg-black/50 flex items-center justify-center backdrop-blur-sm">
                        <Play className="w-6 h-6 text-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                )}
                {att.type === 'audio' && (
                  <div className="min-w-[240px] rounded-xl bg-[#1F2C33] p-4 flex items-center gap-3 border border-white/5">
                    <div className="w-10 h-10 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
                      <Music className="w-5 h-5 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <audio src={att.url} controls className="w-full h-8" />
                      <p className="text-[10px] text-[#8696a0] mt-1 truncate">{att.name}</p>
                    </div>
                  </div>
                )}
                {att.type === 'file' && (
                  <div className="min-w-[180px] rounded-xl bg-[#1F2C33] p-4 flex items-center gap-3 border border-white/5">
                    <FileText className="w-8 h-8 text-amber-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs text-[#E9EDEF] truncate font-medium">{att.name}</p>
                      <p className="text-[10px] text-[#8696a0]">Documento</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 hover:bg-black/80 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={fileAccept}
        className="hidden"
        onChange={handleFileChange}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Reply quote chip in composer */}
      {replyTo && (
        <div className="px-4 py-2 bg-[#1F2C33] border-t border-white/5">
          <ReplyQuote
            authorLabel={replyTo.authorLabel}
            preview={replyTo.preview}
            onDismiss={handleClearReply}
          />
        </div>
      )}

      {/* Input Bar — non-floating */}
      <div className="flex justify-center py-2 px-4 md:px-6 z-10 shrink-0 bg-[#0B141A] shadow-[0_2px_10px_rgba(11,20,26,0.16)]">
        <div className="w-full max-w-[487px] flex items-center gap-1 bg-[#1F2C33] rounded-[26px] px-2 h-[50px]">
          <div className="relative">
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-colors shrink-0"
              title="Emoji"
              onClick={() => setEmojiPickerOpen(!emojiPickerOpen)}
            >
              <Smile className="w-[22px] h-[22px] text-[#8696a0]" />
            </button>
            {emojiPickerOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setEmojiPickerOpen(false)} />
                <div className="absolute bottom-full left-0 mb-2 z-40 bg-[#1F2C33] border border-white/10 rounded-xl p-2 shadow-xl w-[280px] max-h-[200px] overflow-y-auto">
                  <div className="grid grid-cols-8 gap-1">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        className="w-8 h-8 flex items-center justify-center text-lg hover:bg-white/10 rounded-lg transition-colors"
                        onClick={() => insertEmoji(e)}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-colors shrink-0"
                title="Anexar"
              >
                <Paperclip className="w-[22px] h-[22px] text-[#8696a0]" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              <DropdownMenuItem className="cursor-pointer" onClick={() => openFileDialog("image/*,video/*")}>
                <ImageIcon className="w-4 h-4 mr-2" /> Fotos e vídeos
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => openFileDialog("application/*")}>
                <File className="w-4 h-4 mr-2" /> Documento
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={() => cameraInputRef.current?.click()}>
                <Camera className="w-4 h-4 mr-2" /> Câmera
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={handleShareLocation}>
                <MapPin className="w-4 h-4 mr-2" /> Localização
              </DropdownMenuItem>
              <DropdownMenuItem className="cursor-pointer" onClick={handleShareContact}>
                <User className="w-4 h-4 mr-2" /> Contato
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <button
            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-colors shrink-0"
            title="Modelo de mensagem"
            onClick={() => setTemplatePickerOpen(true)}
          >
            <LayoutTemplate className="w-[22px] h-[22px] text-[#8696a0]" />
          </button>

          <textarea
            ref={textareaRef}
            rows={1}
            placeholder="Digite uma mensagem"
            value={replyMessage}
            onChange={handleTextChange}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            className="flex-1 resize-none bg-transparent border-none outline-none text-[#E9EDEF] text-[15px] leading-snug px-1.5 py-2 max-h-[120px] placeholder:text-[#8696a0]"
          />

          {replyMessage.trim() || attachments.length > 0 ? (
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-colors shrink-0"
              onClick={handleSend}
              title="Enviar"
            >
              <Send className="w-[22px] h-[22px] text-[#8696a0]" />
            </button>
          ) : isRecording ? (
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-red-400 text-sm font-mono min-w-[40px]">{formatRecordingTime(recordingTime)}</span>
              <button
                className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500 hover:bg-red-600 transition-colors"
                onClick={cancelRecording}
                title="Cancelar gravação"
              >
                <X className="w-[18px] h-[18px] text-white" />
              </button>
              <button
                className="flex items-center justify-center w-9 h-9 rounded-full bg-green-500 hover:bg-green-600 transition-colors"
                onClick={stopRecording}
                title="Enviar áudio"
              >
                <Mic className="w-[22px] h-[22px] text-white" />
              </button>
            </div>
          ) : (
            <button
              className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-white/5 transition-colors shrink-0"
              onClick={startRecording}
              title="Gravar áudio"
            >
              <Mic className="w-[22px] h-[22px] text-[#8696a0]" />
            </button>
          )}
        </div>
      </div>

      <TemplatePicker
        open={templatePickerOpen}
        onOpenChange={setTemplatePickerOpen}
        onSelect={handleSendTemplate}
      />

      {/* Full-size media preview overlay */}
      {previewImageUrl && (
        <div
          className="fixed inset-0 z-[9999] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setPreviewImageUrl(null)}
        >
          <button
            onClick={() => setPreviewImageUrl(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 transition-colors text-white"
          >
            <X className="w-6 h-6" />
          </button>
          {previewImageUrl.match(/\.(mp4|webm|ogg|mov)$/i) || previewImageUrl.startsWith('blob:') ? (
            <video
              src={previewImageUrl}
              controls
              autoPlay
              className="max-w-full max-h-full rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <img
              src={previewImageUrl}
              alt="Preview"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          )}
        </div>
      )}
    </div>
  );
};
