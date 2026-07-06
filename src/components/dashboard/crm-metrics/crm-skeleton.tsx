import { cn } from "@/lib/utils";

export function CrmSkeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export function CrmSkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5", className)}>
      <CrmSkeleton className="h-4 w-32" />
      <CrmSkeleton className="mt-4 h-8 w-20" />
      <CrmSkeleton className="mt-2 h-3 w-16" />
    </div>
  );
}
