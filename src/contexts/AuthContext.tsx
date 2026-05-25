import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';

export interface Profile {
  id: string;
  user_id: string;
  role?: string;
  status?: string;
  name: string;
  email: string;
  phone?: string;
  birthdate?: string;
  gender?: string;
  social_links?: Array<{platform: string, name: string}>;
  first_name?: string;
  last_name?: string;
  website?: string;
  is_online?: boolean;
  online_status?: string;
  two_factor_enabled?: boolean;
  avatar_url?: string;
  bio?: string;
  email_posts_published?: boolean;
  email_engagement_alerts?: boolean;
  email_weekly_report?: boolean;
  push_posts_published?: boolean;
  push_realtime_engagement?: boolean;
  push_scheduling_reminders?: boolean;
  created_at: string;
  updated_at: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  isOnline: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, name: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<boolean>;
  toggleOnline: () => Promise<void>;
  sendOtp: (phone: string) => Promise<{ success: boolean; error?: string }>;
  verifyOtp: (phone: string, token: string) => Promise<{ success: boolean; error?: string }>;
  onlineUsersMap: Record<string, any>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const AUTH_CACHE_KEY = 'auth_cached_profile';

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  // ── Optimistic Cache: load profile from sessionStorage synchronously with TTL ──
  const [profile, setProfile] = useState<Profile | null>(() => {
    try {
      const cached = sessionStorage.getItem(AUTH_CACHE_KEY);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      const isExpired = Date.now() - timestamp > 30 * 60 * 1000; // 30 minutes TTL
      if (isExpired) {
        sessionStorage.removeItem(AUTH_CACHE_KEY);
        return null;
      }
      return data as Profile;
    } catch {
      return null;
    }
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUsersMap, setOnlineUsersMap] = useState<Record<string, any>>({});
  const presenceChannelRef = React.useRef<any>(null);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (!error && data) {
        setProfile(data);
        // ── Persist to sessionStorage cache with TTL for instant next load ──
        try { 
          sessionStorage.setItem(
            AUTH_CACHE_KEY, 
            JSON.stringify({ data, timestamp: Date.now() })
          ); 
        } catch {}
        Promise.resolve(
          supabase
            .from('profiles')
            .update({ is_online: true, online_status: 'online', updated_at: new Date().toISOString() })
            .eq('user_id', userId)
        ).catch(() => {});
      }
    } catch (e) {
      // Fail silently, don't log errors for transient network issues
    }
  };

  // ── Session Expiry & Auto-Refresh Monitor ──
  useEffect(() => {
    if (!session) return;

    const checkSessionExpiry = async () => {
      const now = Math.floor(Date.now() / 1000);
      // Se faltar menos de 30 segundos para expirar ou já tiver expirado
      if (session.expires_at && session.expires_at - now < 30) {
        console.warn("[AuthContext] JWT está prestes a expirar. Tentando renovação automática...");
        try {
          const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
          if (error || !refreshedSession) {
            console.error("[AuthContext] Falha ao renovar sessão (JWT expirado). Deslogando...");
            await logout();
            const publicPaths = ['/', '/login', '/register'];
            if (!publicPaths.includes(window.location.pathname)) {
              window.location.href = '/login';
            }
          } else {
            console.log("[AuthContext] Sessão renovada com sucesso!");
            setSession(refreshedSession);
            setUser(refreshedSession.user);
          }
        } catch (e) {
          console.error("[AuthContext] Erro ao tentar renovar sessão:", e);
        }
      }
    };

    // Executa a checagem imediatamente e depois a cada 15 segundos
    checkSessionExpiry();
    const interval = setInterval(checkSessionExpiry, 15000);

    return () => clearInterval(interval);
  }, [session]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          fetchProfile(session.user.id);
        } else {
          setProfile(null);
        }
      }
    );

    // Initial check - FAST PATH com validação robusta de JWT expirado
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
      const now = Math.floor(Date.now() / 1000);
      if (initialSession && initialSession.expires_at && initialSession.expires_at < now) {
        console.warn("[AuthContext] Sessão inicial detectada como expirada. Tentando renovação...");
        try {
          const { data: { session: refreshedSession }, error } = await supabase.auth.refreshSession();
          if (!error && refreshedSession) {
            setSession(refreshedSession);
            setUser(refreshedSession.user);
            fetchProfile(refreshedSession.user.id);
          } else {
            console.error("[AuthContext] Falha na renovação da sessão expirada. Efetuando logout limpo...");
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setProfile(null);
          }
        } catch (e) {
          setSession(null);
          setUser(null);
        }
      } else {
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        if (initialSession?.user) {
          fetchProfile(initialSession.user.id);
        }
      }
      setIsLoading(false);
    }).catch(() => {
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // ── Realtime Presence: marca usuário como online quando logado ──
  useEffect(() => {
    if (!user) {
      // Sair do canal de presença se houver
      if (presenceChannelRef.current) {
        supabase.removeChannel(presenceChannelRef.current);
        presenceChannelRef.current = null;
      }
      return;
    }

    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState();
        const onlineIds: Record<string, any> = {};
        Object.keys(newState).forEach(key => {
          const presenceEntry = newState[key][0] as any;
          if (presenceEntry.user_id) {
            onlineIds[presenceEntry.user_id] = presenceEntry;
          }
        });
        setOnlineUsersMap(onlineIds);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      presenceChannelRef.current = null;
    };
  }, [user]);

  useEffect(() => {
    if (profile) {
      setIsOnline(profile.is_online ?? true);
    } else if (!isLoading && !user) {
      setIsOnline(false);
    } else if (user) {
      // If we have a user but profile is still loading, 
      // we can assume online by default for a better UX
      setIsOnline(true);
    }
  }, [profile, user, isLoading]);

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        // Detecta falha de rede vs credenciais incorretas
        const isNetworkErr = error.message?.toLowerCase().includes('fetch') || error.status === 0;
        return {
          success: false,
          error: isNetworkErr
            ? 'Servidor inacessível. Verifique sua conexão.'
            : 'Email ou senha incorretos.'
        };
      }

      return { success: true };
    } catch (networkErr: any) {
      // TypeError: Failed to fetch — servidor Supabase inacessível (522/CORS)
      return { success: false, error: 'Servidor inacessível. Verifique sua conexão.' };
    }
  };

  const register = async (email: string, password: string, name: string): Promise<{ success: boolean; error?: string }> => {
    const redirectUrl = `${window.location.origin}/dashboard`;
    
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl,
        data: {
          name,
        },
      },
    });

    if (error) {
      // Generic error message to prevent user enumeration
      return { success: false, error: 'Não foi possível criar a conta. Tente novamente.' };
    }

    return { success: true };
  };

  const logout = async () => {
    try {
      if (user) {
        // Tenta marcar como offline, mas se o JWT estiver expirado ou a rede falhar, ignoramos silenciosamente
        await supabase
          .from('profiles')
          .update({ is_online: false, online_status: 'offline', updated_at: new Date().toISOString() })
          .eq('user_id', user.id);
      }
    } catch (e) {
      // Ignora erro no update ao fazer logout com JWT expirado ou rede offline
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      // Ignora erro no signOut
    }
    // ── Limpar cache de perfil ao fazer logout ──
    try { sessionStorage.removeItem(AUTH_CACHE_KEY); } catch {}
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const updateProfile = async (updates: Partial<Profile>): Promise<boolean> => {
    if (!user) return false;

    // Use upsert to guarantee the row is created if it's missing
    const { error } = await supabase
      .from('profiles')
      .upsert({ 
        user_id: user.id,
        email: profile?.email || user.email || '',
        name: profile?.name || user.user_metadata?.name || 'Usuário',
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (error) {
      console.error('Error updating profile:', error);
      return false;
    }

    await fetchProfile(user.id);
    return true;
  };

  const toggleOnline = async () => {
    if (!user || !profile) return;
    const newStatus = !profile.is_online;
    
    // Optimistic update
    setIsOnline(newStatus);
    
    const success = await updateProfile({ 
      is_online: newStatus,
      online_status: newStatus ? 'online' : 'offline'
    });
    
    if (!success) {
      // Rollback on failure
      setIsOnline(!newStatus);
    }
  };

  const sendOtp = async (phone: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.signInWithOtp({
      phone,
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const verifyOtp = async (phone: string, token: string): Promise<{ success: boolean; error?: string }> => {
    const { error } = await supabase.auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });
    if (error) return { success: false, error: error.message };
    return { success: true };
  };

  const value = { 
      user, 
      session, 
      profile, 
      isLoading, 
      isOnline,
      login, 
      register, 
      logout, 
      updateProfile, 
      toggleOnline,
      sendOtp, 
      verifyOtp,
      onlineUsersMap,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
