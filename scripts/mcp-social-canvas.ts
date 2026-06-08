#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ghtkdkauseesambzqfrd.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || '';
const USER_ID = process.env.MCP_USER_ID || '';

if (!SUPABASE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_PUBLISHABLE_KEY required');
  process.exit(1);
}

if (!USER_ID) {
  console.error('MCP_USER_ID required (the Supabase user UUID to query data for)');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function query(table: string, select = '*', filters: Record<string, any> = {}) {
  let q = supabase.from(table).select(select);
  if (USER_ID && !table.startsWith('audit_')) {
    q = q.eq('user_id', USER_ID);
  }
  for (const [key, val] of Object.entries(filters)) {
    if (val !== undefined && val !== null) q = q.eq(key, val);
  }
  const { data, error } = await q;
  if (error) throw new Error(`Supabase error on ${table}: ${error.message}`);
  return data;
}

const server = new McpServer({
  name: 'social-canvas-hub',
  version: '1.0.0',
  description: 'MCP server for Social Canvas Hub — access all social media metrics from Supabase',
});

server.registerTool(
  'get_social_accounts',
  {
    description: 'List all connected social media accounts with current metrics (followers, posts, views, engagement)',
    inputSchema: z.object({
      platform: z.string().optional().describe('Filter by platform: facebook, instagram, twitter, tiktok, youtube, threads, whatsapp, telegram, linkedin'),
    }),
  },
  async ({ platform }) => {
    const filters: Record<string, any> = {};
    if (platform) filters.platform = platform;
    const data = await query('social_accounts', 'id,platform,username,profile_picture,followers_count,posts_count,views,likes,shares,comments,engagement_rate,updated_at', filters);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'get_platform_summary',
  {
    description: 'Get aggregated metrics summary for all platforms',
  },
  async () => {
    const data = await query('social_accounts', 'platform,followers_count,posts_count,views,likes,shares,comments');
    const byPlatform: Record<string, any> = {};
    for (const row of data as any[]) {
      const p = row.platform;
      if (!byPlatform[p]) byPlatform[p] = { platform: p, accounts: 0, followers: 0, posts: 0, views: 0, likes: 0, shares: 0, comments: 0 };
      byPlatform[p].accounts++;
      byPlatform[p].followers += row.followers_count || 0;
      byPlatform[p].posts += row.posts_count || 0;
      byPlatform[p].views += row.views || 0;
      byPlatform[p].likes += row.likes || 0;
      byPlatform[p].shares += row.shares || 0;
      byPlatform[p].comments += row.comments || 0;
    }
    const totals = Object.values(byPlatform).reduce((acc: any, p: any) => {
      acc.accounts += p.accounts;
      acc.followers += p.followers;
      acc.posts += p.posts;
      acc.views += p.views;
      acc.likes += p.likes;
      acc.shares += p.shares;
      acc.comments += p.comments;
      return acc;
    }, { accounts: 0, followers: 0, posts: 0, views: 0, likes: 0, shares: 0, comments: 0 });
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ platforms: Object.values(byPlatform), totals }, null, 2),
      }],
    };
  }
);

server.registerTool(
  'get_account_metrics_history',
  {
    description: 'Get historical time-series metrics from account_metrics table',
    inputSchema: z.object({
      platform: z.string().optional().describe('Filter by platform'),
      days: z.number().optional().default(90).describe('Number of days of history to return'),
      metric: z.string().optional().describe('Metric column to return: followers, views, engagement, posts'),
    }),
  },
  async ({ platform, days, metric }) => {
    const filters: Record<string, any> = {};
    if (platform) filters.platform = platform;
    const all = await query('account_metrics', '*', filters);
    const cutoff = new Date(Date.now() - (days || 90) * 86400000).toISOString();
    let filtered = (all as any[]).filter(r => r.collected_at >= cutoff);
    if (metric) {
      filtered = filtered.map((r: any) => ({
        collected_at: r.collected_at,
        platform: r.platform,
        [metric]: r[metric] ?? null,
      }));
    }
    return { content: [{ type: 'text', text: JSON.stringify(filtered, null, 2) }] };
  }
);

