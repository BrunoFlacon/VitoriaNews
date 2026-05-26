import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (_req: Request) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();

    const { data: toDelete } = await supabase
      .from("messages")
      .select("id")
      .lt("created_at", twelveHoursAgo)
      .filter("metadata->>is_system_log", "eq", "true");

    const ids = (toDelete || []).map(r => r.id);
    if (ids.length === 0) {
      return new Response(JSON.stringify({ deleted: 0 }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error } = await supabase
      .from("messages")
      .delete()
      .in("id", ids);

    if (error) {
      console.error("[CLEANUP-TEMP] Erro:", error.message);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }

    console.log(`[CLEANUP-TEMP] ${ids.length} mensagens temporárias excluídas`);
    return new Response(JSON.stringify({ deleted: ids.length }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("[CLEANUP-TEMP] Erro global:", err.message);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
});
