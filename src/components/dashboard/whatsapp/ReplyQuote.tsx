"use client";

import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReplyQuoteProps {
  authorLabel: string;
  preview: string;
  onDismiss?: () => void;
  onPrimary?: boolean;
}

export function ReplyQuote({
  authorLabel,
  preview,
  onDismiss,
  onPrimary = false,
}: ReplyQuoteProps) {
  const isChip = !!onDismiss;
  return (
    <div
      className={cn(
        "flex items-start gap-2 border-l-2 px-2 py-1",
        onPrimary ? "border-primary-foreground/50" : "border-primary",
        isChip
          ? "rounded-md bg-muted/80"
          : onPrimary
            ? "mb-1.5 rounded-md bg-primary-foreground/15"
            : "mb-1.5 rounded-md bg-background/20",
      )}
    >
      <div className="min-w-0 flex-1 overflow-hidden">
        <div
          className={cn(
            "truncate text-[11px] font-medium",
            onPrimary ? "text-primary-foreground" : "text-primary",
          )}
        >
          {authorLabel}
        </div>
        <div className="whitespace-pre-wrap break-words text-xs text-foreground/80">
          {preview}
        </div>
      </div>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Cancel reply"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

/** Build the one-line preview text shown inside a reply quote.
 *  Adapted for the current project's message shape (uses `content` field instead of `content_text`). */
export function buildReplyPreview(message: any): string {
  if (message.content) return message.content;
  const mediaType = message.metadata?.media_type || message.content_type;
  switch (mediaType) {
    case "image":
      return "[Image]";
    case "video":
      return "[Video]";
    case "audio":
    case "voice":
      return "[Audio]";
    case "document":
      return "[Document]";
    case "location":
      return "[Location]";
    case "template":
      return "[Template]";
    default:
      return "[Message]";
  }
}
