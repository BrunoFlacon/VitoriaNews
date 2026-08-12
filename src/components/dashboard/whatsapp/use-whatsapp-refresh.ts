"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Hook unificado de refresh para o módulo WhatsApp.
 * 
 * Dispara um evento customizado que qualquer componente pode ouvir
 * para recarregar seus dados após ações como pin, mute, criar
 * conversa, etc.
 * 
 * Uso:
 *   const { refresh, refreshKey } = useWhatsappRefresh();
 *   // refreshKey muda a cada chamada de refresh()
 *   // useEffect que depende de refreshKey recarregará dados
 */
const REFRESH_EVENT = "whatsapp:refresh";

export function useWhatsappRefresh() {
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setRefreshKey(k => k + 1);
    window.dispatchEvent(new CustomEvent(REFRESH_EVENT));
  }, []);

  return { refresh, refreshKey };
}

/**
 * Hook para ouvir o evento de refresh em qualquer componente.
 * Retorna um refreshKey que muda quando o evento é disparado.
 */
export function useWhatsappRefreshListener() {
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1);
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, []);

  return refreshKey;
}
