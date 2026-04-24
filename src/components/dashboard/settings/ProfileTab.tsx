import { memo } from "react";
import { User, Mail, Shield, Clock, Camera, Phone, Check, RefreshCw, Calendar, Users, FileText, Save } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProfileTabProps {
  profile: any;
  profileData: any;
  setProfileData: (data: any) => void;
  isOnline: boolean;
  can: (perm: string) => boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleAvatarUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handlePhoneChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isValidatingWhatsApp: boolean;
  isWhatsAppValid: boolean | null;
  calculateAge: (dob: string | undefined) => number | null;
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
  calculateAge
}: ProfileTabProps) => {
  return (
    <div className="flex flex-col gap-8">
      {/* Cabeçalho do Perfil */}
      <div className="flex flex-col md:flex-row gap-6 items-center md:items-start border-b border-border/20 pb-8">
        <div className="relative group">
          <Avatar className="w-24 h-24 rounded-2xl border-4 border-background shadow-xl">
            {profile?.avatar_url && (
              <AvatarImage src={profile.avatar_url} alt={profileData.name} className="object-cover" />
            )}
            <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-2xl font-bold text-primary-foreground">
              {profileData.name?.charAt(0).toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="absolute inset-0 flex items-center justify-center bg-black/40 text-white opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl backdrop-blur-sm"
          >
            <Camera className="w-6 h-6" />
          </button>
          <input type="file" ref={fileInputRef} onChange={handleAvatarUpload} className="hidden" accept="image/*" />
          <div className={cn("absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-4 border-background shadow-sm transition-all duration-300", isOnline ? "bg-green-500 shadow-green-500/50" : "bg-transparent border border-muted-foreground/40")} />
        </div>

        <div className="flex-1 flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <h3 className="font-display font-bold text-2xl tracking-tight">{profileData.first_name || profileData.name || "Usuário"} {profileData.last_name}</h3>
            <p className="text-muted-foreground flex items-center gap-2">
              <Mail className="w-3.5 h-3.5" /> {profileData.email}
            </p>
          </div>

          <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/50">
              <Shield className="w-3.5 h-3.5 text-primary" />
              <span className="font-medium">
                {can('system.access') ? 'Administrador Master' : 'Desenvolvedor'}
              </span>
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted/50 border border-border/50">
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Membro desde {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Formulário de Campos */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3 h-3" /> Nome
            </label>
            <Input
              value={profileData.first_name || ""}
              onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
              placeholder="Nome"
              className="bg-muted/30 h-8 text-sm w-full border-border/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3 h-3" /> Sobrenome
            </label>
            <Input
              value={profileData.last_name || ""}
              onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
              placeholder="Sobrenome"
              className="bg-muted/30 h-8 text-sm w-full border-border/40"
            />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
              <Mail className="w-3 h-3" /> Email
            </label>
            <Input
              value={profileData.email || ""}
              readOnly
              className="bg-muted/20 opacity-70 cursor-not-allowed h-8 text-sm border-border/40"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-start">
          <div className="space-y-1 relative">
            <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
              <Phone className="w-3 h-3" /> Celular / WhatsApp
            </label>
            <div className="relative">
              <Input
                value={profileData.phone || ""}
                onChange={handlePhoneChange}
                placeholder="(00) 00000-0000"
                className={cn("bg-muted/30 h-8 text-sm w-full border-border/40 transition-all", isWhatsAppValid ? "border-green-500/40 pr-9" : "")}
              />
              {isValidatingWhatsApp && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2">
                  <RefreshCw className="w-3 h-3 animate-spin text-muted-foreground" />
                </div>
              )}
              {!isValidatingWhatsApp && isWhatsAppValid === true && (
                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 text-green-500 bg-green-500/10 rounded-full px-2 py-0.5 border border-green-500/20">
                  <span className="text-[9px] font-bold uppercase tracking-tight">WhatsApp</span>
                  <Check className="w-3 h-3" />
                </div>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
              <Calendar className="w-3 h-3" /> Data Nasc.
            </label>
            <div className="relative">
              <Input
                type="date"
                value={profileData.birthdate || ""}
                onChange={(e) => setProfileData({ ...profileData, birthdate: e.target.value })}
                className="bg-muted/30 h-8 text-sm w-full border-border/40 pr-16"
              />
              {profileData.birthdate && calculateAge(profileData.birthdate) !== null && (
                <span className="absolute right-[28px] top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground/90 bg-muted/40 px-1 py-0.5 rounded border border-border/10 whitespace-nowrap pointer-events-none">
                  {calculateAge(profileData.birthdate)} anos
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3 h-3" /> Sexo
            </label>
            <select
              value={profileData.gender || ""}
              onChange={(e) => setProfileData({ ...profileData, gender: e.target.value })}
              className="bg-muted/30 h-8 text-xs w-full border border-border/40 rounded-md px-2 focus:ring-1 focus:ring-primary outline-none"
            >
              <option value="">Não informado</option>
              <option value="male">Masculino</option>
              <option value="female">Feminino</option>
              <option value="other">Outro</option>
              <option value="prefer_not_to_say">Prefiro não dizer</option>
            </select>
          </div>
        </div>

        <div className="space-y-1 mt-1">
          <div className="flex justify-between items-center pr-1">
            <label className="text-[10px] font-bold text-primary/80 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3 h-3" /> Biografia / Sobre você
            </label>
            <span className={cn("text-[9px] font-bold", (profileData.bio?.length || 0) > 450 ? "text-red-500" : "text-muted-foreground")}>
              {profileData.bio?.length || 0}/500
            </span>
          </div>
          <textarea
            value={profileData.bio || ""}
            onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
            placeholder="Conte um pouco sobre você ou sua marca..."
            className="bg-muted/30 w-full min-h-[80px] text-xs border border-border/40 rounded-md p-2 focus:ring-1 focus:ring-primary outline-none resize-none"
            maxLength={500}
          />
        </div>
      </div>
    </div>
  );
});

ProfileTab.displayName = "ProfileTab";
