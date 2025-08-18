import React from 'react';
import Card from './Card';

const Shimmer: React.FC = () => (
    <div className="absolute inset-0 -translate-x-full animate-background-shine bg-slate-200" />
);

export const SkeletonBox: React.FC<{className?: string}> = ({ className }) => (
    <div className={`relative overflow-hidden bg-slate-200/70 rounded-md ${className}`}>
        <div className="animate-background-shine absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/50 to-transparent" />
    </div>
);


export const CriteriosPanelSkeleton: React.FC = () => (
     <section>
        {/* Single Card Skeleton */}
        <div className="bg-white p-8 sm:p-10 rounded-3xl border border-slate-200/80 shadow-lg shadow-slate-500/10">
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-x-10 gap-y-8">
                {/* Left Column Skeleton */}
                <div className="lg:col-span-3 flex flex-col sm:flex-row items-center gap-8">
                    <div className="w-[180px] h-[180px] rounded-full bg-slate-200/70 relative overflow-hidden flex-shrink-0">
                        <div className="w-[180px] h-[180px] rounded-full border-[16px] border-slate-300/50 absolute"></div>
                        <Shimmer />
                    </div>
                    <div className="flex-1 space-y-4 w-full">
                        <SkeletonBox className="h-8 w-4/5" />
                        <SkeletonBox className="h-20 w-full rounded-xl" />
                        <SkeletonBox className="h-6 w-1/2" />
                    </div>
                </div>

                {/* Right Column Skeleton */}
                <div className="lg:col-span-2 flex flex-col justify-center gap-10 border-t-2 lg:border-t-0 lg:border-l-2 border-slate-200/70 pt-8 lg:pt-0 lg:pl-10">
                    {/* Rotation Tracker Skeleton */}
                    <div className="w-full space-y-3">
                        <div className="flex justify-between items-center">
                           <SkeletonBox className="h-5 w-2/5" />
                           <SkeletonBox className="h-5 w-1/4" />
                        </div>
                        <div className="flex gap-1.5 h-2">
                           <SkeletonBox className="h-full w-full rounded-full" />
                           <SkeletonBox className="h-full w-full rounded-full" />
                           <SkeletonBox className="h-full w-full rounded-full" />
                        </div>
                    </div>

                    {/* Specialty Progress Skeleton */}
                    <div className="w-full space-y-3">
                        <div className="flex justify-between items-center">
                           <SkeletonBox className="h-5 w-1/2" />
                           <SkeletonBox className="h-5 w-1/4" />
                        </div>
                        <SkeletonBox className="h-2.5 w-full rounded-full" />
                    </div>
                </div>
            </div>
        </div>
    </section>
);

export const TableSkeleton: React.FC = () => {
    const rows = Array.from({ length: 5 }, (_, i) => i);
    return (
        <div className="space-y-3">
            {rows.map(i => (
                 <div key={i} className="flex items-center gap-4 p-2">
                    <SkeletonBox className="h-12 w-12 rounded-lg" />
                    <div className="flex-grow space-y-2">
                        <SkeletonBox className="h-4 w-4/5" />
                        <SkeletonBox className="h-3 w-3/5" />
                    </div>
                    <SkeletonBox className="h-6 w-24 rounded-full" />
                 </div>
            ))}
        </div>
    );
}