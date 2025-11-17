import React from 'react';

export const SkeletonBox = ({ className = '' }: { className?: string }) => (
  <div className={`animate-background-shine bg-slate-200 rounded-md ${className}`} />
);

export const CriteriosPanelSkeleton: React.FC = () => (
  <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/60 shadow-lg">
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
      <div className="lg:col-span-3 flex flex-col sm:flex-row items-center gap-8">
        <div className="w-40 h-40 rounded-full bg-slate-200 animate-background-shine flex-shrink-0" />
        <div className="flex-1 w-full space-y-4">
          <SkeletonBox className="h-8 w-3/4" />
          <SkeletonBox className="h-5 w-full" />
          <SkeletonBox className="h-5 w-5/6" />
        </div>
      </div>
      <div className="lg:col-span-2 flex flex-col justify-center gap-8 border-t-2 lg:border-t-0 lg:border-l-2 border-slate-200/60 pt-8 lg:pt-0 lg:pl-8">
        <div className="space-y-3">
          <SkeletonBox className="h-6 w-1/2" />
          <SkeletonBox className="h-4 w-full" />
        </div>
        <div className="space-y-3">
          <SkeletonBox className="h-6 w-1/2" />
          <SkeletonBox className="h-10 w-full" />
        </div>
      </div>
    </div>
  </div>
);

export const TableSkeleton: React.FC = () => (
  <div className="space-y-3">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="flex items-center gap-4 p-2">
        <SkeletonBox className="h-8 w-1/4" />
        <SkeletonBox className="h-8 w-1/4" />
        <SkeletonBox className="h-8 w-1/4" />
        <SkeletonBox className="h-8 w-1/4" />
      </div>
    ))}
  </div>
);