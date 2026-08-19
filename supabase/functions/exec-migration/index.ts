import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const dbUrl = Deno.env.get("SUPABASE_DB_URL") || Deno.env.get("LOCAL_DATABASE_URL");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // DDL SQL Statements
    const sqls = [
      `CREATE TABLE IF NOT EXISTS public.cover_projects (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          title VARCHAR(255) NOT NULL DEFAULT 'Capa Sem Título',
          media_type VARCHAR(50) NOT NULL DEFAULT 'video',
          aspect_ratio VARCHAR(20) NOT NULL DEFAULT '16:9',
          canvas_width INTEGER NOT NULL DEFAULT 1920,
          canvas_height INTEGER NOT NULL DEFAULT 1080,
          layers JSONB NOT NULL DEFAULT '[]'::jsonb,
          export_url TEXT,
          thumbnail_url TEXT,
          is_template BOOLEAN NOT NULL DEFAULT false,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      `CREATE TABLE IF NOT EXISTS public.cover_templates (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          name VARCHAR(255) NOT NULL,
          category VARCHAR(100) NOT NULL DEFAULT 'geral',
          aspect_ratio VARCHAR(20) NOT NULL DEFAULT '16:9',
          preview_url TEXT,
          config JSONB NOT NULL DEFAULT '{}'::jsonb,
          is_official BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`,

      `CREATE TABLE IF NOT EXISTS public.cover_analytics (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          user_id UUID NOT NULL,
          cover_project_id UUID,
          post_id UUID,
          platform VARCHAR(50) NOT NULL,
          media_type VARCHAR(50) NOT NULL DEFAULT 'video',
          cover_url TEXT NOT NULL,
          impressions_count INTEGER NOT NULL DEFAULT 0,
          clicks_count INTEGER NOT NULL DEFAULT 0,
          last_synced_at TIMESTAMPTZ DEFAULT NOW(),
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );`
    ];

    const results: any[] = [];
    for (const sql of sqls) {
      const { data, error } = await supabase.rpc("exec_sql", { query: sql }).catch(() => ({ data: null, error: { message: "rpc_not_found" } }));
      results.push({ sql: sql.substring(0, 40) + "...", error: error?.message || null });
    }

    return new Response(JSON.stringify({ success: true, results }, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
