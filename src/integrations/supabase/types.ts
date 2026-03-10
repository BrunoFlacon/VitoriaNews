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
          created_at: string
          id: string
          platform: string
          platform_post_id: string | null
          post_id: string
          published_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          platform_post_id?: string | null
          post_id: string
          published_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          platform_post_id?: string | null
          post_id?: string
          published_at?: string | null
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
      social_connections: {
        Row: {
          access_token: string | null
          created_at: string
          id: string
          is_connected: boolean
          page_id: string | null
          page_name: string | null
          platform: string
          platform_user_id: string | null
          profile_image_url: string | null
          refresh_token: string | null
          token_expires_at: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          page_id?: string | null
          page_name?: string | null
          platform: string
          platform_user_id?: string | null
          profile_image_url?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string | null
          created_at?: string
          id?: string
          is_connected?: boolean
          page_id?: string | null
          page_name?: string | null
          platform?: string
          platform_user_id?: string | null
          profile_image_url?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          updated_at?: string
          user_id?: string
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
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
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
