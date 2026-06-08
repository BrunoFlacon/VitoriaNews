import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Briefcase, Plus, Trash2, Heart, Palette, Type, Globe, 
  Instagram, Hash, Check, LayoutGrid, Loader2 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  voice_tone: string | null;
  website_url: string | null;
  instagram_url: string | null;
  default_hashtags: string[] | null;
  is_default: boolean;
}

export const BrandsTab = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  const [newBrand, setNewBrand] = useState<Partial<Brand>>({
    name: "",
    primary_color: "#8B5CF6",
    secondary_color: "#D946EF",
    voice_tone: "Profissional e Engajador",
    default_hashtags: []
  });

  const fetchBrands = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await supabase
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

  useEffect(() => {
    fetchBrands();
  }, [user]);

  const handleSave = async () => {
    if (!user || !newBrand.name) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("brands")
        .insert([{ ...newBrand, user_id: user.id }]);
      
      if (error) throw error;
      
      toast({ title: "Marca Criada!", description: "Sua nova identidade visual foi salva." });
      setShowAddForm(false);
      setNewBrand({ name: "", primary_color: "#8B5CF6", secondary_color: "#D946EF" });
      fetchBrands();
    } catch (err: any) {
      toast({ title: "Erro ao salvar", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("brands").delete().eq("id", id);
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nome da Marca</label>
                  <Input 
                    placeholder="Ex: Minha Empresa" 
                    value={newBrand.name} 
                    onChange={e => setNewBrand({...newBrand, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tom de Voz</label>
                  <Input 
                    placeholder="Ex: Corporativo, Descontraído..." 
                    value={newBrand.voice_tone || ""} 
                    onChange={e => setNewBrand({...newBrand, voice_tone: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cor Primária</label>
                  <div className="flex gap-2">
                    <Input type="color" className="w-12 h-10 p-1" value={newBrand.primary_color} onChange={e => setNewBrand({...newBrand, primary_color: e.target.value})} />
                    <Input value={newBrand.primary_color} onChange={e => setNewBrand({...newBrand, primary_color: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cor Secundária</label>
                  <div className="flex gap-2">
                    <Input type="color" className="w-12 h-10 p-1" value={newBrand.secondary_color} onChange={e => setNewBrand({...newBrand, secondary_color: e.target.value})} />
                    <Input value={newBrand.secondary_color} onChange={e => setNewBrand({...newBrand, secondary_color: e.target.value})} />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Hashtags Padrão (separadas por vírgula)</label>
                <Input 
                  placeholder="#vitoria #news #social" 
                  value={newBrand.default_hashtags?.join(", ") || ""} 
                  onChange={e => setNewBrand({...newBrand, default_hashtags: e.target.value.split(",").map(t => t.trim())})}
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
                <Card className="glass-card hover:shadow-xl hover:shadow-primary/5 transition-all group border-border/40">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white" style={{ background: `linear-gradient(135deg, ${brand.primary_color}, ${brand.secondary_color})` }}>
                          <Briefcase className="w-5 h-5" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">{brand.name}</CardTitle>
                          <Badge variant="outline" className="text-[10px] mt-1">{brand.voice_tone || "Padrão"}</Badge>
                        </div>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(brand.id)} className="text-destructive opacity-0 group-hover:opacity-100 transition-opacity">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex gap-2">
                      <div className="flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: brand.primary_color, color: '#fff', MixBlendMode: 'difference' }}>{brand.primary_color}</div>
                      <div className="flex-1 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold" style={{ backgroundColor: brand.secondary_color, color: '#fff' }}>{brand.secondary_color}</div>
                    </div>
                    {brand.default_hashtags && brand.default_hashtags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {brand.default_hashtags.slice(0, 3).map((tag, i) => (
                          <Badge key={i} variant="secondary" className="px-1.5 py-0 text-[10px] bg-primary/5 border-primary/10">
                            {tag.startsWith("#") ? tag : `#${tag}`}
                          </Badge>
                        ))}
                      </div>
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
