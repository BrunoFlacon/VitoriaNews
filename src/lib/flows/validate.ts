/**
 * Save-time validation for flows.
 */

export interface ValidationIssue {
  severity: "error" | "warning";
  scope: "flow" | "trigger" | "node";
  node_key?: string;
  field?: string;
  message: string;
}

interface FlowInput {
  name: string;
  trigger_type: "keyword" | "first_inbound_message" | "manual";
  trigger_config: Record<string, unknown>;
  entry_node_key: string | null;
}

interface NodeInput {
  node_key: string;
  node_type: string;
  config: Record<string, unknown>;
}

const META_LIMITS = {
  bodyMaxLength: 1024,
  buttonTitleMaxLength: 20,
  maxButtons: 3,
  listRowTitleMaxLength: 24,
  listRowDescriptionMaxLength: 72,
  maxListRowsTotal: 10,
};

export function validateFlowForActivation(
  flow: FlowInput,
  nodes: NodeInput[],
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  if (!flow.name || !flow.name.trim()) {
    issues.push({
      severity: "error",
      scope: "flow",
      field: "name",
      message: "O nome do fluxo é obrigatório.",
    });
  }

  issues.push(...validateTrigger(flow.trigger_type, flow.trigger_config));

  if (!flow.entry_node_key) {
    issues.push({
      severity: "error",
      scope: "flow",
      field: "entry_node_id",
      message: "Selecione um nó de entrada antes de ativar.",
    });
  }

  const keys = new Set(nodes.map((n) => n.node_key));
  if (nodes.length === 0) {
    issues.push({
      severity: "error",
      scope: "flow",
      message: "O fluxo precisa de pelo menos um nó antes da ativação.",
    });
  }

  if (flow.entry_node_key && !keys.has(flow.entry_node_key)) {
    issues.push({
      severity: "error",
      scope: "flow",
      field: "entry_node_id",
      message: `Nó de entrada "${flow.entry_node_key}" não existe.`,
    });
  }

  const seen = new Set<string>();
  for (const n of nodes) {
    if (seen.has(n.node_key)) {
      issues.push({
        severity: "error",
        scope: "node",
        node_key: n.node_key,
        message: `Chave duplicada "${n.node_key}".`,
      });
    }
    seen.add(n.node_key);
  }

  for (const n of nodes) {
    issues.push(...validateNode(n, keys));
  }

  if (flow.entry_node_key && keys.has(flow.entry_node_key)) {
    const reached = reachableFromEntry(flow.entry_node_key, nodes);
    for (const n of nodes) {
      if (!reached.has(n.node_key)) {
        issues.push({
          severity: "warning",
          scope: "node",
          node_key: n.node_key,
          message: `Nó "${n.node_key}" inalcançável a partir do nó de entrada.`,
        });
      }
    }
  }

  return issues;
}

function validateTrigger(
  trigger_type: FlowInput["trigger_type"],
  trigger_config: Record<string, unknown>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  if (trigger_type === "keyword") {
    const keywords = Array.isArray(trigger_config.keywords)
      ? (trigger_config.keywords as unknown[])
      : null;
    if (!keywords || keywords.length === 0) {
      issues.push({
        severity: "error",
        scope: "trigger",
        field: "trigger_config.keywords",
        message: "Trigger por palavra-chave precisa de ao menos uma palavra.",
      });
    } else {
      const blanks = keywords.filter(
        (k) => typeof k !== "string" || !k.trim(),
      ).length;
      if (blanks > 0) {
        issues.push({
          severity: "warning",
          scope: "trigger",
          field: "trigger_config.keywords",
          message: `${blanks} palavra(s) em branco — não vão corresponder a nada.`,
        });
      }
    }
  }
  return issues;
}

