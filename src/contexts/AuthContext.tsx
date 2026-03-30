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

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOnline, setIsOnline] = useState(false);
  const [onlineUsersMap, setOnlineUsersMap] = useState<Record<string, any>>({});
  const presenceChannelRef = React.useRef<any>(null);

  const fetchProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    
    if (!error && data) {
      setProfile(data);
      // Mark as online whenever the profile is loaded (user is authenticated)
      await supabase
        .from('profiles')
        .update({ is_online: true, online_status: 'online', updated_at: new Date().toISOString() })
        .eq('user_id', userId);
    }
  };

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          // Defer profile fetch with setTimeout to avoid deadlock
          setTimeout(() => {
            fetchProfile(session.user.id);
          }, 0);
        } else {
          setProfile(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
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
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { success: false, error: 'Email ou senha incorretos.' };
    }

    return { success: true };
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
    // Set offline BEFORE signing out so we still have auth context to write
    if (user) {
      await supabase
        .from('profiles')
        .update({ is_online: false, online_status: 'offline', updated_at: new Date().toISOString() })
        .eq('user_id', user.id);
    }
    await supabase.auth.signOut();
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
