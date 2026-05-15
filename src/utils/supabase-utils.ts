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

  try {
    const { data, error } = await supabase.functions.invoke(fnName, {
      body,
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        ...callerHeaders,
      },
    });

    clearTimeout(timeoutHandle);

    if (error) {
      const errorStr = String(error).toLowerCase();
      console.error(`[safeInvoke] Function ${fnName} failed with status:`, (error as any).status || "unknown");
      
      try {
        const errObj = error as any;
        if (errObj.context) {
           console.error(`[safeInvoke] Error context:`, errObj.context);
        }
      } catch {}

      if (errorStr.includes('cors') || errorStr.includes('cross-origin')) {
        if (!silent) {
          console.info(`[safeInvoke] CORS error for ${fnName}`);
        }
        return {
          data: null,
          error: new Error(`CORS error for ${fnName}. Expected in local development.`)
        };
      }

      if (errorStr.includes('404') || errorStr.includes('not found')) {
        if (!silent) {
          console.info(`[safeInvoke] Function ${fnName} not found`);
        }
        return {
          data: null,
          error: new Error(`Function ${fnName} not found.`)
        };
      }

      throw error;
    }

    return { data, error: null };
  } catch (err: any) {
    clearTimeout(timeoutHandle);

    let message = err.message || "Unknown error";

    if (err.name === 'AbortError') {
      message = `Timeout after ${timeoutMs}ms calling ${fnName}`;
      console.warn(`[safeInvoke] ${message}`);
    } else if (message.includes('CORS') || message.includes('cors')) {
      message = `CORS error. Expected in local development.`;
    }

    if (!silent) {
      console.error(`[safeInvoke] Error:`, err);
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