function validateNode(
  node: NodeInput,
  knownKeys: Set<string>,
): ValidationIssue[] {
  const issues: ValidationIssue[] = [];

  switch (node.node_type) {
    case "start": {
      const cfg = node.config as { next_node_key?: string };
      if (!cfg.next_node_key) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "next_node_key", message: "Nó inicial deve apontar para um próximo nó.",
        });
      } else if (!knownKeys.has(cfg.next_node_key)) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "next_node_key", message: `Início aponta para nó "${cfg.next_node_key}" que não existe.`,
        });
      }
      break;
    }

    case "send_message": {
      const cfg = node.config as { text?: string; next_node_key?: string };
      if (!cfg.text?.trim()) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "text", message: "Nó de mensagem precisa de um texto.",
        });
      }
      if (!cfg.next_node_key) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "next_node_key", message: "Nó de mensagem deve apontar para um próximo nó.",
        });
      } else if (!knownKeys.has(cfg.next_node_key)) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "next_node_key", message: `Mensagem aponta para nó "${cfg.next_node_key}" que não existe.`,
        });
      }
      break;
    }

    case "send_buttons": {
      const cfg = node.config as {
        text?: string;
        buttons?: Array<{ reply_id?: string; title?: string; next_node_key?: string }>;
      };
      if (!cfg.text?.trim()) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "text", message: "Nó de botões precisa de um texto.",
        });
      }
      const btns = cfg.buttons ?? [];
      if (btns.length < 1) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "buttons", message: "Botões precisa de ao menos 1 botão.",
        });
      }
      if (btns.length > META_LIMITS.maxButtons) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "buttons", message: `WhatsApp permite no máximo ${META_LIMITS.maxButtons} botões.`,
        });
      }
      const seenIds = new Set<string>();
      btns.forEach((b, i) => {
        if (!b.reply_id?.trim()) {
          issues.push({
            severity: "error", scope: "node", node_key: node.node_key,
            field: `buttons.${i}.reply_id`, message: `Botão ${i + 1} precisa de um reply_id.`,
          });
        } else if (seenIds.has(b.reply_id)) {
          issues.push({
            severity: "error", scope: "node", node_key: node.node_key,
            field: `buttons.${i}.reply_id`, message: `Reply_id duplicado "${b.reply_id}".`,
          });
        }
        if (b.reply_id) seenIds.add(b.reply_id);
        if (!b.title?.trim()) {
          issues.push({
            severity: "error", scope: "node", node_key: node.node_key,
            field: `buttons.${i}.title`, message: `Botão ${i + 1} precisa de um título.`,
          });
        } else if (b.title.length > META_LIMITS.buttonTitleMaxLength) {
          issues.push({
            severity: "error", scope: "node", node_key: node.node_key,
            field: `buttons.${i}.title`, message: `Botão ${i + 1} título excede ${META_LIMITS.buttonTitleMaxLength} caracteres.`,
          });
        }
        if (!b.next_node_key) {
          issues.push({
            severity: "error", scope: "node", node_key: node.node_key,
            field: `buttons.${i}.next_node_key`, message: `Botão ${i + 1} precisa de um próximo nó.`,
          });
        } else if (!knownKeys.has(b.next_node_key)) {
          issues.push({
            severity: "error", scope: "node", node_key: node.node_key,
            field: `buttons.${i}.next_node_key`, message: `Botão ${i + 1} aponta para nó "${b.next_node_key}" que não existe.`,
          });
        }
      });
      break;
    }

    case "send_list": {
      const cfg = node.config as {
        text?: string;
        button_label?: string;
        sections?: Array<{
          title?: string;
          rows?: Array<{ reply_id?: string; title?: string; description?: string; next_node_key?: string }>;
        }>;
      };
      if (!cfg.text?.trim()) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "text", message: "Nó de lista precisa de um texto.",
        });
      }
      if (!cfg.button_label?.trim()) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "button_label", message: "Lista precisa de um rótulo de botão.",
        });
      }
      const sections = cfg.sections ?? [];
      const totalRows = sections.reduce((sum, s) => sum + (s.rows?.length ?? 0), 0);
      if (totalRows < 1) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "sections", message: "Lista precisa de ao menos 1 linha.",
        });
      }
      if (totalRows > META_LIMITS.maxListRowsTotal) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "sections", message: `Lista permite no máximo ${META_LIMITS.maxListRowsTotal} linhas.`,
        });
      }
      const seenIds = new Set<string>();
      sections.forEach((section, si) => {
        const rows = section.rows ?? [];
        rows.forEach((row, ri) => {
          if (!row.reply_id?.trim()) {
            issues.push({
              severity: "error", scope: "node", node_key: node.node_key,
              field: `sections.${si}.rows.${ri}.reply_id`, message: `Linha ${ri + 1} precisa de um reply_id.`,
            });
          } else if (seenIds.has(row.reply_id)) {
            issues.push({
              severity: "error", scope: "node", node_key: node.node_key,
              field: `sections.${si}.rows.${ri}.reply_id`, message: `Reply_id duplicado "${row.reply_id}".`,
            });
          }
          if (row.reply_id) seenIds.add(row.reply_id);
          if (!row.title?.trim()) {
            issues.push({
              severity: "error", scope: "node", node_key: node.node_key,
              field: `sections.${si}.rows.${ri}.title`, message: `Linha ${ri + 1} precisa de um título.`,
            });
          } else if (row.title.length > META_LIMITS.listRowTitleMaxLength) {
            issues.push({
              severity: "error", scope: "node", node_key: node.node_key,
              field: `sections.${si}.rows.${ri}.title`, message: `Linha ${ri + 1} título excede ${META_LIMITS.listRowTitleMaxLength} caracteres.`,
            });
          }
          if (!row.next_node_key) {
            issues.push({
              severity: "error", scope: "node", node_key: node.node_key,
              field: `sections.${si}.rows.${ri}.next_node_key`, message: `Linha ${ri + 1} precisa de um próximo nó.`,
            });
          } else if (!knownKeys.has(row.next_node_key)) {
            issues.push({
              severity: "error", scope: "node", node_key: node.node_key,
              field: `sections.${si}.rows.${ri}.next_node_key`, message: `Linha ${ri + 1} aponta para nó "${row.next_node_key}" que não existe.`,
            });
          }
        });
      });
      break;
    }

    case "collect_input": {
      const cfg = node.config as { prompt_text?: string; var_key?: string; next_node_key?: string };
      if (!cfg.prompt_text?.trim()) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "prompt_text", message: "Coleta de input precisa de um texto de prompt.",
        });
      }
      if (!cfg.var_key?.trim()) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "var_key", message: "Coleta precisa de um var_key.",
        });
      } else if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(cfg.var_key)) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "var_key", message: `var_key "${cfg.var_key}" deve ser alfanumérico.`,
        });
      }
      if (!cfg.next_node_key) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "next_node_key", message: "Coleta deve apontar para um próximo nó.",
        });
      } else if (!knownKeys.has(cfg.next_node_key)) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "next_node_key", message: `Coleta aponta para nó "${cfg.next_node_key}" que não existe.`,
        });
      }
      break;
    }

    case "condition": {
      const cfg = node.config as {
        subject?: string; subject_key?: string; operator?: string;
        value?: string; true_next?: string; false_next?: string;
      };
      if (!cfg.subject || !["var", "tag", "contact_field"].includes(cfg.subject)) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "subject", message: "Condição precisa de um subject.",
        });
      }
      if (!cfg.subject_key?.trim()) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "subject_key", message: "Condição precisa de um subject_key.",
        });
      }
      if (!cfg.operator || !["equals", "contains", "present", "absent"].includes(cfg.operator)) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "operator", message: "Condição precisa de um operador.",
        });
      }
      for (const branch of ["true_next", "false_next"] as const) {
        const key = cfg[branch];
        if (!key) {
          issues.push({
            severity: "error", scope: "node", node_key: node.node_key,
            field: branch, message: `Condição precisa de um nó para o ramo "${branch === "true_next" ? "verdadeiro" : "falso"}".`,
          });
        } else if (!knownKeys.has(key)) {
          issues.push({
            severity: "error", scope: "node", node_key: node.node_key,
            field: branch, message: `Condição aponta para nó "${key}" que não existe.`,
          });
        }
      }
      break;
    }

    case "set_tag": {
      const cfg = node.config as { mode?: string; tag_id?: string; next_node_key?: string };
      if (!cfg.mode || !["add", "remove"].includes(cfg.mode)) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "mode", message: "Set-tag precisa de um mode (add/remove).",
        });
      }
      if (!cfg.tag_id) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "tag_id", message: "Set-tag precisa de uma tag.",
        });
      }
      if (!cfg.next_node_key) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "next_node_key", message: "Set-tag deve apontar para um próximo nó.",
        });
      } else if (!knownKeys.has(cfg.next_node_key)) {
        issues.push({
          severity: "error", scope: "node", node_key: node.node_key,
          field: "next_node_key", message: `Set-tag aponta para nó "${cfg.next_node_key}" que não existe.`,
        });
      }
      break;
    }

    case "handoff":
    case "end":
      break;

    default:
      issues.push({
        severity: "error", scope: "node", node_key: node.node_key,
        message: `Tipo de nó desconhecido "${node.node_type}".`,
      });
  }

  return issues;
}

