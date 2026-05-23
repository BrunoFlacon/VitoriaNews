/**
 * @file paymentService.ts
 * @description Serviço de pagamento centralizado.
 *
 * ESTRUTURA PRONTA PARA INTEGRAÇÃO COM:
 * - Stripe (https://stripe.com/docs)
 * - Mercado Pago (https://www.mercadopago.com.br/developers)
 *
 * COMO ATIVAR:
 *  1. Escolha o gateway (Stripe ou Mercado Pago).
 *  2. Instale o SDK correspondente (ver comentários abaixo).
 *  3. Configure as variáveis de ambiente no .env.
 *  4. Implemente as funções dentro de cada método marcado com TODO.
 */

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS COMPARTILHADOS
// ─────────────────────────────────────────────────────────────────────────────

export type PaymentMethod = 'pix' | 'card' | 'boleto';

export type PlanDuration = 'monthly' | 'quarterly' | 'yearly';

export interface PlanConfig {
  duration: PlanDuration;
  label: string;
  priceInCents: number; // Sempre em centavos para evitar erros de float
  priceBRL: string;     // Formatado para exibição: "22,00"
  intervalDays: number;
}

export interface PaymentCustomer {
  name: string;
  email: string;
  phone: string;
  taxId?: string; // CPF/CNPJ — necessário para Boleto e PIX no Mercado Pago
}

export interface CreatePaymentParams {
  customer: PaymentCustomer;
  plan: PlanConfig;
  method: PaymentMethod;
  /** Token gerado pelo SDK frontend (Stripe Elements / Mercado Pago Brick) */
  gatewayToken?: string;
  /** Metadados extras para salvar no gateway */
  metadata?: Record<string, string>;
}

export interface PaymentResult {
  success: boolean;
  paymentId?: string;
  status: 'approved' | 'pending' | 'rejected' | 'error';
  /** URL de retorno para PIX QR ou Boleto PDF */
  redirectUrl?: string;
  /** Código PIX copia-e-cola (Mercado Pago) */
  pixCopyPaste?: string;
  /** Código de barras do boleto */
  barcodeData?: string;
  errorMessage?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DOS PLANOS
// ─────────────────────────────────────────────────────────────────────────────

export const PLAN_CONFIGS: Record<PlanDuration, PlanConfig> = {
  monthly: {
    duration: 'monthly',
    label: 'Mensal',
    priceInCents: 2200,
    priceBRL: '22,00',
    intervalDays: 30,
  },
  quarterly: {
    duration: 'quarterly',
    label: 'Trimestral',
    priceInCents: 5900,
    priceBRL: '59,00',
    intervalDays: 90,
  },
  yearly: {
    duration: 'yearly',
    label: 'Anual',
    priceInCents: 19900,
    priceBRL: '199,00',
    intervalDays: 365,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAÇÃO DO GATEWAY (dinâmica via system_settings + fallback para .env)
// ─────────────────────────────────────────────────────────────────────────────

import { supabase } from '@/integrations/supabase/client';

// Fallback estático para variáveis de ambiente (quando system_settings não disponível)
export let PAYMENT_GATEWAY: 'stripe' | 'mercadopago' | 'none' =
  (import.meta.env.VITE_PAYMENT_GATEWAY || 'none') as any;
export let STRIPE_PUBLIC_KEY = import.meta.env.VITE_STRIPE_PUBLIC_KEY || '';
export let MP_PUBLIC_KEY = import.meta.env.VITE_MP_PUBLIC_KEY || '';

// Variáveis internas para controle de cache
let _configLoaded = false;
let _configPromise: Promise<void> | null = null;

/**
 * Carrega as configurações de gateway a partir de `system_settings` no Supabase.
 * Usa cache para evitar chamadas repetidas. Apenas a primeira chamada faz a query.
 */
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
        if (d.stripe_public_key) STRIPE_PUBLIC_KEY = d.stripe_public_key;
        if (d.mercadopago_public_key) MP_PUBLIC_KEY = d.mercadopago_public_key;
      }
    } catch {
      // Falha silenciosa — mantém os valores do .env
    } finally {
      _configLoaded = true;
      _configPromise = null;
    }
  })();

  return _configPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVIÇO DE PAGAMENTO
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Cria uma cobrança no gateway configurado.
 *
 * ATENÇÃO: Esta função deve chamar um endpoint seguro no seu backend
 * (ex: Supabase Edge Function, Next.js API Route, etc.) que detém a
 * SECRET KEY do gateway. NUNCA processe pagamentos diretamente no frontend.
 */
