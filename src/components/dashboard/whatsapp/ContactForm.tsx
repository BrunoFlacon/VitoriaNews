import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: any | null;
  onSaved: () => void;
}

export function ContactForm({ open, onOpenChange, contact, onSaved }: ContactFormProps) {
  const { user } = useAuth();
  const isEdit = !!contact;

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [company, setCompany] = useState("");
  const [saving, setSaving] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setName(contact?.name ?? "");
      setPhone(contact?.phone ?? "");
      setEmail(contact?.email ?? "");
      setCompany(contact?.company ?? "");
      fetchTags();
      if (contact?.id) fetchContactTags(contact.id);
    }
  }, [open, contact]);

  async function fetchTags() {
    if (!user) return;
    const { data } = await supabase
      .from("tags")
      .select("*")
      .eq("user_id", user.id)
      .order("name");
    setTags(data ?? []);
  }

  async function fetchContactTags(contactId: string) {
    const { data } = await supabase
      .from("contact_tags")
      .select("tag_id")
      .eq("contact_id", contactId);
    setSelectedTagIds(data?.map((ct: any) => ct.tag_id) ?? []);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!phone.trim()) {
      toast.error("Phone number is required");
      return;
    }
    if (!user) return;
    setSaving(true);

    try {
      let contactId = contact?.id;

      if (isEdit && contactId) {
        const { error } = await supabase
          .from("contacts")
          .update({
            name: name.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            company: company.trim() || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", contactId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("contacts")
          .insert({
            user_id: user.id,
            name: name.trim() || null,
            phone: phone.trim(),
            email: email.trim() || null,
            company: company.trim() || null,
          })
          .select("id")
          .single();
        if (error) throw error;
        contactId = data.id;
      }

      if (contactId) {
        await supabase.from("contact_tags").delete().eq("contact_id", contactId);
        if (selectedTagIds.length > 0) {
          const rows = selectedTagIds.map(tag_id => ({ contact_id: contactId!, tag_id }));
          await supabase.from("contact_tags").insert(rows);
        }
      }

      toast.success(isEdit ? "Contact updated" : "Contact created");
      onOpenChange(false);
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to save contact";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-popover border-border text-popover-foreground sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-popover-foreground">
            {isEdit ? "Edit Contact" : "Add Contact"}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? "Update the contact details below."
              : "Fill in the details to create a new contact."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="cf-name" className="text-muted-foreground">Name</Label>
            <Input
              id="cf-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-phone" className="text-muted-foreground">
              Phone <span className="text-red-400">*</span>
            </Label>
            <Input
              id="cf-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+55 11 99999-0000"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
            <p className="text-xs text-muted-foreground">
              Include country code, e.g. +55 for Brazil
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-email" className="text-muted-foreground">Email</Label>
            <Input
              id="cf-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cf-company" className="text-muted-foreground">Company</Label>
            <Input
              id="cf-company"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="Acme Inc."
              className="bg-muted border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">Tags</Label>
            {tags.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No tags available. Create tags in Settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {tags.map((tag) => {
                  const selected = selectedTagIds.includes(tag.id);
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => toggleTag(tag.id)}
                      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors cursor-pointer ${
                        selected
                          ? "ring-2 ring-primary ring-offset-1 ring-offset-border"
                          : "opacity-60 hover:opacity-100"
                      }`}
                      style={{
                        backgroundColor: tag.color + "20",
                        color: tag.color,
                      }}
                    >
                      {tag.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <DialogFooter className="bg-popover border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="border-border text-muted-foreground hover:bg-muted"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {saving && <Loader2 className="size-4 animate-spin" />}
              {isEdit ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
