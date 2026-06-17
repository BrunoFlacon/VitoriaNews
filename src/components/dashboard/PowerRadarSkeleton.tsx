import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TrendCardSkeleton } from "./TrendCardSkeleton";

export const PowerRadarSkeleton = () => {
  return (
    <div className="space-y-8 animate-pulse">
      {/* HEADER RADAR SKELETON (already rendered in main file as real part) */}
      
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* COLUNA ESQUERDA: IA & REPOSTS SKELETON */}
        <div className="lg:col-span-1 space-y-4">
           <Skeleton className="h-4 w-32 bg-white/5" />
           <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="bg-black/20 border-white/5 p-4 rounded-3xl">
                   <Skeleton className="h-4 w-24 bg-white/5 mb-2" />
                   <Skeleton className="h-16 w-full bg-white/5" />
                </Card>
              ))}
           </div>
        </div>

        {/* COLUNA CENTRAL: MAPA & TENDÊNCIAS SKELETON */}
        <div className="lg:col-span-2 space-y-8">
           <Card className="bg-[#0c0c0e] border-white/5 rounded-[40px] overflow-hidden">
              <CardHeader className="p-8 pb-4">
                 <Skeleton className="h-8 w-48 bg-white/5" />
              </CardHeader>
              <CardContent className="p-8 pt-0">
                 <Skeleton className="h-[400px] w-full rounded-[32px] bg-white/5" />
              </CardContent>
           </Card>

           <div className="space-y-4">
              <div className="flex justify-between items-center px-2">
                 <Skeleton className="h-4 w-40 bg-white/5" />
                 <Skeleton className="h-8 w-24 bg-white/5" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {[1, 2, 4, 5].map((i) => (
                    <TrendCardSkeleton key={i} />
                 ))}
              </div>
           </div>
        </div>

        {/* COLUNA DIREITA: ATAQUES & CAMPANHAS SKELETON */}
        <div className="lg:col-span-1 space-y-8">
           <div className="space-y-4">
              <Skeleton className="h-4 w-32 bg-white/5" />
              {[1, 2].map((i) => (
                <Card key={i} className="p-5 rounded-[28px] border border-white/5 bg-black/40">
                  <Skeleton className="h-4 w-20 bg-white/5 mb-3" />
                  <Skeleton className="h-6 w-full bg-white/5 mb-2" />
                  <Skeleton className="h-3 w-3/4 bg-white/5" />
                </Card>
              ))}
           </div>
        </div>

      </div>
    </div>
  );
};
