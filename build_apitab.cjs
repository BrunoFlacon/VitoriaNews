const fs = require('fs');

const imports = `import { memo, useState } from "react";
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

const interfaceProps = `
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

const startComp = `
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

const jsx1 = fs.readFileSync('apitab_full_utf8.tsx', 'utf8');

let combined = jsx1;
let startIdx = combined.indexOf('<div className="space-y-3">');
let content = combined.substring(startIdx + '<div className="space-y-3">'.length);

// Remove the end of the file past the loop
let endIdx = content.indexOf('{/*  Add API Modal  */}');
if(endIdx !== -1) {
    content = content.substring(0, endIdx);
}
// Strip the last few closing divs corresponding to TabsContent/motion.div
let cutoffIdx = content.lastIndexOf('</motion.div>');
if(cutoffIdx !== -1) {
    let secondCutoff = content.lastIndexOf('</div>', cutoffIdx);
    if(secondCutoff !== -1) {
        content = content.substring(0, secondCutoff);
    }
}


const endComp = `
    </div>
  );
});

APITab.displayName = "APITab";
`;

fs.writeFileSync('src/components/dashboard/settings/APITab.tsx', imports + interfaceProps + startComp + content + endComp);
console.log("APITab rebuilt successfully");
