import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Loader2, Check, AlertCircle } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WhatsAppPhotoUploadProps {
  connectionId: string;
  currentPhoto?: string;
  onPhotoUpdated?: (url: string) => void;
}

export function WhatsAppPhotoUpload({ connectionId, currentPhoto, onPhotoUpdated }: WhatsAppPhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Foto muito grande", description: "Máximo 5MB", variant: "destructive" });
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("connection_id", connectionId);

      const { data, error: fnErr } = await supabase.functions.invoke("whatsapp-upload-photo", {
        body: formData,
      });

      if (fnErr) throw fnErr;
      if (data?.error) throw new Error(data.error);

      toast({ title: "Foto atualizada!", description: "Foto de perfil do WhatsApp alterada com sucesso." });
      onPhotoUpdated?.(data.url);
    } catch (err: any) {
      toast({ title: "Erro ao enviar foto", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex items-center gap-3">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelected}
      />
      <Button
        variant="outline"
        size="sm"
        disabled={uploading}
        onClick={() => fileRef.current?.click()}
        className="bg-slate-900 border-border/30 text-slate-300 font-bold uppercase tracking-[0.1em] text-[10px] h-9 px-4 hover:text-green-400 hover:bg-slate-900 rounded-xl gap-2"
      >
        {uploading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <Camera className="w-3.5 h-3.5" />
        )}
        {uploading ? "Enviando..." : "Alterar Foto"}
      </Button>
      {preview && (
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4 text-green-500" />
          <span className="text-[10px] text-green-500 font-bold">Pré-visualização</span>
        </div>
      )}
    </div>
  );
}
