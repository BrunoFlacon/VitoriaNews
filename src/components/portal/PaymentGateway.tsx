/**
 * @file PaymentGateway.tsx
 * @description Componente de checkout seguro.
 *
 * Este componente gerencia a UI de pagamento para cada método selecionado
 * (PIX, Cartão de Crédito, Boleto). Nenhum dado de pagamento é processado
 * localmente — toda a lógica real deve ser delegada ao gateway via
 * `paymentService.ts` e uma Edge Function no backend.
 *
 * ─── COMO INTEGRAR ──────────────────────────────────────────────────────────
 *
 * STRIPE:
 *   1. `npm install @stripe/stripe-js @stripe/react-stripe-js`
 *   2. Envolva este componente com <Elements stripe={stripePromise}>
 *   3. Substitua o bloco "card" pelo <PaymentElement /> do Stripe
 *   4. Use `useStripe()` + `stripe.confirmPayment()` ao submeter
 *
 * MERCADO PAGO:
 *   1. `npm install @mercadopago/sdk-react`
 *   2. Inicialize com `initMercadoPago(MP_PUBLIC_KEY)`
 *   3. Substitua cada bloco pelo Brick correspondente:
 *      - card  → <CardPayment />
 *      - pix   → <Payment /> com paymentMethods={{ types: { excluded: ['credit_card'] }}}
 *      - boleto→ <Payment /> com paymentMethods={{ types: { excluded: ['credit_card', 'debit_card'] }}}
 * ────────────────────────────────────────────────────────────────────────────
 */

import React, { useEffect, useState } from "react";
import { CreditCard, Smartphone, FileText, AlertCircle, ExternalLink, Loader2 } from "lucide-react";
import { PAYMENT_GATEWAY, PlanConfig, PaymentMethod, loadGatewayConfig } from "@/services/paymentService";
import { cn } from "@/lib/utils";

interface PaymentGatewayProps {
  method: PaymentMethod;
  plan: PlanConfig;
  /** Chamado quando o SDK do gateway gera um token/card token pronto para o backend */
  onTokenReady?: (token: string) => void;
}

/**
 * Banner exibido quando o gateway ainda não está configurado.
 * Orienta o desenvolvedor a configurar o .env ou o painel administrativo.
 */
const GatewayNotConfiguredBanner = () => (
  <div className="flex flex-col items-center gap-3 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center">
    <AlertCircle className="w-8 h-8 text-amber-400" />
    <div>
      <p className="text-amber-400 font-black text-xs uppercase tracking-wider mb-1">
        Gateway de Pagamento Não Configurado
      </p>
      <p className="text-slate-400 text-[10px] leading-relaxed">
        Adicione <code className="bg-white/10 px-1 rounded text-yellow-400">VITE_PAYMENT_GATEWAY</code> ao seu{" "}
        <code className="bg-white/10 px-1 rounded text-yellow-400">.env</code> ou configure no painel de Faturamento.
      </p>
      <p className="text-slate-500 text-[9px] mt-1.5">
        Opções: <strong className="text-slate-400">stripe</strong> ou{" "}
        <strong className="text-slate-400">mercadopago</strong>
      </p>
    </div>
    <a
      href="https://github.com/BrunoFlacon/social-canvas-hub#payment-setup"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-1 text-[9px] text-yellow-400/70 hover:text-yellow-400 transition-colors"
    >
      Ver documentação <ExternalLink className="w-2.5 h-2.5" />
    </a>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  method,
  plan,
  onTokenReady,
}) => {
  const [gateway, setGateway] = useState<'stripe' | 'mercadopago' | 'none'>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadGatewayConfig().then(() => {
      if (active) {
        setGateway(PAYMENT_GATEWAY);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="p-8 bg-white/5 border border-white/10 rounded-2xl flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground">Iniciando checkout seguro...</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "p-4 bg-white/5 border border-white/10 rounded-2xl transition-all duration-300",
        gateway === "none" && "border-amber-500/20"
      )}
    >
      {method === "card" && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 mb-1">
            <CreditCard className="w-3.5 h-3.5 text-yellow-400" />
            Cartão de Crédito
          </div>

          {gateway === "none" ? (
            <GatewayNotConfiguredBanner />
          ) : gateway === "stripe" ? (
            <div className="p-4 bg-white/5 border border-dashed border-yellow-400/30 rounded-xl text-center">
              <p className="text-yellow-400 text-[10px] font-bold">Stripe — PaymentElement</p>
              <p className="text-slate-500 text-[9px] mt-1">
                Instale <code>@stripe/react-stripe-js</code> e substitua este bloco pelo{" "}
                <code>&lt;PaymentElement /&gt;</code>
              </p>
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-dashed border-blue-400/30 rounded-xl text-center">
              <p className="text-blue-400 text-[10px] font-bold">Mercado Pago — CardPayment Brick</p>
              <p className="text-slate-500 text-[9px] mt-1">
                Instale <code>@mercadopago/sdk-react</code> e substitua por{" "}
                <code>&lt;CardPayment /&gt;</code>
              </p>
            </div>
          )}
        </div>
      )}

      {method === "pix" && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 mb-1">
            <Smartphone className="w-3.5 h-3.5 text-green-400" />
            PIX — Pagamento Instantâneo
          </div>

          {gateway === "none" ? (
            <GatewayNotConfiguredBanner />
          ) : (
            <div className="p-4 bg-white/5 border border-dashed border-green-400/30 rounded-xl text-center space-y-2">
              <div className="w-12 h-12 mx-auto bg-green-500/10 rounded-xl flex items-center justify-center">
                <Smartphone className="w-6 h-6 text-green-400" />
              </div>
              <p className="text-green-400 text-[10px] font-bold uppercase">
                {gateway === "stripe" ? "Stripe PIX" : "Mercado Pago PIX"}
              </p>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                O QR Code PIX será gerado automaticamente após você clicar em{" "}
                <strong className="text-white">"Finalizar Assinatura"</strong>.
              </p>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 mt-1">
                <p className="text-green-400 font-black text-sm">R$ {plan.priceBRL}</p>
                <p className="text-slate-500 text-[9px]">Plano {plan.label}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {method === "boleto" && (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 mb-1">
            <FileText className="w-3.5 h-3.5 text-orange-400" />
            Boleto Bancário
          </div>

          {gateway === "none" ? (
            <GatewayNotConfiguredBanner />
          ) : gateway === "stripe" ? (
            <div className="p-4 bg-white/5 border border-dashed border-orange-400/30 rounded-xl text-center space-y-2">
              <FileText className="w-8 h-8 mx-auto text-orange-400" />
              <p className="text-orange-400 text-[10px] font-bold uppercase">Stripe Boleto</p>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                O PDF do boleto será gerado e aberto automaticamente. Vencimento em 3 dias úteis.
              </p>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2.5">
                <p className="text-orange-400 font-black text-sm">R$ {plan.priceBRL}</p>
                <p className="text-slate-500 text-[9px]">Plano {plan.label} · Compensação em até 24h</p>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-white/5 border border-dashed border-orange-400/30 rounded-xl text-center space-y-2">
              <FileText className="w-8 h-8 mx-auto text-orange-400" />
              <p className="text-orange-400 text-[10px] font-bold uppercase">Mercado Pago Boleto</p>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                Substitua este bloco pelo Brick de Boleto do Mercado Pago.
              </p>
              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2.5">
                <p className="text-orange-400 font-black text-sm">R$ {plan.priceBRL}</p>
                <p className="text-slate-500 text-[9px]">Plano {plan.label} · Compensação em até 24h</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
