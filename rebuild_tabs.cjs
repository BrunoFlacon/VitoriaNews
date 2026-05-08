const fs = require('fs');

const originalFile = fs.readFileSync('old_SettingsView_utf8.tsx', 'utf8');

// ==== REBUILD PROFILE TAB ====
const profileImports = `import { memo } from "react";
import { motion } from "framer-motion";
import { 
  User, Camera, Shield, Clock, Mail, Phone, RefreshCw, Check, Calendar, UserCircle2, Pencil, Globe, Plus, Save 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PlatformIconBadge } from "@/components/icons/PlatformIconBadge";
`;

const profileInterfaceProps = `
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
`;

const profileStartComp = `
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

  return (
    <div className="flex flex-col gap-8">
`;

let profileStartIdx = originalFile.indexOf('<div className="flex flex-col gap-8">');
let profileContent = originalFile.substring(profileStartIdx + '<div className="flex flex-col gap-8">'.length);

let profileEndIdx = profileContent.indexOf('{/*  Notifications Tab  */}');
if(profileEndIdx !== -1) {
    profileContent = profileContent.substring(0, profileEndIdx);
}
let profileCutoffIdx = profileContent.lastIndexOf('</motion.div>');
if(profileCutoffIdx !== -1) {
    let secondCutoff = profileContent.lastIndexOf('</div>', profileCutoffIdx);
    if(secondCutoff !== -1) {
        let thirdCutoff = profileContent.lastIndexOf('</div>', secondCutoff - 1);
        if(thirdCutoff !== -1) {
           profileContent = profileContent.substring(0, thirdCutoff);
        }
    }
}

// Replace the Save Button colors
profileContent = profileContent.replace(
  'className="relative overflow-hidden group gap-2 bg-gradient-to-r from-primary to-accent hover:opacity-90 text-black font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/10 transition-all h-9 px-6 text-xs uppercase tracking-wider"',
  'className="relative overflow-hidden group gap-2 bg-gradient-to-r from-[#4A72FF] to-[#8C38FF] hover:opacity-90 text-black font-extrabold shadow-[0_4px_12px_rgba(0,0,0,0.5)] border border-white/10 transition-all h-9 px-6 text-xs uppercase tracking-wider"'
);

const profileEndComp = `
    </div>
  );
});

ProfileTab.displayName = "ProfileTab";
`;

fs.writeFileSync('src/components/dashboard/settings/ProfileTab.tsx', profileImports + profileInterfaceProps + profileStartComp + profileContent + profileEndComp);


// ==== REBUILD API TAB ====
const apiImports = `import { memo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Users, RefreshCw, ChevronUp, ChevronDown, X, Globe, 
  Unplug, Link2, Loader2, Key, Eye, EyeOff, Target, Phone, Check, Plus, MessageSquare, Trash2, FileText, Save
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { PlatformIconBadge } from "@/components/icons/PlatformIconBadge";
import { GoogleIcon, FacebookIcon, MetaIcon, NewsapiIcon, MapsIcon, YoutubeIcon, AdsIcon, AnalyticsIcon, PeopleIcon, GoogleNewsIcon } from "@/components/icons/SocialIcons";
import { PLATFORM_CREDENTIAL_FIELDS } from "@/hooks/useApiCredentials";
`;

const apiInterfaceProps = `
interface APITabProps {
  UNIQUE_PLATFORM_CONFIGS: any[];
  activePlatformIds: string[];
  expandedPlatform: string | null;
  setExpandedPlatform: (id: string | null) => void;
  connections: any[];
  socialStats: any[];
  audienceBreakdown: any | null;
  statsLoading: boolean;
  syncSocialStats: (platformId?: string) => void;
  handleRemovePlatform: (e: React.MouseEvent, id: string) => void;
  credentials: Record<string, any>;
  deleteCredentials: (id: string) => void;
  handleSaveCreds: (id: string, creds: any) => void;
  saveCredentials: (id: string, creds: any) => void;
  toast: any;
  refreshStats: () => void;
  getBrandLogo: (id: string, isActive: boolean) => React.ReactNode;
  
  connectingPlatform: string | null;
  handleConnectApi: (platform: string) => void;
  formValues: Record<string, Record<string, string>>;
  updateFormField: (platform: string, key: string, value: string) => void;
  visibleFields: Record<string, boolean>;
  toggleFieldVisibility: (fieldKey: string) => void;
  hasCredentials: (id: string) => boolean;
  maskValue: (value: string) => string;
  systemSettings: any;
  updateSettingsOptimistic: (updates: any) => void;
  localBotActive: boolean | null;
  handleToggleBot: (active: boolean) => void;
  handleDisconnectCustom: (platformId: string, connectionId: string) => void;
  user: any;
  saving?: string | null;
  handleDeleteCreds?: (id: string) => void;
}
`;

const apiStartComp = `
export const APITab = memo(({
  UNIQUE_PLATFORM_CONFIGS,
  activePlatformIds,
  expandedPlatform,
  setExpandedPlatform,
  connections,
  socialStats,
  audienceBreakdown,
  statsLoading,
  syncSocialStats,
  handleRemovePlatform,
  credentials,
  deleteCredentials,
  handleSaveCreds,
  saveCredentials,
  toast,
  refreshStats,
  getBrandLogo,
  connectingPlatform,
  handleConnectApi,
  formValues,
  updateFormField,
  visibleFields,
  toggleFieldVisibility,
  hasCredentials,
  maskValue,
  systemSettings,
  updateSettingsOptimistic,
  localBotActive,
  handleToggleBot,
  handleDisconnectCustom,
  user,
  saving,
  handleDeleteCreds = (id) => { deleteCredentials(id); }
}: APITabProps) => {
  const toggleExpand = (id: string) => {
    setExpandedPlatform(expandedPlatform === id ? null : id);
  };
  
  const [pixelList, updatePixels] = useState<string[]>(['']);

  return (
    <div className="space-y-3">
`;

let apiStartIdx = originalFile.indexOf('<TabsContent value="api">');
let apiContentRaw = originalFile.substring(apiStartIdx);
let apiActualStart = apiContentRaw.indexOf('<div className="space-y-3">');
let apiContent = apiContentRaw.substring(apiActualStart + '<div className="space-y-3">'.length);

let apiEndIdx = apiContent.indexOf('{/*  Add API Modal  */}');
if(apiEndIdx !== -1) {
    apiContent = apiContent.substring(0, apiEndIdx);
}
let apiCutoffIdx = apiContent.lastIndexOf('</motion.div>');
if(apiCutoffIdx !== -1) {
    let secondCutoff = apiContent.lastIndexOf('</div>', apiCutoffIdx);
    if(secondCutoff !== -1) {
        apiContent = apiContent.substring(0, secondCutoff);
    }
}

const apiEndComp = `
    </div>
  );
});

APITab.displayName = "APITab";
`;

fs.writeFileSync('src/components/dashboard/settings/APITab.tsx', apiImports + apiInterfaceProps + apiStartComp + apiContent + apiEndComp);

console.log("Both tabs rebuilt successfully directly from old_SettingsView_utf8.tsx without encoding corruption!");
