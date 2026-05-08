const fs = require('fs');

const imports = `import { memo } from "react";
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

const interfaceProps = `
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
  
  // Missing ones added:
  toggleOnline: () => void;
  socialPlatforms: any[];
  setEditingSocial: (val: any) => void;
  newSocialLink: any;
  setNewSocialLink: (val: any) => void;
  handleAddSocialLink: () => void;
  handleSaveProfile: () => void;
}
`;

const startComp = `
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

const jsx1 = fs.readFileSync('profiletab_utf8.tsx', 'utf8');

let combined = jsx1;
let startIdx = combined.indexOf('<div className="flex flex-col gap-8">');
let content = combined.substring(startIdx + '<div className="flex flex-col gap-8">'.length);

let endIdx = content.lastIndexOf('</div>\\n            </div>\\n          </motion.div>');
if(endIdx === -1) endIdx = content.lastIndexOf('</div>\\r\\n            </div>\\r\\n          </motion.div>');

content = content.substring(0, endIdx);

const endComp = `
    </div>
  );
});

ProfileTab.displayName = "ProfileTab";
`;

fs.writeFileSync('src/components/dashboard/settings/ProfileTab.tsx', imports + interfaceProps + startComp + content + endComp);
console.log("ProfileTab rebuilt successfully");
