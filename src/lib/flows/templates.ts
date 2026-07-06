/**
 * Starter flow templates.
 *
 * Three pre-canned flows users can clone with one click instead of
 * building from scratch.
 */

export type FlowTemplateNodeType =
  | "start"
  | "send_message"
  | "send_buttons"
  | "send_list"
  | "collect_input"
  | "condition"
  | "set_tag"
  | "handoff"
  | "end";

export interface FlowTemplateNode {
  node_key: string;
  node_type: FlowTemplateNodeType;
  config: Record<string, unknown>;
}

export interface FlowTemplate {
  slug: string;
  name: string;
  description: string;
  icon: "MessageSquare" | "HelpCircle" | "UserPlus";
  trigger_type: "keyword" | "first_inbound_message" | "manual";
  trigger_config: Record<string, unknown>;
  entry_node_key: string;
  nodes: FlowTemplateNode[];
}

// ============================================================
// 1. Welcome menu
// ============================================================
const WELCOME_MENU: FlowTemplate = {
  slug: "welcome_menu",
  name: "Menu de boas-vindas",
  description:
    "Cumprimente clientes que digitam uma palavra-chave e os direcione para o agente certo.",
  icon: "MessageSquare",
  trigger_type: "keyword",
  trigger_config: { keywords: ["suporte", "ajuda", "oi"], match_type: "contains" },
  entry_node_key: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "welcome" },
    },
    {
      node_key: "welcome",
      node_type: "send_buttons",
      config: {
        text: "Olá! 👋 Bem-vindo ao suporte. Você é um cliente existente ou novo por aqui?",
        footer_text: "Toque em um botão abaixo para continuar.",
        buttons: [
          { reply_id: "existing", title: "Cliente existente", next_node_key: "existing_handoff" },
          { reply_id: "new", title: "Novo cliente", next_node_key: "new_handoff" },
        ],
      },
    },
    {
      node_key: "existing_handoff",
      node_type: "handoff",
      config: { note: "Cliente existente precisa de ajuda — verifique o histórico antes de responder." },
    },
    {
      node_key: "new_handoff",
      node_type: "handoff",
      config: { note: "Novo cliente — compartilhe preços e link de onboarding." },
    },
  ],
};

// ============================================================
// 2. FAQ bot
// ============================================================
const FAQ_BOT: FlowTemplate = {
  slug: "faq_bot",
  name: "FAQ automático",
  description:
    "Responda perguntas comuns automaticamente. O cliente escolhe um tópico e o bot responde.",
  icon: "HelpCircle",
  trigger_type: "keyword",
  trigger_config: { keywords: ["faq", "pergunta", "info"], match_type: "contains" },
  entry_node_key: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "topics" },
    },
    {
      node_key: "topics",
      node_type: "send_list",
      config: {
        text: "Com o que posso ajudar?",
        button_label: "Ver tópicos",
        sections: [
          {
            title: "Perguntas frequentes",
            rows: [
              { reply_id: "hours", title: "Horários", next_node_key: "answer_hours" },
              { reply_id: "pricing", title: "Preços", next_node_key: "answer_pricing" },
              { reply_id: "refunds", title: "Reembolsos", next_node_key: "answer_refunds" },
            ],
          },
          {
            title: "Outros",
            rows: [
              { reply_id: "human", title: "Falar com humano", next_node_key: "human_handoff" },
            ],
          },
        ],
      },
    },
    {
      node_key: "answer_hours",
      node_type: "send_message",
      config: { text: "Estamos abertos Seg–Sex, 9h–18h (horário local). Suporte de fim de semana é limitado.", next_node_key: "end" },
    },
    {
      node_key: "answer_pricing",
      node_type: "send_message",
      config: { text: "Nossos preços começam em R$ 49/mês. Visite https://exemplo.com/precos para detalhes.", next_node_key: "end" },
    },
    {
      node_key: "answer_refunds",
      node_type: "send_message",
      config: { text: "Reembolsos são feitos em até 30 dias da compra. Responda com seu número de pedido.", next_node_key: "end" },
    },
    {
      node_key: "human_handoff",
      node_type: "handoff",
      config: { note: "Cliente pediu para falar com um humano." },
    },
    {
      node_key: "end",
      node_type: "end",
      config: {},
    },
  ],
};

// ============================================================
// 3. Lead capture
// ============================================================
const LEAD_CAPTURE: FlowTemplate = {
  slug: "lead_capture",
  name: "Captura de lead",
  description:
    "Receba primeiras mensagens, capture nome + email + empresa e passe para vendas.",
  icon: "UserPlus",
  trigger_type: "first_inbound_message",
  trigger_config: {},
  entry_node_key: "start",
  nodes: [
    {
      node_key: "start",
      node_type: "start",
      config: { next_node_key: "intro" },
    },
    {
      node_key: "intro",
      node_type: "send_message",
      config: { text: "Bem-vindo! 👋 Vou fazer algumas perguntas rápidas para te direcionar à pessoa certa.", next_node_key: "ask_name" },
    },
    {
      node_key: "ask_name",
      node_type: "collect_input",
      config: { prompt_text: "Qual é o seu nome?", var_key: "name", next_node_key: "ask_email" },
    },
    {
      node_key: "ask_email",
      node_type: "collect_input",
      config: { prompt_text: "Obrigado {{vars.name}}! Qual é seu email profissional?", var_key: "email", next_node_key: "ask_company" },
    },
    {
      node_key: "ask_company",
      node_type: "collect_input",
      config: { prompt_text: "Quase lá — qual o nome da sua empresa?", var_key: "company", next_node_key: "handoff" },
    },
    {
      node_key: "handoff",
      node_type: "handoff",
      config: { note: "Novo lead — nome={{vars.name}}, email={{vars.email}}, empresa={{vars.company}}." },
    },
  ],
};

// ============================================================
// Registry
// ============================================================

const TEMPLATES: Record<string, FlowTemplate> = {
  welcome_menu: WELCOME_MENU,
  faq_bot: FAQ_BOT,
  lead_capture: LEAD_CAPTURE,
};

export function getFlowTemplate(slug: string): FlowTemplate | null {
  return TEMPLATES[slug] ?? null;
}

export function listFlowTemplates(): FlowTemplate[] {
  return Object.values(TEMPLATES);
}
