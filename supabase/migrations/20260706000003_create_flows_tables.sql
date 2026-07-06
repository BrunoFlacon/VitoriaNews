CREATE TABLE IF NOT EXISTS flows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Novo Fluxo',
  description TEXT DEFAULT '',
  trigger_type TEXT NOT NULL DEFAULT 'keyword' CHECK (trigger_type IN ('keyword', 'first_inbound_message', 'manual')),
  trigger_config JSONB DEFAULT '{}',
  fallback_policy JSONB DEFAULT '{"action": "ignore", "reprompt_limit": 2}',
  is_active BOOLEAN NOT NULL DEFAULT false,
  is_template BOOLEAN NOT NULL DEFAULT false,
  template_slug TEXT,
  entry_node_key TEXT,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS flow_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  node_key TEXT NOT NULL,
  node_type TEXT NOT NULL CHECK (node_type IN ('start', 'send_message', 'send_buttons', 'send_list', 'send_media', 'collect_input', 'condition', 'set_tag', 'handoff', 'end')),
  config JSONB DEFAULT '{}',
  position_x DOUBLE PRECISION DEFAULT 0,
  position_y DOUBLE PRECISION DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(flow_id, node_key)
);

CREATE TABLE IF NOT EXISTS flow_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flow_id UUID NOT NULL REFERENCES flows(id) ON DELETE CASCADE,
  contact_phone TEXT NOT NULL,
  current_node_key TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled', 'timeout', 'error')),
  variables JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_flow_runs_contact ON flow_runs(contact_phone);
CREATE INDEX IF NOT EXISTS idx_flow_runs_flow ON flow_runs(flow_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_run_per_contact ON flow_runs(contact_phone) WHERE status = 'active';

CREATE TABLE IF NOT EXISTS flow_run_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL REFERENCES flow_runs(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  node_key TEXT,
  payload JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_flow_run_events_run ON flow_run_events(run_id);

CREATE TABLE IF NOT EXISTS quick_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  connection_id UUID,
  title TEXT NOT NULL,
  shortcut TEXT,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  usage_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE flows ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE flow_run_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "flows_user_isolation" ON flows
  FOR ALL USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE POLICY "flow_nodes_user_isolation" ON flow_nodes
  FOR ALL USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_nodes.flow_id AND flows.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_nodes.flow_id AND flows.user_id = auth.uid())
  );

CREATE POLICY "flow_runs_user_isolation" ON flow_runs
  FOR ALL USING (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_runs.flow_id AND flows.user_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM flows WHERE flows.id = flow_runs.flow_id AND flows.user_id = auth.uid())
  );

CREATE POLICY "flow_run_events_user_isolation" ON flow_run_events
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM flow_runs
      JOIN flows ON flows.id = flow_runs.flow_id
      WHERE flow_runs.id = flow_run_events.run_id AND flows.user_id = auth.uid()
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM flow_runs
      JOIN flows ON flows.id = flow_runs.flow_id
      WHERE flow_runs.id = flow_run_events.run_id AND flows.user_id = auth.uid()
    )
  );

CREATE INDEX IF NOT EXISTS idx_flows_user ON flows(user_id);
CREATE INDEX IF NOT EXISTS idx_flows_active ON flows(is_active);
CREATE INDEX IF NOT EXISTS idx_flow_nodes_flow ON flow_nodes(flow_id);
CREATE INDEX IF NOT EXISTS idx_flows_updated ON flows(updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_flow_runs_status ON flow_runs(status);
CREATE INDEX IF NOT EXISTS idx_flow_run_events_type ON flow_run_events(event_type);
CREATE INDEX IF NOT EXISTS idx_flow_run_events_created ON flow_run_events(created_at DESC);

CREATE OR REPLACE FUNCTION update_flows_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_flows_updated ON flows;
CREATE TRIGGER trg_flows_updated
  BEFORE UPDATE ON flows
  FOR EACH ROW EXECUTE FUNCTION update_flows_updated_at();

DROP TRIGGER IF EXISTS trg_flow_nodes_updated ON flow_nodes;
CREATE TRIGGER trg_flow_nodes_updated
  BEFORE UPDATE ON flow_nodes
  FOR EACH ROW EXECUTE FUNCTION update_flows_updated_at();
