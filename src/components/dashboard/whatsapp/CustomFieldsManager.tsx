import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Plus, Trash2 } from "lucide-react";

interface CustomField {
  id: string;
  field_name: string;
  field_type: string;
  user_id: string;
}

interface CustomFieldsManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomFieldsManager({ open, onOpenChange }: CustomFieldsManagerProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-popover text-popover-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">Custom fields</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Define extra contact fields (e.g. ZIP code, lead source). They appear on every contact.
          </DialogDescription>
        </DialogHeader>
        <CustomFieldsPanel />
      </DialogContent>
    </Dialog>
  );
}

export function CustomFieldsPanel() {
  const { user } = useAuth();
  const [fields, setFields] = useState<CustomField[]>([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const fetchFields = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data } = await supabase
      .from("custom_fields")
      .select("*")
      .eq("user_id", user.id)
      .order("field_name");
    setFields((data as CustomField[] | null) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) fetchFields();
  }, [user, fetchFields]);

  function isDuplicate(name: string, exceptId?: string): boolean {
    const lower = name.toLowerCase();
    return fields.some(f => f.id !== exceptId && f.field_name.toLowerCase() === lower);
  }

  async function handleCreate() {
    const name = newName.trim();
    if (!name || !user) return;
    if (isDuplicate(name)) {
      toast.error(`A field named "${name}" already exists.`);
      return;
    }
    setCreating(true);
    const { error } = await supabase.from("custom_fields").insert({
      field_name: name,
      field_type: "text",
      user_id: user.id,
    });
    setCreating(false);
    if (error) {
      toast.error("Could not create field.");
      return;
    }
    toast.success(`Created "${name}".`);
    setNewName("");
    await fetchFields();
  }

  async function handleRename(field: CustomField, nextName: string): Promise<boolean> {
    const name = nextName.trim();
    if (!name || name === field.field_name) return true;
    if (isDuplicate(name, field.id)) {
      toast.error(`A field named "${name}" already exists.`);
      return false;
    }
    setBusyId(field.id);
    const { error } = await supabase
      .from("custom_fields")
      .update({ field_name: name })
      .eq("id", field.id);
    setBusyId(null);
    if (error) {
      toast.error("Could not rename field.");
      return false;
    }
    await fetchFields();
    return true;
  }

  async function handleDelete(field: CustomField) {
    if (!window.confirm(`Delete "${field.field_name}"? This cannot be undone.`)) return;
    setBusyId(field.id);
    const { error } = await supabase
      .from("custom_fields")
      .delete()
      .eq("id", field.id);
    setBusyId(null);
    if (error) {
      toast.error("Could not delete field.");
      return;
    }
    toast.success(`Deleted "${field.field_name}".`);
    await fetchFields();
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); void handleCreate(); } }}
          placeholder="New field name…"
          className="bg-muted text-foreground"
        />
        <Button
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
          className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0"
        >
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Add
        </Button>
      </div>

      <div className="max-h-72 overflow-y-auto rounded-md border border-border">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : fields.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No custom fields yet.</p>
        ) : (
          <ul className="divide-y divide-border">
            {fields.map((field) => (
              <FieldRow
                key={field.id}
                field={field}
                busy={busyId === field.id}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function FieldRow({
  field,
  busy,
  onRename,
  onDelete,
}: {
  field: CustomField;
  busy: boolean;
  onRename: (field: CustomField, name: string) => Promise<boolean>;
  onDelete: (field: CustomField) => void;
}) {
  const [name, setName] = useState(field.field_name);

  async function commit() {
    if (name.trim() === field.field_name) {
      setName(field.field_name);
      return;
    }
    const ok = await onRename(field, name);
    if (!ok) setName(field.field_name);
  }

  return (
    <li className="flex items-center gap-2 px-3 py-2">
      <Input
        value={name}
        disabled={busy}
        onChange={(e) => setName(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
        aria-label={`Rename ${field.field_name}`}
        className="focus:border-primary h-8 border-transparent bg-transparent text-foreground hover:border-border"
      />
      <Button
        variant="ghost"
        size="icon"
        disabled={busy}
        onClick={() => onDelete(field)}
        title="Delete field"
        className="shrink-0 text-muted-foreground hover:text-red-400 h-8 w-8"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </Button>
    </li>
  );
}
