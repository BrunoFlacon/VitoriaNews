// Maps Supabase Edge Function names → local Node handlers.
import socialOauthInit from "./social-oauth-init.js";
import socialOauthCallback from "./social-oauth-callback.js";
import refreshSocialToken from "./refresh-social-token.js";
import publishPost from "./publish-post.js";
import getAnalytics from "./get-analytics.js";
import webhookHealth from "./webhook-health.js";
import collectSocialAnalytics from "./collect-social-analytics.js";
import getWeather from "./get-weather.js";
import whatsappAnalytics from "./whatsapp-analytics.js";
import collectYoutubeAnalytics from "./collect-youtube-analytics.js";
import collectGoogleAnalytics from "./collect-google-analytics.js";
import syncTelegramChats from "./sync-telegram-chats.js";
import syncTelegramInfo from "./sync-telegram-info.js";
import syncMessagingChannels from "./sync-messaging-channels.js";

export const registry = {
  "social-oauth-init": socialOauthInit,
  "social-oauth-callback": socialOauthCallback,
  "refresh-social-token": refreshSocialToken,
  "publish-post": publishPost,
  "get-analytics": getAnalytics,
  "webhook-health": webhookHealth,
  "collect-social-analytics": collectSocialAnalytics,
  "get-weather": getWeather,
  "whatsapp-analytics": whatsappAnalytics,
  "collect-youtube-analytics": collectYoutubeAnalytics,
  "collect-google-analytics": collectGoogleAnalytics,
  "sync-telegram-chats": syncTelegramChats,
  "sync-telegram-info": syncTelegramInfo,
  "sync-messaging-channels": syncMessagingChannels,
};

export function getFunction(name) {
  return registry[name] || null;
}
