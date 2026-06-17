import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Briefcase, Plus, Trash2, Palette, Type, Globe, 
  Instagram, Hash, Check, LayoutGrid, Loader2, Sparkles
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Brand } from "@/hooks/useBrands";

const FONT_OPTIONS = [
  "Inter", "Roboto", "Poppins", "Outfit", "Montserrat", 
  "Playfair Display", "Lato", "Open Sans", "Raleway", "Nunito"
];

const DEFAULT_BRAND: Partial<Brand> = {
  name: "",
  primary_color: "#8B5CF6",
  secondary_color: "#D946EF",
  highlight_color: "#F59E0B",
  background_color: "#0F0F1A",
  text_color: "#F1F0FB",
  muted_color: "#6B7280",
  font_primary: "Inter",
  font_heading: "Outfit",
  font_body: "Inter",
  voice_tone: "Profissional e Engajador",
  default_hashtags: []
};

const ColorField = ({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) => (
  <div className="space-y-1.5">
    <label className="text-xs font-medium text-muted-foreground">{label}</label>
    <div className="flex gap-2">
      <input 
        type="color" 
        className="w-10 h-9 p-0.5 rounded border border-border/40 cursor-pointer bg-transparent" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
      />
      <Input 
        className="font-mono text-xs" 
        value={value} 
        onChange={e => onChange(e.target.value)} 
      />
    </div>
  </div>
);

export const BrandsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newBrand, setNewBrand] = useState<Partial<Brand>>(DEFAULT_BRAND);

  const patch = (fields: Partial<Brand>) => setNewBrand(prev => ({ ...prev, ...fields }));

  const fetchBrands = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("brands")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      setBrands(data || []);
    } catch (err: any) {
      console.error("Erro ao buscar marcas:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBrands(); }, [user]);

  const handleSave = async () => {
    if (!user || !newBrand.name) return;
    setSaving(true);
    try {
      const { error } = await (supabase as any)
        .from("brands")
        .insert([{ ...newBrand, user_id: user.id }]);
      if (error) throw error;
      toast({ title: "Marca Criada!", description: "Sua nova identidade visual foi salva." });
      setShowAddForm(false);
      setNewBrand(DEFAULT_BRAND);
      fetchBrands();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    try {
      await (supabase as any).from("brands").update({ is_default: false }).eq("user_id", user?.id);
      await (supabase as any).from("brands").update({ is_default: true }).eq("id", id);
      fetchBrands();
      toast({ title: "Marca padrão definida!" });
    } catch (err: any) {
      toast({ title: "Erro", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await (supabase as any).from("brands").delete().eq("id", id);
      if (error) throw error;
      setBrands(brands.filter(b => b.id !== id));
      toast({ title: "Marca Removida" });
    } catch (err: any) {
      toast({ title: "Erro ao excluir", description: err.message, variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-display font-bold">Identidade de Marca</h2>
          <p className="text-muted-foreground">Gerencie cores, logos e o tom de voz das suas redes.</p>
        </div>
        <Button onClick={() => setShowAddForm(!showAddForm)} className="shadow-lg shadow-primary/20">
          {showAddForm ? <LayoutGrid className="w-4 h-4 mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          {showAddForm ? "Ver Marcas" : "Nova Marca"}
        </Button>
      </div>

      {showAddForm ? (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="glass-card border-primary/20">
            <CardHeader>
              <CardTitle>Criar Nova Marca</CardTitle>
              <CardDescription>Defina os padrões que a IA usará para seus posts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">

              {/* Nome e Tom de Voz */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Marca</label>
                  <Input placeholder="Ex: Vitória News" value={newBrand.name} onChange={e => patch({ name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tom de Voz</label>
                  <Input placeholder="Ex: Informativo, Engajador..." value={newBrand.voice_tone || ""} onChange={e => patch({ voice_tone: e.target.value })} />
                </div>
              </div>

              {/* Paleta de Cores */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Palette className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Paleta de Cores</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <ColorField label="Primária" value={newBrand.primary_color || "#8B5CF6"} onChange={v => patch({ primary_color: v })} />
                  <ColorField label="Secundária" value={newBrand.secondary_color || "#D946EF"} onChange={v => patch({ secondary_color: v })} />
                  <ColorField label="Destaque" value={newBrand.highlight_color || "#F59E0B"} onChange={v => patch({ highlight_color: v })} />
                  <ColorField label="Fundo" value={newBrand.background_color || "#0F0F1A"} onChange={v => patch({ background_color: v })} />
                  <ColorField label="Texto" value={newBrand.text_color || "#F1F0FB"} onChange={v => patch({ text_color: v })} />
                  <ColorField label="Muted" value={newBrand.muted_color || "#6B7280"} onChange={v => patch({ muted_color: v })} />
                </div>

                {/* Preview da Paleta */}
                <div className="flex gap-1.5 mt-3 rounded-xl overflow-hidden h-8">
                  {[newBrand.primary_color, newBrand.secondary_color, newBrand.highlight_color, newBrand.background_color, newBrand.text_color, newBrand.muted_color].map((c, i) => (
                    <div key={i} className="flex-1 rounded" style={{ backgroundColor: c || "#888" }} title={c || ""} />
                  ))}
                </div>
              </div>

              {/* Tipografia */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Type className="w-4 h-4 text-primary" />
                  <h3 className="text-sm font-semibold">Tipografia</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {[
                    { label: "Fonte Principal", key: "font_primary" as const },
                    { label: "Fonte Título", key: "font_heading" as const },
                    { label: "Fonte Corpo", key: "font_body" as const },
                  ].map(({ label, key }) => (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs font-medium text-muted-foreground">{label}</label>
                      <select
                        className="w-full h-9 px-3 rounded-md text-sm bg-background border border-border/40"
                        value={newBrand[key] || "Inter"}
                        onChange={e => patch({ [key]: e.target.value })}
                      >
                        {FONT_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Descrição para IA */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <label className="text-sm font-medium">Descrição / Contexto IA</label>
                </div>
                <Textarea
                  placeholder="Descreva sua marca para a IA: público-alvo, pilares de conteúdo, estilo visual..."
                  value={newBrand.ai_description || ""}
                  onChange={e => patch({ ai_description: e.target.value })}
                  rows={3}
                />
              </div>

              {/* Hashtags */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Hashtags Padrão (separadas por vírgula)</label>
                <Input
                  placeholder="#vitoria #news #social"
                  value={newBrand.default_hashtags?.join(", ") || ""}
                  onChange={e => patch({ default_hashtags: e.target.value.split(",").map(t => t.trim()).filter(Boolean) })}
                />
              </div>

              <Button onClick={handleSave} disabled={saving || !newBrand.name} className="w-full">
                {saving ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                Salvar Identidade Visual
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            <div className="col-span-full py-12 flex justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
          ) : brands.length === 0 ? (
            <div className="col-span-full py-20 text-center glass-card rounded-2xl border-dashed">
              <Briefcase className="w-12 h-12 mx-auto text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground">Nenhuma marca cadastrada ainda.</p>
            </div>
          ) : (
            brands.map((brand) => (
              <motion.div key={brand.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <Card className={cn("glass-card hover:shadow-xl transition-all group border-border/40", brand.is_default && "border-primary/40 shadow-primary/10")}>
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${brand.primary_color}, ${brand.secondary_color})` }}>
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{brand.name}</CardTitle>
                          <div className="flex gap-1 mt-0.5">
                            {brand.is_default && <Badge className="text-[10px] px-1.5 py-0 bg-primary/20 text-primary border-primary/30">Padrão</Badge>}
                            <Badge variant="outline" className="text-[10px] px-1.5 py-0">{brand.voice_tone || "Padrão"}</Badge>
                          </div>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(brand.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Paleta visual */}
                    <div className="flex gap-1 rounded-lg overflow-hidden h-6">
                      {[brand.primary_color, brand.secondary_color, brand.highlight_color, brand.background_color, brand.text_color, brand.muted_color].filter(Boolean).map((c, i) => (
                        <div key={i} className="flex-1" style={{ backgroundColor: c! }} title={c!} />
                      ))}
                    </div>
                    {/* Fontes */}
                    {brand.font_primary && (
                      <p className="text-[10px] text-muted-foreground">
                        <span className="font-medium">Fonte:</span> {brand.font_primary}
                        {brand.font_heading && ` / ${brand.font_heading}`}
                      </p>
                    )}
                    {/* Hashtags */}
                    {brand.default_hashtags && brand.default_hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {brand.default_hashtags.slice(0, 4).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="px-1.5 py-0 text-[10px] bg-primary/5 border-primary/10">
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </Badge>
                        ))}
                      </div>
                    )}
                    {!brand.is_default && (
                      <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => handleSetDefault(brand.id)}>
                        <Check className="w-3 h-3 mr-1" /> Definir como padrão
                      </Button>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
