import { memo, useMemo } from "react";
import { motion } from "framer-motion";
// Triggering HMR to resolve ChevronDown reference error
import { 
  User, Camera, Shield, Clock, Mail, Phone, RefreshCw, Check, Calendar, UserCircle2, Pencil, Globe, Plus, Save, MessageSquare, ChevronDown
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn, getProxyUrl } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PlatformIconBadge } from "@/components/icons/PlatformIconBadge";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";


interface ProfileTabProps {
  profile: any;
  profileData: any;
  setProfileData: (data: any) => void;
  isOnline: boolean;
  can: (permission: string) => boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isValidatingWhatsApp: boolean;
  isWhatsAppValid: boolean | null;
  calculateAge: (dob: string | undefined) => number | null;
  toggleOnline: () => void;
  socialPlatforms: readonly any[];
  setEditingSocial: (val: any) => void;
  newSocialLink: any;
  setNewSocialLink: (val: any) => void;
  handleAddSocialLink: () => void;
  handleSaveProfile: () => void;
}

export const ProfileTab = memo(({
  profile,
  profileData,
  setProfileData,
  isOnline,
  can,
  fileInputRef,
  handleAvatarUpload,
  handlePhoneChange,
  isValidatingWhatsApp,
  isWhatsAppValid,
  calculateAge,
  toggleOnline,
  socialPlatforms,
  setEditingSocial,
  newSocialLink,
  setNewSocialLink,
  handleAddSocialLink,
  handleSaveProfile
}: ProfileTabProps) => {

  const hasMasterAccess = can('access_master_panel');

  const resolvedAvatarUrl = useMemo(() => {
    const src = profileData.avatar_url;
    if (!src) return "";
    
    const currentProjectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
    
    if (src.startsWith('http') || src.startsWith('blob:') || src.startsWith('data:')) {
       if (src.startsWith('http') && src.includes('.supabase.co/storage/v1/object/public/media/') && !src.includes(`${currentProjectId}.supabase.co`)) {
          const parts = src.split('/public/media/');
          if (parts.length > 1) {
             return supabase.storage.from('media').getPublicUrl(parts[1]).data.publicUrl;
          }
       }
       return src;
    }
    
    return supabase.storage.from('media').getPublicUrl(src).data.publicUrl;
  }, [profileData.avatar_url]);

  return (
    <div className="flex flex-col gap-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card rounded-2xl border border-border p-5 relative overflow-hidden">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row gap-5 items-center md:items-start mb-6">
          <div className="flex-shrink-0 flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="absolute inset-0 bg-gradient-to-br from-primary to-accent rounded-[2rem] blur-xl opacity-20 group-hover:opacity-40 transition-opacity"></div>
              <Avatar className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-4 border-background/50 shadow-2xl relative z-10 transition-transform duration-300 group-hover:scale-[1.02]">
                <AvatarImage src={resolvedAvatarUrl} alt={`${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || "User"} className="object-cover" />
                <AvatarFallback className="text-3xl sm:text-4xl font-black bg-gradient-to-br from-muted to-muted/50 rounded-[2rem]">
                  {(`${profileData.first_name || ""} ${profileData.last_name || ""}`.trim() || "User").charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              
              <div className={cn(
                "absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-[3px] border-background z-20 flex items-center justify-center transition-colors shadow-lg",
                isOnline ? "bg-green-500" : "bg-slate-500"
              )}></div>

              <div className="absolute inset-0 z-30 bg-black/50 rounded-2xl opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center backdrop-blur-sm">
                <div className="flex flex-col items-center gap-1 text-white">
                  <Camera className="w-5 h-5 sm:w-6 sm:h-6" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleAvatarUpload}
              />
            </div>
          </div>
          
          <div className="flex-1 min-w-0 flex flex-col justify-center text-center md:text-left pt-2">
            <div className="flex flex-col gap-1 mb-3">
              <h2 className="text-xl sm:text-2xl font-display font-black tracking-tight text-white line-clamp-1">
                {profileData.first_name} {profileData.last_name}
              </h2>
              
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-muted-foreground">
                <Mail className="w-3.5 h-3.5" />
                <span className="font-medium">{profile?.email || "email@exemplo.com"}</span>
              </div>
            </div>

            <div className="flex flex-wrap justify-center md:justify-start gap-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#4A72FF]/10 border border-[#4A72FF]/20 text-[#4A72FF] w-fit shadow-[0_0_15px_rgba(74,114,255,0.1)]">
                <Shield className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-wider">
                  {(profile?.role === 'dev_master' || profile?.role === 'master' || hasMasterAccess) ? "Desenvolvedor Master" : "Usuário"}
                </span>
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-muted/30 border border-border w-fit text-muted-foreground">
                <Clock className="w-3 h-3" />
                <span className="text-[9px] font-black uppercase tracking-wider">
                  Membro desde {profile?.created_at ? new Date(profile.created_at).toLocaleDateString('pt-BR') : '06/03/2026'}
                </span>
              </div>
            </div>
          </div>

        </div>

        {/* Inputs Section - 3 columns per row */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7CA2FF] flex items-center gap-1.5 ml-1">
                <User className="w-3 h-3" /> Nome
              </label>
              <Input
                value={profileData.first_name || ""}
                onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                className="h-9 rounded-xl bg-[#0a0b14]/50 border-white/5 focus-visible:border-primary/50 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7CA2FF] flex items-center gap-1.5 ml-1">
                <UserCircle2 className="w-3 h-3" /> Sobrenome
              </label>
              <Input
                value={profileData.last_name || ""}
                onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                className="h-9 rounded-xl bg-[#0a0b14]/50 border-white/5 focus-visible:border-primary/50 text-xs font-medium"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7CA2FF] flex items-center gap-1.5 ml-1">
                <Mail className="w-3 h-3" /> Email
              </label>
              <Input
                value={profile?.email || ""}
                disabled
                className="h-9 rounded-xl bg-muted/20 border-white/5 text-muted-foreground text-xs font-medium opacity-60"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7CA2FF] flex items-center gap-1.5 ml-1">
                <Phone className="w-3 h-3" /> Celular / WhatsApp
              </label>
              <div className="relative">
                <Input
                  value={profileData.phone || ""}
                  onChange={handlePhoneChange}
                  placeholder="(00) 00000-0000"
                  className={cn(
                    "h-9 rounded-xl bg-[#0a0b14]/50 text-xs font-medium pr-16",
                    isWhatsAppValid === true ? "border-green-500/30 focus-visible:border-green-500/50" : "border-white/5 focus-visible:border-primary/50"
                  )}
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 scale-75 origin-right">
                  {isValidatingWhatsApp ? (
                    <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                  ) : isWhatsAppValid === true ? (
                    <Badge className="bg-[#25D366] text-black hover:bg-[#25D366] font-black gap-1 px-1.5 h-6 border-none">
                      <span className="text-[8px] uppercase tracking-tighter">WhatsApp</span>
                    </Badge>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7CA2FF] flex items-center gap-1.5 ml-1">
                <Calendar className="w-3 h-3" /> Data Nasc.
              </label>
              <div className="relative flex items-center">
                <Input
                  type="date"
                  value={profileData.birthdate || ""}
                  onChange={(e) => setProfileData({ ...profileData, birthdate: e.target.value })}
                  className="h-9 rounded-xl bg-[#0a0b14]/50 border-white/5 focus-visible:border-primary/50 text-xs font-medium pr-16"
                />
                {profileData.birthdate && (
                  <span className="absolute right-8 text-[8px] font-black text-muted-foreground/60 bg-white/5 px-1.5 py-0.5 rounded uppercase">
                    {calculateAge(profileData.birthdate)} anos
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7CA2FF] flex items-center gap-1.5 ml-1">
                <UserCircle2 className="w-3 h-3" /> Sexo
              </label>
              <div className="relative">
                <select
                  value={profileData.gender || ""}
                  onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
                  className="w-full h-9 px-3 rounded-xl bg-[#0a0b14] border border-white/10 focus:border-[#4A72FF]/50 text-xs font-bold text-white outline-none appearance-none cursor-pointer hover:border-[#4A72FF]/30 transition-colors"
                >
                  <option value="" disabled className="bg-[#0a0b14]">Selecione...</option>
                  <option value="male" className="bg-[#0a0b14]">Masculino</option>
                  <option value="female" className="bg-[#0a0b14]">Feminino</option>
                  <option value="other" className="bg-[#0a0b14]">Outro</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                  <ChevronDown className="w-3.5 h-3.5 text-[#4A72FF]" />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between ml-1">
              <label className="text-[9px] font-black uppercase tracking-[0.15em] text-[#7CA2FF] flex items-center gap-1.5">
                <Pencil className="w-3 h-3" /> Biografia
              </label>
              <span className="text-[8px] text-muted-foreground/50 font-black">
                {(profileData.bio?.length || 0)} / 150 caracteres
              </span>
            </div>
            <textarea
              value={profileData.bio || ""}
              onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
              maxLength={150}
              placeholder="Fale um pouco sobre você..."
              className="w-full min-h-[60px] p-3 rounded-xl bg-[#0a0b14]/50 border border-white/5 focus-visible:border-primary/50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary/50 text-xs font-medium resize-none"
            />
          </div>

          {/* Social Links Icons - Connected only */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-2 flex-wrap min-h-[36px]">
              {socialPlatforms.map((platform) => {
                const link = Array.isArray(profileData.social_links) 
                  ? profileData.social_links.find((l: any) => l.platform === platform.id)
                  : null;
                const hasLink = !!link;
                
                // Only show connected icons
                if (!hasLink) return null;

                return (
                  <button
                    key={platform.id}
                    onClick={() => {
                      const index = profileData.social_links.findIndex((l: any) => l.platform === platform.id);
                      setEditingSocial({ index, name: link.name });
                    }}
                    className="transition-all duration-300 hover:scale-110"
                    title={`${platform.name}: ${link.name}`}
                  >
                    <PlatformIconBadge platform={platform as any} size="sm" muted={false} />
                  </button>
                );
              })}
            </div>

            {/* Consolidated Footer Row: [Add Social] [Status] [Save] */}
            <div className="pt-2 flex items-center justify-between gap-4">
              {/* Left: Add Social Link */}
              <div className="flex gap-2 items-center flex-1 max-w-[360px]">
                <select
                  value={newSocialLink.platform}
                  onChange={(e) => setNewSocialLink({ ...newSocialLink, platform: e.target.value })}
                  className="w-28 h-8 px-2 rounded-lg bg-[#0a0b14] border border-white/5 focus-visible:border-primary text-[10px] font-black uppercase outline-none"
                >
                  <option value="">Plataforma</option>
                  {socialPlatforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground text-[10px] font-black">@</span>
                  <Input
                    value={newSocialLink.name || ""}
                    onChange={(e) => setNewSocialLink({ ...newSocialLink, name: e.target.value })}
                    placeholder="usuário"
                    className="h-8 rounded-lg bg-[#0a0b14] border-white/5 pl-6 text-[10px] font-medium"
                  />
                </div>
                <Button onClick={handleAddSocialLink} size="icon" className="h-8 w-8 shrink-0 bg-primary/20 text-primary hover:bg-primary/30 rounded-lg">
                  <Plus className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Center: Status Toggle (Soft design) */}
              <button 
                onClick={toggleOnline}
                className={cn(
                  "px-4 py-1.5 rounded-full border transition-all duration-500 flex items-center gap-2 relative overflow-hidden group",
                  isOnline 
                    ? "bg-green-500/5 border-green-500/20 text-green-400" 
                    : "bg-white/5 border-white/5 text-white/30"
                )}
              >
                <div className={cn(
                  "w-1.5 h-1.5 rounded-full transition-all duration-500",
                  isOnline ? "bg-green-400 shadow-[0_0_8px_rgba(34,197,94,1)]" : "bg-white/20"
                )} />
                <span className="text-[9px] font-black uppercase tracking-[0.2em]">{isOnline ? 'Online' : 'Offline'}</span>
                
                {/* Subtle highlight effect on hover */}
                <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>

              {/* Right: Save Button */}
              <Button
                onClick={handleSaveProfile}
                className="gap-2 bg-gradient-to-r from-[#5880FB] via-[#6266FA] to-[#9843F5] hover:from-[#4870EB] hover:via-[#5256EA] hover:to-[#8833E5] text-black font-black transition-all h-9 px-6 text-[11px] uppercase tracking-widest rounded-xl shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Salvar Alterações</span>
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
});

ProfileTab.displayName = "ProfileTab";

