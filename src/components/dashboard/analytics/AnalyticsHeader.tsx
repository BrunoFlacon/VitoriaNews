import React from "react";
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  Calendar, 
  RefreshCw, 
  Settings, 
  Check, 
  FileDown,
  Loader2,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { socialPlatforms } from "@/components/icons/platform-metadata";

interface AnalyticsHeaderProps {
  period: string;
  setPeriod: (period: string) => void;
  platform: string;
  setPlatform: (platform: string) => void;
  source: string;
  setSource: (source: string) => void;
  syncAnalytics: () => void;
  isSyncingAll: boolean;
  activeView: 'analytics' | 'trends';
  setActiveView: (view: 'analytics' | 'trends') => void;
  handleExportPDF: () => void;
  isExporting: boolean;
  lastSyncedAt?: string;
  dataSource?: string;
  PERIOD_OPTIONS: { value: string; label: string }[];
}

export const AnalyticsHeader = ({
  period,
  setPeriod,
  platform,
  setPlatform,
  source,
  setSource,
  syncAnalytics,
  isSyncingAll,
  activeView,
  setActiveView,
  handleExportPDF,
  isExporting,
  lastSyncedAt,
  dataSource,
  PERIOD_OPTIONS
}: AnalyticsHeaderProps) => {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <h1 className="text-xl md:text-3xl font-display font-bold tracking-tight mb-1 md:mb-2 flex items-center gap-2 md:gap-3">
            <BarChart3 className="w-6 h-6 md:w-8 md:h-8 text-primary" />
            Analytics Avançados
            {dataSource === 'seeded' && (
              <span className="text-xs px-2 py-1 bg-yellow-500/10 text-yellow-500 rounded-full font-medium ml-2">
                Dados Históricos Pendentes
              </span>
            )}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground font-medium">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary/70" />
              <span>Sincronizado: </span>
              <span className="text-foreground">
                {lastSyncedAt 
                  ? new Date(lastSyncedAt).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    })
                  : "Não sincronizado"
                }
              </span>
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs opacity-70 font-display font-black uppercase tracking-widest">Live Engine Active</span>
          </div>
          
          <div className="flex items-center gap-1 mt-6 p-1 bg-white/5 backdrop-blur-xl rounded-xl inline-flex border border-white/10">
            <button 
              onClick={() => setActiveView('analytics')} 
              className={cn(
                "px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all", 
                activeView === 'analytics' ? "bg-white/10 shadow-lg text-foreground border border-white/10" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Visão Geral
            </button>
            <button 
              onClick={() => setActiveView('trends')}
              className={cn(
                "px-4 py-2 text-[11px] font-black uppercase tracking-widest rounded-lg transition-all flex items-center gap-2", 
                activeView === 'trends' ? "bg-white/10 shadow-lg text-primary border border-white/10" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Trends & Viral
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {/* SOURCE TOGGLE */}
        <div className="flex items-center gap-1 bg-white/5 backdrop-blur-md p-1 rounded-xl border border-white/10">
          <button 
            onClick={() => setSource('dashboard')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
              source === 'dashboard' ? "bg-white/10 shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Dashboard
          </button>
          <button 
            onClick={() => setSource('api')}
            className={cn(
              "px-3 py-1.5 text-[10px] font-black uppercase tracking-widest rounded-lg transition-all",
              source === 'api' ? "bg-primary text-primary-foreground shadow-lg" : "text-muted-foreground hover:text-foreground"
            )}
          >
            API Live
          </button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-[10px] font-black uppercase tracking-widest">{PERIOD_OPTIONS.find(p => p.value === period)?.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px] p-2 bg-background/95 backdrop-blur-xl border-white/10">
            <DropdownMenuRadioGroup value={period} onValueChange={setPeriod}>
              {PERIOD_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value} className="text-[10px] font-bold uppercase tracking-wider py-2 rounded-lg">
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Group Gear + Sync for mobile */}
        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <button className="flex items-center gap-2 px-2.5 py-2 md:px-4 md:py-2 bg-white/5 border border-white/10 rounded-xl hover:border-primary/50 transition-all font-bold text-[10px] uppercase tracking-widest shadow-lg group shrink-0">
                <Settings className="w-4 h-4 text-primary group-hover:rotate-90 transition-transform duration-500" />
                <span className="hidden md:inline">{platform === 'all' ? 'Todas as Redes' : socialPlatforms.find(p => p.id === platform)?.name}</span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-[240px] md:w-[280px] p-2 bg-background/95 backdrop-blur-2xl border-white/10 shadow-2xl">
              <div className="text-[10px] font-black text-primary px-3 py-2 mb-1 uppercase tracking-[0.2em] border-b border-white/5">
                FILTRAR PLATAFORMA
              </div>
              <div className="grid grid-cols-1 gap-1 max-h-[300px] md:max-h-[400px] overflow-y-auto custom-scrollbar p-1">
                <button
                  onClick={() => setPlatform('all')}
                  className={cn(
                    "flex items-center justify-between w-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all",
                    platform === 'all' ? "bg-primary/10 text-primary" : "hover:bg-white/5"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <Activity className="w-4 h-4" />
                    Visão Geral
                  </div>
                  {platform === 'all' && <Check className="w-3 h-3" />}
                </button>
                {socialPlatforms.map(p => {
                  if (p.id === 'site' || p.id === 'giphy') return null;
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPlatform(p.id)}
                      className={cn(
                        "flex items-center justify-between w-full px-4 py-2.5 text-[11px] font-bold uppercase tracking-wider rounded-lg transition-all text-left",
                        platform === p.id ? "bg-primary/10 text-primary" : "hover:bg-white/5"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <p.icon className={cn("w-4 h-4", p.textColor)} />
                        {p.name}
                      </div>
                      {platform === p.id && <Check className="w-3 h-3" />}
                    </button>
                  );
                })}
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            size="icon" 
            onClick={syncAnalytics}
            disabled={isSyncingAll}
            className="h-9 w-9 rounded-xl border-white/10 bg-white/5 hover:bg-white/10 transition-all shrink-0"
            title="Atualizar Dados"
          >
            <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isSyncingAll && "animate-spin")} />
          </Button>
        </div>

        <Button 
          variant="default" 
          size="sm" 
          onClick={handleExportPDF}
          disabled={isExporting}
          className="h-9 gap-2 rounded-xl bg-primary hover:bg-primary/90 shadow-xl transition-all shrink-0 ml-auto"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <FileDown className="w-4 h-4" />
          )}
          <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Gerar PDF Premium</span>
        </Button>
      </div>
    </div>
  );
};
