import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, Activity, AlertTriangle, CheckCircle2, Globe } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

export const NetworkHealthIndicator = () => {
  const [status, setStatus] = useState({
    supabase: 'checking',
    internet: 'checking',
    latency: 0
  });
  const [isOpen, setIsOpen] = useState(false);

  const checkHealth = async () => {
    const start = Date.now();
    try {
      // 1. Check Internet
      const online = window.navigator.onLine;
      
      // 2. Check Supabase Connectivity (Health Check)
      // We check auth session as it's more reliable than selecting from profiles (RLS)
      const { data: session } = await supabase.auth.getSession();
      const isSupabaseUp = !!session;
      
      setStatus({
        internet: online ? 'online' : 'offline',
        supabase: isSupabaseUp ? 'online' : 'error',
        latency: Date.now() - start
      });
    } catch (e) {
      setStatus(prev => ({ ...prev, supabase: 'error', internet: window.navigator.onLine ? 'online' : 'offline' }));
    }
  };

  useEffect(() => {
    checkHealth();
    if (!window.navigator.onLine) return;
    const interval = setInterval(checkHealth, 300000); // Check every 5min
    return () => clearInterval(interval);
  }, []);

  const isHealthy = status.supabase === 'online' && status.internet === 'online';

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <button 
          className={cn(
            "flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
            isHealthy 
              ? "bg-green-500/10 text-green-500 border border-green-500/20" 
              : "bg-red-500/10 text-red-500 border border-red-500/20"
          )}
        >
          {isHealthy ? <Activity className="w-3 h-3 animate-pulse" /> : <AlertTriangle className="w-3 h-3" />}
          <span className="hidden md:inline">{isHealthy ? "Conectado" : "Erro de Rede"}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4 bg-background/95 backdrop-blur-xl border-border">
        <h4 className="font-bold text-sm mb-3">Status do Sistema</h4>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <Globe className="w-4 h-4 text-muted-foreground" />
              <span>Internet</span>
            </div>
            <Badge variant={status.internet === 'online' ? "default" : "destructive"} className="text-[9px]">
              {status.internet === 'online' ? "OK" : "Offline"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs">
              <div className="w-4 h-4 rounded bg-primary/20 flex items-center justify-center">
                <span className="text-[8px] font-bold text-primary">S</span>
              </div>
              <span>API Supabase</span>
            </div>
            <Badge variant={status.supabase === 'online' ? "default" : "destructive"} className="text-[9px]">
              {status.supabase === 'online' ? "Online" : "Falha"}
            </Badge>
          </div>

          <div className="pt-2 border-t border-border mt-2">
            <div className="flex items-center justify-between text-[10px] text-muted-foreground">
              <span>Latência (REST)</span>
              <span>{status.latency}ms</span>
            </div>
          </div>

          {!isHealthy && (
            <p className="text-[9px] text-red-400 mt-2 bg-red-400/10 p-2 rounded border border-red-400/20">
              Detectamos falha na resolução de DNS ou bloqueio de firewall. Reinicie o servidor 'npm run dev' ou verifique sua conexão.
            </p>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
