import React, { startTransition } from "react";
import { 
  BarChart3, 
  Clock, 
  TrendingUp, 
  Calendar, 
  RefreshCw, 
  Check, 
  FileDown,
  Loader2,
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { DateRangePicker } from "@/components/dashboard/DateRangePicker";

interface AnalyticsHeaderProps {
  period: string;
  setPeriod: (period: string) => void;
  platform: string;
  setPlatform: (platform: string) => void;
  syncAnalytics: () => void;
  isSyncingAll: boolean;
  activeView: 'analytics' | 'trends' | 'platform-detail';
  setActiveView: (view: 'analytics' | 'trends' | 'platform-detail') => void;
  handleExportPDF: () => void;
  isExporting: boolean;
  lastSyncedAt?: string;
  dataSource?: string;
  PERIOD_OPTIONS: { value: string; label: string }[];
  dateRange: { start: Date | null; end: Date | null };
  setDateRange: (range: { start: Date | null; end: Date | null }) => void;
  refetch: () => void;
}

export const AnalyticsHeader = ({
  period,
  setPeriod,
  platform,
  setPlatform,
  syncAnalytics,
  isSyncingAll,
  activeView,
  setActiveView,
  handleExportPDF,
  isExporting,
  lastSyncedAt,
  dataSource,
  PERIOD_OPTIONS,
  dateRange,
  setDateRange,
  refetch
}: AnalyticsHeaderProps) => {
  const activePlatform = socialPlatforms.find(p => p.id === platform);

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
          
          <div className="flex items-center gap-1 mt-6 p-1 bg-muted/30 rounded-xl inline-flex border border-border">
            <button 
              onClick={() => setActiveView('analytics')} 
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all", 
                activeView === 'analytics' ? "bg-card shadow-lg text-white border border-border" : "text-muted-foreground hover:text-white"
              )}
            >
              Visão Geral
            </button>
            <button 
              onClick={() => setActiveView('trends')}
              className={cn(
                "px-4 py-2 text-xs font-bold uppercase rounded-lg transition-all flex items-center gap-2", 
                activeView === 'trends' ? "bg-card shadow-lg text-primary border border-border" : "text-muted-foreground hover:text-white"
              )}
            >
              <TrendingUp className="w-3.5 h-3.5" /> Trends & Viral
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-border bg-muted/30 hover:bg-muted/50 transition-all">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase">{PERIOD_OPTIONS.find(p => p.value === period)?.label}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[200px] p-2">
            <DropdownMenuRadioGroup value={period} onValueChange={(v) => startTransition(() => setPeriod(v))}>
              {PERIOD_OPTIONS.map((option) => (
                <DropdownMenuRadioItem key={option.value} value={option.value} className="text-xs font-bold uppercase py-2 rounded-lg">
                  {option.label}
                </DropdownMenuRadioItem>
              ))}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <DateRangePicker
          start={dateRange.start ? dateRange.start.toISOString().split('T')[0] : null}
          end={dateRange.end ? dateRange.end.toISOString().split('T')[0] : null}
          onChange={(range) => {
            setDateRange({
              start: range.start ? new Date(range.start) : null,
              end: range.end ? new Date(range.end) : null
            });
          }}
          onApply={refetch}
        />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-2 rounded-xl border-border bg-muted/30 hover:bg-muted/50 transition-all">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold uppercase">
                {platform === 'all' ? 'Todas as Redes' : activePlatform?.name}
              </span>
              {platform !== 'all' && activePlatform && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: activePlatform.textColor?.includes('text-') ? undefined : activePlatform.textColor }} />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-[240px] p-2">
            <DropdownMenuRadioGroup value={platform} onValueChange={(v) => startTransition(() => setPlatform(v))}>
              <DropdownMenuRadioItem value="all" className="text-xs font-bold uppercase py-2 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4" />
                  Todas as Redes
                </div>
              </DropdownMenuRadioItem>
              {socialPlatforms.map(p => {
                if (p.id === 'site' || p.id === 'giphy') return null;
                return (
                  <DropdownMenuRadioItem key={p.id} value={p.id} className="text-xs font-bold uppercase py-2 rounded-lg">
                    <div className="flex items-center gap-3">
                      <p.icon className={cn("w-4 h-4", p.textColor)} />
                      {p.name}
                    </div>
                  </DropdownMenuRadioItem>
                );
              })}
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button 
          variant="outline" 
          size="icon" 
          onClick={syncAnalytics}
          disabled={isSyncingAll}
          className="h-9 w-9 rounded-xl border-border bg-muted/30 hover:bg-muted/50 transition-all shrink-0"
          title="Atualizar Dados"
        >
          <RefreshCw className={cn("w-3.5 h-3.5 text-primary", isSyncingAll && "animate-spin")} />
        </Button>

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
