import React from "react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip } from "recharts";
import { Users, Smartphone, MapPin, Globe, UserCheck, Calendar } from "lucide-react";
import { Card } from "@/components/ui/card";
import type { AudienceDemographicEntry } from "@/hooks/useSocialStats";

interface AudienceDemographicsProps {
  demographics: AudienceDemographicEntry | null;
}

const SectionHeading = ({ icon: Icon, title }: { icon: any; title: string }) => (
  <div className="flex items-center gap-2 mb-4">
    <div className="p-1.5 rounded-lg bg-primary/10">
      <Icon className="w-3.5 h-3.5 text-primary" />
    </div>
    <h3 className="font-bold text-xs text-white uppercase">{title}</h3>
  </div>
);

const MiniBar = ({ value, max, label, pct }: { value: number; max: number; label: string; pct?: number }) => {
  const barWidth = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="flex items-center gap-3 py-1 px-2 rounded-lg hover:bg-muted/30 transition-colors">
      <span className="w-24 text-[10px] font-medium text-muted-foreground truncate shrink-0">{label}</span>
      <div className="flex-1 h-4 bg-muted/30 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-primary/60 to-primary transition-all duration-500 ease-out"
          style={{ width: `${Math.min(barWidth, 100)}%` }}
        />
      </div>
      <span className="w-14 text-right text-xs font-bold text-white tabular-nums shrink-0">{value.toLocaleString()}</span>
      {pct !== undefined && (
        <span className="w-10 text-right text-[10px] text-muted-foreground/60 shrink-0">{pct}%</span>
      )}
    </div>
  );
};

export const AudienceDemographics = ({ demographics }: AudienceDemographicsProps) => {
  if (!demographics) return null;

  const { ageGroups, gender, devices, topCities, topCountries } = demographics;
  const hasData = ageGroups.length > 0 || gender.length > 0 || devices.length > 0 || topCities.length > 0 || topCountries.length > 0;
  if (!hasData) return null;

  const maxAge = Math.max(...ageGroups.map(a => a.value), 1);
  const maxGender = Math.max(...gender.map(g => g.value), 1);
  const maxDevice = Math.max(...devices.map(d => d.value), 1);
  const maxCity = Math.max(...topCities.map(c => c.value), 1);
  const maxCountry = Math.max(...topCountries.map(c => c.value), 1);

  return (
    <Card className="p-4 md:p-6 shadow-xl border-border bg-card hover:shadow-2xl transition-shadow mb-6">
      <div className="flex items-center gap-3 mb-6">
        <Users className="w-5 h-5 text-primary" />
        <div>
          <h2 className="font-display font-bold text-lg md:text-xl text-white">Dados Demográficos</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Distribuição etária, gênero, dispositivos e localização da audiência</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {ageGroups.length > 0 && (
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <SectionHeading icon={Calendar} title="Faixa Etária" />
            <div className="space-y-0.5">
              {ageGroups.map((g) => (
                <MiniBar key={g.range} label={g.range} value={g.value} max={maxAge} />
              ))}
            </div>
          </div>
        )}

        {gender.length > 0 && (
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <SectionHeading icon={UserCheck} title="Gênero" />
            <div className="h-48 w-full relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={gender.map(g => ({ name: g.label, value: g.value }))}
                    cx="50%" cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    dataKey="value"
                    nameKey="name"
                    isAnimationActive={false}
                    stroke="none"
                  >
                    {gender.map((g, idx) => (
                      <Cell key={`gender-${idx}`} fill={idx === 0 ? "#3b82f6" : "#f02849"} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-white">{gender[0]?.pct ?? 0}%</span>
                <span className="text-[10px] font-medium text-muted-foreground">{gender[0]?.label}</span>
              </div>
            </div>
            <div className="mt-2 space-y-1">
              {gender.map((g, idx) => (
                <div key={g.label} className="flex items-center gap-2 text-xs">
                  <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: idx === 0 ? "#3b82f6" : "#f02849" }} />
                  <span className="flex-1 text-muted-foreground">{g.label}</span>
                  <span className="font-bold text-white">{g.pct}%</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {devices.length > 0 && (
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <SectionHeading icon={Smartphone} title="Dispositivos" />
            <div className="space-y-0.5">
              {devices.map((d) => (
                <MiniBar key={d.label} label={d.label} value={d.value} max={maxDevice} pct={d.pct} />
              ))}
            </div>
          </div>
        )}

        {topCities.length > 0 && (
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <SectionHeading icon={MapPin} title="Principais Cidades (%)" />
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topCities.map(c => ({ name: c.name, value: c.pct ?? c.value }))}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="4 4" stroke="hsl(222, 30%, 18%)" horizontal={false} />
                  <XAxis type="number" stroke="hsl(215, 20%, 55%)" fontSize={10} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <YAxis type="category" dataKey="name" stroke="hsl(215, 20%, 55%)" fontSize={10} axisLine={false} tickLine={false} width={70} />
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "hsl(222, 47%, 11%)", border: "1px solid hsl(222, 30%, 22%)", borderRadius: "12px",
                      boxShadow: "0 10px 40px -10px rgba(0,0,0,0.6)", padding: "6px 12px"
                    }}
                    formatter={(value: any) => [<span key="v" style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{Number(value).toFixed(1)}%</span>, "% Público"]}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={20}>
                    {topCities.map((_, idx) => (
                      <Cell key={`city-${idx}`} fill="#3b82f6" fillOpacity={0.9} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {topCountries.length > 0 && (
          <div className="p-4 rounded-xl bg-card border border-border/50">
            <SectionHeading icon={Globe} title="Principais Países" />
            <div className="space-y-0.5">
              {topCountries.map((c) => (
                <MiniBar key={c.name} label={c.name} value={c.value} max={maxCountry} pct={c.pct} />
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};
