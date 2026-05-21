import React, { useEffect, useRef, useState } from 'react';
import { useToast } from "@/hooks/use-toast";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Tipagem global para o SDK do Facebook
declare const FB: any;

interface WhatsAppEmbeddedSignupProps {
  appId: string;
  configId: string; // O ID da Configuração de Tech Provider criada na Meta
  onSuccess: () => void;
  isLoading?: boolean;
}

export function WhatsAppEmbeddedSignup({
  appId,
  configId,
  onSuccess,
  isLoading = false,
}: WhatsAppEmbeddedSignupProps) {
  const { toast } = useToast();
  const [isSdkLoaded, setIsSdkLoaded] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const sessionInfoRef = useRef<any>(null);

  useEffect(() => {
    // Inicializa o SDK do Facebook se ainda não estiver carregado
    const initFB = () => {
      FB.init({
        appId: appId,
        autoLogAppEvents: true,
        xfbml: true,
        version: 'v21.0',
      });
      setIsSdkLoaded(true);
    };

    if (typeof FB !== 'undefined') {
      initFB();
    } else {
      (window as any).fbAsyncInit = initFB;
      // Injeta o script nativo do Facebook SDK na página caso não exista
      if (!document.getElementById('facebook-jssdk')) {
        const script = document.createElement('script');
        script.id = 'facebook-jssdk';
        script.src = 'https://connect.facebook.net/pt_BR/sdk.js';
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);
      }
    }

    // Listener para as mensagens que vêm do popup do Facebook (Padrão Tech Provider)
    const handleMessage = async (event: MessageEvent) => {
      // O SDK da Meta envia mensagens via 'facebook.com'
      if (!event.origin.includes('facebook.com') && !event.origin.includes('fb.com')) return;

      try {
        const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
        
        // Verifica se a mensagem é do fluxo de Embedded Signup
        if (data?.type === 'WA_EMBEDDED_SIGNUP') {
          if (!data.data?.current_step) {
            // Fluxo concluído no popup, precisamos guardar os dados da sessão
            // O authResponse com o código foi recebido no callback do FB.login
            const sessionInfo = data;
            console.log("[WA_EMBEDDED_SIGNUP] Recebido payload final do SDK. (Dados sensíveis ocultados para conformidade de segurança)");
            sessionInfoRef.current = sessionInfo;
          } else {
            console.log(`[WA_EMBEDDED_SIGNUP] Progresso do fluxo: passo ${data.data.current_step}`);
          }
        }
      } catch (err) {
        // Ignora outras mensagens não-JSON do iframe
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, [appId, toast]);

  const handleProcessCode = async (code: string) => {
    try {
      setIsProcessing(true);
      toast({
        title: "Ativando WhatsApp Oficial...",
        description: "Registrando número e vinculando webhooks (isso pode levar 10 segundos).",
      });

      // Se o sessionInfo não chegou a tempo, aguardamos meio segundo por segurança
      if (!sessionInfoRef.current) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }

      // Passa o code e detalhes para a nossa nova Edge Function segura
      const { data, error } = await supabase.functions.invoke('whatsapp-tech-provider-auth', {
        body: {
          code,
          waba_id: sessionInfoRef.current?.data?.waba_id,
          phone_number_id: sessionInfoRef.current?.data?.phone_number_id,
          app_id: appId
        }
      });

      if (error) throw error;
      
      toast({
        title: "WhatsApp Business Ativado!",
        description: "Seu número foi registrado e integrado com sucesso na plataforma.",
      });
      
      onSuccess();
    } catch (err: any) {
      console.error("Erro na ativação do WhatsApp Tech Provider:", err);
      toast({
        title: "Falha na conexão do WhatsApp",
        description: err.message || "Erro desconhecido ao tentar registrar na Meta.",
        variant: "destructive"
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const launchWhatsAppSignup = () => {
    if (!configId) {
      toast({
        title: "Configuração incompleta",
        description: "Você precisa informar o 'Configuration ID' de Tech Provider nas configurações antes de conectar.",
        variant: "destructive"
      });
      return;
    }

    if (!isSdkLoaded || typeof FB === 'undefined') {
      toast({
        title: "Carregando SDK...",
        description: "O SDK da Meta ainda está carregando. Tente novamente em alguns segundos.",
        variant: "default"
      });
      return;
    }

    setIsProcessing(true);
    sessionInfoRef.current = null; // reseta o estado

    // Patch temporário para capturar a referência da janela que o FB.login vai abrir
    const originalWindowOpen = window.open;
    window.open = function (...args) {
      const popup = originalWindowOpen.apply(window, args);
      if (popup) popupRef.current = popup;
      window.open = originalWindowOpen;
      return popup;
    };

    // A chamada nativa obrigatória para o Embedded Signup (Padrão Meta)
    FB.login((response: any) => {
      if (response.authResponse && response.authResponse.code) {
        // Sucesso: pegamos o código OAuth. Agora invocamos nosso backend.
        handleProcessCode(response.authResponse.code);
      } else {
        // Usuário cancelou ou erro
        setIsProcessing(false);
        toast({
          title: "Login cancelado",
          description: "O processo de autorização do WhatsApp Business foi abortado.",
          variant: "destructive"
        });
      }
    }, {
      config_id: configId,
      response_type: 'code',
      override_default_response_type: true,
      extras: {
        feature: 'whatsapp_embedded_signup',
        setup: {
          // O PIN padrão da plataforma para ativar os números dos clientes transparentemente
          pin: '123456'
        }
      }
    });
  };

  return (
    <button
      onClick={launchWhatsAppSignup}
      disabled={isLoading || isProcessing}
      className={`inline-flex items-center justify-center gap-2 rounded-md bg-[#25D366] px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-[#1DA851] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#25D366] disabled:opacity-50 disabled:cursor-not-allowed transition-all h-9 whitespace-nowrap`}
    >
      <MessageCircle className="h-4 w-4" />
      {isProcessing ? "Registrando na Meta..." : "Conectar via Login do Facebook"}
    </button>
  );
}
