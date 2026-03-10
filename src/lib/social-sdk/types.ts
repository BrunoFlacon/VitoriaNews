// Social SDK Universal Interface
// Each platform implements these via Edge Functions

export interface PostContent {
  text: string;
  mediaUrls?: string[];
  mediaType?: 'image' | 'video' | 'carousel' | 'link';
  linkUrl?: string;
  hashtags?: string[];
}

export interface StoryMedia {
  mediaUrl: string;
  caption?: string;
  duration?: number;
}

export interface LiveConfig {
  title: string;
  description?: string;
  platforms: string[];
  scheduledAt?: Date;
}

export interface PostMetrics {
  likes: number;
  comments: number;
  shares: number;
  impressions: number;
  reach: number;
  clicks: number;
  engagementRate: number;
}

export interface AccountMetrics {
  followers: number;
  following: number;
  postsCount: number;
  engagementRate: number;
}

export interface SocialConnector {
  platform: string;
  connectAccount(): Promise<void>;
  refreshToken(): Promise<void>;
  publishPost(content: PostContent): Promise<string>;
  publishStory(media: StoryMedia): Promise<string>;
  startLive(config: LiveConfig): Promise<string>;
  getPostMetrics(postId: string): Promise<PostMetrics>;
  getAccountMetrics(): Promise<AccountMetrics>;
  getFollowersCount(): Promise<number>;
}

export type SupportedPlatform =
  | 'instagram'
  | 'facebook'
  | 'linkedin'
  | 'twitter'
  | 'tiktok'
  | 'youtube'
  | 'threads'
  | 'pinterest'
  | 'whatsapp'
  | 'telegram'
  | 'snapchat'
  | 'site';

export interface JobQueueItem {
  id: string;
  user_id: string;
  job_type: string;
  payload: Record<string, unknown>;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  attempts: number;
  max_attempts: number;
  next_retry_at?: string;
  error_message?: string;
  created_at: string;
  completed_at?: string;
}

export interface Campaign {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  status: 'draft' | 'active' | 'completed' | 'paused';
  created_at: string;
  updated_at: string;
}

export interface Article {
  id: string;
  user_id: string;
  title: string;
  slug: string;
  content: string;
  cover_image?: string;
  status: 'draft' | 'published' | 'archived';
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface LiveSession {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  scheduled_at?: string;
  stream_key?: string;
  status: 'draft' | 'scheduled' | 'live' | 'ended';
  recording_url?: string;
  created_at: string;
  updated_at: string;
}
