export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.1"
  }
  public: {
    Tables: {
      account_metrics: {
        Row: {
          collected_at: string
          engagement_rate: number | null
          followers: number | null
          following: number | null
          id: string
          posts_count: number | null
          social_account_id: string | null
          user_id: string
        }
        Insert: {
          collected_at?: string
          engagement_rate?: number | null
          followers?: number | null
          following?: number | null
          id?: string
          posts_count?: number | null
          social_account_id?: string | null
          user_id: string
        }
        Update: {
          collected_at?: string
          engagement_rate?: number | null
          followers?: number | null
          following?: number | null
          id?: string
          posts_count?: number | null
          social_account_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_metrics_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_generated_content: {
        Row: {
          content_type: string
          created_at: string
          generated_text: string
          id: string
          metadata: Json | null
          prompt: string
          user_id: string
        }
        Insert: {
          content_type?: string
          created_at?: string
          generated_text?: string
          id?: string
          metadata?: Json | null
          prompt: string
          user_id: string
        }
        Update: {
          content_type?: string
          created_at?: string
          generated_text?: string
          id?: string
          metadata?: Json | null
          prompt?: string
          user_id?: string
        }
        Relationships: []
      }
      api_credentials: {
        Row: {
          created_at: string
          credentials: Json
          id: string
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          credentials?: Json
          id?: string
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          credentials?: Json
          id?: string
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      api_keys: {
        Row: {
          api_key: string | null
          created_at: string | null
          id: string
          status: string | null
          user_id: string | null
        }
        Insert: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Update: {
          api_key?: string | null
          created_at?: string | null
          id?: string
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      api_rate_limits: {
        Row: {
          created_at: string
          id: string
          last_request_at: string | null
          platform: string
          requests_per_minute: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          last_request_at?: string | null
          platform: string
          requests_per_minute?: number
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          last_request_at?: string | null
          platform?: string
          requests_per_minute?: number
          user_id?: string
        }
        Relationships: []
      }
      articles: {
        Row: {
          content: string
          cover_image: string | null
          created_at: string
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          content?: string
          cover_image?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          content?: string
          cover_image?: string | null
          created_at?: string
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      audio_articles: {
        Row: {
          article_id: string
          audio_url: string
          created_at: string
          duration: number | null
          id: string
          user_id: string
        }
        Insert: {
          article_id: string
          audio_url: string
          created_at?: string
          duration?: number | null
          id?: string
          user_id: string
        }
        Update: {
          article_id?: string
          audio_url?: string
          created_at?: string
          duration?: number | null
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audio_articles_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "articles"
            referencedColumns: ["id"]
          },
        ]
      }
      auto_reply_rules: {
        Row: {
          active: boolean | null
          created_at: string | null
          id: string
          keyword: string | null
          platform: string | null
          reply: string | null
          user_id: string | null
        }
        Insert: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          keyword?: string | null
          platform?: string | null
          reply?: string | null
          user_id?: string | null
        }
        Update: {
          active?: boolean | null
          created_at?: string | null
          id?: string
          keyword?: string | null
          platform?: string | null
          reply?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      campaign_posts: {
        Row: {
          campaign_id: string
          created_at: string
          id: string
          platform: string | null
          post_id: string
          scheduled_at: string | null
        }
        Insert: {
          campaign_id: string
          created_at?: string
          id?: string
          platform?: string | null
          post_id: string
          scheduled_at?: string | null
        }
        Update: {
          campaign_id?: string
          created_at?: string
          id?: string
          platform?: string | null
          post_id?: string
          scheduled_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "campaign_posts_campaign_id_fkey"
            columns: ["campaign_id"]
            isOneToOne: false
            referencedRelation: "campaigns"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "campaign_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      campaigns: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          name: string
          start_date: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          name?: string
          start_date?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          id: string
          name: string
          notes: string | null
          phone: string | null
          platform: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          id?: string
          name: string
          notes?: string | null
          phone?: string | null
          platform?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          email?: string | null
          id?: string
          name?: string
          notes?: string | null
          phone?: string | null
          platform?: string | null
          user_id?: string
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          downloads: number | null
          file_size: number | null
          file_type: string
          file_url: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          downloads?: number | null
          file_size?: number | null
          file_type?: string
          file_url: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          downloads?: number | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      job_queue: {
        Row: {
          attempts: number
          completed_at: string | null
          created_at: string
          error_message: string | null
          id: string
          job_type: string
          max_attempts: number
          next_retry_at: string | null
          payload: Json
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type: string
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          completed_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          job_type?: string
          max_attempts?: number
          next_retry_at?: string | null
          payload?: Json
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      live_clips: {
        Row: {
          clip_url: string
          created_at: string
          end_time: number | null
          id: string
          live_id: string | null
          start_time: number | null
          status: string
          title: string | null
          user_id: string
        }
        Insert: {
          clip_url: string
          created_at?: string
          end_time?: number | null
          id?: string
          live_id?: string | null
          start_time?: number | null
          status?: string
          title?: string | null
          user_id: string
        }
        Update: {
          clip_url?: string
          created_at?: string
          end_time?: number | null
          id?: string
          live_id?: string | null
          start_time?: number | null
          status?: string
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_clips_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "stories_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      live_destinations: {
        Row: {
          created_at: string
          id: string
          live_id: string
          platform: string
          status: string
          stream_url: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          live_id: string
          platform: string
          status?: string
          stream_url?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          live_id?: string
          platform?: string
          status?: string
          stream_url?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_destinations_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_highlights: {
        Row: {
          clip_url: string | null
          created_at: string
          end_time: number
          id: string
          live_id: string
          start_time: number
          title: string | null
          user_id: string
        }
        Insert: {
          clip_url?: string | null
          created_at?: string
          end_time?: number
          id?: string
          live_id: string
          start_time?: number
          title?: string | null
          user_id: string
        }
        Update: {
          clip_url?: string | null
          created_at?: string
          end_time?: number
          id?: string
          live_id?: string
          start_time?: number
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_highlights_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string
          description: string | null
          id: string
          recording_url: string | null
          scheduled_at: string | null
          status: string
          stream_key: string | null
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          recording_url?: string | null
          scheduled_at?: string | null
          status?: string
          stream_key?: string | null
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          recording_url?: string | null
          scheduled_at?: string | null
          status?: string
          stream_key?: string | null
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      media: {
        Row: {
          created_at: string
          duration: number | null
          file_size: number | null
          file_type: string
          file_url: string
          height: number | null
          id: string
          name: string
          thumbnail_url: string | null
          user_id: string
          width: number | null
        }
        Insert: {
          created_at?: string
          duration?: number | null
          file_size?: number | null
          file_type: string
          file_url: string
          height?: number | null
          id?: string
          name: string
          thumbnail_url?: string | null
          user_id: string
          width?: number | null
        }
        Update: {
          created_at?: string
          duration?: number | null
          file_size?: number | null
          file_type?: string
          file_url?: string
          height?: number | null
          id?: string
          name?: string
          thumbnail_url?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      media_processing_jobs: {
        Row: {
          completed_at: string | null
          created_at: string
          id: string
          job_type: string
          media_id: string | null
          result: Json | null
          status: string
          user_id: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          id?: string
          job_type: string
          media_id?: string | null
          result?: Json | null
          status?: string
          user_id: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          id?: string
          job_type?: string
          media_id?: string | null
          result?: Json | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_processing_jobs_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      message_events: {
        Row: {
          direction: string
          id: string
          message: string
          sent_at: string
          status: string
          thread_id: string
          user_id: string
        }
        Insert: {
          direction?: string
          id?: string
          message: string
          sent_at?: string
          status?: string
          thread_id: string
          user_id: string
        }
        Update: {
          direction?: string
          id?: string
          message?: string
          sent_at?: string
          status?: string
          thread_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_events_thread_id_fkey"
            columns: ["thread_id"]
            isOneToOne: false
            referencedRelation: "message_threads"
            referencedColumns: ["id"]
          },
        ]
      }
      message_threads: {
        Row: {
          contact_id: string | null
          created_at: string
          id: string
          last_message: string | null
          platform: string
          updated_at: string
          user_id: string
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          platform: string
          updated_at?: string
          user_id: string
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          id?: string
          last_message?: string | null
          platform?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_threads_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          channel_id: string | null
          content: string
          created_at: string
          id: string
          media_url: string | null
          platform: string | null
          recipient_name: string | null
          recipient_phone: string | null
          scheduled_at: string | null
          sent_at: string | null
          status: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          content: string
          created_at?: string
          id?: string
          media_url?: string | null
          platform?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          content?: string
          created_at?: string
          id?: string
          media_url?: string | null
          platform?: string | null
          recipient_name?: string | null
          recipient_phone?: string | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "messaging_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      messaging_channels: {
        Row: {
          channel_id: string | null
          channel_name: string
          channel_type: string
          created_at: string
          id: string
          members_count: number | null
          platform: string
          user_id: string
        }
        Insert: {
          channel_id?: string | null
          channel_name: string
          channel_type?: string
          created_at?: string
          id?: string
          members_count?: number | null
          platform: string
          user_id: string
        }
        Update: {
          channel_id?: string | null
          channel_name?: string
          channel_type?: string
          created_at?: string
          id?: string
          members_count?: number | null
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          platform: string | null
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          platform?: string | null
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          platform?: string | null
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          platform: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at?: string
          id?: string
          platform: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          platform?: string
          redirect_uri?: string
          state?: string
          user_id?: string
        }
        Relationships: []
      }
      platform_api_logs: {
        Row: {
          created_at: string | null
          endpoint: string | null
          id: string
          platform: string | null
          request_payload: Json | null
          response_payload: Json | null
          status_code: number | null
        }
        Insert: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          platform?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
        }
        Update: {
          created_at?: string | null
          endpoint?: string | null
          id?: string
          platform?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status_code?: number | null
        }
        Relationships: []
      }
      platform_hourly_performance: {
        Row: {
          avg_comments: number | null
          avg_impressions: number | null
          avg_likes: number | null
          avg_shares: number | null
          hour: number | null
          id: string
          platform: string | null
          samples: number | null
          updated_at: string | null
        }
        Insert: {
          avg_comments?: number | null
          avg_impressions?: number | null
          avg_likes?: number | null
          avg_shares?: number | null
          hour?: number | null
          id?: string
          platform?: string | null
          samples?: number | null
          updated_at?: string | null
        }
        Update: {
          avg_comments?: number | null
          avg_impressions?: number | null
          avg_likes?: number | null
          avg_shares?: number | null
          hour?: number | null
          id?: string
          platform?: string | null
          samples?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      platform_rate_limits: {
        Row: {
          created_at: string | null
          current_requests: number | null
          id: string
          max_requests: number
          platform: string
          reset_at: string | null
          user_id: string | null
          window_seconds: number
        }
        Insert: {
          created_at?: string | null
          current_requests?: number | null
          id?: string
          max_requests: number
          platform: string
          reset_at?: string | null
          user_id?: string | null
          window_seconds: number
        }
        Update: {
          created_at?: string | null
          current_requests?: number | null
          id?: string
          max_requests?: number
          platform?: string
          reset_at?: string | null
          user_id?: string | null
          window_seconds?: number
        }
        Relationships: []
      }
      platform_tokens: {
        Row: {
          bearer_token: string | null
          created_at: string | null
          id: string
          platform: string | null
        }
        Insert: {
          bearer_token?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
        }
        Update: {
          bearer_token?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
        }
        Relationships: []
      }
      post_analytics: {
        Row: {
          collected_at: string | null
          id: string | null
          likes: number | null
          platform: string | null
          post_id: string | null
          replies: number | null
          retweets: number | null
          views: number | null
        }
        Insert: {
          collected_at?: string | null
          id?: string | null
          likes?: number | null
          platform?: string | null
          post_id?: string | null
          replies?: number | null
          retweets?: number | null
          views?: number | null
        }
        Update: {
          collected_at?: string | null
          id?: string | null
          likes?: number | null
          platform?: string | null
          post_id?: string | null
          replies?: number | null
          retweets?: number | null
          views?: number | null
        }
        Relationships: []
      }
      post_metrics: {
        Row: {
          clicks: number | null
          collected_at: string
          comments: number | null
          engagement_rate: number | null
          id: string
          impressions: number | null
          likes: number | null
          platform: string
          post_id: string
          reach: number | null
          shares: number | null
          user_id: string
        }
        Insert: {
          clicks?: number | null
          collected_at?: string
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          platform: string
          post_id: string
          reach?: number | null
          shares?: number | null
          user_id: string
        }
        Update: {
          clicks?: number | null
          collected_at?: string
          comments?: number | null
          engagement_rate?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          platform?: string
          post_id?: string
          reach?: number | null
          shares?: number | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          bio: string | null
          created_at: string
          email: string
          id: string
          name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email: string
          id?: string
          name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          email?: string
          id?: string
          name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      published_posts: {
        Row: {
          api_response: Json | null
          created_at: string
          id: string
          platform: string
          platform_post_id: string | null
          post_id: string
          post_url: string | null
          published_at: string | null
          tweet_id: string | null
          user_id: string
        }
        Insert: {
          api_response?: Json | null
          created_at?: string
          id?: string
          platform: string
          platform_post_id?: string | null
          post_id: string
          post_url?: string | null
          published_at?: string | null
          tweet_id?: string | null
          user_id: string
        }
        Update: {
          api_response?: Json | null
          created_at?: string
          id?: string
          platform?: string
          platform_post_id?: string | null
          post_id?: string
          post_url?: string | null
          published_at?: string | null
          tweet_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "published_posts_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          bulk_import_id: string | null
          content: string
          created_at: string
          error_message: string | null
          id: string
          media_ids: string[] | null
          media_type: string
          orientation: string | null
          platforms: string[]
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          bulk_import_id?: string | null
          content: string
          created_at?: string
          error_message?: string | null
          id?: string
          media_ids?: string[] | null
          media_type?: string
          orientation?: string | null
          platforms: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          bulk_import_id?: string | null
          content?: string
          created_at?: string
          error_message?: string | null
          id?: string
          media_ids?: string[] | null
          media_type?: string
          orientation?: string | null
          platforms?: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          access_secret: string | null
          access_token: string | null
          api_key: string | null
          api_secret: string | null
          chat_id: string | null
          created_at: string
          engagement_rate: number | null
          followers: number | null
          following: number | null
          id: string
          last_synced_at: string | null
          platform: string
          posts_count: number | null
          profile_picture: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          access_secret?: string | null
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          chat_id?: string | null
          created_at?: string
          engagement_rate?: number | null
          followers?: number | null
          following?: number | null
          id?: string
          last_synced_at?: string | null
          platform: string
          posts_count?: number | null
          profile_picture?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          access_secret?: string | null
          access_token?: string | null
          api_key?: string | null
          api_secret?: string | null
          chat_id?: string | null
          created_at?: string
          engagement_rate?: number | null
          followers?: number | null
          following?: number | null
          id?: string
          last_synced_at?: string | null
          platform?: string
          posts_count?: number | null
          profile_picture?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      social_comments: {
        Row: {
          author: string | null
          comment: string | null
          comment_id: string | null
          created_at: string | null
          id: string
          platform: string | null
          post_id: string | null
          processed: boolean | null
          user_id: string | null
        }
        Insert: {
          author?: string | null
          comment?: string | null
          comment_id?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
          post_id?: string | null
          processed?: boolean | null
          user_id?: string | null
        }
        Update: {
          author?: string | null
          comment?: string | null
          comment_id?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
          post_id?: string | null
          processed?: boolean | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          access_token: string | null
          created_at: string
          expires_at: string | null
          followers_count: number | null
          id: string
          is_connected: boolean
          metadata: Json | null
          page_id: string | null
          page_name: string | null
          platform: string
          platform_user_id: string | null
          profile_image_url: string | null
          profile_picture: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
          username: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          followers_count?: number | null
          id?: string
          is_connected?: boolean
          metadata?: Json | null
          page_id?: string | null
          page_name?: string | null
          platform: string
          platform_user_id?: string | null
          profile_image_url?: string | null
          profile_picture?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
          username?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string
          expires_at?: string | null
          followers_count?: number | null
          id?: string
          is_connected?: boolean
          metadata?: Json | null
          page_id?: string | null
          page_name?: string | null
          platform?: string
          platform_user_id?: string | null
          profile_image_url?: string | null
          profile_picture?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      social_inbox: {
        Row: {
          author: string | null
          created_at: string | null
          handled: boolean | null
          id: string
          message: string | null
          platform: string | null
          source_id: string | null
          type: string | null
          user_id: string | null
        }
        Insert: {
          author?: string | null
          created_at?: string | null
          handled?: boolean | null
          id?: string
          message?: string | null
          platform?: string | null
          source_id?: string | null
          type?: string | null
          user_id?: string | null
        }
        Update: {
          author?: string | null
          created_at?: string | null
          handled?: boolean | null
          id?: string
          message?: string | null
          platform?: string | null
          source_id?: string | null
          type?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_leads: {
        Row: {
          created_at: string | null
          id: string
          message: string | null
          platform: string | null
          source_post: string | null
          status: string | null
          user_id: string | null
          username: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          message?: string | null
          platform?: string | null
          source_post?: string | null
          status?: string | null
          user_id?: string | null
          username?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          message?: string | null
          platform?: string | null
          source_post?: string | null
          status?: string | null
          user_id?: string | null
          username?: string | null
        }
        Relationships: []
      }
      social_platforms: {
        Row: {
          api_base_url: string | null
          auth_type: string | null
          created_at: string | null
          id: string
          name: string
          status: string | null
        }
        Insert: {
          api_base_url?: string | null
          auth_type?: string | null
          created_at?: string | null
          id?: string
          name: string
          status?: string | null
        }
        Update: {
          api_base_url?: string | null
          auth_type?: string | null
          created_at?: string | null
          id?: string
          name?: string
          status?: string | null
        }
        Relationships: []
      }
      social_publish_log: {
        Row: {
          account_id: string | null
          created_at: string | null
          id: string
          platform: string | null
          post_id: string | null
          published_at: string | null
          response: Json | null
          status: string | null
        }
        Insert: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
          post_id?: string | null
          published_at?: string | null
          response?: Json | null
          status?: string | null
        }
        Update: {
          account_id?: string | null
          created_at?: string | null
          id?: string
          platform?: string | null
          post_id?: string | null
          published_at?: string | null
          response?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      social_webhooks: {
        Row: {
          created_at: string | null
          event_type: string | null
          id: string
          payload: Json | null
          platform: string | null
        }
        Insert: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          platform?: string | null
        }
        Update: {
          created_at?: string | null
          event_type?: string | null
          id?: string
          payload?: Json | null
          platform?: string | null
        }
        Relationships: []
      }
      stories_lives: {
        Row: {
          comments: number | null
          completed_at: string | null
          content: string | null
          created_at: string
          id: string
          likes: number | null
          media_url: string | null
          platform: string
          scheduled_at: string | null
          status: string
          thumbnail_url: string | null
          title: string
          type: string
          user_id: string
          viewers: number | null
        }
        Insert: {
          comments?: number | null
          completed_at?: string | null
          content?: string | null
          created_at?: string
          id?: string
          likes?: number | null
          media_url?: string | null
          platform: string
          scheduled_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title: string
          type?: string
          user_id: string
          viewers?: number | null
        }
        Update: {
          comments?: number | null
          completed_at?: string | null
          content?: string | null
          created_at?: string
          id?: string
          likes?: number | null
          media_url?: string | null
          platform?: string
          scheduled_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string
          type?: string
          user_id?: string
          viewers?: number | null
        }
        Relationships: []
      }
      story_metrics: {
        Row: {
          collected_at: string
          exits: number | null
          id: string
          replies: number | null
          story_id: string
          user_id: string
          views: number | null
        }
        Insert: {
          collected_at?: string
          exits?: number | null
          id?: string
          replies?: number | null
          story_id: string
          user_id: string
          views?: number | null
        }
        Update: {
          collected_at?: string
          exits?: number | null
          id?: string
          replies?: number | null
          story_id?: string
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "story_metrics_story_id_fkey"
            columns: ["story_id"]
            isOneToOne: false
            referencedRelation: "stories_lives"
            referencedColumns: ["id"]
          },
        ]
      }
      system_audit: {
        Row: {
          checked_at: string | null
          details: string | null
          id: string
          module: string | null
          status: string | null
        }
        Insert: {
          checked_at?: string | null
          details?: string | null
          id?: string
          module?: string | null
          status?: string | null
        }
        Update: {
          checked_at?: string | null
          details?: string | null
          id?: string
          module?: string | null
          status?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          metadata: Json | null
          service: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          metadata?: Json | null
          service: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          metadata?: Json | null
          service?: string
          user_id?: string | null
        }
        Relationships: []
      }
      transcriptions: {
        Row: {
          created_at: string
          id: string
          language: string | null
          media_id: string | null
          text: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          language?: string | null
          media_id?: string | null
          text?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          language?: string | null
          media_id?: string | null
          text?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transcriptions_media_id_fkey"
            columns: ["media_id"]
            isOneToOne: false
            referencedRelation: "media"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_posts: {
        Row: {
          detected_at: string | null
          engagement_score: number | null
          id: string
          platform: string | null
          post_id: string | null
        }
        Insert: {
          detected_at?: string | null
          engagement_score?: number | null
          id?: string
          platform?: string | null
          post_id?: string | null
        }
        Update: {
          detected_at?: string | null
          engagement_score?: number | null
          id?: string
          platform?: string | null
          post_id?: string | null
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      analytics_dashboard: {
        Row: {
          platform: string | null
          posts: number | null
          total_comments: number | null
          total_impressions: number | null
          total_likes: number | null
          total_shares: number | null
        }
        Relationships: []
      }
      dashboard_metrics: {
        Row: {
          avg_engagement_rate: number | null
          last_update: string | null
          platform: string | null
          post_id: string | null
          total_clicks: number | null
          total_comments: number | null
          total_impressions: number | null
          total_likes: number | null
          total_reach: number | null
          total_shares: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_stats: {
        Row: {
          status: string | null
          total: number | null
        }
        Relationships: []
      }
      rate_limit_status: {
        Row: {
          platform: string | null
          requests: number | null
          reset_at: string | null
        }
        Relationships: []
      }
      social_connections_safe: {
        Row: {
          created_at: string | null
          id: string | null
          is_connected: boolean | null
          page_id: string | null
          page_name: string | null
          platform: string | null
          platform_user_id: string | null
          profile_image_url: string | null
          token_expires_at: string | null
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string | null
          is_connected?: boolean | null
          page_id?: string | null
          page_name?: string | null
          platform?: string | null
          platform_user_id?: string | null
          profile_image_url?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string | null
          is_connected?: boolean | null
          page_id?: string | null
          page_name?: string | null
          platform?: string | null
          platform_user_id?: string | null
          profile_image_url?: string | null
          token_expires_at?: string | null
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      social_leads_dashboard: {
        Row: {
          platform: string | null
          total_leads: number | null
        }
        Relationships: []
      }
      social_posts_dashboard: {
        Row: {
          platform: string | null
          post_url: string | null
          published_at: string | null
          tweet_id: string | null
        }
        Insert: {
          platform?: string | null
          post_url?: string | null
          published_at?: string | null
          tweet_id?: string | null
        }
        Update: {
          platform?: string | null
          post_url?: string | null
          published_at?: string | null
          tweet_id?: string | null
        }
        Relationships: []
      }
      social_publication_status: {
        Row: {
          api_response: Json | null
          platform: string | null
          platform_post_id: string | null
          published_at: string | null
        }
        Insert: {
          api_response?: Json | null
          platform?: string | null
          platform_post_id?: string | null
          published_at?: string | null
        }
        Update: {
          api_response?: Json | null
          platform?: string | null
          platform_post_id?: string | null
          published_at?: string | null
        }
        Relationships: []
      }
      worker_throughput: {
        Row: {
          jobs_processed: number | null
          minute: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      api_get_leads: {
        Args: { p_api_key: string }
        Returns: {
          created_at: string
          message: string
          platform: string
          username: string
        }[]
      }
      api_get_post_metrics: {
        Args: { p_api_key: string }
        Returns: {
          comments: number
          impressions: number
          likes: number
          platform: string
          post_id: string
          shares: number
        }[]
      }
      api_publish_post: {
        Args: { p_api_key: string; p_content: string; p_platforms: Json }
        Returns: string
      }
      api_receive_webhook: {
        Args: { p_event: string; p_payload: Json; p_platform: string }
        Returns: undefined
      }
      api_schedule_post: {
        Args: {
          p_api_key: string
          p_content: string
          p_date: string
          p_platforms: Json
        }
        Returns: string
      }
      auto_boost_trending: { Args: never; Returns: undefined }
      auto_reply_social: {
        Args: { p_message: string; p_platform: string }
        Returns: string
      }
      best_posting_hour: { Args: { p_platform: string }; Returns: number }
      calculate_engagement_score: {
        Args: {
          p_comments: number
          p_impressions: number
          p_likes: number
          p_shares: number
        }
        Returns: number
      }
      capture_social_lead: {
        Args: {
          p_message: string
          p_platform: string
          p_post: string
          p_user_id: string
          p_username: string
        }
        Returns: undefined
      }
      check_rate_limit: {
        Args: { p_platform: string; p_user_id: string }
        Returns: boolean
      }
      collect_post_analytics:
        | { Args: never; Returns: undefined }
        | { Args: { payload: Json }; Returns: undefined }
      collect_post_metrics: { Args: { p_post_id: string }; Returns: undefined }
      collect_social_analytics: { Args: never; Returns: undefined }
      create_api_key: { Args: { p_user: string }; Returns: string }
      detect_lead_keywords: { Args: { p_message: string }; Returns: boolean }
      detect_trending_posts: { Args: never; Returns: undefined }
      enqueue_publish_job: {
        Args: { content_text: string; post_uuid: string; user_uuid: string }
        Returns: undefined
      }
      enqueue_scheduled_posts: { Args: never; Returns: undefined }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      optimize_post_schedule: { Args: never; Returns: undefined }
      process_job_queue: { Args: never; Returns: undefined }
      publish_post_worker: { Args: { payload: Json }; Returns: undefined }
      publish_to_telegram: { Args: { p_content: string }; Returns: Json }
      publish_to_x: { Args: { p_content: string }; Returns: Json }
      refresh_dashboard_metrics: { Args: never; Returns: undefined }
      refresh_social_tokens: { Args: never; Returns: undefined }
      sdk_collect_post_metrics: {
        Args: { p_platform: string; p_platform_post_id: string }
        Returns: Json
      }
      sdk_publish_multi_platform: {
        Args: { payload: Json }
        Returns: undefined
      }
      sdk_publish_post:
        | { Args: { p_post_id: string }; Returns: undefined }
        | {
            Args: {
              p_content: string
              p_platform: string
              p_post_id: string
              p_user_id: string
            }
            Returns: Json
          }
      update_hourly_performance: { Args: never; Returns: undefined }
      validate_api_key: { Args: { p_key: string }; Returns: string }
      worker_collect_metrics: { Args: never; Returns: undefined }
      worker_process_batch: { Args: never; Returns: number }
      worker_process_inbox: { Args: never; Returns: undefined }
      worker_process_jobs: { Args: never; Returns: undefined }
      worker_publish_post: {
        Args: { p_platform: string; p_post_id: string; p_user_id: string }
        Returns: boolean
      }
      worker_sdk_publisher: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "editor" | "journalist"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "editor", "journalist"],
    },
  },
} as const
