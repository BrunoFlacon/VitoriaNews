/**
 * @file paymentService.ts
 * @description Serviço de pagamento centralizado integrado com EFI Bank (PIX).
 */

import { supabase } from '@/integrations/supabase/client';

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS COMPARTILHADOS
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'pix' | 'card' | 'boleto';

export type PlanDuration = 'monthly' | 'quarterly' | 'yearly';

export interface PlanConfig {
  duration: PlanDuration;
  label: string;
  priceInCents: number; // Sempre em centavos para evitar erros de float
  priceBRL: string;     // Formatado para exibição
  intervalDays: number;
}

export interface PaymentCustomer {
  name: string;
  email: string;
  phone: string;
  taxId?: string; // CPF/CNPJ
}

export interface CreatePaymentParams {
  customer: PaymentCustomer;
  plan: PlanConfig;
  method: PaymentMethod;
  gatewayToken?: string;
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status: 'approved' | 'pending' | 'rejected' | 'error';
  redirectUrl?: string; // Imagem base64 do QR Code para PIX
  pixCopyPaste?: string; // Código copia-e-cola
  barcodeData?: string;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DOS PLANOS (Valores atualizados)
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_CONFIGS: Record<PlanDuration, PlanConfig> = {
  monthly: {
    duration: 'monthly',
    label: 'Mensal',
    priceInCents: 2292,
    priceBRL: '22,92',
    intervalDays: 30,
  },
  quarterly: {
    duration: 'quarterly',
    label: 'Trimestral',
    priceInCents: 6992,
    priceBRL: '69,92',
    intervalDays: 90,
  },
  yearly: {
    duration: 'yearly',
    label: 'Anual',
    priceInCents: 22222,
    priceBRL: '222,22',
    intervalDays: 365,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DO GATEWAY
// ─────────────────────────────────────────────────────────────────────────────

export let PAYMENT_GATEWAY: 'efipay' | 'none' =
  (import.meta.env.VITE_PAYMENT_GATEWAY || 'efipay') as any;

let _configLoaded = false;
let _configPromise: Promise<void> | null = null;

export async function loadGatewayConfig(): Promise<void> {
  if (_configLoaded) return;
  if (_configPromise) return _configPromise;

  _configPromise = (async () => {
    try {
      const { data } = await supabase
        .from('system_settings' as any)
        .select('*')
        .maybeSingle();

      if (data) {
        const d = data as any;
        if (d.payment_gateway && d.payment_gateway !== 'none') {
          PAYMENT_GATEWAY = d.payment_gateway;
        }
      }
    } catch {
      // mantém o default
    } finally {
      _configLoaded = true;
      _configPromise = null;
    }
  })();

  return _configPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVIÇO DE PAGAMENTO EFI BANK
// ─────────────────────────────────────────────────────────────────────────────

export async function createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
  if (PAYMENT_GATEWAY === 'none') {
    return {
      success: false,
      status: 'error',
      errorMessage: 'Gateway de pagamento não configurado.',
    };
  }

  try {
    const { data: session } = await supabase.auth.getSession();
    
    // Chamada à Edge Function no Supabase para segurança total das credenciais
    const { data, error } = await supabase.functions.invoke('efi-create-charge', {
      body: {
        plan: params.plan.duration,
        customer: {
          name: params.customer.name,
          email: params.customer.email,
          phone: params.customer.phone,
          cpf: params.customer.taxId || '',
        },
        method: params.method,
      },
      headers: session?.session?.access_token ? {
        Authorization: `Bearer ${session.session.access_token}`
      } : {}
    });

    if (error) throw error;

    if (data?.error) {
      return {
        success: false,
        status: 'error',
        errorMessage: data.error,
      };
    }

    return {
      success: true,
      status: 'pending',
      paymentId: data.txid,
      pixCopyPaste: data.qrcodeText,
      redirectUrl: data.qrcodeImage, // Imagem Base64
    };
  } catch (err: any) {
    console.error('[PaymentService] Erro ao criar cobrança:', err);
    return {
      success: false,
      status: 'error',
      errorMessage: err.message || 'Erro ao processar pagamento via EFI Bank.',
    };
  }
}
