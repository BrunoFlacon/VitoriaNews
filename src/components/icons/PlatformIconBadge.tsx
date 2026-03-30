import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";

type Platform = typeof socialPlatforms[number];

interface PlatformIconBadgeProps {
  platform: Platform;
  /** icon size variant */
  size?: "xs" | "sm" | "md" | "lg";
  /** force muted/disabled look regardless of connection status */
  muted?: boolean;
  className?: string;
}

/**
 * Standardized social platform icon badge used across the entire app.
 * Renders the platform SVG icon inside a rounded square with:
 * - Brand background colour (or muted when disconnected/muted)
 * - Diagonal drop-shadow (box-shadow), more pronounced for larger sizes
 * - SVG drop-shadow filter on the inner icon
 * - Smooth hover / transition
 */
export function PlatformIconBadge({
  platform,
  size = "md",
  muted = false,
  className,
}: PlatformIconBadgeProps) {
  const Icon = platform.icon;

  const sizeClasses = {
    xs:  { wrapper: "w-7  h-7  rounded-xl",  icon: "w-[20px] h-[20px]" },
    sm:  { wrapper: "w-9  h-9  rounded-xl",  icon: "w-[26px] h-[26px]" },
    md:  { wrapper: "w-12 h-12 rounded-2xl", icon: "w-[36px] h-[36px]" },
    lg:  { wrapper: "w-14 h-14 rounded-2xl", icon: "w-[44px] h-[44px]" },
  } as const;

  const boxShadow = {
    xs:  muted ? "none" : "2px 3px 5px rgba(0,0,0,0.45)",
    sm:  muted ? "none" : "3px 4px 8px rgba(0,0,0,0.50)",
    md:  muted ? "none" : "5px 6px 12px rgba(0,0,0,0.60)",
    lg:  muted ? "none" : "6px 8px 15px rgba(0,0,0,0.65)",
  } as const;

  const { wrapper, icon } = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 transition-all",
        muted ? "bg-transparent border-[1.5px] border-muted-foreground/30" : platform.color,
        wrapper,
        className
      )}
      style={{ boxShadow: boxShadow[size] }}
    >
      <Icon
        className={cn(icon, muted ? "text-muted-foreground/70" : "text-white")}
        data-active={!muted}
        style={{ filter: muted ? "none" : "drop-shadow(3px 4px 3px rgba(0,0,0,0.55))" }}
      />
    </div>
  );
}
