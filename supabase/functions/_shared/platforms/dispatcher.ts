export type ContentType = 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contact' | 'carousel' | 'story' | 'live' | 'animation' | 'voice' | 'video_note';

export interface PublishPayload {
  platform: string;
  contentType: ContentType;
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
import { publishToKwai } from './kwai.ts';
import { publishToRumble } from './rumble.ts';
import { publishToTruthSocial } from './truthsocial.ts';
import { publishToGettr } from './gettr.ts';
import { publishToGoogleNews } from './googlenews.ts';
import { getMetaCredentials, getPlatformCredentials } from "../credentials.ts";

async function mirrorMediaToCloudinary(supabase: any, userId: string, mediaUrls: string[]): Promise<string[]> {
  try {
    const { data: cloudCreds } = await supabase
      .from("api_credentials")
      .select("credentials")
      .eq("user_id", userId)
      .eq("platform", "cloudinary")
      .maybeSingle();

    if (!cloudCreds?.credentials?.cloud_name || !cloudCreds?.credentials?.api_key) {
      console.log("[Dispatcher] Cloudinary não configurado, pulando espelhamento.");
      return mediaUrls;
    }

    const { cloud_name, api_key, api_secret, upload_preset } = cloudCreds.credentials;
    const newUrls = [];

    for (const url of mediaUrls) {
      if (url.includes("res.cloudinary.com")) {
        newUrls.push(url);
        continue;
      }

      console.log(`[Dispatcher] Espelhando no Cloudinary: ${url}`);
      
      const response = await supabase.functions.invoke('cloudinary-upload', {
        body: { 
          imageUrl: url, 
          cloudName: cloud_name, 
          apiKey: api_key, 
          apiSecret: api_secret,
          uploadPreset: upload_preset || 'social_canvas_hub'
        }
      });

      if (response.data?.cloudinaryUrl) {
        newUrls.push(response.data.cloudinaryUrl);
      } else {
        console.warn(`[Dispatcher] Falha no espelhamento para ${url}:`, response.error);
        newUrls.push(url); // Fallback para URL original
      }
    }
    return newUrls;
  } catch (err) {
    console.error("[Dispatcher] Erro crítico no espelhamento Cloudinary:", err);
    return mediaUrls;
  }
}

export async function dispatchPost(supabase: any, payload: PublishPayload): Promise<any> {
  const { platform, userId, mediaUrls } = payload;
  
  // 🔄 CLOUDINARY MIRROR LOGIC (Nova do Projeto Hive)
  // Aplicar espelhamento se for Instagram ou Facebook (onde o Meta exige hosts específicos)
  let activeMediaUrls = mediaUrls || [];
  if (userId && activeMediaUrls.length > 0 && (platform.toLowerCase() === 'instagram' || platform.toLowerCase() === 'facebook')) {
    activeMediaUrls = await mirrorMediaToCloudinary(supabase, userId, activeMediaUrls);
    payload.mediaUrls = activeMediaUrls;
  }

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
    case 'kwai': return publishToKwai(supabase, payload);
    case 'rumble': return publishToRumble(supabase, payload);
    case 'truthsocial': return publishToTruthSocial(supabase, payload);
    case 'gettr': return publishToGettr(supabase, payload);
    case 'googlenews': return publishToGoogleNews(supabase, payload);
    default: throw new Error(`Platform ${platform} is not supported for publishing.`);
  }
}
