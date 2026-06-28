import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  highlight_color: string | null;
  background_color: string | null;
  text_color: string | null;
  muted_color: string | null;
  font_primary: string | null;
  font_heading: string | null;
  font_body: string | null;
  voice_tone: string | null;
  ai_description: string | null;
  website_url: string | null;
  instagram_url: string | null;
  default_hashtags: string[] | null;
  is_default: boolean;
}

export const useBrands = () => {
  const { user } = useAuth();
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [defaultBrand, setDefaultBrand] = useState<Brand | null>(null);

  const fetchBrands = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data, error } = await (supabase as any)
        .from("brands")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      const list: Brand[] = data || [];
      setBrands(list);
      const def = list.find(b => b.is_default) || list[0] || null;
      setDefaultBrand(def);
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBrands();
  }, [user]);

  return { brands, loading, defaultBrand, refetch: fetchBrands };
};
