import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface CsvRow {
  content: string;
  platforms: string;
  scheduled_at: string;
  media_type?: string;
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { rows } = await req.json() as { rows: CsvRow[] };

    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      return new Response(
        JSON.stringify({ error: "No rows provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (rows.length > 500) {
      return new Response(
        JSON.stringify({ error: "Maximum 500 rows per import" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const bulkImportId = crypto.randomUUID();
    const results: { line: number; success: boolean; error?: string; postId?: string }[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      
      // Validate content
      if (!row.content || row.content.trim().length === 0) {
        results.push({ line: i + 1, success: false, error: "Conteúdo vazio" });
        continue;
      }

      if (row.content.length > 5000) {
        results.push({ line: i + 1, success: false, error: "Conteúdo excede 5000 caracteres" });
        continue;
      }

      // Parse platforms
      const platforms = row.platforms?.split(",").map(p => p.trim().toLowerCase()).filter(Boolean);
      if (!platforms || platforms.length === 0) {
        results.push({ line: i + 1, success: false, error: "Nenhuma plataforma especificada" });
        continue;
      }

      // Parse date
      let scheduledAt: string | null = null;
      if (row.scheduled_at) {
        const date = new Date(row.scheduled_at);
        if (isNaN(date.getTime())) {
          results.push({ line: i + 1, success: false, error: "Data inválida" });
          continue;
        }
        if (date <= new Date()) {
          results.push({ line: i + 1, success: false, error: "Data deve ser no futuro" });
          continue;
        }
        scheduledAt = date.toISOString();
      }

      try {
        const { data, error } = await supabase
          .from("scheduled_posts")
          .insert({
            user_id: user.id,
            content: row.content.trim(),
            platforms,
            media_type: row.media_type || "image",
            media_ids: [],
            status: scheduledAt ? "scheduled" : "draft",
            scheduled_at: scheduledAt,
            bulk_import_id: bulkImportId,
          })
          .select("id")
          .single();

        if (error) throw error;
        results.push({ line: i + 1, success: true, postId: data.id });
      } catch (err) {
        results.push({ 
          line: i + 1, 
          success: false, 
          error: err instanceof Error ? err.message : "Erro ao inserir" 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    // console.log(`Bulk import complete: ${successCount} success, ${failCount} failed, user: ${user.id}`);

    return new Response(JSON.stringify({
      bulkImportId,
      total: rows.length,
      success: successCount,
      failed: failCount,
      results,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in bulk-import-posts:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
