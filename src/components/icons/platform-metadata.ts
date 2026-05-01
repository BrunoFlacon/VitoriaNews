import { Camera, Newspaper } from "lucide-react";
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
  ThreadsIcon,
  KwaiIcon,
  RumbleIcon,
  TruthSocialIcon,
  GettrIcon,
  SpotifyIcon,
  GoogleNewsIcon,
  RedditIcon,
  GoogleIcon,
  MetaIcon,
  GiphyIcon,
  NewsapiIcon
} from "./SocialIcons";

export const socialPlatforms = [
  {
    id: "facebook",
    name: "Facebook",
    icon: FacebookIcon,
    color: "bg-[#1877F2]",
    textColor: "text-[#1877F2]",
    gradient: "from-[#1877F2] to-[#0D65D9]",
    shadow: "shadow-[#1877F2]/40",
    type: "social"
  },
  {
    id: "instagram",
    name: "Instagram",
    icon: InstagramIcon,
    color: "bg-gradient-to-br from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    textColor: "text-[#DD2A7B]",
    gradient: "from-[#F58529] via-[#DD2A7B] to-[#8134AF]",
    shadow: "shadow-[#DD2A7B]/40",
    type: "social"
  },
  {
    id: "twitter",
    name: "X (Twitter)",
    icon: XIcon,
    color: "bg-black",
    textColor: "text-white",
    gradient: "from-[#1a1a1a] to-[#000000]",
    type: "social"
  },
  {
    id: "linkedin",
    name: "LinkedIn",
    icon: LinkedinIcon,
    color: "bg-[#0A66C2]",
    textColor: "text-[#0A66C2]",
    gradient: "from-[#0A66C2] to-[#004182]",
    type: "social"
  },
  {
    id: "youtube",
    name: "YouTube",
    icon: YoutubeIcon,
    color: "bg-[#FF0000]",
    textColor: "text-[#FF0000]",
    gradient: "from-[#FF0000] to-[#CC0000]",
    type: "social"
  },
  {
    id: "tiktok",
    name: "TikTok",
    icon: TikTokIcon,
    color: "bg-[#000000]",
    textColor: "text-[#00F2EA]",
    gradient: "from-[#000000] via-[#010101] to-[#000000]",
    type: "social"
  },
  {
    id: "whatsapp",
    name: "WhatsApp",
    icon: WhatsappIcon,
    color: "bg-[#25D366]",
    textColor: "text-[#25D366]",
    gradient: "from-[#25D366] to-[#128C7E]",
    type: "social"
  },
  {
    id: "telegram",
    name: "Telegram",
    icon: TelegramIcon,
    color: "bg-[#24A1DE]",
    textColor: "text-[#24A1DE]",
    gradient: "from-[#2AABEE] to-[#229ED9]",
    shadow: "shadow-[#24A1DE]/40",
    type: "social"
  },
  {
    id: "pinterest",
    name: "Pinterest",
    icon: PinterestIcon,
    color: "bg-[#E60023]",
    textColor: "text-[#E60023]",
    gradient: "from-[#E60023] to-[#BD001A]",
    type: "social"
  },
  {
    id: "snapchat",
    name: "Snapchat",
    icon: SnapchatIcon,
    color: "bg-[#FFFC00]",
    textColor: "text-[#000000]",
    gradient: "from-[#FFFC00] to-[#FFE600]",
    type: "social"
  },
  {
    id: "threads",
    name: "Threads",
    icon: ThreadsIcon,
    color: "bg-[#000000]",
    textColor: "text-white",
    gradient: "from-[#000000] to-[#1a1a1a]",
    type: "social"
  },
  {
    id: "kwai",
    name: "Kwai",
    icon: KwaiIcon,
    color: "bg-[#FF5000]",
    textColor: "text-[#FF5000]",
    gradient: "from-[#FF5000] to-[#FF8000]",
    type: "social"
  },
  {
    id: "rumble",
    name: "Rumble",
    icon: RumbleIcon,
    color: "bg-[#85C742]",
    textColor: "text-[#85C742]",
    gradient: "from-[#85C742] to-[#6BA336]",
    type: "social"
  },
  {
    id: "truthsocial",
    name: "Truth Social",
    icon: TruthSocialIcon,
    color: "bg-[#00AEEF]",
    textColor: "text-[#00AEEF]",
    gradient: "from-[#00AEEF] to-[#0089C2]",
    type: "social"
  },
  {
    id: "gettr",
    name: "Gettr",
    icon: GettrIcon,
    color: "bg-[#E11A27]",
    textColor: "text-[#E11A27]",
    gradient: "from-[#E11A27] to-[#B0141E]",
    type: "social"
  },
  {
    id: "spotify",
    name: "Spotify",
    icon: SpotifyIcon,
    color: "bg-[#1DB954]",
    textColor: "text-[#1DB954]",
    gradient: "from-[#1DB954] to-[#191414]",
    type: "tool"
  },
  {
    id: "giphy",
    name: "Giphy",
    icon: GiphyIcon,
    color: "bg-[#000000]",
    textColor: "text-white",
    gradient: "from-[#000000] via-[#4d4d4d] to-[#000000]",
    type: "tool"
  },
  {
    id: "google",
    name: "Google Cloud (Maps, YouTube, Ads, News)",
    icon: GoogleIcon,
    color: "bg-white",
    textColor: "text-[#4285F4]",
    gradient: "from-white via-[#f8f9fa] to-white",
    type: "tool"
  },
  {
    id: "reddit",
    name: "Reddit",
    icon: RedditIcon,
    color: "bg-[#FF4500]",
    textColor: "text-[#FF4500]",
    gradient: "from-[#FF4500] to-[#FF5700]",
    type: "social"
  },
  {
    id: "whatsapp_business",
    name: "WhatsApp Business",
    icon: WhatsappIcon,
    color: "bg-[#075E54]",
    textColor: "text-[#075E54]",
    gradient: "from-[#075E54] to-[#128C7E]",
    type: "social"
  },
  {
    id: "google_news",
    name: "Google News",
    icon: GoogleNewsIcon,
    color: "bg-[#4285F4]",
    textColor: "text-[#4285F4]",
    gradient: "from-[#4285F4] to-[#3367D6]",
    type: "tool"
  },
  {
    id: "newsapi",
    name: "News API",
    icon: NewsapiIcon,
    color: "bg-[#1A1A2E]",
    textColor: "text-[#E94560]",
    gradient: "from-[#1A1A2E] to-[#16213E]",
    type: "tool"
  },
  {
    id: "site",
    name: "Website",
    icon: Camera,
    color: "bg-gradient-to-br from-primary to-accent",
    textColor: "text-primary",
    gradient: "from-primary to-accent",
    type: "social"
  },
  {
    id: "meta_ads",
    name: "Meta Marketing & Ads API",
    icon: MetaIcon,
    color: "bg-[#0081FB]",
    textColor: "text-[#0081FB]",
    gradient: "from-[#0081FB] to-[#0165E1]",
    type: "tool"
  },
] as const;

export type SocialPlatformId = typeof socialPlatforms[number]["id"];

export const getSocialPlatform = (id: SocialPlatformId) =>
  socialPlatforms.find(p => p.id === id);

export const platformMetadata = Object.fromEntries(
  socialPlatforms.map(p => [p.id, p])
) as Record<string, typeof socialPlatforms[number]>;
