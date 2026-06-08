import { memo } from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { getPlatformDetails } from "@/components/icons/platform-metadata";
import type { PlatformAccount } from "./usePlatformDetail";

interface PlatformSelectorProps {
  platformId: string;
  accounts: PlatformAccount[];
  selectedAccountId: string | null;
  onSelect: (id: string) => void;
}

export const PlatformSelector = memo(({
  platformId,
  accounts,
  selectedAccountId,
  onSelect,
}: PlatformSelectorProps) => {
  const platform = getPlatformDetails(platformId);
  const selected = accounts.find((a) => a.id === selectedAccountId);

  if (accounts.length <= 1) return null;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-card border border-border rounded-lg hover:border-primary/50 transition-colors">
          {platform && <platform.icon className={cn("w-4 h-4", platform.textColor)} />}
          <span className="font-medium truncate max-w-[120px]">
            {selected?.username || accounts[0]?.username || platform?.name}
          </span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={4} className="w-[200px] p-1">
        {accounts.map((acc) => (
          <button
            key={acc.id}
            onClick={() => onSelect(acc.id)}
            className={cn(
              "flex items-center justify-between w-full px-3 py-2 text-sm rounded-md transition-colors",
              acc.id === selectedAccountId
                ? "bg-primary/10 text-primary font-bold"
                : "hover:bg-muted"
            )}
          >
            <span className="truncate">{acc.username}</span>
            {acc.id === selectedAccountId && <Check className="w-3.5 h-3.5 shrink-0" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
});

PlatformSelector.displayName = "PlatformSelector";
