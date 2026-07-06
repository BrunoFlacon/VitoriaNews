"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { slugify, type BuilderNode, type NodeType } from "../shared";
import { TextRow, NextNodeRow } from "./fields";

let _replyIdCounter = 0;
function freshReplyId(): string {
  _replyIdCounter += 1;
  return `r_${Date.now().toString(36)}_${_replyIdCounter}`;
}

export function NodeConfigForm({
  node, allNodes, showAdvanced, onUpdateConfig,
}: {
  node: BuilderNode; allNodes: BuilderNode[]; showAdvanced?: boolean;
  onUpdateConfig: (patch: Record<string, unknown>) => void;
}) {
  const cfg = node.config;

  switch (node.node_type) {
    case "start":
      return (
        <NextNodeRow value={(cfg as any).next_node_key ?? ""} allNodes={allNodes}
          currentKey={node.node_key} onChange={(v) => onUpdateConfig({ next_node_key: v })} label="Primeiro nó" />
      );

    case "send_message":
      return (
        <div className="flex flex-col gap-3">
          <TextRow label="Texto da mensagem" value={(cfg as any).text ?? ""} onChange={(v) => onUpdateConfig({ text: v })} rows={3} />
          <NextNodeRow value={(cfg as any).next_node_key ?? ""} allNodes={allNodes}
            currentKey={node.node_key} onChange={(v) => onUpdateConfig({ next_node_key: v })} label="Próximo nó" />
        </div>
      );

    case "send_buttons": {
      const buttons: Array<any> = Array.isArray(cfg.buttons) ? cfg.buttons : [];
      return (
        <div className="flex flex-col gap-3">
          <TextRow label="Texto" value={(cfg as any).text ?? ""} onChange={(v: string) => onUpdateConfig({ text: v })} rows={2} />
          <TextRow label="Cabeçalho (opcional)" value={(cfg as any).header_text ?? ""} onChange={(v) => onUpdateConfig({ header_text: v })} />
          <TextRow label="Rodapé (opcional)" value={(cfg as any).footer_text ?? ""} onChange={(v) => onUpdateConfig({ footer_text: v })} />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Botões ({buttons.length}/3)</label>
            {buttons.map((btn, i) => (
              <div key={i} className="mb-2 flex items-end gap-2">
                <div className="flex-1">
                  <input className="w-full rounded-md border border-border bg-muted px-3 py-1.5 text-xs" placeholder="Título"
                    value={btn.title ?? ""} onChange={(e) => {
                      const next = [...buttons];
                      next[i] = { ...next[i], title: e.target.value, reply_id: next[i].reply_id || freshReplyId() };
                      onUpdateConfig({ buttons: next });
                    }} />
                </div>
                <NextNodeRow value={btn.next_node_key ?? ""} allNodes={allNodes}
                  currentKey={node.node_key} onChange={(v) => {
                    const next = [...buttons]; next[i] = { ...next[i], next_node_key: v };
                    onUpdateConfig({ buttons: next });
                  }} label="" />
                <button type="button" onClick={() => {
                  onUpdateConfig({ buttons: buttons.filter((_, j) => j !== i) });
                }} className="p-1 text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
              </div>
            ))}
            {buttons.length < 3 && (
              <Button variant="outline" size="sm" onClick={() =>
                onUpdateConfig({ buttons: [...buttons, { reply_id: freshReplyId(), title: "", next_node_key: "" }] })
              } className="mt-1"><Plus className="h-3 w-3 mr-1" /> Adicionar botão</Button>
            )}
          </div>
        </div>
      );
    }

    case "send_list": {
      const sections: Array<any> = Array.isArray(cfg.sections) ? cfg.sections : [];
      // Flatten rows for editing with section index
      interface FlatRow { sectionIdx: number; rowIdx: number; reply_id: string; title: string; description?: string; next_node_key: string; }
      const flatRows: FlatRow[] = [];
      sections.forEach((s, si) => {
        (s.rows ?? []).forEach((r: any, ri: number) => {
          flatRows.push({ sectionIdx: si, rowIdx: ri, reply_id: r.reply_id ?? "", title: r.title ?? "", description: r.description ?? "", next_node_key: r.next_node_key ?? "" });
        });
      });

      return (
        <div className="flex flex-col gap-3">
          <TextRow label="Texto" value={(cfg as any).text ?? ""} onChange={(v) => onUpdateConfig({ text: v })} rows={2} />
          <TextRow label="Rótulo do botão" value={(cfg as any).button_label ?? "Ver opções"} onChange={(v) => onUpdateConfig({ button_label: v })} />
          <TextRow label="Cabeçalho (opcional)" value={(cfg as any).header_text ?? ""} onChange={(v) => onUpdateConfig({ header_text: v })} />
          <TextRow label="Rodapé (opcional)" value={(cfg as any).footer_text ?? ""} onChange={(v) => onUpdateConfig({ footer_text: v })} />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Opções ({flatRows.length}/10)</label>
            {flatRows.map((row, i) => (
              <div key={i} className="mb-2 flex flex-col gap-1 rounded-md border border-border bg-muted/30 p-2">
                <div className="flex items-end gap-2">
                  <input className="flex-1 rounded-md border border-border bg-muted px-3 py-1.5 text-xs" placeholder="Título"
                    value={row.title} onChange={(e) => {
                      const si = row.sectionIdx; const ri = row.rowIdx;
                      const next = [...sections.map(s => ({ ...s, rows: [...(s.rows ?? [])] }))];
                      next[si].rows[ri] = { ...next[si].rows[ri], title: e.target.value, reply_id: next[si].rows[ri].reply_id || freshReplyId() };
                      onUpdateConfig({ sections: next });
                    }} />
                  <button type="button" onClick={() => {
                    const si = row.sectionIdx; const ri = row.rowIdx;
                    const next = [...sections.map(s => ({ ...s, rows: [...(s.rows ?? [])] }))];
                    next[si].rows.splice(ri, 1);
                    if (next[si].rows.length === 0) next.splice(si, 1);
                    onUpdateConfig({ sections: next.length > 0 ? next : [] });
                  }} className="p-1 text-red-400 hover:text-red-300"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
                <input className="w-full rounded-md border border-border bg-muted px-3 py-1.5 text-xs" placeholder="Descrição (opcional)"
                  value={row.description ?? ""} onChange={(e) => {
                    const si = row.sectionIdx; const ri = row.rowIdx;
                    const next = [...sections.map(s => ({ ...s, rows: [...(s.rows ?? [])] }))];
                    next[si].rows[ri] = { ...next[si].rows[ri], description: e.target.value };
                    onUpdateConfig({ sections: next });
                  }} />
                <NextNodeRow value={row.next_node_key ?? ""} allNodes={allNodes}
                  currentKey={node.node_key} onChange={(v) => {
                    const si = row.sectionIdx; const ri = row.rowIdx;
                    const next = [...sections.map(s => ({ ...s, rows: [...(s.rows ?? [])] }))];
                    next[si].rows[ri] = { ...next[si].rows[ri], next_node_key: v };
                    onUpdateConfig({ sections: next });
                  }} label="" />
              </div>
            ))}
            {flatRows.length < 10 && (
              <Button variant="outline" size="sm" onClick={() => {
                const next = sections.length === 0
                  ? [{ title: "", rows: [{ reply_id: freshReplyId(), title: "Nova opção", next_node_key: "" }] }]
                  : [...sections.map(s => ({ ...s, rows: [...(s.rows ?? [])] }))];
                next[next.length - 1].rows.push({ reply_id: freshReplyId(), title: "", next_node_key: "" });
                onUpdateConfig({ sections: next });
              }} className="mt-1"><Plus className="h-3 w-3 mr-1" /> Adicionar opção</Button>
            )}
          </div>
        </div>
      );
    }

    case "send_media":
      return (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Tipo de mídia</label>
            <Select value={(cfg as any).media_type ?? "image"} onValueChange={(v) => onUpdateConfig({ media_type: v })}>
              <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="video">Vídeo</SelectItem>
                <SelectItem value="document">Documento</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TextRow label="URL da mídia" value={(cfg as any).media_url ?? ""} onChange={(v) => onUpdateConfig({ media_url: v })} />
          <TextRow label="Nome do arquivo (docs)" value={(cfg as any).filename ?? ""} onChange={(v) => onUpdateConfig({ filename: v })} />
          <TextRow label="Legenda" value={(cfg as any).caption ?? ""} onChange={(v) => onUpdateConfig({ caption: v })} rows={2} />
          <NextNodeRow value={(cfg as any).next_node_key ?? ""} allNodes={allNodes}
            currentKey={node.node_key} onChange={(v) => onUpdateConfig({ next_node_key: v })} label="Próximo nó" />
        </div>
      );

    case "collect_input":
      return (
        <div className="flex flex-col gap-3">
          <TextRow label="Texto do prompt" value={(cfg as any).prompt_text ?? ""} onChange={(v) => onUpdateConfig({ prompt_text: v })} rows={2} />
          <TextRow label="Nome da variável (var_key)" value={(cfg as any).var_key ?? ""} onChange={(v) => onUpdateConfig({ var_key: slugify(v, "answer") })} />
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Validação (v2 — reservado)</label>
            <Select value={(cfg as any).validation ?? "any"} onValueChange={(v) => onUpdateConfig({ validation: v })}>
              <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Qualquer texto</SelectItem>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="phone">Telefone</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <NextNodeRow value={(cfg as any).next_node_key ?? ""} allNodes={allNodes}
            currentKey={node.node_key} onChange={(v) => onUpdateConfig({ next_node_key: v })} label="Próximo nó" />
        </div>
      );

    case "condition":
      return (
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Sujeito</label>
              <Select value={(cfg as any).subject ?? "var"} onValueChange={(v) => onUpdateConfig({ subject: v })}>
                <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="var">Variável (vars)</SelectItem>
                  <SelectItem value="tag">Tag</SelectItem>
                  <SelectItem value="contact_field">Campo do contato</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Operador</label>
              <Select value={(cfg as any).operator ?? "equals"} onValueChange={(v) => onUpdateConfig({ operator: v })}>
                <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="equals">Igual a</SelectItem>
                  <SelectItem value="contains">Contém</SelectItem>
                  <SelectItem value="present">Presente</SelectItem>
                  <SelectItem value="absent">Ausente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <TextRow label="Chave do sujeito (subject_key)" value={(cfg as any).subject_key ?? ""} onChange={(v) => onUpdateConfig({ subject_key: v })} />
          <TextRow label="Valor de comparação" value={(cfg as any).value ?? ""} onChange={(v) => onUpdateConfig({ value: v })} />
          <div className="grid grid-cols-2 gap-3">
            <NextNodeRow value={(cfg as any).true_next ?? ""} allNodes={allNodes}
              currentKey={node.node_key} onChange={(v) => onUpdateConfig({ true_next: v })} label="Se verdadeiro" />
            <NextNodeRow value={(cfg as any).false_next ?? ""} allNodes={allNodes}
              currentKey={node.node_key} onChange={(v) => onUpdateConfig({ false_next: v })} label="Se falso" />
          </div>
        </div>
      );

    case "set_tag":
      return (
        <div className="flex flex-col gap-3">
          <div>
            <label className="mb-1 block text-xs text-muted-foreground">Modo</label>
            <Select value={(cfg as any).mode ?? "add"} onValueChange={(v) => onUpdateConfig({ mode: v })}>
              <SelectTrigger className="bg-muted"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="add">Adicionar tag</SelectItem>
                <SelectItem value="remove">Remover tag</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <TextRow label="ID da tag" value={(cfg as any).tag_id ?? ""} onChange={(v) => onUpdateConfig({ tag_id: v })} />
          <NextNodeRow value={(cfg as any).next_node_key ?? ""} allNodes={allNodes}
            currentKey={node.node_key} onChange={(v) => onUpdateConfig({ next_node_key: v })} label="Próximo nó" />
        </div>
      );

    case "handoff":
      return (
        <div className="flex flex-col gap-3">
          <TextRow label="Nota interna" value={(cfg as any).note ?? ""} onChange={(v) => onUpdateConfig({ note: v })} rows={3} />
          <TextRow label="Atribuir a (user_id, opcional)" value={(cfg as any).assign_to ?? ""} onChange={(v) => onUpdateConfig({ assign_to: v })} />
        </div>
      );

    case "end":
      return <p className="text-xs text-muted-foreground">Nó terminal. O fluxo termina aqui.</p>;

    default:
      return <p className="text-xs text-muted-foreground">Configuração não disponível para este tipo de nó.</p>;
  }
}
