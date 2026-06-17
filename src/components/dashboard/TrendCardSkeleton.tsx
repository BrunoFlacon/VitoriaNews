import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const TrendCardSkeleton = () => {
  return (
    <Card className="bg-card/40 border-white/5 overflow-hidden relative">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <Skeleton className="h-5 w-16 rounded-full bg-white/5" />
          <div className="flex flex-col items-end gap-1">
            <Skeleton className="h-4 w-12 bg-white/5" />
            <Skeleton className="h-3 w-20 bg-white/5" />
          </div>
        </div>
        <Skeleton className="h-6 w-3/4 mt-4 bg-white/5" />
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-10 bg-white/5" />
            <Skeleton className="h-6 w-16 bg-white/5" />
          </div>
          <div className="h-8 w-[1px] bg-white/5" />
          <div className="flex flex-col gap-2">
            <Skeleton className="h-3 w-10 bg-white/5" />
            <Skeleton className="h-6 w-16 bg-white/5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};