export function reachableFromEntry(
  entryKey: string,
  nodes: NodeInput[],
): Set<string> {
  const byKey = new Map<string, NodeInput>();
  for (const n of nodes) byKey.set(n.node_key, n);
  const visited = new Set<string>();
  const queue: string[] = [entryKey];
  while (queue.length > 0) {
    const key = queue.shift() as string;
    if (visited.has(key)) continue;
    visited.add(key);
    const node = byKey.get(key);
    if (!node) continue;
    for (const next of outgoingEdges(node)) {
      if (!visited.has(next)) queue.push(next);
    }
  }
  return visited;
}

function outgoingEdges(node: NodeInput): string[] {
  switch (node.node_type) {
    case "start":
    case "send_message":
    case "send_media":
    case "collect_input":
    case "set_tag": {
      const cfg = node.config as { next_node_key?: string };
      return cfg.next_node_key ? [cfg.next_node_key] : [];
    }
    case "condition": {
      const cfg = node.config as { true_next?: string; false_next?: string };
      const out: string[] = [];
      if (cfg.true_next) out.push(cfg.true_next);
      if (cfg.false_next) out.push(cfg.false_next);
      return out;
    }
    case "send_buttons": {
      const cfg = node.config as { buttons?: Array<{ next_node_key?: string }> };
      return (cfg.buttons ?? []).map((b) => b.next_node_key).filter((k): k is string => !!k);
    }
    case "send_list": {
      const cfg = node.config as { sections?: Array<{ rows?: Array<{ next_node_key?: string }> }> };
      const out: string[] = [];
      for (const s of cfg.sections ?? []) {
        for (const r of s.rows ?? []) {
          if (r.next_node_key) out.push(r.next_node_key);
        }
      }
      return out;
    }
    case "handoff":
    case "end":
    default:
      return [];
  }
}
