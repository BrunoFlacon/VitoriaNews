import { memo } from "react";
import { Globe } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface GeoEntry {
  name: string;
  value: number;
  pct?: number;
}

interface PlatformAudienceGeoProps {
  topCountries?: GeoEntry[];
  topCities?: GeoEntry[];
  loading?: boolean;
}

const countryFlags: Record<string, string> = {
  brasil: '🇧🇷', portugal: '🇵🇹', eua: '🇺🇸', 'estados unidos': '🇺🇸',
  'united states': '🇺🇸', uk: '🇬🇧', 'reino unido': '🇬🇧', frança: '🇫🇷',
  alemanha: '🇩🇪', espanha: '🇪🇸', itália: '🇮🇹', japão: '🇯🇵',
  china: '🇨🇳', índia: '🇮🇳', argentina: '🇦🇷', méxico: '🇲🇽',
  canadá: '🇨🇦', austrália: '🇦🇺', rússia: '🇷🇺', coreia: '🇰🇷',
};

function getFlag(name: string): string {
  const lower = name.toLowerCase().trim();
  return countryFlags[lower] || countryFlags[lower.split(' ')[0]] || '';
}

function MiniBar({ label, value, pct, maxValue }: { label: string; value: number; pct?: number; maxValue: number }) {
  const width = maxValue > 0 ? (value / maxValue) * 100 : 0;

  return (
    <div className="flex items-center gap-3 group">
      <div className="w-6 text-center shrink-0">{getFlag(label)}</div>
      <div className="flex-1 min-w-0">
        <div className="flex justify-between text-xs mb-1">
          <span className="truncate text-muted-foreground group-hover:text-white transition-colors">{label}</span>
          <span className="font-bold text-white tabular-nums">{value.toLocaleString()}</span>
        </div>
        <div className="h-1.5 w-full bg-muted/30 rounded-full overflow-hidden">
          <div className="h-full rounded-full bg-primary/60 transition-all duration-700" style={{ width: `${width}%` }} />
        </div>
      </div>
      {pct !== undefined && (
        <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{pct.toFixed(1)}%</span>
      )}
    </div>
  );
}

export const PlatformAudienceGeo = memo(({ topCountries, topCities, loading }: PlatformAudienceGeoProps) => {
  const hasData = (topCountries && topCountries.length > 0) || (topCities && topCities.length > 0);

  if (loading) {
    return (
      <Card className="p-6 bg-card border border-border/50 min-h-[200px]">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-32 bg-muted/30 rounded" />
          <div className="h-3 w-full bg-muted/20 rounded" />
          <div className="h-3 w-full bg-muted/20 rounded" />
          <div className="h-3 w-full bg-muted/20 rounded" />
        </div>
      </Card>
    );
  }

  if (!hasData) return null;

  const maxCountry = Math.max(...(topCountries || []).map(c => c.value), 1);
  const maxCity = Math.max(...(topCities || []).map(c => c.value), 1);

  return (
    <Card className="p-6 bg-card border border-border/50">
      <div className="flex items-center gap-3 mb-5">
        <Globe className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-sm uppercase text-muted-foreground">Audiência Geográfica</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {topCountries && topCountries.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-3 tracking-wider">Países</p>
            <div className="space-y-3">
              {topCountries.slice(0, 10).map((c, i) => (
                <MiniBar key={i} label={c.name} value={c.value} pct={c.pct} maxValue={maxCountry} />
              ))}
            </div>
          </div>
        )}

        {topCities && topCities.length > 0 && (
          <div>
            <p className="text-xs font-bold text-muted-foreground uppercase mb-3 tracking-wider">Cidades</p>
            <div className="space-y-3">
              {topCities.slice(0, 10).map((c, i) => (
                <MiniBar key={i} label={c.name} value={c.value} maxValue={maxCity} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
});

PlatformAudienceGeo.displayName = "PlatformAudienceGeo";