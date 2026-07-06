-- ============================================================
-- Merge wacrm CRM schema into social-canvas-hub
-- Single-tenant (no accounts table, uses user_id directly)
-- All statements are idempotent
-- ============================================================

-- ============================================================
-- 1. EXTEND EXISTING TABLES
-- ============================================================

-- 1a. profiles: add role column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'role'
  ) THEN
    ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'user';
  END IF;
END $$;

-- 1b. contacts: add company + phone_normalized
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'company'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN company TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'contacts' AND column_name = 'phone_normalized'
  ) THEN
    ALTER TABLE public.contacts ADD COLUMN phone_normalized TEXT GENERATED ALWAYS AS (regexp_replace(phone, '\D', '', 'g')) STORED;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contacts_phone_normalized ON public.contacts(phone_normalized);

-- 1c. messages: add CRM columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN sender_type TEXT CHECK (sender_type IN ('customer','agent','bot'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'sender_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN sender_id UUID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'content_type'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN content_type TEXT DEFAULT 'text';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'template_name'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN template_name TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'wa_message_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN wa_message_id TEXT;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'reply_to_message_id'
  ) THEN
    ALTER TABLE public.messages ADD COLUMN reply_to_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_messages_wa_message_id ON public.messages(wa_message_id);
CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON public.messages(reply_to_message_id) WHERE reply_to_message_id IS NOT NULL;

-- 1d. whatsapp_conversations: add CRM columns
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'contact_id'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'status'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN status TEXT DEFAULT 'open' CHECK (status IN ('open','pending','closed'));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'assigned_agent_id'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN assigned_agent_id UUID;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'ai_autoreply_disabled'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN ai_autoreply_disabled BOOLEAN NOT NULL DEFAULT false;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'whatsapp_conversations' AND column_name = 'ai_reply_count'
  ) THEN
    ALTER TABLE public.whatsapp_conversations ADD COLUMN ai_reply_count INTEGER NOT NULL DEFAULT 0;
  END IF;
END $$;

-- ============================================================
-- 2. NEW TABLES
-- ============================================================

-- 5. message_reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  conversation_id UUID NOT NULL REFERENCES public.whatsapp_conversations(id) ON DELETE CASCADE,
  actor_type TEXT NOT NULL CHECK (actor_type IN ('customer','agent')),
  actor_id UUID,
  emoji TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(message_id, actor_type, actor_id)
);

ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_message_reactions_conversation ON public.message_reactions(conversation_id);
CREATE INDEX IF NOT EXISTS idx_message_reactions_message ON public.message_reactions(message_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_reactions' AND policyname = 'Users manage message reactions via messages'
  ) THEN
    CREATE POLICY "Users manage message reactions via messages" ON public.message_reactions
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.messages WHERE id = message_reactions.message_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.messages WHERE id = message_reactions.message_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- 6. tags
CREATE TABLE IF NOT EXISTS public.tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'tags' AND policyname = 'Users manage own tags'
  ) THEN
    CREATE POLICY "Users manage own tags" ON public.tags
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_tags_user_id ON public.tags(user_id);

-- 7. contact_tags (M:N)
CREATE TABLE IF NOT EXISTS public.contact_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES public.tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id, tag_id)
);

ALTER TABLE public.contact_tags ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_tags' AND policyname = 'Users manage contact tags via contacts'
  ) THEN
    CREATE POLICY "Users manage contact tags via contacts" ON public.contact_tags
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.contacts WHERE id = contact_tags.contact_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.contacts WHERE id = contact_tags.contact_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contact_tags_contact ON public.contact_tags(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_tags_tag ON public.contact_tags(tag_id);

-- 8. custom_fields
CREATE TABLE IF NOT EXISTS public.custom_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text',
  field_options JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.custom_fields ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'custom_fields' AND policyname = 'Users manage own custom fields'
  ) THEN
    CREATE POLICY "Users manage own custom fields" ON public.custom_fields
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_custom_fields_user ON public.custom_fields(user_id);

