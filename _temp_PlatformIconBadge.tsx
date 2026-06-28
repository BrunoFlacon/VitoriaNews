import { cn } from "@/lib/utils";
import { socialPlatforms } from "@/components/icons/platform-metadata";
import { Globe } from "lucide-react";

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
 * - Subtle diagonal drop-shadow (not too strong)
 * - Smooth transition on connection state changes
 *
 * Design calibration:
 *   - Connected: brand color bg + subtle drop-shadow (toned down from previous version)
 *   - Disconnected: dark muted bg, opacity-70 (slightly visible, not blown out)
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

  // Subtle shadows — noticeably lighter than before
  const boxShadow = {
    xs:  "2px 3px 5px rgba(0,0,0,0.30)",
    sm:  "3px 4px 7px rgba(0,0,0,0.35)",
    md:  "4px 5px 10px rgba(0,0,0,0.40)",
    lg:  "5px 6px 12px rgba(0,0,0,0.45)",
  } as const;

  const { wrapper, icon } = sizeClasses[size];

  return (
    <div
      className={cn(
        "flex items-center justify-center shrink-0 transition-all duration-500",
        muted
          // Disconnected: dark bg, no border ring, opacity-70 (not too faded)
          ? "bg-[#1c1f30]/60 border border-white/8 opacity-70 grayscale-[60%]"
          // Connected: brand color, very subtle ring, no heavy scale transform
          : cn(platform.color, "shadow-md"),
        wrapper,
        className
      )}
      style={{
        // Connected: subtle directional shadow (not the heavy branded shadow from before)
        boxShadow: muted ? "none" : boxShadow[size],
        // Instagram gradient override
        background: !muted && platform.id === 'instagram' ? platform.gradient : undefined,
      }}
    >
      {Icon ? (
        <Icon
          className={cn(
            icon,
            muted ? "text-slate-400/60" : "text-white"
          )}
          data-active={!muted}
          style={{
            filter: muted ? "none" : "drop-shadow(0px 1px 1px rgba(0,0,0,0.25))",
          }}
        />
      ) : (
        <Globe className={cn(icon, "text-slate-400/60")} />
      )}
    </div>
  );
}
