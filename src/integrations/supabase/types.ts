Initialising login role...
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
    PostgrestVersion: "14.4"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      account_metrics: {
        Row: {
          ad_revenue: number | null
          clicks_link: number | null
          collected_at: string | null
          comments: number | null
          earnings: number | null
          engagement_rate: number | null
          followers: number | null
          following: number | null
          id: string
          impressions: number | null
          likes: number | null
          metric_date: string | null
          new_followers: number | null
          page_visits: number | null
          platform: string
          posts_count: number | null
          profile_visits: number | null
          reach: number | null
          shares: number | null
          social_account_id: string | null
          subscribers_count: number | null
          user_id: string
          views: number | null
        }
        Insert: {
          ad_revenue?: number | null
          clicks_link?: number | null
          collected_at?: string | null
          comments?: number | null
          earnings?: number | null
          engagement_rate?: number | null
          followers?: number | null
          following?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          metric_date?: string | null
          new_followers?: number | null
          page_visits?: number | null
          platform: string
          posts_count?: number | null
          profile_visits?: number | null
          reach?: number | null
          shares?: number | null
          social_account_id?: string | null
          subscribers_count?: number | null
          user_id: string
          views?: number | null
        }
        Update: {
          ad_revenue?: number | null
          clicks_link?: number | null
          collected_at?: string | null
          comments?: number | null
          earnings?: number | null
          engagement_rate?: number | null
          followers?: number | null
          following?: number | null
          id?: string
          impressions?: number | null
          likes?: number | null
          metric_date?: string | null
          new_followers?: number | null
          page_visits?: number | null
          platform?: string
          posts_count?: number | null
          profile_visits?: number | null
          reach?: number | null
          shares?: number | null
          social_account_id?: string | null
          subscribers_count?: number | null
          user_id?: string
          views?: number | null
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
      advanced_themes: {
        Row: {
          buttons: Json | null
          colors: Json | null
          created_at: string
          effects: Json | null
          id: string
          is_active: boolean | null
          is_draft: boolean | null
          layout: Json | null
          name: string
          shadows: Json | null
          target: string | null
          typography: Json | null
          updated_at: string
        }
        Insert: {
          buttons?: Json | null
          colors?: Json | null
          created_at?: string
          effects?: Json | null
          id?: string
          is_active?: boolean | null
          is_draft?: boolean | null
          layout?: Json | null
          name: string
          shadows?: Json | null
          target?: string | null
          typography?: Json | null
          updated_at?: string
        }
        Update: {
          buttons?: Json | null
          colors?: Json | null
          created_at?: string
          effects?: Json | null
          id?: string
          is_active?: boolean | null
          is_draft?: boolean | null
          layout?: Json | null
          name?: string
          shadows?: Json | null
          target?: string | null
          typography?: Json | null
          updated_at?: string
        }
        Relationships: []
      }
      ai_generated_posts: {
        Row: {
          content: string
          created_at: string
          id: string
          platform: string | null
          tone: string | null
          trend_id: string | null
        }
        Insert: {
          content: string
          created_at?: string
          id?: string
          platform?: string | null
          tone?: string | null
          trend_id?: string | null
        }
        Update: {
          content?: string
          created_at?: string
          id?: string
          platform?: string | null
          tone?: string | null
          trend_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_generated_posts_trend_id_fkey"
            columns: ["trend_id"]
            isOneToOne: false
            referencedRelation: "trends"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_posts: {
        Row: {
          comments: number | null
          engagement_score: number | null
          likes: number | null
          platform: string
          post_id: string
          shares: number | null
          updated_at: string
          views: number | null
        }
        Insert: {
          comments?: number | null
          engagement_score?: number | null
          likes?: number | null
          platform: string
          post_id: string
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Update: {
          comments?: number | null
          engagement_score?: number | null
          likes?: number | null
          platform?: string
          post_id?: string
          shares?: number | null
          updated_at?: string
          views?: number | null
        }
        Relationships: []
      }
      api_credentials: {
        Row: {
          created_at: string | null
          credentials: Json
          id: string
          platform: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          credentials?: Json
          id?: string
          platform: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          credentials?: Json
          id?: string
          platform?: string
          updated_at?: string | null
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
      api_responses_cache: {
        Row: {
          created_at: string | null
          endpoint: string
          expires_at: string
          id: string
          platform: string
          request_params: Json | null
          response_data: Json
          user_id: string
        }
        Insert: {
          created_at?: string | null
          endpoint: string
          expires_at: string
          id?: string
          platform: string
          request_params?: Json | null
          response_data: Json
          user_id: string
        }
        Update: {
          created_at?: string | null
          endpoint?: string
          expires_at?: string
          id?: string
          platform?: string
          request_params?: Json | null
          response_data?: Json
          user_id?: string
        }
        Relationships: []
      }
      api_settings: {
        Row: {
          config_name: string
          config_value: string
          created_at: string | null
          id: string
          is_active: boolean | null
          platform: string
          updated_at: string | null
          user_id: string | null
        }
        Insert: {
          config_name: string
          config_value: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform: string
          updated_at?: string | null
          user_id?: string | null
        }
        Update: {
          config_name?: string
          config_value?: string
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          platform?: string
          updated_at?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      articles: {
        Row: {
          content: string
          cover_image: string | null
          created_at: string | null
          id: string
          published_at: string | null
          slug: string
          status: string
          title: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          content?: string
          cover_image?: string | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          slug: string
          status?: string
          title: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          content?: string
          cover_image?: string | null
          created_at?: string | null
          id?: string
          published_at?: string | null
          slug?: string
          status?: string
          title?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      attack_logs: {
        Row: {
          attack_type: string | null
          detected_at: string | null
          id: string
          metadata: Json | null
          severity: string | null
          target_platform: string | null
        }
        Insert: {
          attack_type?: string | null
          detected_at?: string | null
          id?: string
          metadata?: Json | null
          severity?: string | null
          target_platform?: string | null
        }
        Update: {
          attack_type?: string | null
          detected_at?: string | null
          id?: string
          metadata?: Json | null
          severity?: string | null
          target_platform?: string | null
        }
        Relationships: []
      }
      audience_demographics: {
        Row: {
          age_groups: Json | null
          collected_at: string | null
          created_at: string
          devices: Json | null
          gender: Json | null
          id: string
          platform: string
          platform_user_id: string | null
          top_cities: Json | null
          top_countries: Json | null
          updated_at: string
          user_id: string
        }
        Insert: {
          age_groups?: Json | null
          collected_at?: string | null
          created_at?: string
          devices?: Json | null
          gender?: Json | null
          id?: string
          platform: string
          platform_user_id?: string | null
          top_cities?: Json | null
          top_countries?: Json | null
          updated_at?: string
          user_id: string
        }
        Update: {
          age_groups?: Json | null
          collected_at?: string | null
          created_at?: string
          devices?: Json | null
          gender?: Json | null
          id?: string
          platform?: string
          platform_user_id?: string | null
          top_cities?: Json | null
          top_countries?: Json | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      bot_settings: {
        Row: {
          ai_model: string | null
          ai_prompt: string | null
          ai_provider: string | null
          audio_alerts_enabled: boolean | null
          behavior_mode: string | null
          claude_api_key: string | null
          created_at: string
          floating_button_enabled: boolean | null
          flow_coordinates: Json | null
          gemini_api_key: string | null
          groq_api_key: string | null
          id: string
          is_active: boolean | null
          mcp_config: Json | null
          openai_api_key: string | null
          openrouter_api_key: string | null
          platform: string
          respond_broadcast_lists: boolean | null
          respond_channels: boolean | null
          respond_comments: boolean | null
          respond_groups: boolean | null
          respond_private: boolean | null
          silence_duration_hours: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          ai_model?: string | null
          ai_prompt?: string | null
          ai_provider?: string | null
          audio_alerts_enabled?: boolean | null
          behavior_mode?: string | null
          claude_api_key?: string | null
          created_at?: string
          floating_button_enabled?: boolean | null
          flow_coordinates?: Json | null
          gemini_api_key?: string | null
          groq_api_key?: string | null
          id?: string
          is_active?: boolean | null
          mcp_config?: Json | null
          openai_api_key?: string | null
          openrouter_api_key?: string | null
          platform: string
          respond_broadcast_lists?: boolean | null
          respond_channels?: boolean | null
          respond_comments?: boolean | null
          respond_groups?: boolean | null
          respond_private?: boolean | null
          silence_duration_hours?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          ai_model?: string | null
          ai_prompt?: string | null
          ai_provider?: string | null
          audio_alerts_enabled?: boolean | null
          behavior_mode?: string | null
          claude_api_key?: string | null
          created_at?: string
          floating_button_enabled?: boolean | null
          flow_coordinates?: Json | null
          gemini_api_key?: string | null
          groq_api_key?: string | null
          id?: string
          is_active?: boolean | null
          mcp_config?: Json | null
          openai_api_key?: string | null
          openrouter_api_key?: string | null
          platform?: string
          respond_broadcast_lists?: boolean | null
          respond_channels?: boolean | null
          respond_comments?: boolean | null
          respond_groups?: boolean | null
          respond_private?: boolean | null
          silence_duration_hours?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      competitor_intel: {
        Row: {
          competitor_name: string
          engagement_rate: number | null
          followers_count: number | null
          id: string
          last_updated: string
          platform: string
          top_mentions: string[] | null
        }
        Insert: {
          competitor_name: string
          engagement_rate?: number | null
          followers_count?: number | null
          id?: string
          last_updated?: string
          platform: string
          top_mentions?: string[] | null
        }
        Update: {
          competitor_name?: string
          engagement_rate?: number | null
          followers_count?: number | null
          id?: string
          last_updated?: string
          platform?: string
          top_mentions?: string[] | null
        }
        Relationships: []
      }
      documents: {
        Row: {
          created_at: string
          downloads: number | null
          file_size: number | null
          file_type: string | null
          file_url: string
          id: string
          name: string
          user_id: string
        }
        Insert: {
          created_at?: string
          downloads?: number | null
          file_size?: number | null
          file_type?: string | null
          file_url: string
          id?: string
          name: string
          user_id: string
        }
        Update: {
          created_at?: string
          downloads?: number | null
          file_size?: number | null
          file_type?: string | null
          file_url?: string
          id?: string
          name?: string
          user_id?: string
        }
        Relationships: []
      }
      eventos_de_ataque: {
        Row: {
          contas_envolvidas: string[] | null
          criado_em: string
          hashtags_relacionadas: string[] | null
          id: string
          nivel_de_risco: string | null
          padrao_detectado: string | null
          plataforma: string
          pontuacao_de_intensidade: number | null
          topico: string
          user_id: string | null
        }
        Insert: {
          contas_envolvidas?: string[] | null
          criado_em?: string
          hashtags_relacionadas?: string[] | null
          id?: string
          nivel_de_risco?: string | null
          padrao_detectado?: string | null
          plataforma: string
          pontuacao_de_intensidade?: number | null
          topico: string
          user_id?: string | null
        }
        Update: {
          contas_envolvidas?: string[] | null
          criado_em?: string
          hashtags_relacionadas?: string[] | null
          id?: string
          nivel_de_risco?: string | null
          padrao_detectado?: string | null
          plataforma?: string
          pontuacao_de_intensidade?: number | null
          topico?: string
          user_id?: string | null
        }
        Relationships: []
      }
      facebook_daily_earnings: {
        Row: {
          created_at: string | null
          id: number
          metric_date: string
          stars_earnings_usd: number | null
          total_earnings_usd: number
          video_earnings_usd: number | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          metric_date: string
          stars_earnings_usd?: number | null
          total_earnings_usd?: number
          video_earnings_usd?: number | null
        }
        Update: {
          created_at?: string | null
          id?: never
          metric_date?: string
          stars_earnings_usd?: number | null
          total_earnings_usd?: number
          video_earnings_usd?: number | null
        }
        Relationships: []
      }
      facebook_daily_metrics: {
        Row: {
          created_at: string | null
          id: number
          metric_date: string
          metric_type: string
          value: number
        }
        Insert: {
          created_at?: string | null
          id?: never
          metric_date: string
          metric_type: string
          value?: number
        }
        Update: {
          created_at?: string | null
          id?: never
          metric_date?: string
          metric_type?: string
          value?: number
        }
        Relationships: []
      }
      facebook_daily_retention: {
        Row: {
          created_at: string | null
          id: number
          metric_date: string
          views_10min: number | null
          views_15min: number | null
          views_15s: number
          views_1h: number | null
          views_1min: number
          views_20min: number | null
          views_30min: number | null
          views_30s: number | null
          views_3min: number | null
          views_3s: number
          views_45min: number | null
          views_55min: number | null
          views_5min: number | null
        }
        Insert: {
          created_at?: string | null
          id?: never
          metric_date: string
          views_10min?: number | null
          views_15min?: number | null
          views_15s?: number
          views_1h?: number | null
          views_1min?: number
          views_20min?: number | null
          views_30min?: number | null
          views_30s?: number | null
          views_3min?: number | null
          views_3s?: number
          views_45min?: number | null
          views_55min?: number | null
          views_5min?: number | null
        }
        Update: {
          created_at?: string | null
          id?: never
          metric_date?: string
          views_10min?: number | null
          views_15min?: number | null
          views_15s?: number
          views_1h?: number | null
          views_1min?: number
          views_20min?: number | null
          views_30min?: number | null
          views_30s?: number | null
          views_3min?: number | null
          views_3s?: number
          views_45min?: number | null
          views_55min?: number | null
          views_5min?: number | null
        }
        Relationships: []
      }
      facebook_payment_receipts: {
        Row: {
          amount_usd: number
          created_at: string | null
          id: number
          notes: string | null
          payment_date: string | null
          payout_reference: string | null
          period_end: string
          period_start: string
        }
        Insert: {
          amount_usd: number
          created_at?: string | null
          id?: never
          notes?: string | null
          payment_date?: string | null
          payout_reference?: string | null
          period_end: string
          period_start: string
        }
        Update: {
          amount_usd?: number
          created_at?: string | null
          id?: never
          notes?: string | null
          payment_date?: string | null
          payout_reference?: string | null
          period_end?: string
          period_start?: string
        }
        Relationships: []
      }
      fb_ganhos_detalhados: {
        Row: {
          anuncios_in_stream: number | null
          criado_em: string | null
          data_consolidacao: string | null
          estrelas: number | null
          estrelas_qtd: number | null
          fonte_imagem: string | null
          ganhos_totais: number | null
          id: number
          monetizacao_conteudo: number | null
          reels: number | null
        }
        Insert: {
          anuncios_in_stream?: number | null
          criado_em?: string | null
          data_consolidacao?: string | null
          estrelas?: number | null
          estrelas_qtd?: number | null
          fonte_imagem?: string | null
          ganhos_totais?: number | null
          id?: number
          monetizacao_conteudo?: number | null
          reels?: number | null
        }
        Update: {
          anuncios_in_stream?: number | null
          criado_em?: string | null
          data_consolidacao?: string | null
          estrelas?: number | null
          estrelas_qtd?: number | null
          fonte_imagem?: string | null
          ganhos_totais?: number | null
          id?: number
          monetizacao_conteudo?: number | null
          reels?: number | null
        }
        Relationships: []
      }
      fb_metricas_video_periodo: {
        Row: {
          criado_em: string | null
          fonte_imagem: string | null
          id: number
          minutos_visualizados_total: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          visualizacoes_1min: number | null
          visualizacoes_3s: number | null
        }
        Insert: {
          criado_em?: string | null
          fonte_imagem?: string | null
          id?: number
          minutos_visualizados_total?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          visualizacoes_1min?: number | null
          visualizacoes_3s?: number | null
        }
        Update: {
          criado_em?: string | null
          fonte_imagem?: string | null
          id?: number
          minutos_visualizados_total?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          visualizacoes_1min?: number | null
          visualizacoes_3s?: number | null
        }
        Relationships: []
      }
      fb_resumo_periodo: {
        Row: {
          alcance: number | null
          criado_em: string | null
          deixaram_de_seguir: number | null
          fonte_imagem: string | null
          id: number
          novos_seguidores: number | null
          periodo_fim: string | null
          periodo_inicio: string | null
          seguidores_liquidos: number | null
          seguidores_total: number | null
          variacao_alcance_pct: number | null
        }
        Insert: {
          alcance?: number | null
          criado_em?: string | null
          deixaram_de_seguir?: number | null
          fonte_imagem?: string | null
          id?: number
          novos_seguidores?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          seguidores_liquidos?: number | null
          seguidores_total?: number | null
          variacao_alcance_pct?: number | null
        }
        Update: {
          alcance?: number | null
          criado_em?: string | null
          deixaram_de_seguir?: number | null
          fonte_imagem?: string | null
          id?: number
          novos_seguidores?: number | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          seguidores_liquidos?: number | null
          seguidores_total?: number | null
          variacao_alcance_pct?: number | null
        }
        Relationships: []
      }
      google_analytics_data: {
        Row: {
          created_at: string | null
          date: string | null
          dimension: string | null
          dimension_value: string | null
          id: string
          metadata: Json | null
          metric_name: string
          metric_value: number | null
          property_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          date?: string | null
          dimension?: string | null
          dimension_value?: string | null
          id?: string
          metadata?: Json | null
          metric_name: string
          metric_value?: number | null
          property_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          date?: string | null
          dimension?: string | null
          dimension_value?: string | null
          id?: string
          metadata?: Json | null
          metric_name?: string
          metric_value?: number | null
          property_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      hashtag_metrics: {
        Row: {
          hashtag: string
          id: string
          mentions_count: number | null
          platform: string
          reach_estimate: number | null
          recorded_at: string
          velocity_score: number | null
        }
        Insert: {
          hashtag: string
          id?: string
          mentions_count?: number | null
          platform: string
          reach_estimate?: number | null
          recorded_at?: string
          velocity_score?: number | null
        }
        Update: {
          hashtag?: string
          id?: string
          mentions_count?: number | null
          platform?: string
          reach_estimate?: number | null
          recorded_at?: string
          velocity_score?: number | null
        }
        Relationships: []
      }
      historical_sync_state: {
        Row: {
          created_at: string | null
          id: string
          is_completed: boolean | null
          last_synced_at: string | null
          metadata: Json | null
          next_cursor: string | null
          platform: string
          social_account_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          next_cursor?: string | null
          platform: string
          social_account_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          is_completed?: boolean | null
          last_synced_at?: string | null
          metadata?: Json | null
          next_cursor?: string | null
          platform?: string
          social_account_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "historical_sync_state_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      influence_nodes: {
        Row: {
          created_at: string
          engagement_rate: number | null
          followers: number | null
          id: string
          influence_score: number | null
          platform: string
          username: string
        }
        Insert: {
          created_at?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          influence_score?: number | null
          platform: string
          username: string
        }
        Update: {
          created_at?: string
          engagement_rate?: number | null
          followers?: number | null
          id?: string
          influence_score?: number | null
          platform?: string
          username?: string
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
          created_at: string | null
          end_time: number | null
          id: string
          live_id: string | null
          start_time: number | null
          status: string | null
          title: string | null
          user_id: string
        }
        Insert: {
          clip_url: string
          created_at?: string | null
          end_time?: number | null
          id?: string
          live_id?: string | null
          start_time?: number | null
          status?: string | null
          title?: string | null
          user_id: string
        }
        Update: {
          clip_url?: string
          created_at?: string | null
          end_time?: number | null
          id?: string
          live_id?: string | null
          start_time?: number | null
          status?: string | null
          title?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "live_clips_live_id_fkey"
            columns: ["live_id"]
            isOneToOne: false
            referencedRelation: "live_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      live_sessions: {
        Row: {
          created_at: string | null
          description: string | null
          ended_at: string | null
          id: string
          recording_url: string | null
          scheduled_at: string | null
          started_at: string | null
          status: string | null
          stream_key: string | null
          thumbnail_url: string | null
          title: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          recording_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          ended_at?: string | null
          id?: string
          recording_url?: string | null
          scheduled_at?: string | null
          started_at?: string | null
          status?: string | null
          stream_key?: string | null
          thumbnail_url?: string | null
          title?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      live_streams: {
        Row: {
          created_at: string
          id: string
          platform: string
          playback_url: string | null
          status: string | null
          stream_key: string
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          playback_url?: string | null
          status?: string | null
          stream_key: string
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          playback_url?: string | null
          status?: string | null
          stream_key?: string
          title?: string
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
          size: number | null
          storage_path: string | null
          thumbnail_url: string | null
          type: string | null
          updated_at: string
          url: string | null
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
          size?: number | null
          storage_path?: string | null
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string
          url?: string | null
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
          size?: number | null
          storage_path?: string | null
          thumbnail_url?: string | null
          type?: string | null
          updated_at?: string
          url?: string | null
          user_id?: string
          width?: number | null
        }
        Relationships: []
      }
      media_kit_leads: {
        Row: {
          created_at: string | null
          email: string
          id: string
          name: string
          status: string | null
          whatsapp: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          name: string
          status?: string | null
          whatsapp: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          name?: string
          status?: string | null
          whatsapp?: string
        }
        Relationships: []
      }
      message_backups: {
        Row: {
          backup_date: string | null
          chat_id: string
          created_at: string | null
          encryption_key_id: string | null
          file_path: string
          id: string
          metadata: Json | null
          platform: string
          user_id: string
        }
        Insert: {
          backup_date?: string | null
          chat_id: string
          created_at?: string | null
          encryption_key_id?: string | null
          file_path: string
          id?: string
          metadata?: Json | null
          platform: string
          user_id: string
        }
        Update: {
          backup_date?: string | null
          chat_id?: string
          created_at?: string | null
          encryption_key_id?: string | null
          file_path?: string
          id?: string
          metadata?: Json | null
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      messages: {
        Row: {
          channel_id: string | null
          content: string
          created_at: string | null
          id: string
          media_url: string | null
          metadata: Json | null
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
          created_at?: string | null
          id?: string
          media_url?: string | null
          metadata?: Json | null
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
          created_at?: string | null
          id?: string
          media_url?: string | null
          metadata?: Json | null
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
      messaging_audience_logs: {
        Row: {
          channel_id: string
          id: string
          logged_at: string | null
          members_online: number | null
          members_total: number | null
          platform: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          logged_at?: string | null
          members_online?: number | null
          members_total?: number | null
          platform: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          logged_at?: string | null
          members_online?: number | null
          members_total?: number | null
          platform?: string
          user_id?: string
        }
        Relationships: []
      }
      messaging_channels: {
        Row: {
          channel_id: string
          channel_name: string
          channel_type: string
          cover_photo: string | null
          created_at: string
          full_name: string | null
          id: string
          invite_link: string | null
          is_active: boolean | null
          is_online: boolean | null
          last_message: string | null
          last_message_at: string | null
          last_seen: string | null
          members_count: number | null
          online_count: number | null
          platform: string
          posts_count: number | null
          profile_picture: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          channel_id: string
          channel_name: string
          channel_type: string
          cover_photo?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          invite_link?: string | null
          is_active?: boolean | null
          is_online?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          last_seen?: string | null
          members_count?: number | null
          online_count?: number | null
          platform: string
          posts_count?: number | null
          profile_picture?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          channel_id?: string
          channel_name?: string
          channel_type?: string
          cover_photo?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          invite_link?: string | null
          is_active?: boolean | null
          is_online?: boolean | null
          last_message?: string | null
          last_message_at?: string | null
          last_seen?: string | null
          members_count?: number | null
          online_count?: number | null
          platform?: string
          posts_count?: number | null
          profile_picture?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      messaging_members: {
        Row: {
          channel_id: string | null
          created_at: string | null
          first_name: string | null
          full_name: string | null
          google_contact_id: string | null
          id: string
          is_admin: boolean | null
          is_online: boolean | null
          last_name: string | null
          last_seen: string | null
          phone_number: string | null
          platform: string
          profile_picture: string | null
          role: string | null
          telegram_user_id: number | null
          updated_at: string | null
          user_id: string
          username: string | null
          whatsapp_id: string | null
        }
        Insert: {
          channel_id?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          google_contact_id?: string | null
          id?: string
          is_admin?: boolean | null
          is_online?: boolean | null
          last_name?: string | null
          last_seen?: string | null
          phone_number?: string | null
          platform: string
          profile_picture?: string | null
          role?: string | null
          telegram_user_id?: number | null
          updated_at?: string | null
          user_id: string
          username?: string | null
          whatsapp_id?: string | null
        }
        Update: {
          channel_id?: string | null
          created_at?: string | null
          first_name?: string | null
          full_name?: string | null
          google_contact_id?: string | null
          id?: string
          is_admin?: boolean | null
          is_online?: boolean | null
          last_name?: string | null
          last_seen?: string | null
          phone_number?: string | null
          platform?: string
          profile_picture?: string | null
          role?: string | null
          telegram_user_id?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
          whatsapp_id?: string | null
        }
        Relationships: []
      }
      meta_ads_campaigns: {
        Row: {
          amount_spent: number | null
          campaign_id: string
          campaign_name: string | null
          clicks: number | null
          conversions: number | null
          cpc: number | null
          cpm: number | null
          created_at: string | null
          ctr: number | null
          daily_budget: number | null
          frequency: number | null
          id: string
          impressions: number | null
          lifetime_budget: number | null
          metadata: Json | null
          objective: string | null
          reach: number | null
          status: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          amount_spent?: number | null
          campaign_id: string
          campaign_name?: string | null
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          daily_budget?: number | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          lifetime_budget?: number | null
          metadata?: Json | null
          objective?: string | null
          reach?: number | null
          status?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          amount_spent?: number | null
          campaign_id?: string
          campaign_name?: string | null
          clicks?: number | null
          conversions?: number | null
          cpc?: number | null
          cpm?: number | null
          created_at?: string | null
          ctr?: number | null
          daily_budget?: number | null
          frequency?: number | null
          id?: string
          impressions?: number | null
          lifetime_budget?: number | null
          metadata?: Json | null
          objective?: string | null
          reach?: number | null
          status?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      narratives: {
        Row: {
          detected_at: string
          dominance_score: number | null
          id: string
          narrative_type: string | null
          sentiment: string | null
          topic: string
          user_id: string | null
        }
        Insert: {
          detected_at?: string
          dominance_score?: number | null
          id?: string
          narrative_type?: string | null
          sentiment?: string | null
          topic: string
          user_id?: string | null
        }
        Update: {
          detected_at?: string
          dominance_score?: number | null
          id?: string
          narrative_type?: string | null
          sentiment?: string | null
          topic?: string
          user_id?: string | null
        }
        Relationships: []
      }
      news_blocks: {
        Row: {
          content: Json | null
          created_at: string
          id: string
          order_index: number
          page_id: string | null
          styles: Json | null
          type: string
          updated_at: string
          visibility: Json | null
          visibility_tier: string | null
        }
        Insert: {
          content?: Json | null
          created_at?: string
          id?: string
          order_index?: number
          page_id?: string | null
          styles?: Json | null
          type: string
          updated_at?: string
          visibility?: Json | null
          visibility_tier?: string | null
        }
        Update: {
          content?: Json | null
          created_at?: string
          id?: string
          order_index?: number
          page_id?: string | null
          styles?: Json | null
          type?: string
          updated_at?: string
          visibility?: Json | null
          visibility_tier?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "news_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "news_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      news_pages: {
        Row: {
          created_at: string
          id: string
          is_home: boolean | null
          is_published: boolean | null
          meta_description: string | null
          meta_image: string | null
          redirect_url: string | null
          slug: string
          title: string
          updated_at: string
          visibility_tier: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          is_home?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_image?: string | null
          redirect_url?: string | null
          slug: string
          title: string
          updated_at?: string
          visibility_tier?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          is_home?: boolean | null
          is_published?: boolean | null
          meta_description?: string | null
          meta_image?: string | null
          redirect_url?: string | null
          slug?: string
          title?: string
          updated_at?: string
          visibility_tier?: string | null
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          platform: string | null
          read: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          platform?: string | null
          read?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          platform?: string | null
          read?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      oauth_logs: {
        Row: {
          created_at: string | null
          id: string
          provider: string
          request_payload: Json | null
          response_payload: Json | null
          stage: string
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          provider: string
          request_payload?: Json | null
          response_payload?: Json | null
          stage: string
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          provider?: string
          request_payload?: Json | null
          response_payload?: Json | null
          stage?: string
          user_id?: string | null
        }
        Relationships: []
      }
      oauth_states: {
        Row: {
          callback_domain: string | null
          code_verifier: string | null
          created_at: string
          expires_at: string
          id: string
          platform: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Insert: {
          callback_domain?: string | null
          code_verifier?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          platform: string
          redirect_uri: string
          state: string
          user_id: string
        }
        Update: {
          callback_domain?: string | null
          code_verifier?: string | null
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
      payment_charges: {
        Row: {
          created_at: string | null
          customer_email: string
          customer_name: string
          expires_at: string
          id: string
          paid_at: string | null
          plan: string
          qrcode_text: string | null
          status: string | null
          txid: string
          value_cents: number
        }
        Insert: {
          created_at?: string | null
          customer_email: string
          customer_name: string
          expires_at: string
          id?: string
          paid_at?: string | null
          plan: string
          qrcode_text?: string | null
          status?: string | null
          txid: string
          value_cents: number
        }
        Update: {
          created_at?: string | null
          customer_email?: string
          customer_name?: string
          expires_at?: string
          id?: string
          paid_at?: string | null
          plan?: string
          qrcode_text?: string | null
          status?: string | null
          txid?: string
          value_cents?: number
        }
        Relationships: []
      }
      permissions: {
        Row: {
          description: string | null
          id: string
          name: string
        }
        Insert: {
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      platform_evolution_milestones: {
        Row: {
          date: string | null
          description: string
          id: string
          is_major_milestone: boolean | null
          phase: string
          tech_details: string | null
          title: string
          version: string | null
        }
        Insert: {
          date?: string | null
          description: string
          id?: string
          is_major_milestone?: boolean | null
          phase: string
          tech_details?: string | null
          title: string
          version?: string | null
        }
        Update: {
          date?: string | null
          description?: string
          id?: string
          is_major_milestone?: boolean | null
          phase?: string
          tech_details?: string | null
          title?: string
          version?: string | null
        }
        Relationships: []
      }
      platform_hourly_performance: {
        Row: {
          avg_comments: number | null
          avg_impressions: number | null
          avg_likes: number | null
          avg_shares: number | null
          hour: number
          id: string
          platform: string
        }
        Insert: {
          avg_comments?: number | null
          avg_impressions?: number | null
          avg_likes?: number | null
          avg_shares?: number | null
          hour: number
          id?: string
          platform: string
        }
        Update: {
          avg_comments?: number | null
          avg_impressions?: number | null
          avg_likes?: number | null
          avg_shares?: number | null
          hour?: number
          id?: string
          platform?: string
        }
        Relationships: []
      }
      political_trends: {
        Row: {
          detected_at: string
          id: string
          keyword: string
          mentions: number | null
          sentiment: string | null
          sub_source: string | null
          user_id: string | null
          velocity: number | null
        }
        Insert: {
          detected_at?: string
          id?: string
          keyword: string
          mentions?: number | null
          sentiment?: string | null
          sub_source?: string | null
          user_id?: string | null
          velocity?: number | null
        }
        Update: {
          detected_at?: string
          id?: string
          keyword?: string
          mentions?: number | null
          sentiment?: string | null
          sub_source?: string | null
          user_id?: string | null
          velocity?: number | null
        }
        Relationships: []
      }
      portal_subscribers: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string
          is_active: boolean | null
          metadata: Json | null
          phone: string | null
          plan_type: string | null
          source_content_id: string | null
          source_platform: string | null
        }
        Insert: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          phone?: string | null
          plan_type?: string | null
          source_content_id?: string | null
          source_platform?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          is_active?: boolean | null
          metadata?: Json | null
          phone?: string | null
          plan_type?: string | null
          source_content_id?: string | null
          source_platform?: string | null
        }
        Relationships: []
      }
      post_metrics: {
        Row: {
          ad_revenue: number | null
          collected_at: string | null
          comments: number | null
          content: string | null
          earnings: number | null
          external_id: string | null
          id: string
          impressions: number | null
          is_sponsored: boolean | null
          likes: number | null
          media_type: string | null
          media_url: string | null
          performance_score: number | null
          platform: string
          post_id: string | null
          post_type: string | null
          post_url: string | null
          published_at: string | null
          reach: number | null
          sentiment_score: number | null
          shares: number | null
          social_account_id: string | null
          sponsor_name: string | null
          user_id: string
          views: number | null
        }
        Insert: {
          ad_revenue?: number | null
          collected_at?: string | null
          comments?: number | null
          content?: string | null
          earnings?: number | null
          external_id?: string | null
          id?: string
          impressions?: number | null
          is_sponsored?: boolean | null
          likes?: number | null
          media_type?: string | null
          media_url?: string | null
          performance_score?: number | null
          platform: string
          post_id?: string | null
          post_type?: string | null
          post_url?: string | null
          published_at?: string | null
          reach?: number | null
          sentiment_score?: number | null
          shares?: number | null
          social_account_id?: string | null
          sponsor_name?: string | null
          user_id: string
          views?: number | null
        }
        Update: {
          ad_revenue?: number | null
          collected_at?: string | null
          comments?: number | null
          content?: string | null
          earnings?: number | null
          external_id?: string | null
          id?: string
          impressions?: number | null
          is_sponsored?: boolean | null
          likes?: number | null
          media_type?: string | null
          media_url?: string | null
          performance_score?: number | null
          platform?: string
          post_id?: string | null
          post_type?: string | null
          post_url?: string | null
          published_at?: string | null
          reach?: number | null
          sentiment_score?: number | null
          shares?: number | null
          social_account_id?: string | null
          sponsor_name?: string | null
          user_id?: string
          views?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "scheduled_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "post_metrics_social_account_id_fkey"
            columns: ["social_account_id"]
            isOneToOne: false
            referencedRelation: "social_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      post_metrics_details: {
        Row: {
          breakdown: Json | null
          collected_at: string
          external_id: string | null
          id: string
          platform: string
          post_id: string | null
          user_id: string
        }
        Insert: {
          breakdown?: Json | null
          collected_at?: string
          external_id?: string | null
          id?: string
          platform: string
          post_id?: string | null
          user_id: string
        }
        Update: {
          breakdown?: Json | null
          collected_at?: string
          external_id?: string | null
          id?: string
          platform?: string
          post_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "post_metrics_details_post_id_fkey"
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
          birthdate: string | null
          created_at: string | null
          email: string | null
          email_engagement_alerts: boolean | null
          email_posts_published: boolean | null
          email_weekly_report: boolean | null
          first_name: string | null
          gender: string | null
          google_provider_token: string | null
          google_refresh_token: string | null
          google_token_expiry: string | null
          id: string
          is_online: boolean | null
          last_name: string | null
          name: string | null
          online_status: string | null
          phone: string | null
          profile_content: Json | null
          push_posts_published: boolean | null
          push_realtime_engagement: boolean | null
          push_scheduling_reminders: boolean | null
          role: string | null
          social_links: Json | null
          status: string | null
          two_factor_enabled: boolean | null
          updated_at: string | null
          user_id: string
          website: string | null
        }
        Insert: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          created_at?: string | null
          email?: string | null
          email_engagement_alerts?: boolean | null
          email_posts_published?: boolean | null
          email_weekly_report?: boolean | null
          first_name?: string | null
          gender?: string | null
          google_provider_token?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          id?: string
          is_online?: boolean | null
          last_name?: string | null
          name?: string | null
          online_status?: string | null
          phone?: string | null
          profile_content?: Json | null
          push_posts_published?: boolean | null
          push_realtime_engagement?: boolean | null
          push_scheduling_reminders?: boolean | null
          role?: string | null
          social_links?: Json | null
          status?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
          website?: string | null
        }
        Update: {
          avatar_url?: string | null
          bio?: string | null
          birthdate?: string | null
          created_at?: string | null
          email?: string | null
          email_engagement_alerts?: boolean | null
          email_posts_published?: boolean | null
          email_weekly_report?: boolean | null
          first_name?: string | null
          gender?: string | null
          google_provider_token?: string | null
          google_refresh_token?: string | null
          google_token_expiry?: string | null
          id?: string
          is_online?: boolean | null
          last_name?: string | null
          name?: string | null
          online_status?: string | null
          phone?: string | null
          profile_content?: Json | null
          push_posts_published?: boolean | null
          push_realtime_engagement?: boolean | null
          push_scheduling_reminders?: boolean | null
          role?: string | null
          social_links?: Json | null
          status?: string | null
          two_factor_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
          website?: string | null
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
      repost_suggestions: {
        Row: {
          created_at: string
          id: string
          original_post_id: string
          status: string | null
          suggested_content: string
          target_platform: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          original_post_id: string
          status?: string | null
          suggested_content: string
          target_platform: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          original_post_id?: string
          status?: string | null
          suggested_content?: string
          target_platform?: string
          user_id?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          permission_id: string
          role: string
        }
        Insert: {
          permission_id: string
          role: string
        }
        Update: {
          permission_id?: string
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      scheduled_posts: {
        Row: {
          bulk_import_id: string | null
          content: string
          created_at: string | null
          error_message: string | null
          id: string
          media_ids: string[] | null
          media_type: string | null
          orientation: string | null
          platforms: string[]
          published_at: string | null
          scheduled_at: string | null
          status: string
          updated_at: string | null
          user_id: string
        }
        Insert: {
          bulk_import_id?: string | null
          content: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          media_ids?: string[] | null
          media_type?: string | null
          orientation?: string | null
          platforms: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string | null
          user_id: string
        }
        Update: {
          bulk_import_id?: string | null
          content?: string
          created_at?: string | null
          error_message?: string | null
          id?: string
          media_ids?: string[] | null
          media_type?: string | null
          orientation?: string | null
          platforms?: string[]
          published_at?: string | null
          scheduled_at?: string | null
          status?: string
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      settings: {
        Row: {
          key: string
          updated_at: string | null
          value: string | null
        }
        Insert: {
          key: string
          updated_at?: string | null
          value?: string | null
        }
        Update: {
          key?: string
          updated_at?: string | null
          value?: string | null
        }
        Relationships: []
      }
      social_accounts: {
        Row: {
          access_secret: string | null
          access_token: string | null
          account_name: string | null
          account_type: string | null
          ad_revenue_30d: number | null
          ad_revenue_7d: number | null
          api_key: string | null
          api_secret: string | null
          avatar_url: string | null
          bio: string | null
          chat_id: string | null
          chat_type: string | null
          comments: number | null
          cover_photo: string | null
          created_at: string
          currency: string | null
          data_retention_days: number | null
          display_name: string | null
          email: string | null
          engagement_rate: number | null
          estimated_earnings: number | null
          followers: number | null
          followers_count: number | null
          following: number | null
          id: string
          is_active: boolean | null
          is_connected: boolean | null
          last_synced_at: string | null
          likes: number | null
          location: string | null
          metadata: Json | null
          monetization_enabled: boolean | null
          monetization_status: string | null
          page_id: string | null
          page_name: string | null
          platform: string
          platform_user_id: string | null
          posts_count: number | null
          profile_picture: string | null
          shares: number | null
          subscribers_count: number | null
          sync_status: string | null
          total_earnings: number | null
          total_engagement: number | null
          total_followers: number | null
          total_posts: number | null
          updated_at: string
          user_id: string
          username: string | null
          views: number | null
          website: string | null
        }
        Insert: {
          access_secret?: string | null
          access_token?: string | null
          account_name?: string | null
          account_type?: string | null
          ad_revenue_30d?: number | null
          ad_revenue_7d?: number | null
          api_key?: string | null
          api_secret?: string | null
          avatar_url?: string | null
          bio?: string | null
          chat_id?: string | null
          chat_type?: string | null
          comments?: number | null
          cover_photo?: string | null
          created_at?: string
          currency?: string | null
          data_retention_days?: number | null
          display_name?: string | null
          email?: string | null
          engagement_rate?: number | null
          estimated_earnings?: number | null
          followers?: number | null
          followers_count?: number | null
          following?: number | null
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          last_synced_at?: string | null
          likes?: number | null
          location?: string | null
          metadata?: Json | null
          monetization_enabled?: boolean | null
          monetization_status?: string | null
          page_id?: string | null
          page_name?: string | null
          platform: string
          platform_user_id?: string | null
          posts_count?: number | null
          profile_picture?: string | null
          shares?: number | null
          subscribers_count?: number | null
          sync_status?: string | null
          total_earnings?: number | null
          total_engagement?: number | null
          total_followers?: number | null
          total_posts?: number | null
          updated_at?: string
          user_id: string
          username?: string | null
          views?: number | null
          website?: string | null
        }
        Update: {
          access_secret?: string | null
          access_token?: string | null
          account_name?: string | null
          account_type?: string | null
          ad_revenue_30d?: number | null
          ad_revenue_7d?: number | null
          api_key?: string | null
          api_secret?: string | null
          avatar_url?: string | null
          bio?: string | null
          chat_id?: string | null
          chat_type?: string | null
          comments?: number | null
          cover_photo?: string | null
          created_at?: string
          currency?: string | null
          data_retention_days?: number | null
          display_name?: string | null
          email?: string | null
          engagement_rate?: number | null
          estimated_earnings?: number | null
          followers?: number | null
          followers_count?: number | null
          following?: number | null
          id?: string
          is_active?: boolean | null
          is_connected?: boolean | null
          last_synced_at?: string | null
          likes?: number | null
          location?: string | null
          metadata?: Json | null
          monetization_enabled?: boolean | null
          monetization_status?: string | null
          page_id?: string | null
          page_name?: string | null
          platform?: string
          platform_user_id?: string | null
          posts_count?: number | null
          profile_picture?: string | null
          shares?: number | null
          subscribers_count?: number | null
          sync_status?: string | null
          total_earnings?: number | null
          total_engagement?: number | null
          total_followers?: number | null
          total_posts?: number | null
          updated_at?: string
          user_id?: string
          username?: string | null
          views?: number | null
          website?: string | null
        }
        Relationships: []
      }
      social_connections: {
        Row: {
          access_token: string | null
          created_at: string | null
          expires_at: string | null
          followers_count: number | null
          id: string
          is_connected: boolean
          is_primary: boolean
          last_refresh_attempt: string | null
          metadata: Json | null
          monetization_status: string | null
          page_id: string | null
          page_name: string | null
          platform: string
          platform_user_id: string | null
          posts_count: number | null
          profile_image_url: string | null
          profile_picture: string | null
          refresh_error: string | null
          refresh_token: string | null
          token_expires_at: string | null
          total_earnings: number | null
          updated_at: string | null
          user_id: string
          username: string | null
        }
        Insert: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          followers_count?: number | null
          id?: string
          is_connected?: boolean
          is_primary?: boolean
          last_refresh_attempt?: string | null
          metadata?: Json | null
          monetization_status?: string | null
          page_id?: string | null
          page_name?: string | null
          platform: string
          platform_user_id?: string | null
          posts_count?: number | null
          profile_image_url?: string | null
          profile_picture?: string | null
          refresh_error?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id: string
          username?: string | null
        }
        Update: {
          access_token?: string | null
          created_at?: string | null
          expires_at?: string | null
          followers_count?: number | null
          id?: string
          is_connected?: boolean
          is_primary?: boolean
          last_refresh_attempt?: string | null
          metadata?: Json | null
          monetization_status?: string | null
          page_id?: string | null
          page_name?: string | null
          platform?: string
          platform_user_id?: string | null
          posts_count?: number | null
          profile_image_url?: string | null
          profile_picture?: string | null
          refresh_error?: string | null
          refresh_token?: string | null
          token_expires_at?: string | null
          total_earnings?: number | null
          updated_at?: string | null
          user_id?: string
          username?: string | null
        }
        Relationships: []
      }
      social_metrics_history: {
        Row: {
          collected_at: string | null
          followers: number | null
          id: string
          platform: string
          posts_count: number | null
          user_id: string
          views: number | null
        }
        Insert: {
          collected_at?: string | null
          followers?: number | null
          id?: string
          platform: string
          posts_count?: number | null
          user_id: string
          views?: number | null
        }
        Update: {
          collected_at?: string | null
          followers?: number | null
          id?: string
          platform?: string
          posts_count?: number | null
          user_id?: string
          views?: number | null
        }
        Relationships: []
      }
      social_monetization_metrics: {
        Row: {
          amount: number
          collected_at: string
          created_at: string
          currency: string
          description: string | null
          id: string
          platform: string
          post_id: string | null
          post_type: string
          source: string
          user_id: string
        }
        Insert: {
          amount?: number
          collected_at?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          platform: string
          post_id?: string | null
          post_type?: string
          source: string
          user_id: string
        }
        Update: {
          amount?: number
          collected_at?: string
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          platform?: string
          post_id?: string | null
          post_type?: string
          source?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "social_monetization_metrics_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "post_metrics"
            referencedColumns: ["id"]
          },
        ]
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
      social_sync_tasks: {
        Row: {
          connection_id: string | null
          created_at: string | null
          days_offset: number | null
          error_log: string | null
          id: string
          last_sync_at: string | null
          metadata: Json | null
          next_sync_at: string | null
          platform: string
          status: string
          sync_type: string
          updated_at: string | null
        }
        Insert: {
          connection_id?: string | null
          created_at?: string | null
          days_offset?: number | null
          error_log?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          next_sync_at?: string | null
          platform: string
          status?: string
          sync_type: string
          updated_at?: string | null
        }
        Update: {
          connection_id?: string | null
          created_at?: string | null
          days_offset?: number | null
          error_log?: string | null
          id?: string
          last_sync_at?: string | null
          metadata?: Json | null
          next_sync_at?: string | null
          platform?: string
          status?: string
          sync_type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "social_sync_tasks_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "social_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      stories_lives: {
        Row: {
          author_id: string | null
          comments: number | null
          completed_at: string | null
          content: string | null
          created_at: string
          id: string
          likes: number | null
          media_url: string | null
          metadata: Json | null
          platform: string
          scheduled_at: string | null
          status: string
          thumbnail_url: string | null
          title: string | null
          type: string
          user_id: string
          viewers: number | null
        }
        Insert: {
          author_id?: string | null
          comments?: number | null
          completed_at?: string | null
          content?: string | null
          created_at?: string
          id?: string
          likes?: number | null
          media_url?: string | null
          metadata?: Json | null
          platform: string
          scheduled_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          type: string
          user_id: string
          viewers?: number | null
        }
        Update: {
          author_id?: string | null
          comments?: number | null
          completed_at?: string | null
          content?: string | null
          created_at?: string
          id?: string
          likes?: number | null
          media_url?: string | null
          metadata?: Json | null
          platform?: string
          scheduled_at?: string | null
          status?: string
          thumbnail_url?: string | null
          title?: string | null
          type?: string
          user_id?: string
          viewers?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "stories_lives_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["user_id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string | null
          email: string
          expires_at: string
          id: string
          plan: string
          started_at: string | null
          status: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          email: string
          expires_at: string
          id?: string
          plan: string
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          email?: string
          expires_at?: string
          id?: string
          plan?: string
          started_at?: string | null
          status?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      system_logs: {
        Row: {
          created_at: string
          id: string
          level: string
          message: string
          service: string
        }
        Insert: {
          created_at?: string
          id?: string
          level?: string
          message: string
          service: string
        }
        Update: {
          created_at?: string
          id?: string
          level?: string
          message?: string
          service?: string
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          active: boolean | null
          active_theme_id: string | null
          allowed_roles: string[] | null
          contact_email: string | null
          favicon_url: string | null
          footer_text: string | null
          google_pixel_id: string | null
          group: string | null
          id: string
          key: string | null
          logo_url: string | null
          manual_url: string | null
          meta_pixel_id: string | null
          order_index: number | null
          platform_name: string | null
          portal_logo_url: string | null
          privacy_policy_url: string | null
          resend_api_key: string | null
          responsabilidade_url: string | null
          seo_description: string | null
          seo_image_url: string | null
          seo_title: string | null
          show_footer: boolean | null
          show_logo: boolean | null
          site_url: string | null
          target: string | null
          terms_of_service_url: string | null
          tiktok_pixel_id: string | null
          updated_at: string | null
          uso_plataforma_url: string | null
          value: string | null
          whatsapp_access_token: string | null
          whatsapp_business_id: string | null
          whatsapp_phone_id: string | null
          x_pixel_id: string | null
        }
        Insert: {
          active?: boolean | null
          active_theme_id?: string | null
          allowed_roles?: string[] | null
          contact_email?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          google_pixel_id?: string | null
          group?: string | null
          id?: string
          key?: string | null
          logo_url?: string | null
          manual_url?: string | null
          meta_pixel_id?: string | null
          order_index?: number | null
          platform_name?: string | null
          portal_logo_url?: string | null
          privacy_policy_url?: string | null
          resend_api_key?: string | null
          responsabilidade_url?: string | null
          seo_description?: string | null
          seo_image_url?: string | null
          seo_title?: string | null
          show_footer?: boolean | null
          show_logo?: boolean | null
          site_url?: string | null
          target?: string | null
          terms_of_service_url?: string | null
          tiktok_pixel_id?: string | null
          updated_at?: string | null
          uso_plataforma_url?: string | null
          value?: string | null
          whatsapp_access_token?: string | null
          whatsapp_business_id?: string | null
          whatsapp_phone_id?: string | null
          x_pixel_id?: string | null
        }
        Update: {
          active?: boolean | null
          active_theme_id?: string | null
          allowed_roles?: string[] | null
          contact_email?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          google_pixel_id?: string | null
          group?: string | null
          id?: string
          key?: string | null
          logo_url?: string | null
          manual_url?: string | null
          meta_pixel_id?: string | null
          order_index?: number | null
          platform_name?: string | null
          portal_logo_url?: string | null
          privacy_policy_url?: string | null
          resend_api_key?: string | null
          responsabilidade_url?: string | null
          seo_description?: string | null
          seo_image_url?: string | null
          seo_title?: string | null
          show_footer?: boolean | null
          show_logo?: boolean | null
          site_url?: string | null
          target?: string | null
          terms_of_service_url?: string | null
          tiktok_pixel_id?: string | null
          updated_at?: string | null
          uso_plataforma_url?: string | null
          value?: string | null
          whatsapp_access_token?: string | null
          whatsapp_business_id?: string | null
          whatsapp_phone_id?: string | null
          x_pixel_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_active_theme_id_fkey"
            columns: ["active_theme_id"]
            isOneToOne: false
            referencedRelation: "themes"
            referencedColumns: ["id"]
          },
        ]
      }
      system_settings_backup_20260418: {
        Row: {
          active: boolean | null
          active_theme_id: string | null
          allowed_roles: string[] | null
          contact_email: string | null
          favicon_url: string | null
          footer_text: string | null
          google_pixel_id: string | null
          group: string | null
          id: string | null
          key: string | null
          logo_url: string | null
          manual_url: string | null
          meta_pixel_id: string | null
          order_index: number | null
          platform_name: string | null
          privacy_policy_url: string | null
          resend_api_key: string | null
          responsabilidade_url: string | null
          show_footer: boolean | null
          terms_of_service_url: string | null
          tiktok_pixel_id: string | null
          updated_at: string | null
          uso_plataforma_url: string | null
          value: string | null
          whatsapp_access_token: string | null
          whatsapp_business_id: string | null
          whatsapp_phone_id: string | null
          x_pixel_id: string | null
        }
        Insert: {
          active?: boolean | null
          active_theme_id?: string | null
          allowed_roles?: string[] | null
          contact_email?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          google_pixel_id?: string | null
          group?: string | null
          id?: string | null
          key?: string | null
          logo_url?: string | null
          manual_url?: string | null
          meta_pixel_id?: string | null
          order_index?: number | null
          platform_name?: string | null
          privacy_policy_url?: string | null
          resend_api_key?: string | null
          responsabilidade_url?: string | null
          show_footer?: boolean | null
          terms_of_service_url?: string | null
          tiktok_pixel_id?: string | null
          updated_at?: string | null
          uso_plataforma_url?: string | null
          value?: string | null
          whatsapp_access_token?: string | null
          whatsapp_business_id?: string | null
          whatsapp_phone_id?: string | null
          x_pixel_id?: string | null
        }
        Update: {
          active?: boolean | null
          active_theme_id?: string | null
          allowed_roles?: string[] | null
          contact_email?: string | null
          favicon_url?: string | null
          footer_text?: string | null
          google_pixel_id?: string | null
          group?: string | null
          id?: string | null
          key?: string | null
          logo_url?: string | null
          manual_url?: string | null
          meta_pixel_id?: string | null
          order_index?: number | null
          platform_name?: string | null
          privacy_policy_url?: string | null
          resend_api_key?: string | null
          responsabilidade_url?: string | null
          show_footer?: boolean | null
          terms_of_service_url?: string | null
          tiktok_pixel_id?: string | null
          updated_at?: string | null
          uso_plataforma_url?: string | null
          value?: string | null
          whatsapp_access_token?: string | null
          whatsapp_business_id?: string | null
          whatsapp_phone_id?: string | null
          x_pixel_id?: string | null
        }
        Relationships: []
      }
      test: {
        Row: {
          id: number | null
        }
        Insert: {
          id?: number | null
        }
        Update: {
          id?: number | null
        }
        Relationships: []
      }
      themes: {
        Row: {
          accent_color: string
          background_color: string
          card_color: string
          color_scheme: string | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          primary_color: string
          secondary_color: string
          text_color: string
        }
        Insert: {
          accent_color: string
          background_color: string
          card_color: string
          color_scheme?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          primary_color: string
          secondary_color: string
          text_color: string
        }
        Update: {
          accent_color?: string
          background_color?: string
          card_color?: string
          color_scheme?: string | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          primary_color?: string
          secondary_color?: string
          text_color?: string
        }
        Relationships: []
      }
      trends: {
        Row: {
          category: string | null
          description: string | null
          detected_at: string
          id: string
          keyword: string
          metadata: Json | null
          score: number | null
          source: string
          sub_source: string | null
          thumbnail_url: string | null
          url: string | null
        }
        Insert: {
          category?: string | null
          description?: string | null
          detected_at?: string
          id?: string
          keyword: string
          metadata?: Json | null
          score?: number | null
          source: string
          sub_source?: string | null
          thumbnail_url?: string | null
          url?: string | null
        }
        Update: {
          category?: string | null
          description?: string | null
          detected_at?: string
          id?: string
          keyword?: string
          metadata?: Json | null
          score?: number | null
          source?: string
          sub_source?: string | null
          thumbnail_url?: string | null
          url?: string | null
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          permission_id: string
          user_id: string
        }
        Insert: {
          permission_id: string
          user_id: string
        }
        Update: {
          permission_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: string
          user_id?: string
        }
        Relationships: []
      }
      viral_campaigns: {
        Row: {
          detected_at: string
          id: string
          intensity_score: number | null
          platforms: string[] | null
          topic: string
          user_id: string | null
        }
        Insert: {
          detected_at?: string
          id?: string
          intensity_score?: number | null
          platforms?: string[] | null
          topic: string
          user_id?: string | null
        }
        Update: {
          detected_at?: string
          id?: string
          intensity_score?: number | null
          platforms?: string[] | null
          topic?: string
          user_id?: string | null
        }
        Relationships: []
      }
      webhook_events: {
        Row: {
          created_at: string | null
          event_timestamp: string | null
          event_type: string
          id: string
          platform: string
          raw_payload: Json | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          event_timestamp?: string | null
          event_type: string
          id?: string
          platform: string
          raw_payload?: Json | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          event_timestamp?: string | null
          event_type?: string
          id?: string
          platform?: string
          raw_payload?: Json | null
          status?: string | null
        }
        Relationships: []
      }
      youtube_analytics: {
        Row: {
          channel_id: string | null
          comments: number | null
          created_at: string | null
          date: string | null
          id: string
          likes: number | null
          metadata: Json | null
          subscribers_gained: number | null
          user_id: string
          video_id: string | null
          views: number | null
          watch_time_minutes: number | null
        }
        Insert: {
          channel_id?: string | null
          comments?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          likes?: number | null
          metadata?: Json | null
          subscribers_gained?: number | null
          user_id: string
          video_id?: string | null
          views?: number | null
          watch_time_minutes?: number | null
        }
        Update: {
          channel_id?: string | null
          comments?: number | null
          created_at?: string | null
          date?: string | null
          id?: string
          likes?: number | null
          metadata?: Json | null
          subscribers_gained?: number | null
          user_id?: string
          video_id?: string | null
          views?: number | null
          watch_time_minutes?: number | null
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_cron_jobs: {
        Args: never
        Returns: {
          active: boolean
          command: string
          jobid: number
          jobname: string
          schedule: string
        }[]
      }
      get_cron_run_details: {
        Args: never
        Returns: {
          command: string
          end_time: string
          job_pid: number
          jobid: number
          return_message: string
          runid: number
          start_time: string
          status: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      omni_search: {
        Args: { p_limit?: number; p_search_term: string }
        Returns: {
          id: string
          rank: number
          slug: string
          snippet: string
          thumbnail_url: string
          title: string
          type: string
        }[]
      }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      app_role:
        | "admin"
        | "editor"
        | "journalist"
        | "dev_master"
        | "admin_master"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      app_role: ["admin", "editor", "journalist", "dev_master", "admin_master"],
    },
  },
} as const
A new version of Supabase CLI is available: v2.105.0 (currently installed v2.82.0)
We recommend updating regularly for new features and bug fixes: https://supabase.com/docs/guides/cli/getting-started#updating-the-supabase-cli