-- 9. contact_custom_values (M:N)
CREATE TABLE IF NOT EXISTS public.contact_custom_values (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  custom_field_id UUID NOT NULL REFERENCES public.custom_fields(id) ON DELETE CASCADE,
  value TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(contact_id, custom_field_id)
);

ALTER TABLE public.contact_custom_values ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_custom_values' AND policyname = 'Users manage custom values via contacts'
  ) THEN
    CREATE POLICY "Users manage custom values via contacts" ON public.contact_custom_values
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.contacts WHERE id = contact_custom_values.contact_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.contacts WHERE id = contact_custom_values.contact_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contact_custom_values_contact ON public.contact_custom_values(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_custom_values_field ON public.contact_custom_values(custom_field_id);

-- 10. contact_notes
CREATE TABLE IF NOT EXISTS public.contact_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contact_id UUID NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  note_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.contact_notes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'contact_notes' AND policyname = 'Users manage own contact notes'
  ) THEN
    CREATE POLICY "Users manage own contact notes" ON public.contact_notes
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON public.contact_notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_notes_user ON public.contact_notes(user_id);

-- 11. message_templates
CREATE TABLE IF NOT EXISTS public.message_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'Marketing' CHECK (category IN ('Marketing','Utility','Authentication')),
  language TEXT DEFAULT 'en_US',
  header_type TEXT CHECK (header_type IN ('text','image','video','document')),
  header_content TEXT,
  body_text TEXT NOT NULL,
  footer_text TEXT,
  buttons JSONB,
  status TEXT DEFAULT 'DRAFT',
  sample_values JSONB,
  meta_template_id TEXT,
  rejection_reason TEXT,
  quality_score TEXT CHECK (quality_score IS NULL OR quality_score IN ('GREEN','YELLOW','RED')),
  header_handle TEXT,
  submission_error TEXT,
  last_submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, name, language)
);

ALTER TABLE public.message_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'message_templates' AND policyname = 'Users manage own message templates'
  ) THEN
    CREATE POLICY "Users manage own message templates" ON public.message_templates
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_message_templates_user ON public.message_templates(user_id);

-- 12. pipelines
CREATE TABLE IF NOT EXISTS public.pipelines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pipelines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pipelines' AND policyname = 'Users manage own pipelines'
  ) THEN
    CREATE POLICY "Users manage own pipelines" ON public.pipelines
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pipelines_user ON public.pipelines(user_id);

-- 13. pipeline_stages
CREATE TABLE IF NOT EXISTS public.pipeline_stages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.pipeline_stages ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'pipeline_stages' AND policyname = 'Users manage pipeline stages via pipelines'
  ) THEN
    CREATE POLICY "Users manage pipeline stages via pipelines" ON public.pipeline_stages
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.pipelines WHERE id = pipeline_stages.pipeline_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.pipelines WHERE id = pipeline_stages.pipeline_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_pipeline_stages_pipeline ON public.pipeline_stages(pipeline_id);

-- 14. deals
CREATE TABLE IF NOT EXISTS public.deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pipeline_id UUID NOT NULL REFERENCES public.pipelines(id) ON DELETE CASCADE,
  stage_id UUID NOT NULL REFERENCES public.pipeline_stages(id),
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  value NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT DEFAULT 'USD',
  notes TEXT,
  expected_close_date DATE,
  status TEXT DEFAULT 'open' CHECK (status IN ('open','won','lost')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'deals' AND policyname = 'Users manage own deals'
  ) THEN
    CREATE POLICY "Users manage own deals" ON public.deals
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_deals_user ON public.deals(user_id);
CREATE INDEX IF NOT EXISTS idx_deals_pipeline ON public.deals(pipeline_id);
CREATE INDEX IF NOT EXISTS idx_deals_stage ON public.deals(stage_id);
CREATE INDEX IF NOT EXISTS idx_deals_assigned ON public.deals(assigned_to);

