/**
 * @file PaymentGateway.tsx
 * @description Componente de checkout seguro para o EFI Bank (PIX).
 */

import React, { useEffect, useState } from "react";
import { Smartphone, AlertCircle, Loader2 } from "lucide-react";
import { PAYMENT_GATEWAY, PlanConfig, PaymentMethod, loadGatewayConfig } from "@/services/paymentService";
import { cn } from "@/lib/utils";

interface PaymentGatewayProps {
  method: PaymentMethod;
  plan: PlanConfig;
  onTokenReady?: (token: string) => void;
}

const GatewayNotConfiguredBanner = () => (
  <div className="flex flex-col items-center gap-3 p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-center text-white">
    <AlertCircle className="w-8 h-8 text-amber-400 animate-pulse" />
    <div>
      <p className="text-amber-400 font-black text-xs uppercase tracking-wider mb-1">
        Gateway de Pagamento Não Configurado
      </p>
      <p className="text-slate-400 text-[10px] leading-relaxed">
        Adicione <code className="bg-white/10 px-1 rounded text-yellow-400">VITE_PAYMENT_GATEWAY</code> ao seu{" "}
        <code className="bg-white/10 px-1 rounded text-yellow-400">.env</code> ou configure no painel de Faturamento.
      </p>
      <p className="text-slate-500 text-[9px] mt-1.5">
        Opção atual: <strong className="text-slate-400">efipay</strong>
      </p>
    </div>
  </div>
);

export const PaymentGateway: React.FC<PaymentGatewayProps> = ({
  method,
  plan,
  onTokenReady,
}) => {
  const [gateway, setGateway] = useState<'efipay' | 'none'>('none');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    loadGatewayConfig().then(() => {
      if (active) {
        setGateway(PAYMENT_GATEWAY as any);
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
      {method === "pix" ? (
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
                EFI Bank PIX
              </p>
              <p className="text-slate-400 text-[10px] leading-relaxed">
                O QR Code PIX e o copia-e-cola serão gerados em tempo real após você clicar em{" "}
                <strong className="text-white">"Finalizar Assinatura"</strong>.
              </p>
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2.5 mt-1">
                <p className="text-green-400 font-black text-sm">R$ {plan.priceBRL}</p>
                <p className="text-slate-500 text-[9px]">Plano {plan.label}</p>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center p-4 text-xs text-muted-foreground text-white">
          Apenas pagamento via PIX é suportado para assinaturas da Web Rádio Vitória.
        </div>
      )}
    </div>
  );
};
