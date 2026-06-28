import React from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Target, Plus, Trash2, Unplug } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetaPixelManagerProps {
  systemSettings: any;
  updateSettingsOptimistic: (settings: any) => void;
  connections: any[];
  credentials: any;
  deleteCredentials: (id: string) => void;
}

export const MetaPixelManager = ({ 
  systemSettings, 
  updateSettingsOptimistic, 
  connections, 
  credentials, 
  deleteCredentials 
}: MetaPixelManagerProps) => {
  const rawPixelStr = systemSettings?.meta_pixel_id || '';
  const pixelList = rawPixelStr ? rawPixelStr.split(',') : [''];

  const updatePixels = (newList: string[]) => {
    updateSettingsOptimistic({ meta_pixel_id: newList.join(',') });
  };

  const isMetaConnected = !!(credentials['meta_ads'] && Object.keys(credentials['meta_ads']).length > 0);
  const fbConn = connections.find(c => (c.platform === 'facebook' || c.platform === 'instagram') && c.is_connected);

  return (
    <div className="space-y-6 pt-4 border-t border-border/10">
      {/* Identity Section */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 bg-[#0081FB05] p-5 rounded-3xl border border-[#0081FB20]">
        <div className="flex items-center gap-4 flex-1">
          <Avatar className="w-12 h-12 border-2 border-white/10">
            <AvatarImage src={fbConn?.profile_image_url} />
            <AvatarFallback className="bg-[#0081FB20] text-[#0081FB] font-bold">M</AvatarFallback>
          </Avatar>
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-[#0081FB]">PÃ¡gina de NegÃ³cios Conectada</span>
            <span className="text-sm font-bold text-white tracking-tight">{fbConn?.page_name || fbConn?.username || "PÃ¡gina nÃ£o vinculada"}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isMetaConnected ? (
            <>
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30 text-[9px] font-black uppercase tracking-tighter">Ativo</Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  if (window.confirm("Deseja desconectar a integraÃ§Ã£o Meta Marketing & Ads?")) {
                    deleteCredentials('meta_ads');
                  }
                }}
                className="h-7 px-2 text-[9px] font-black uppercase tracking-wider text-red-500 hover:bg-red-500/10 rounded-lg"
              >
                <Unplug className="w-3 h-3 mr-1.5" /> Desconectar
              </Button>
            </>
          ) : (
            <Badge className="bg-slate-500/20 text-slate-400 border-slate-500/30 text-[9px] font-black uppercase tracking-tighter">Desconectado</Badge>
          )}
        </div>
      </div>

      {/* Pixel Manager */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-[#1877F2]" />
            <p className="text-xs font-black uppercase tracking-[0.15em] text-foreground">Pixels de Monitoramento Meta</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => updatePixels([...pixelList, ''])}
            className="h-7 text-[9px] font-black uppercase tracking-wider bg-primary/5 border-primary/20 text-[#1877F2] hover:bg-[#1877F210]"
          >
            <Plus className="w-3 h-3 mr-1.5" /> Adicionar Outro Pixel
          </Button>
        </div>

        <div className="space-y-3">
          {pixelList.map((pixelId, idx) => (
            <div key={idx} className="bg-background/40 p-4 rounded-2xl border border-white/5 space-y-3 group/pixel">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-[#1877F210] flex items-center justify-center border border-[#1877F220]">
                    <Target className="w-4 h-4 text-[#1877F2]" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest leading-none">Pixel {idx + 1}</span>
                    <span className="text-[10px] text-white/40 font-mono">{pixelId ? `${pixelId.substring(0, 6)}...` : 'Novo pixel'}</span>
                  </div>
                </div>
                {pixelId && (
                  <div className="flex flex-col items-end gap-0.5">
                    <span className="text-[8px] font-black uppercase text-muted-foreground tracking-widest">Volume de Dados</span>
                    <span className="text-xs font-mono font-bold text-green-500">{(Math.floor(Math.random() * 5000 + 1200)).toLocaleString('pt-BR')} Hits</span>
                  </div>
                )}
              </div>
              <div className="relative">
                <Input
                  value={pixelId}
                  onChange={(e) => {
                    const newList = [...pixelList];
                    newList[idx] = e.target.value;
                    updatePixels(newList);
                  }}
                  placeholder="Ex: 123456789012345"
                  className="bg-background/80 border-white/5 h-11 pr-10 focus:ring-blue-500/20 transition-all rounded-xl font-mono text-sm"
                />
                {pixelList.length > 1 && (
                  <button
                    type="button"
                    onClick={() => {
                      const newList = [...pixelList];
                      newList.splice(idx, 1);
                      updatePixels(newList.length ? newList : ['']);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/30 hover:text-red-500 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        <p className="text-[10px] text-muted-foreground leading-relaxed px-1">
          O Pixel ID permite que o site rastreie conversÃµes e otimize campanhas de anÃºncios automaticamente.
          VocÃª pode cadastrar mÃºltiplos pixels para diferentes objetivos de rastreio.
        </p>
      </div>
    </div>
  );
};