-- 15. broadcasts
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  template_name TEXT NOT NULL,
  template_language TEXT NOT NULL DEFAULT 'en_US',
  template_variables JSONB,
  audience_filter JSONB,
  scheduled_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  total_recipients INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  read_count INTEGER DEFAULT 0,
  replied_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'broadcasts' AND policyname = 'Users manage own broadcasts'
  ) THEN
    CREATE POLICY "Users manage own broadcasts" ON public.broadcasts
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_broadcasts_user ON public.broadcasts(user_id);

-- 16. broadcast_recipients
CREATE TABLE IF NOT EXISTS public.broadcast_recipients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  broadcast_id UUID NOT NULL REFERENCES public.broadcasts(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','delivered','read','replied','failed')),
  whatsapp_message_id TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  read_at TIMESTAMPTZ,
  replied_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.broadcast_recipients ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_broadcast_recipients_wamid ON public.broadcast_recipients(whatsapp_message_id) WHERE whatsapp_message_id IS NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'broadcast_recipients' AND policyname = 'Users manage broadcast recipients via broadcasts'
  ) THEN
    CREATE POLICY "Users manage broadcast recipients via broadcasts" ON public.broadcast_recipients
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.broadcasts WHERE id = broadcast_recipients.broadcast_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.broadcasts WHERE id = broadcast_recipients.broadcast_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_broadcast ON public.broadcast_recipients(broadcast_id);
CREATE INDEX IF NOT EXISTS idx_broadcast_recipients_contact ON public.broadcast_recipients(contact_id);

-- 17. automations
CREATE TABLE IF NOT EXISTS public.automations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT FALSE,
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'automations' AND policyname = 'Users manage own automations'
  ) THEN
    CREATE POLICY "Users manage own automations" ON public.automations
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_automations_user ON public.automations(user_id);
CREATE INDEX IF NOT EXISTS idx_automations_active ON public.automations(is_active) WHERE is_active = TRUE;

-- 18. automation_steps
CREATE TABLE IF NOT EXISTS public.automation_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES public.automation_steps(id) ON DELETE CASCADE,
  branch TEXT CHECK (branch IN ('yes','no')),
  step_type TEXT NOT NULL,
  step_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automation_steps ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_automation_steps_automation_position ON public.automation_steps(automation_id, position);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'automation_steps' AND policyname = 'Users manage automation steps via automations'
  ) THEN
    CREATE POLICY "Users manage automation steps via automations" ON public.automation_steps
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.automations WHERE id = automation_steps.automation_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.automations WHERE id = automation_steps.automation_id AND user_id = auth.uid())
      );
  END IF;
END $$;

-- 19. automation_logs
CREATE TABLE IF NOT EXISTS public.automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  trigger_event TEXT NOT NULL,
  steps_executed JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('success','partial','failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automation_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'automation_logs' AND policyname = 'Users view own automation logs'
  ) THEN
    CREATE POLICY "Users view own automation logs" ON public.automation_logs
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_automation_logs_automation ON public.automation_logs(automation_id);
CREATE INDEX IF NOT EXISTS idx_automation_logs_user ON public.automation_logs(user_id);

-- 20. automation_pending_executions
CREATE TABLE IF NOT EXISTS public.automation_pending_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id UUID NOT NULL REFERENCES public.automations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  log_id UUID REFERENCES public.automation_logs(id) ON DELETE CASCADE,
  parent_step_id UUID REFERENCES public.automation_steps(id) ON DELETE SET NULL,
  branch TEXT CHECK (branch IN ('yes','no')),
  next_step_position INTEGER NOT NULL,
  context JSONB NOT NULL DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','done','failed')),
  run_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.automation_pending_executions ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_automation_pending_executions_run ON public.automation_pending_executions(run_at) WHERE status = 'pending';

