import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { resolveCorsOrigin } from "../_shared/cors.ts";

const corsHeaders = (req) => ({
  'Access-Control-Allow-Origin': resolveCorsOrigin(req),
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
});

// Helper: insere uma notificação para o usuário na tabela `notifications`
async function notifyUser(
  supabase: any,
  userId: string,
  type: 'success' | 'error' | 'warning' | 'info',
  title: string,
  message: string,
  platform?: string
) {
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    title,
    message,
    platform: platform || null,
  }).catch((e: any) => console.error('Falha ao inserir notificação:', e));
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders(req) });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch pending jobs, ordered by creation, limited batch
    const { data: jobs, error } = await supabase
      .from("job_queue")
      .select("*")
      .eq("status", "pending")
      .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
      .order("created_at", { ascending: true })
      .limit(10);

    if (error) throw error;
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ processed: 0 }), { headers: { ...corsHeaders(req), "Content-Type": "application/json" } });
    }

    let processed = 0;

    for (const job of jobs) {
      // Mark as processing
      await supabase.from("job_queue").update({ status: "processing", attempts: job.attempts + 1 }).eq("id", job.id);

      try {
        let result;
        switch (job.job_type) {
          case "publish":
            result = await supabase.functions.invoke("publish-post", { body: job.payload });
            break;
          case "collect_analytics":
            result = await supabase.functions.invoke("collect-social-analytics", { body: job.payload });
            break;
          case "text_to_speech":
            result = await supabase.functions.invoke("text-to-speech", { body: job.payload });
            break;
          case "transcribe":
            result = await supabase.functions.invoke("transcribe-media", { body: job.payload });
            break;
          default:
            throw new Error(`Unknown job type: ${job.job_type}`);
        }

        // Supabase invoke() doesn't throw on 5xx errors, it returns { error }
        if (result && result.error) {
            throw new Error(result.error.message || JSON.stringify(result.error));
        }

        // Special check for publish-post which catches errors internally and returns success: true
        if (job.job_type === "publish" && result && result.data && result.data.results) {
            const allFailed = result.data.results.every((r: any) => r.success === false);
            if (allFailed && result.data.results.length > 0) {
               throw new Error("Publish failed for all platforms: " + result.data.results.map((r:any) => `${r.platform}: ${r.error}`).join(" | "));
            }
        }

        // Mark completed
        await supabase.from("job_queue").update({
          status: "completed",
          completed_at: new Date().toISOString(),
        }).eq("id", job.id);

        // Log success
        await supabase.from("system_logs").insert({
          user_id: job.user_id,
          service: `job_queue.${job.job_type}`,
          level: "info",
          message: `Job ${job.id} completed successfully`,
          metadata: { job_id: job.id, result },
        });

        // Notificar o usuário do sucesso
        const successTitles: Record<string, string> = {
          publish: '✅ Post Publicado com Sucesso',
          collect_analytics: '✅ Métricas Atualizadas',
          text_to_speech: '✅ Áudio Gerado',
          transcribe: '✅ Transcrição Concluída',
        };
        const successMessages: Record<string, string> = {
          publish: 'Seu post foi publicado nas redes sociais conforme agendado.',
          collect_analytics: 'As métricas das suas contas foram atualizadas.',
          text_to_speech: 'O áudio do seu conteúdo está pronto.',
          transcribe: 'A transcrição de mídia foi concluída.',
        };
        await notifyUser(
          supabase,
          job.user_id,
          'success',
          successTitles[job.job_type] || '✅ Tarefa Concluída',
          successMessages[job.job_type] || `A tarefa '${job.job_type}' foi executada com sucesso.`,
          job.payload?.platform || undefined
        );

        processed++;
      } catch (jobError) {
        const attempts = job.attempts + 1;
        const maxAttempts = job.max_attempts || 3;
        const errorMsg = jobError instanceof Error ? jobError.message : String(jobError);

        if (attempts >= maxAttempts) {
          // Limite de tentativas atingido — marcar como falha permanente
          await supabase.from("job_queue").update({
            status: "failed",
            error_message: errorMsg,
          }).eq("id", job.id);

          // Notificar o usuário da falha definitiva
          await notifyUser(
            supabase,
            job.user_id,
            'error',
            '❌ Publicação Falhou Definitivamente',
            `Após ${maxAttempts} tentativas, não foi possível executar a tarefa '${job.job_type}'. Motivo: ${errorMsg.substring(0, 200)}`,
            job.payload?.platform || undefined
          );
        } else {
          // Exponential backoff: tentativa 1 → 1min, 2 → 5min, 3 → 25min
          const delayMs = Math.pow(5, attempts - 1) * 60 * 1000;
          const nextRetry = new Date(Date.now() + delayMs);
          const nextRetryISO = nextRetry.toISOString();

          // Formatar a hora local (Brasil) para mostrar ao usuário
          const nextRetryFormatted = nextRetry.toLocaleString('pt-BR', {
            timeZone: 'America/Sao_Paulo',
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
          });

          await supabase.from("job_queue").update({
            status: "pending",
            next_retry_at: nextRetryISO,
            error_message: errorMsg,
          }).eq("id", job.id);

          // Notificar o usuário da tentativa com previsão da próxima
          await notifyUser(
            supabase,
            job.user_id,
            'warning',
            `⚠️ Tentativa ${attempts}/${maxAttempts} Falhou`,
            `A tarefa '${job.job_type}' encontrou um erro. Próxima tentativa: ${nextRetryFormatted}. Motivo: ${errorMsg.substring(0, 150)}`,
            job.payload?.platform || undefined
          );
        }

        // Log error
        await supabase.from("system_logs").insert({
          user_id: job.user_id,
          service: `job_queue.${job.job_type}`,
          level: "error",
          message: `Job ${job.id} failed (attempt ${attempts}/${maxAttempts})`,
          metadata: { job_id: job.id, error: errorMsg },
        });
      }
    }

    return new Response(JSON.stringify({ processed }), {
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { ...corsHeaders(req), "Content-Type": "application/json" },
    });
  }
});

