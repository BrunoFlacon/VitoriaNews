import React from "react";

const SkeletonCard = ({ className = "" }: { className?: string }) => (
  <div className={`rounded-xl bg-card border border-border/50 overflow-hidden ${className}`}>
    <div className="p-4 md:p-6 space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="w-12 h-12 rounded-xl bg-muted/30" />
        <div className="w-20 h-6 rounded-full bg-muted/30" />
      </div>
      <div className="space-y-2">
        <div className="h-8 w-24 rounded-md bg-muted/20" />
        <div className="h-3 w-16 rounded-md bg-muted/20" />
      </div>
      <div className="h-8 w-full rounded-md bg-muted/10" />
    </div>
  </div>
);

const SkeletonBar = ({ className = "" }: { className?: string }) => (
  <div className={`h-4 rounded-md bg-muted/20 animate-pulse ${className}`} />
);

export const AnalyticsSkeleton = () => (
  <div className="space-y-8 pb-12 w-full animate-fade-in" style={{ contain: 'layout style paint' }}>
    <div className="h-12 w-full rounded-xl bg-card border border-border/50 animate-pulse" />

    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      {[1, 2, 3, 4].map(i => <SkeletonCard key={i} />)}
    </div>

    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
      {[1, 2, 3, 4, 5, 6, 7, 8].map(i => (
        <div key={i} className="p-3 md:p-4 rounded-xl bg-card border border-border/50 animate-pulse space-y-2">
          <SkeletonBar className="w-12 mx-auto" />
          <SkeletonBar className="w-8 mx-auto" />
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <SkeletonCard className="h-72" />
      </div>
      <SkeletonCard className="h-72" />
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[1, 2, 3].map(i => <SkeletonCard key={i} className="h-32" />)}
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <SkeletonCard className="h-48" />
      <SkeletonCard className="h-48" />
    </div>
  </div>
);