-- 21. flows
CREATE TABLE IF NOT EXISTS public.flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','active','archived')),
  trigger_type TEXT NOT NULL CHECK (trigger_type IN ('keyword','first_inbound_message','manual')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::jsonb,
  entry_node_id TEXT,
  fallback_policy JSONB NOT NULL DEFAULT '{"on_unknown_reply":"reprompt","max_reprompts":2,"on_timeout_hours":24,"on_exhaust":"handoff"}',
  execution_count INTEGER NOT NULL DEFAULT 0,
  last_executed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.flows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'flows' AND policyname = 'Users manage own flows'
  ) THEN
    CREATE POLICY "Users manage own flows" ON public.flows
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flows_user ON public.flows(user_id);

-- 22. flow_nodes
CREATE TABLE IF NOT EXISTS public.flow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  node_type TEXT NOT NULL,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  position_x INTEGER NOT NULL DEFAULT 0,
  position_y INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(flow_id, node_key)
);

ALTER TABLE public.flow_nodes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'flow_nodes' AND policyname = 'Users manage flow nodes via flows'
  ) THEN
    CREATE POLICY "Users manage flow nodes via flows" ON public.flow_nodes
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.flows WHERE id = flow_nodes.flow_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.flows WHERE id = flow_nodes.flow_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow ON public.flow_nodes(flow_id);

-- 23. flow_runs
CREATE TABLE IF NOT EXISTS public.flow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES public.flows(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES public.contacts(id) ON DELETE SET NULL,
  conversation_id UUID REFERENCES public.whatsapp_conversations(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','completed','handed_off','timed_out','paused_by_agent','failed')),
  current_node_key TEXT,
  last_prompt_message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,
  vars JSONB NOT NULL DEFAULT '{}'::jsonb,
  reprompt_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_advanced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  end_reason TEXT
);

ALTER TABLE public.flow_runs ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_run_per_contact ON public.flow_runs(user_id, contact_id) WHERE status = 'active';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'flow_runs' AND policyname = 'Users manage own flow runs'
  ) THEN
    CREATE POLICY "Users manage own flow runs" ON public.flow_runs
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flow_runs_flow ON public.flow_runs(flow_id);

-- 24. flow_run_events
CREATE TABLE IF NOT EXISTS public.flow_run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_run_id UUID NOT NULL REFERENCES public.flow_runs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type IN ('started','node_entered','message_sent','reply_received','fallback_fired','handoff','timeout','error','completed')),
  node_key TEXT,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.flow_run_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'flow_run_events' AND policyname = 'Users manage flow run events via flow_runs'
  ) THEN
    CREATE POLICY "Users manage flow run events via flow_runs" ON public.flow_run_events
      FOR ALL TO authenticated
      USING (
        EXISTS (SELECT 1 FROM public.flow_runs WHERE id = flow_run_events.flow_run_id AND user_id = auth.uid())
      )
      WITH CHECK (
        EXISTS (SELECT 1 FROM public.flow_runs WHERE id = flow_run_events.flow_run_id AND user_id = auth.uid())
      );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_flow_run_events_run ON public.flow_run_events(flow_run_id);

-- 25. ai_configs
CREATE TABLE IF NOT EXISTS public.ai_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL CHECK (provider IN ('openai','anthropic')),
  model TEXT NOT NULL,
  api_key TEXT NOT NULL,
  system_prompt TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  auto_reply_enabled BOOLEAN NOT NULL DEFAULT false,
  auto_reply_max_per_conversation INTEGER NOT NULL DEFAULT 3 CHECK (auto_reply_max_per_conversation BETWEEN 1 AND 20),
  embeddings_api_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE public.ai_configs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'ai_configs' AND policyname = 'Users manage own AI config'
  ) THEN
    CREATE POLICY "Users manage own AI config" ON public.ai_configs
      FOR ALL TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- ============================================================
-- 3. FUNCTIONS
-- ============================================================

