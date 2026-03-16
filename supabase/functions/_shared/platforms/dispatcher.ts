export interface PublishPayload {
  platform: string;
  contentType: 'text' | 'image' | 'video' | 'audio' | 'carousel' | 'story' | 'live';
  content: string;
  mediaUrls?: string[];
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

export async function dispatchPost(payload: PublishPayload): Promise<any> {
  const { platform } = payload;
  switch (platform.toLowerCase()) {
    case 'telegram': return publishToTelegram(payload);
    case 'whatsapp': return publishToWhatsApp(payload);
    case 'x': case 'twitter': return publishToX(payload);
    case 'facebook': return publishToFacebook(payload);
    case 'instagram': return publishToInstagram(payload);
    case 'threads': return publishToThreads(payload);
    case 'tiktok': return publishToTikTok(payload);
    case 'linkedin': return publishToLinkedIn(payload);
    case 'pinterest': return publishToPinterest(payload);
    case 'snapchat': return publishToSnapchat(payload);
    case 'youtube': return publishToYouTube(payload);
    case 'site': return publishToSite(payload);
    default: throw new Error(`Platform ${platform} is not supported for publishing.`);
  }
}