export async function createPayment(params: CreatePaymentParams): Promise<PaymentResult> {
  if (PAYMENT_GATEWAY === 'none') {
    console.warn('[PaymentService] Nenhum gateway configurado. Defina VITE_PAYMENT_GATEWAY no .env');
    return {
      success: false,
      status: 'error',
      errorMessage: 'Gateway de pagamento não configurado. Configure VITE_PAYMENT_GATEWAY no .env.',
    };
  }

  if (PAYMENT_GATEWAY === 'stripe') {
    return createStripePayment(params);
  }

  if (PAYMENT_GATEWAY === 'mercadopago') {
    return createMercadoPagoPayment(params);
  }

  return { success: false, status: 'error', errorMessage: 'Gateway desconhecido.' };
}

// ─────────────────────────────────────────────────────────────────────────────
// STRIPE INTEGRATION STUB
// ─────────────────────────────────────────────────────────────────────────────
// Instalação: npm install @stripe/stripe-js @stripe/react-stripe-js
// Docs: https://stripe.com/docs/stripe-js/react
//
// No componente de pagamento, use <Elements stripe={stripePromise}> e
// <CardElement> ou <PaymentElement> para capturar os dados do cartão com segurança.

async function createStripePayment(params: CreatePaymentParams): Promise<PaymentResult> {
  try {
    /**
     * TODO: Implemente a chamada ao seu backend seguro.
     *
     * Exemplo de chamada para uma Supabase Edge Function:
     *
     * const { data, error } = await supabase.functions.invoke('create-stripe-payment', {
     *   body: {
     *     paymentMethodId: params.gatewayToken, // Obtido via Stripe Elements
     *     amountInCents: params.plan.priceInCents,
     *     currency: 'brl',
     *     customer: params.customer,
     *     metadata: params.metadata,
     *   },
     * });
     * if (error) throw error;
     * return { success: true, paymentId: data.paymentIntentId, status: 'approved' };
     */
    console.info('[Stripe] Gateway pronto. Implemente a Edge Function e remova este log.');
    return {
      success: false,
      status: 'error',
      errorMessage: 'Integração Stripe pendente. Implemente a Edge Function de pagamento.',
    };
  } catch (err: any) {
    return { success: false, status: 'error', errorMessage: err.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MERCADO PAGO INTEGRATION STUB
// ─────────────────────────────────────────────────────────────────────────────
// Instalação: npm install @mercadopago/sdk-react
// Docs: https://github.com/mercadopago/sdk-react
//
// Use <Payment> Brick ou <CardPayment> Brick para capturar dados com segurança.

async function createMercadoPagoPayment(params: CreatePaymentParams): Promise<PaymentResult> {
  try {
    /**
     * TODO: Implemente a chamada ao seu backend seguro.
     *
     * Exemplo de chamada para uma Supabase Edge Function:
     *
     * const { data, error } = await supabase.functions.invoke('create-mp-payment', {
     *   body: {
     *     token: params.gatewayToken,       // Obtido via Brick após o usuário preencher os dados
     *     transactionAmount: params.plan.priceInCents / 100,
     *     paymentMethodId: params.method === 'card' ? undefined : params.method, // 'pix' | 'boleto'
     *     payer: {
     *       email: params.customer.email,
     *       identification: { type: 'CPF', number: params.customer.taxId },
     *     },
     *     description: `Assinatura VIP ${params.plan.label}`,
     *   },
     * });
     * if (error) throw error;
     *
     * if (data.status === 'approved') return { success: true, paymentId: data.id, status: 'approved' };
     * if (data.payment_method_id === 'pix')
     *   return { success: true, paymentId: data.id, status: 'pending', pixCopyPaste: data.point_of_interaction.transaction_data.qr_code };
     * if (data.payment_method_id === 'bolbradesco' || data.payment_method_id === 'pec')
     *   return { success: true, paymentId: data.id, status: 'pending', redirectUrl: data.transaction_details.external_resource_url };
     */
    console.info('[MercadoPago] Gateway pronto. Implemente a Edge Function e remova este log.');
    return {
      success: false,
      status: 'error',
      errorMessage: 'Integração Mercado Pago pendente. Implemente a Edge Function de pagamento.',
    };
  } catch (err: any) {
    return { success: false, status: 'error', errorMessage: err.message };
  }
}
