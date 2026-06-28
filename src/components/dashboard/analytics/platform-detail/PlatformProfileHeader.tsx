import { memo } from "react";
import { Users, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { getPlatformDetails, getPlatformName } from "./platformConfigs";
import type { PlatformAccount } from "./usePlatformDetail";

interface PlatformProfileHeaderProps {
  account: PlatformAccount | null;
  platformId: string;
  followerCount?: number;
  postCount?: number;
}

export const PlatformProfileHeader = memo(({
  account,
  platformId,
  followerCount,
  postCount,
}: PlatformProfileHeaderProps) => {
  const platform = getPlatformDetails(platformId);

  if (!account) {
    return (
      <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/50">
        <div className="w-12 h-12 rounded-full bg-muted" />
        <div>
          <p className="text-sm font-bold">{getPlatformName(platformId)}</p>
          <p className="text-xs text-muted-foreground">Nenhuma conta conectada</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/20 border border-border/50">
      <Avatar className="w-12 h-12 border-2 border-border">
        <AvatarImage src={account.profile_picture || ""} alt={account.username || ""} />
        <AvatarFallback className={cn("text-white text-lg", platform?.color || "bg-primary")}>
          {(account.username || "?")[0]?.toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-bold truncate">{account.username || getPlatformName(platformId)}</p>
          {platform && <platform.icon className={cn("w-4 h-4 shrink-0", platform.textColor)} />}
        </div>
        <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
          {followerCount !== undefined && (
            <span className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              {followerCount.toLocaleString('pt-BR')} seguidores
            </span>
          )}
          {postCount !== undefined && (
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {postCount} posts
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

PlatformProfileHeader.displayName = "PlatformProfileHeader";
