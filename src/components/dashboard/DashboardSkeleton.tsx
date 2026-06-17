import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const DashboardSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* STATS CARDS SKELETON */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="glass-card rounded-2xl border border-white/5 p-6 bg-white/[0.02]">
            <div className="flex items-start justify-between">
              <div className="space-y-3">
                <Skeleton className="h-4 w-24 bg-white/5" />
                <Skeleton className="h-8 w-32 bg-white/5" />
                <Skeleton className="h-4 w-20 bg-white/5" />
              </div>
              <Skeleton className="h-12 w-12 rounded-xl bg-white/5" />
            </div>
          </Card>
        ))}
      </div>

      {/* CHART SKELETON */}
      <Card className="glass-card rounded-2xl border border-white/5 p-8 bg-white/[0.02]">
        <div className="flex items-center justify-between mb-8">
          <div className="space-y-2">
            <Skeleton className="h-6 w-32 bg-white/5" />
            <Skeleton className="h-4 w-48 bg-white/5" />
          </div>
          <div className="flex gap-4">
             <Skeleton className="h-4 w-20 bg-white/5" />
             <Skeleton className="h-4 w-20 bg-white/5" />
          </div>
        </div>
        <Skeleton className="h-[300px] w-full rounded-2xl bg-white/5" />
      </Card>

      {/* RECENT POSTS / MULTI GRID SKELETON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <Card className="rounded-2xl border border-white/5 p-6 bg-white/[0.02]">
            <Skeleton className="h-6 w-40 bg-white/5 mb-6" />
            <div className="space-y-4">
               {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-xl bg-white/5" />
               ))}
            </div>
         </Card>
         <Card className="rounded-2xl border border-white/5 p-6 bg-white/[0.02]">
            <Skeleton className="h-6 w-40 bg-white/5 mb-6" />
            <Skeleton className="h-[200px] w-full rounded-xl bg-white/5" />
         </Card>
      </div>
    </div>
  );
};
