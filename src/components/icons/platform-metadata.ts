import { Camera } from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  XIcon,
  LinkedinIcon,
  YoutubeIcon,
  TikTokIcon,
  WhatsappIcon,
  TelegramIcon,
  PinterestIcon,
  SnapchatIcon,
  ThreadsIcon
} from "./SocialIcons";

export const socialPlatforms = [
  {
    id: "facebook",
    name: "Facebook",
    icon: FacebookIcon,
    color: "bg-[#1877F2]",
    textColor: "text-[#1877F2]",
    gradient: "from-[#1877F2] to-[#0D65D9]"
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: InstagramIcon,
    color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    textColor: "text-[#DD2A7B]",
    gradient: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]"
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: XIcon,
    color: "bg-black",
    textColor: "text-white",
    gradient: "from-[#1a1a1a] to-[#000000]"
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: LinkedinIcon,
    color: "bg-[#0A66C2]",
    textColor: "text-[#0A66C2]",
    gradient: "from-[#0A66C2] to-[#004182]"
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: YoutubeIcon,
    color: "bg-[#FF0000]",
    textColor: "text-[#FF0000]",
    gradient: "from-[#FF0000] to-[#CC0000]"
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: TikTokIcon,
    color: "bg-[#000000]",
    textColor: "text-[#00F2EA]",
    gradient: "from-[#000000] via-[#010101] to-[#000000]"
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: WhatsappIcon,
    color: "bg-[#25D366]",
    textColor: "text-[#25D366]",
    gradient: "from-[#25D366] to-[#128C7E]"
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: TelegramIcon,
    color: "bg-[#0088CC]",
    textColor: "text-[#0088CC]",
    gradient: "from-[#0088CC] to-[#006699]"
  },
  {
    id: "pinterest",
    name: "Pinterest",
    icon: PinterestIcon,
    color: "bg-[#E60023]",
    textColor: "text-[#E60023]",
    gradient: "from-[#E60023] to-[#BD001A]"
  },
  {
    id: "snapchat",
    name: "Snapchat",
    icon: SnapchatIcon,
    color: "bg-[#FFFC00]",
    textColor: "text-[#000000]",
    gradient: "from-[#FFFC00] to-[#FFE600]"
  },
  {
    id: "threads",
    name: "Threads",
    icon: ThreadsIcon,
    color: "bg-[#000000]",
    textColor: "text-white",
    gradient: "from-[#000000] to-[#1a1a1a]"
  },
  {
    id: "site",
    name: "Website",
    icon: Camera,
    color: "bg-gradient-to-br from-primary to-accent",
    textColor: "text-primary",
    gradient: "from-primary to-accent"
  },
] as const;
// Remove legacy export to avoid Vite HMR "Could not Fast Refresh" errors
// export const SOCIAL_PLATFORMS = socialPlatforms;

export type SocialPlatformId = typeof socialPlatforms[number]["id"];

export const getSocialPlatform = (id: SocialPlatformId) =>
  socialPlatforms.find(p => p.id === id);
