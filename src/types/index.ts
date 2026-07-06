// ============================================================
// Profiles & Accounts
// ============================================================

export interface Profile {
  id: string;
  user_id?: string;
  full_name?: string;
  email?: string;
  avatar_url?: string;
  role?: string;
  account_id?: string;
  created_at: string;
}

export interface AccountMember {
  user_id: string;
  full_name: string;
  email: string | null;
  avatar_url: string | null;
  role: string;
  joined_at: string;
}

// ============================================================
// Contacts & Tags
// ============================================================

export interface Contact {
  id: string;
  user_id: string;
  account_id?: string;
  phone: string;
  phone_normalized?: string;
  name?: string;
  email?: string;
  company?: string;
  avatar_url?: string;
  tags?: Tag[];
  created_at: string;
  updated_at: string;
}

export interface Tag {
  id: string;
  user_id: string;
  name: string;
  color: string;
  created_at: string;
}

export interface CustomField {
  id: string;
  user_id: string;
  account_id?: string;
  field_name: string;
  field_type: string;
  field_options?: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// Conversations & Messages
// ============================================================

export type ConversationStatus = 'open' | 'pending' | 'closed';

export interface Conversation {
  id: string;
  user_id: string;
  contact_id: string;
  status: ConversationStatus;
  assigned_agent_id?: string;
  last_message_text?: string;
  last_message_at?: string;
  unread_count: number;
  contact?: Contact;
  created_at: string;
  updated_at: string;
}

export type SenderType = 'customer' | 'agent' | 'bot';
export type ContentType = 'text' | 'image' | 'document' | 'audio' | 'video' | 'location' | 'template' | 'interactive';
export type MessageStatus = 'sending' | 'sent' | 'delivered' | 'read' | 'failed';

export interface Message {
  id: string;
  conversation_id: string;
  sender_type: SenderType;
  sender_id?: string;
  content_type: ContentType;
  content_text?: string;
  media_url?: string;
  template_name?: string;
  message_id?: string;
  status: MessageStatus;
  interactive_reply_id?: string;
  created_at: string;
}

// ============================================================
// Pipelines & Deals
// ============================================================

export interface Pipeline {
  id: string;
  user_id: string;
  name: string;
  created_at: string;
}

export interface PipelineStage {
  id: string;
  pipeline_id: string;
  name: string;
  position: number;
  color: string;
  created_at: string;
}

export type DealStatus = 'open' | 'won' | 'lost';

export interface Deal {
  id: string;
  user_id: string;
  pipeline_id: string;
  stage_id: string;
  contact_id: string | null;
  conversation_id?: string;
  assigned_to?: string;
  title: string;
  value: number;
  currency?: string;
  notes?: string;
  expected_close_date?: string;
  status?: DealStatus;
  contact?: any;
  stage?: PipelineStage;
  assignee?: any;
  created_at: string;
  updated_at?: string;
}

// ============================================================
// WhatsApp Configuration & Templates
// ============================================================

export type MessageTemplateStatus =
  | 'DRAFT' | 'PENDING' | 'APPROVED' | 'REJECTED'
  | 'PAUSED' | 'DISABLED' | 'IN_APPEAL' | 'PENDING_DELETION';

export type TemplateButton =
  | { type: 'QUICK_REPLY'; text: string }
  | { type: 'URL'; text: string; url: string; example?: string }
  | { type: 'PHONE_NUMBER'; text: string; phone_number: string }
  | { type: 'COPY_CODE'; text: string; example: string };

export interface MessageTemplate {
  id: string;
  user_id: string;
  name: string;
  category: 'Marketing' | 'Utility' | 'Authentication';
  language?: string;
  header_type?: 'text' | 'image' | 'video' | 'document';
  header_content?: string;
  header_handle?: string;
  header_media_url?: string;
  body_text: string;
  footer_text?: string;
  buttons?: TemplateButton[];
  status?: MessageTemplateStatus;
  meta_template_id?: string;
  quality_score?: 'GREEN' | 'YELLOW' | 'RED';
  rejection_reason?: string;
  created_at: string;
}

// ============================================================
// Broadcasts
// ============================================================

export type BroadcastStatus = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed';
export type RecipientStatus = 'pending' | 'sent' | 'delivered' | 'read' | 'replied' | 'failed';

export interface Broadcast {
  id: string;
  user_id: string;
  name: string;
  template_name: string;
  template_language: string;
  template_variables?: Record<string, unknown>;
  audience_filter?: Record<string, unknown>;
  scheduled_at?: string;
  status: BroadcastStatus;
  total_recipients: number;
  sent_count: number;
  delivered_count: number;
  read_count: number;
  replied_count: number;
  failed_count: number;
  created_at: string;
}

export interface BroadcastRecipient {
  id: string;
  broadcast_id: string;
  contact_id: string | null;
  status: RecipientStatus;
  sent_at?: string;
  delivered_at?: string;
  read_at?: string;
  replied_at?: string;
  error_message?: string;
  whatsapp_message_id?: string;
  contact?: Contact;
  created_at: string;
}

// ============================================================
// Automations
// ============================================================

export type AutomationTriggerType =
  | 'new_message_received'
  | 'first_inbound_message'
  | 'keyword_match'
  | 'new_contact_created'
  | 'conversation_assigned'
  | 'tag_added'
  | 'time_based';

export type AutomationStepType =
  | 'send_message'
  | 'send_template'
  | 'add_tag'
  | 'remove_tag'
  | 'assign_conversation'
  | 'update_contact_field'
  | 'create_deal'
  | 'wait'
  | 'condition'
  | 'send_webhook'
  | 'close_conversation';

export type AutomationLogStatus = 'success' | 'partial' | 'failed';

export interface KeywordMatchTriggerConfig {
  keywords: string[];
  match_type: 'exact' | 'contains';
  case_sensitive?: boolean;
}

export interface TagTriggerConfig {
  tag_id: string;
}

export interface TimeBasedTriggerConfig {
  schedule: string;
  timezone?: string;
}

export type AutomationTriggerConfig =
  | Record<string, never>
  | KeywordMatchTriggerConfig
  | TagTriggerConfig
  | TimeBasedTriggerConfig
  | Record<string, unknown>;

export interface SendMessageStepConfig {
  text: string;
}

export interface SendTemplateStepConfig {
  template_name: string;
  language?: string;
  variables?: Record<string, string>;
}

export interface TagStepConfig {
  tag_id: string;
}

export interface AssignConversationStepConfig {
  mode: 'specific' | 'round_robin';
  agent_id?: string;
}

export interface UpdateContactFieldStepConfig {
  field: string;
  value: string;
}

export interface CreateDealStepConfig {
  pipeline_id: string;
  stage_id: string;
  title: string;
  value?: number;
}

export interface WaitStepConfig {
  amount: number;
  unit: 'minutes' | 'hours' | 'days';
}

export type ConditionSubject = 'contact_field' | 'tag_presence' | 'message_content' | 'time_of_day';

export interface ConditionStepConfig {
  subject: ConditionSubject;
  operand?: string;
  value?: string;
}

export interface SendWebhookStepConfig {
  url: string;
  headers?: Record<string, string>;
  body_template?: string;
}

export type AutomationStepConfig =
  | SendMessageStepConfig
  | SendTemplateStepConfig
  | TagStepConfig
  | AssignConversationStepConfig
  | UpdateContactFieldStepConfig
  | CreateDealStepConfig
  | WaitStepConfig
  | ConditionStepConfig
  | SendWebhookStepConfig
  | Record<string, never>
  | Record<string, unknown>;

export interface Automation {
  id: string;
  user_id: string;
  account_id?: string;
  name: string;
  description?: string;
  trigger_type: AutomationTriggerType;
  trigger_config: AutomationTriggerConfig;
  is_active: boolean;
  execution_count: number;
  last_executed_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AutomationStep {
  id: string;
  automation_id: string;
  parent_step_id?: string | null;
  branch?: 'yes' | 'no' | null;
  step_type: AutomationStepType;
  step_config: AutomationStepConfig;
  position: number;
  created_at: string;
}

export interface AutomationLogStepResult {
  step_id: string;
  step_type: AutomationStepType;
  status: 'success' | 'skipped' | 'failed';
  detail?: string;
}

export interface AutomationLog {
  id: string;
  automation_id: string;
  user_id: string;
  contact_id: string | null;
  trigger_event: string;
  steps_executed: AutomationLogStepResult[];
  status: AutomationLogStatus;
  error_message?: string | null;
  contact?: Contact;
  created_at: string;
}