server.registerTool(
  'get_audience_demographics',
  {
    description: 'Get audience demographic data (age, gender, devices, cities, countries)',
  },
  async () => {
    const data = await query('audience_demographics', '*');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'get_messaging_channels',
  {
    description: 'List messaging channels (Telegram groups/channels, WhatsApp) with member counts',
  },
  async () => {
    const data = await query('messaging_channels', 'id,platform,channel_name,channel_type,members_count,online_count,profile_picture');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'get_message_stats',
  {
    description: 'Get message delivery statistics (sent, failed, draft, scheduled, received)',
  },
  async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('platform, status')
      .eq('user_id', USER_ID);
    if (error) throw new Error(`Supabase error: ${error.message}`);
    const msgs = data || [];
    const total = msgs.length;
    const byPlatform: Record<string, any> = {};
    for (const m of msgs as any[]) {
      const p = m.platform || 'unknown';
      if (!byPlatform[p]) byPlatform[p] = { platform: p, sent: 0, failed: 0, draft: 0, scheduled: 0, received: 0 };
      if (byPlatform[p][m.status]) byPlatform[p][m.status]++;
    }
    const totals = { sent: 0, failed: 0, draft: 0, scheduled: 0, received: 0 };
    for (const p of Object.values(byPlatform) as any[]) {
      totals.sent += p.sent;
      totals.failed += p.failed;
      totals.draft += p.draft;
      totals.scheduled += p.scheduled;
      totals.received += p.received;
    }
    totals.successRate = totals.sent + totals.failed > 0
      ? Math.round((totals.sent / (totals.sent + totals.failed)) * 100) : 0;
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ total, byPlatform: Object.values(byPlatform), totals }, null, 2),
      }],
    };
  }
);

server.registerTool(
  'get_scheduled_posts',
  {
    description: 'List posts by status (scheduled, published, draft, failed)',
    inputSchema: z.object({
      status: z.string().optional().describe('Filter by status: published, scheduled, draft, failed'),
    }),
  },
  async ({ status }) => {
    let q = supabase.from('scheduled_posts').select('*').eq('user_id', USER_ID);
    if (status) q = q.eq('status', status);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return { content: [{ type: 'text', text: JSON.stringify(data || [], null, 2) }] };
  }
);

server.registerTool(
  'get_recent_messages',
  {
    description: 'Get recent messages across all platforms',
    inputSchema: z.object({
      limit: z.number().optional().default(20).describe('Number of messages to return'),
      platform: z.string().optional().describe('Filter by platform'),
    }),
  },
  async ({ limit, platform }) => {
    let q = supabase
      .from('messages')
      .select('id,platform,status,content,recipient_name,recipient_phone,created_at')
      .eq('user_id', USER_ID)
      .order('created_at', { ascending: false })
      .limit(limit || 20);
    if (platform) q = q.eq('platform', platform);
    const { data, error } = await q;
    if (error) throw new Error(`Supabase error: ${error.message}`);
    return { content: [{ type: 'text', text: JSON.stringify(data || [], null, 2) }] };
  }
);

server.registerTool(
  'get_total_followers',
  {
    description: 'Get total follower count across all platforms, optionally grouped by platform',
    inputSchema: z.object({
      group_by_platform: z.boolean().optional().default(false).describe('Group results by platform'),
    }),
  },
  async ({ group_by_platform }) => {
    const data = await query('social_accounts', 'platform,followers_count');
    if (group_by_platform) {
      const byPlatform: Record<string, number> = {};
      let total = 0;
      for (const r of data as any[]) {
        const f = r.followers_count || 0;
        byPlatform[r.platform] = (byPlatform[r.platform] || 0) + f;
        total += f;
      }
      return { content: [{ type: 'text', text: JSON.stringify({ total, byPlatform }, null, 2) }] };
    }
    const total = (data as any[]).reduce((s, r) => s + (r.followers_count || 0), 0);
    return { content: [{ type: 'text', text: JSON.stringify({ total }, null, 2) }] };
  }
);

server.registerTool(
  'query_sql',
  {
    description: 'Run a raw SQL query against the database (SELECT only)',
    inputSchema: z.object({
      query: z.string().describe('SQL SELECT query to run'),
    }),
  },
  async ({ query: sql }) => {
    const { data, error } = await supabase.rpc('exec_sql', { query_text: sql }).maybeSingle();
    if (error) {
      const { data: fallback } = await supabase.from('_sql_executor' as any).select('*').limit(0);
      if (fallback !== undefined) {
        throw new Error(`Direct SQL not available. Use other tools or create an exec_sql RPC.`);
      }
      throw new Error(`SQL error: ${error.message}`);
    }
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
);

server.registerTool(
  'trigger_data_capture',
  {
    description: 'Trigger a full data capture/sync from all connected social networks. Calls the collect-social-analytics edge function.',
    inputSchema: z.object({
      sync_all: z.boolean().optional().default(true).describe('Sync all users (default true)'),
      platform: z.string().optional().describe('Sync only a specific platform (e.g. instagram, facebook)'),
    }),
  },
  async ({ sync_all, platform }) => {
    const body: Record<string, any> = {};
    if (sync_all) body.sync_all = true;
    if (platform) body.platform = platform;
    const url = `${SUPABASE_URL}/functions/v1/collect-social-analytics`;
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_KEY}`,
      },
      body: JSON.stringify(body),
    });
    const text = await res.text();
    if (!res.ok) throw new Error(`Sync failed (${res.status}): ${text}`);
    return { content: [{ type: 'text', text }] };
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch(err => {
  console.error('MCP server error:', err);
  process.exit(1);
});
