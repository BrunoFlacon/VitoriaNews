import { supabase } from "@/integrations/supabase/client";

export interface InvokeOptions {
  body?: any;
  headers?: Record<string, string>;
  timeoutMs?: number;
  silent?: boolean;
}

interface InvokeResult {
  data: any | null;
  error: Error | null;
}

export async function safeInvoke(fnName: string, options: InvokeOptions = {}): Promise<InvokeResult> {
  const { body = {}, headers: callerHeaders = {}, timeoutMs = 30000, silent = true } = options;

  const controller = new AbortController();
  const timeoutHandle = setTimeout(() => controller.abort(), timeoutMs);

  // Helper: check if an error string indicates a CORS / network failure
  const isCorsOrNetworkError = (str: string): boolean => {
    const lower = str.toLowerCase();
    return (
      lower.includes('cors') ||
      lower.includes('cross-origin') ||
      lower.includes('failed to fetch') ||
      lower.includes('networkerror') ||
      lower.includes('network error') ||
      lower.includes('load failed')
    );
  };

  try {
    const { data, error } = await supabase.functions.invoke(fnName, {
      body,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...callerHeaders,
      },
      signal: controller.signal,
    });

    clearTimeout(timeoutHandle);

    if (error) {
      const errorStr = String(error);
      const contextStr = String((error as any)?.context ?? '');
      
      // Try to get a more detailed message if available
      let detailMsg = (error as any).message || errorStr;
      if ((error as any).status) {
         detailMsg = `[${(error as any).status}] ${detailMsg}`;
      }

      // ── CORS / Network errors — suppress console noise in dev ──
      if (isCorsOrNetworkError(detailMsg) || isCorsOrNetworkError(contextStr)) {
        if (!silent) {
          console.info(`[safeInvoke] Network/CORS error for ${fnName} — expected in local dev`);
        }
        return {
          data: null,
          error: new Error(`CORS error for ${fnName}. Expected in local development.`)
        };
      }

      // ── 404 / Not Found — function not deployed ──
      if (detailMsg.includes('404') || detailMsg.toLowerCase().includes('not found')) {
        if (!silent) {
          console.info(`[safeInvoke] Function ${fnName} not found`);
        }
        return {
          data: null,
          error: new Error(`Function ${fnName} not found.`)
        };
      }

      // ── Status 0 / network error — treat as CORS/not-deployed ──
      const status = (error as any).status || 0;
      if (status === 0) {
        return {
          data: null,
          error: new Error(`Network error for ${fnName}. Function may not be deployed.`)
        };
      }

      // ── Genuine server error — log only non-4xx (4xx = config issue) ──
      if (status < 400 || status >= 500) {
        console.error(`[safeInvoke] Function ${fnName} failed:`, status, detailMsg);
      } else if (!silent) {
        console.info(`[safeInvoke] Function ${fnName} returned ${status} (expected for unconfigured platform)`);
      }
      return {
        data: null,
        error: new Error(detailMsg)
      };
    }

    return { data, error: null };
  } catch (err: any) {
    clearTimeout(timeoutHandle);

    let message = err.message || "Unknown error";

    if (err.name === 'AbortError') {
      message = `Timeout after ${timeoutMs}ms calling ${fnName}`;
      console.warn(`[safeInvoke] ${message}`);
    } else if (isCorsOrNetworkError(message)) {
      // Silently handle CORS thrown from fetch itself
      message = `CORS error for ${fnName}. Expected in local development.`;
    } else {
      console.error(`[safeInvoke] Error for ${fnName}:`, err);
    }

    return {
      data: null,
      error: new Error(message)
    };
  }
}

export function isCorsError(error: Error | null): boolean {
  if (!error) return false;
  return error.message?.toLowerCase().includes('cors') || false;
}

export function isFunctionNotFoundError(error: Error | null): boolean {
  if (!error) return false;
  return error.message?.includes('404') || error.message?.includes('not found') || false;
}