-- 26. update_updated_at_column (already exists in public schema, ensure it exists)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 27. increment_automation_execution_count
CREATE OR REPLACE FUNCTION public.increment_automation_execution_count(p_automation_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.automations
  SET execution_count = execution_count + 1, last_executed_at = now()
  WHERE id = p_automation_id;
END;
$$;

-- 28. increment_flow_execution_count
CREATE OR REPLACE FUNCTION public.increment_flow_execution_count(p_flow_id UUID)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.flows
  SET execution_count = execution_count + 1, last_executed_at = now()
  WHERE id = p_flow_id;
END;
$$;

-- 29. claim_ai_reply_slot
CREATE OR REPLACE FUNCTION public.claim_ai_reply_slot(p_conversation_id UUID, p_max_replies INT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result INTEGER;
BEGIN
  UPDATE public.whatsapp_conversations
  SET ai_reply_count = ai_reply_count + 1
  WHERE id = p_conversation_id AND ai_reply_count < p_max_replies AND ai_autoreply_disabled = false
  RETURNING ai_reply_count INTO v_result;

  RETURN v_result IS NOT NULL;
END;
$$;

-- 30. filter_contacts_by_tags
CREATE OR REPLACE FUNCTION public.filter_contacts_by_tags(
  p_tag_ids UUID[],
  p_search TEXT DEFAULT NULL,
  p_limit INT DEFAULT 25,
  p_offset INT DEFAULT 0
)
RETURNS TABLE(contact public.contacts, total_count BIGINT)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_total BIGINT;
BEGIN
  v_user_id := auth.uid();

  CREATE TEMP TABLE _matched_contacts ON COMMIT DROP AS
  SELECT DISTINCT c.*
  FROM public.contacts c
  WHERE c.user_id = v_user_id
    AND (
      p_tag_ids IS NULL
      OR EXISTS (
        SELECT 1 FROM public.contact_tags ct
        WHERE ct.contact_id = c.id AND ct.tag_id = ANY(p_tag_ids)
      )
    )
    AND (
      p_search IS NULL
      OR c.name ILIKE '%' || p_search || '%'
      OR c.phone ILIKE '%' || p_search || '%'
      OR c.email ILIKE '%' || p_search || '%'
      OR c.company ILIKE '%' || p_search || '%'
    );

  SELECT count(*) INTO v_total FROM _matched_contacts;

  RETURN QUERY
  SELECT m, v_total
  FROM _matched_contacts m
  ORDER BY m.name
  LIMIT p_limit
  OFFSET p_offset;
END;
$$;

-- ============================================================
-- 4. TRIGGERS FOR updated_at
-- ============================================================

-- message_templates
DROP TRIGGER IF EXISTS tr_message_templates_updated_at ON public.message_templates;
CREATE TRIGGER tr_message_templates_updated_at
  BEFORE UPDATE ON public.message_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- deals
DROP TRIGGER IF EXISTS tr_deals_updated_at ON public.deals;
CREATE TRIGGER tr_deals_updated_at
  BEFORE UPDATE ON public.deals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- broadcasts
DROP TRIGGER IF EXISTS tr_broadcasts_updated_at ON public.broadcasts;
CREATE TRIGGER tr_broadcasts_updated_at
  BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- automations
DROP TRIGGER IF EXISTS tr_automations_updated_at ON public.automations;
CREATE TRIGGER tr_automations_updated_at
  BEFORE UPDATE ON public.automations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- flows
DROP TRIGGER IF EXISTS tr_flows_updated_at ON public.flows;
CREATE TRIGGER tr_flows_updated_at
  BEFORE UPDATE ON public.flows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ai_configs
DROP TRIGGER IF EXISTS tr_ai_configs_updated_at ON public.ai_configs;
CREATE TRIGGER tr_ai_configs_updated_at
  BEFORE UPDATE ON public.ai_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================
-- 5. REALTIME PUBLICATION
-- ============================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'broadcasts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.broadcasts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'flows'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.flows;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'automations'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.automations;
  END IF;
END $$;
