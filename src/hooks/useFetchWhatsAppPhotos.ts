import { useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface PhotoResult {
  connection_id: string;
  page_name: string;
  photo_url: string | null;
  conversations_updated: number;
  error?: string;
}

interface FetchPhotosResult {
  success: boolean;
  connections_processed: number;
  results: PhotoResult[];
}

export function useFetchWhatsAppPhotos() {
  const [loading, setLoading] = useState(false);
  const [lastResult, setLastResult] = useState<FetchPhotosResult | null>(null);

  const fetchPhotos = useCallback(async (): Promise<FetchPhotosResult | null> => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const { data, error } = await supabase.functions.invoke("fetch-whatsapp-photos", {
        body: {},
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      if (error) {
        // 404 means edge function not deployed locally — silent fail
        if (error.message?.includes("404") || error.message?.includes("not found")) {
          console.warn("[useFetchWhatsAppPhotos] Edge function not deployed, skipping");
          return null;
        }
        throw error;
      }

      const result = data as FetchPhotosResult;
      setLastResult(result);
      return result;
    } catch (err: any) {
      // Don't log 404s as errors
      if (!err?.message?.includes("404")) {
        console.error("[useFetchWhatsAppPhotos]", err);
      }
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { fetchPhotos, loading, lastResult };
}
