export interface PublishPayload {
  platform: string;
  contentType: 'text' | 'image' | 'video' | 'audio' | 'carousel' | 'story' | 'live';
  content: string;
  mediaUrls?: string[];
  userId?: string;
  options?: Record<string, any>;
}

import { publishToTelegram } from './telegram.ts';
import { publishToWhatsApp } from './whatsapp.ts';
import { publishToX } from './x.ts';
import { publishToFacebook } from './facebook.ts';
import { publishToInstagram } from './instagram.ts';
import { publishToThreads } from './threads.ts';
import { publishToTikTok } from './tiktok.ts';
import { publishToLinkedIn } from './linkedin.ts';
import { publishToPinterest } from './pinterest.ts';
import { publishToSnapchat } from './snapchat.ts';
import { publishToYouTube } from './youtube.ts';
import { publishToSite } from './site.ts';
import { getMetaCredentials } from "../credentials.ts";

export async function dispatchPost(supabase: any, payload: PublishPayload): Promise<any> {
  const { platform } = payload;
  switch (platform.toLowerCase()) {
    case 'telegram': return publishToTelegram(supabase, payload);
    case 'whatsapp': return publishToWhatsApp(supabase, payload);
    case 'x': case 'twitter': return publishToX(supabase, payload);
    case 'facebook': return publishToFacebook(supabase, payload);
    case 'instagram': return publishToInstagram(supabase, payload);
    case 'threads': return publishToThreads(supabase, payload);
    case 'tiktok': return publishToTikTok(supabase, payload);
    case 'linkedin': return publishToLinkedIn(supabase, payload);
    case 'pinterest': return publishToPinterest(supabase, payload);
    case 'snapchat': return publishToSnapchat(supabase, payload);
    case 'youtube': return publishToYouTube(supabase, payload);
    case 'site': return publishToSite(supabase, payload);
    default: throw new Error(`Platform ${platform} is not supported for publishing.`);
  }
}
