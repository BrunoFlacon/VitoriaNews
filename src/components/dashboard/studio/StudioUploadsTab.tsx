import React, { useState, useEffect } from "react";
import { Upload, Image as LucideImage, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SafeImage } from "@/components/ui/SafeImage";

interface StudioUploadsTabProps {
  onAddImageLayer: (url: string, name: string) => void;
}

export const StudioUploadsTab: React.FC<StudioUploadsTabProps> = ({ onAddImageLayer }) => {
  const { toast } = useToast();
  const [uploads, setUploads] = useState<{ id: string; url: string; name: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    fetchUserMedia();
  }, []);

  const fetchUserMedia = async () => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user?.id) return;

      const { data, error } = await supabase
        .from("media")
        .select("id, file_url, file_name, file_type")
        .eq("user_id", userRes.user.id)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setUploads(
          data
            .filter((m: any) => m.file_type?.startsWith("image/"))
            .map((m: any) => ({
              id: m.id,
              url: m.file_url,
              name: m.file_name || "Imagem do Usuário",
            }))
        );
      }
    } catch {
      // Ignore fallback
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user?.id) throw new Error("Usuário não autenticado");

      const ext = file.name.split(".").pop();
      const path = `${userRes.user.id}/studio_${Date.now()}.${ext}`;

      const { data, error } = await supabase.storage.from("media").upload(path, file);
      if (error) throw error;

      const { data: pubUrl } = supabase.storage.from("media").getPublicUrl(path);
      const publicUrl = pubUrl.publicUrl;

      // Add to state & immediately insert into canvas
      setUploads((prev) => [{ id: path, url: publicUrl, name: file.name }, ...prev]);
      onAddImageLayer(publicUrl, file.name);

      toast({
        title: "Upload Concluído!",
        description: "Imagem adicionada ao projeto e salva na galeria.",
      });
    } catch (err: any) {
      toast({
        title: "Erro no Upload",
        description: err.message || "Não foi possível enviar a imagem.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">
          Galeria & Uploads
        </h3>
        <p className="text-[11px] text-muted-foreground">
          Envie fotos do seu computador ou reutilize imagens da sua biblioteca.
        </p>
      </div>

      {/* Upload Action Button */}
      <label className="cursor-pointer">
        <div className="border-2 border-dashed border-primary/40 hover:border-primary bg-primary/5 hover:bg-primary/10 rounded-2xl p-4 flex flex-col items-center justify-center gap-2 transition-all">
          {isUploading ? (
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          ) : (
            <Upload className="w-6 h-6 text-primary" />
          )}
          <span className="text-xs font-bold text-foreground">
            {isUploading ? "Enviando imagem..." : "Fazer Upload de Imagem"}
          </span>
          <span className="text-[10px] text-muted-foreground">PNG, JPG ou WEBP até 10MB</span>
        </div>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
          disabled={isUploading}
        />
      </label>

      {/* Uploaded Gallery Grid */}
      <div className="space-y-2 pt-2">
        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-wider">
          Sua Galeria ({uploads.length})
        </p>

        {uploads.length === 0 ? (
          <div className="text-center py-6 border border-border/40 rounded-2xl text-xs text-muted-foreground">
            Nenhuma imagem enviada ainda.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
            {uploads.map((img) => (
              <button
                key={img.id}
                onClick={() => onAddImageLayer(img.url, img.name)}
                className="group relative aspect-square rounded-xl overflow-hidden border border-border/60 hover:border-primary transition-all text-left"
              >
                <SafeImage src={img.url} alt={img.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Plus className="w-5 h-5 text-white" />
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
