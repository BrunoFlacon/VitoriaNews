import { cn } from "@/lib/utils";
import type { PresenceStatus } from "@/lib/presence";

export const PRESENCE_DOT_CLASS: Record<PresenceStatus, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  offline: "bg-muted-foreground/50",
};

export function PresenceDot({
  status,
  label,
  className,
}: {
  status: PresenceStatus;
  label?: string;
  className?: string;
}) {
  return (
    <span
      role={label ? "img" : undefined}
      aria-label={label}
      title={label}
      className={cn(
        "inline-block size-2 shrink-0 rounded-full",
        PRESENCE_DOT_CLASS[status],
        className,
      )}
    />
  );
}
