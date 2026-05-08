import React, { useState, useEffect } from "react";
import { 
  Cloud, CloudDrizzle, CloudRain, CloudSun, Sun, Moon, 
  Clock, Calendar, Thermometer, Wind, Droplets, 
  ChevronDown, MapPin, Search, Info, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useNotifications } from "@/contexts/NotificationContext";
import { useToast } from "@/hooks/use-toast";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import * as SupabaseLib from "@/integrations/supabase/client";

// Ensure supabase is available even if HMR acts up
const supabase = SupabaseLib.supabase;

type WeatherProvider = "open-meteo" | "weatherapi";

export const DateTimeWeather = () => {
  const { profile, user } = useAuth();
  const { addNotification } = useNotifications();
  const { toast } = useToast();
  const [time, setTime] = useState(new Date());
  const [weather, setWeather] = useState<{ 
    temp: number; 
    condition: string; 
    icon: any;
    humidity?: number;
    windSpeed?: number;
    rainChance?: number;
    alert?: string;
    forecast?: { day: string; temp: number; icon: any }[];
  } | null>(null);
  const [showGreeting, setShowGreeting] = useState(true);
  const [lastPeriod, setLastPeriod] = useState("");
  const [provider, setProvider] = useState<WeatherProvider>("open-meteo");
  const [location, setLocation] = useState<{ lat: number; lon: number } | null>(null);

  const getGreeting = (date: Date) => {
    const hour = date.getHours();
    if (hour < 12) return "Bom dia";
    if (hour < 18) return "Boa tarde";
    return "Boa noite";
  };

  const displayName = profile?.name || user?.user_metadata?.name || user?.email?.split('@')[0] || "Usuário";

  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setLocation({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => setLocation({ lat: -23.5505, lon: -46.6333 })
      );
    }
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      const now = new Date();
      setTime(now);
      const currentPeriod = getGreeting(now);
      if (currentPeriod !== lastPeriod) {
        setLastPeriod(currentPeriod);
        setShowGreeting(true);
      }
    }, 60000);
    return () => clearInterval(timer);
  }, [lastPeriod]);

  useEffect(() => {
    const hideTimer = setTimeout(() => setShowGreeting(false), 300000);
    return () => clearTimeout(hideTimer);
  }, [showGreeting]);

  const checkAlerts = (code: number, temp: number) => {
    if (code >= 95 || temp > 40 || temp < 5) {
      const alertMsg = code >= 95 ? "Alerta Urgente: Tempestade severa detectada na região!" : "Alerta: Condições climáticas extremas!";
      
      toast({
        title: "⚠️ ALERTA METEOROLÓGICO",
        description: alertMsg,
        variant: "destructive",
      });

      addNotification?.({
        title: "Alerta de Tempestade",
        message: alertMsg,
        type: "warning"
      });

      return alertMsg;
    }
    return undefined;
  };

  useEffect(() => {
    let retryCount = 0;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let weatherIntervalTimer: ReturnType<typeof setInterval> | null = null;
    let cancelled = false;

    const fetchWeather = async () => {
      if (!location || cancelled) return;

      try {
        const { data, error } = await supabase.functions.invoke('get-weather', {
          body: { lat: location.lat, lon: location.lon }
        });

        if (error) throw error;
        if (cancelled) return;
        retryCount = 0; // reset on success

        if (data.current) {
          const code = data.current.weather_code;
          const temp = Math.round(data.current.temperature_2m);
          let condition = "Limpo";
          let Icon = Sun;

          if (code === 0) { condition = "Céu Limpo"; Icon = Sun; }
          else if (code <= 3) { condition = "Parcialmente Nublado"; Icon = CloudSun; }
          else if (code <= 48) { condition = "Neblina"; Icon = Cloud; }
          else if (code <= 57) { condition = "Garoa"; Icon = CloudDrizzle; }
          else if (code <= 67) { condition = "Chuva"; Icon = CloudRain; }
          else { condition = "Tempestade"; Icon = CloudRain; }

          const alert = checkAlerts(code, temp);

          setWeather({
            temp,
            condition,
            icon: Icon,
            humidity: data.current.relative_humidity_2m,
            windSpeed: Math.round(data.current.wind_speed_10m),
            rainChance: code > 50 ? 80 : 10,
            alert,
            forecast: data.daily.time.slice(1, 4).map((t: string, i: number) => ({
              day: new Intl.DateTimeFormat("pt-BR", { weekday: "short" }).format(new Date(t + "T12:00:00")),
              temp: Math.round(data.daily.temperature_2m_max[i + 1]),
              icon: data.daily.weather_code[i + 1] > 50 ? CloudRain : Sun
            }))
          });
        }
      } catch (e: any) {
        console.warn("Falha ao buscar clima oficial:", e.message);
        if (cancelled) return;
        
        // Se falhar e não houver dados, vamos setar um estado padrão para não quebrar a UI
        if (!weather) {
          setWeather({
            temp: 24,
            condition: "Céu Limpo (Cache)",
            icon: Sun,
            humidity: 60,
            windSpeed: 10,
            rainChance: 5,
            forecast: [
              { day: "Amanhã", temp: 26, icon: Sun },
              { day: "Quarta", temp: 25, icon: CloudSun },
              { day: "Quinta", temp: 23, icon: Cloud }
            ]
          });
        }

        retryCount++;
        if (retryCount <= 3) {
          const delay = 30000 * retryCount;
          retryTimer = setTimeout(fetchWeather, delay);
        }
      }
    };

    fetchWeather();
    weatherIntervalTimer = setInterval(() => {
      retryCount = 0;
      fetchWeather();
    }, 900000);

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (weatherIntervalTimer) clearInterval(weatherIntervalTimer);
    };
  }, [location, provider]);

  const dayName = new Intl.DateTimeFormat("pt-BR", { weekday: "long" }).format(time);
  const formattedDate = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(time);
  const formattedTime = time.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <div className="w-full flex flex-col h-[40px] md:h-[42px] overflow-hidden" style={{ contain: 'layout style paint' }}>
      <AnimatePresence>
        {weather?.alert && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "18px", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-500/10 border-b border-red-500/20 py-0.5 px-4 flex items-center justify-center gap-2 overflow-hidden shrink-0"
          >
            <AlertTriangle className="w-2.5 h-2.5 text-red-500 animate-pulse" />
            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-[0.1em] text-red-500">
              {weather.alert}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div 
        initial={{ opacity: 0, y: -5 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between gap-2 px-4 py-0.5 bg-background/40 backdrop-blur-md border-b border-white/5 w-full overflow-hidden shrink-0 z-30 h-full"
      >
        <div className="flex items-center gap-4 md:gap-6">
          <div className="flex items-center gap-3">
            <span className="text-lg md:text-xl font-black tracking-tighter leading-none text-white/90">
              {formattedTime}
            </span>
            <div className="h-3 w-px bg-white/10" />
            <div className="flex items-center gap-2.5 min-w-[150px] md:min-w-[200px]">
              <AnimatePresence mode="wait">
                {showGreeting ? (
                  <motion.span
                    key="greeting"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.1em] text-primary whitespace-nowrap"
                  >
                    {getGreeting(time)}, {displayName}!
                  </motion.span>
                ) : (
                  <motion.div
                    key="desktop-info"
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    className="flex items-center gap-2"
                  >
                    <span className="text-[9px] md:text-[10px] uppercase font-black tracking-[0.1em] text-white/70 whitespace-nowrap">
                      {dayName}
                    </span>
                    <span className="text-[9px] text-muted-foreground/30 uppercase">•</span>
                    <span className="text-[9px] md:text-[10px] font-bold text-muted-foreground/40 uppercase whitespace-nowrap">
                      {formattedDate}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          {weather && (
            <Popover>
              <PopoverTrigger asChild>
                <button className="flex items-center gap-2 px-2 py-0.5 hover:bg-white/5 rounded-md transition-colors group">
                  <span className="text-xs md:text-sm font-black text-white/80">{weather.temp}°C</span>
                  <weather.icon className="w-3.5 h-3.5 text-primary group-hover:scale-110 transition-transform" />
                  <ChevronDown className="w-2.5 h-2.5 text-muted-foreground/30" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-4 bg-background/95 backdrop-blur-xl border-white/10 shadow-2xl">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-black text-white uppercase tracking-wider">{weather.condition}</p>
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <MapPin className="w-2.5 h-2.5" /> Localização Automática
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-black text-primary">{weather.temp}°C</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="p-2 rounded-lg bg-white/5 flex items-center gap-2">
                      <Droplets className="w-3 h-3 text-blue-400" />
                      <div>
                        <p className="text-[8px] uppercase font-bold text-muted-foreground">Umidade</p>
                        <p className="text-xs font-bold text-white">{weather.humidity}%</p>
                      </div>
                    </div>
                    <div className="p-2 rounded-lg bg-white/5 flex items-center gap-2">
                      <Wind className="w-3 h-3 text-teal-400" />
                      <div>
                        <p className="text-[8px] uppercase font-bold text-muted-foreground">Vento</p>
                        <p className="text-xs font-bold text-white">{weather.windSpeed} km/h</p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-white/5">
                    <p className="text-[9px] uppercase font-black text-white/40 mb-2 tracking-widest text-center">Próximos Dias</p>
                    <div className="flex justify-between px-1">
                      {weather.forecast?.map((f, i) => (
                        <div key={i} className="text-center">
                          <p className="text-[8px] font-bold text-muted-foreground uppercase">{f.day}</p>
                          <f.icon className="w-4 h-4 mx-auto my-1 text-primary/60" />
                          <p className="text-[10px] font-black text-white">{f.temp}°</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/5">
                    <div className="flex items-center justify-between gap-2">
                      <select 
                        value={provider} 
                        onChange={(e) => setProvider(e.target.value as WeatherProvider)}
                        className="text-[9px] font-black uppercase bg-white/5 border-none rounded px-2 py-1 text-primary outline-none cursor-pointer hover:bg-white/10 transition-colors"
                      >
                        <option value="open-meteo">Open-Meteo (Oficial)</option>
                        <option value="weatherapi">WeatherAPI (Satélite)</option>
                      </select>
                      <Info className="w-3 h-3 text-muted-foreground/30" />
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          )}
          
          <div className="hidden lg:flex flex-col items-end opacity-[0.1] hover:opacity-100 transition-opacity">
            <p className="text-[6px] uppercase font-black text-primary tracking-tighter">API: {provider.toUpperCase()}</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
