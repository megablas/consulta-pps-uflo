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


export const CriterionCardSkeleton: React.FC = () => (
    <div className="bg-white border rounded-xl p-5 flex flex-col justify-between border-slate-200/80 shadow-md">
        <div className="flex-grow flex flex-col gap-1 w-full text-center">
             <div className="h-16 flex items-center justify-center">
                 <SkeletonBox className="h-5 w-4/5" />
             </div>
             <div className="my-1.5"><SkeletonBox className="h-2.5 w-full" /></div>
             <div className="min-h-9 flex items-center justify-center">
                <SkeletonBox className="h-5 w-1/3" />
             </div>
        </div>
        <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-end">
            <SkeletonBox className="h-6 w-20 rounded-full" />
        </div>
    </div>
);

export const CriteriosPanelSkeleton: React.FC = () => (
     <Card 
      icon="dashboard"
      title={<SkeletonBox className="h-8 w-60" />}
      description={<SkeletonBox className="h-5 w-96 mt-2" />}
      titleAs="h1"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CriterionCardSkeleton />
        <CriterionCardSkeleton />
        <CriterionCardSkeleton />
      </div>
    </Card>
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