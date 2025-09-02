import React from 'react';

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  description: string;
  isLoading: boolean;
  className?: string;
  onClick?: () => void;
}

const MetricCardSkeleton: React.FC = () => (
    <div className="bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm animate-pulse">
        <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-lg bg-slate-200"></div>
            <div className="w-8 h-4 rounded-md bg-slate-200"></div>
        </div>
        <div className="mt-4 h-10 w-1/2 rounded-md bg-slate-200"></div>
        <div className="mt-2 h-4 w-3/4 rounded-md bg-slate-200"></div>
    </div>
);


const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, description, isLoading, className, onClick }) => {
    if (isLoading) {
        return <MetricCardSkeleton />;
    }
    
    const cardContent = (
        <>
            <div className="flex justify-between items-start">
                <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <span className="material-icons">{icon}</span>
                </div>
                {onClick && (
                    <div className="p-1 bg-slate-100 text-slate-500 rounded-full group-hover:bg-blue-200 group-hover:text-blue-700 transition-colors">
                        <span className="material-icons !text-base">open_in_new</span>
                    </div>
                )}
            </div>
            <p className="text-4xl font-black text-slate-800 mt-4 tracking-tighter">{value}</p>
            <h3 className="text-base font-semibold text-slate-700 mt-1">{title}</h3>
            <p className="text-xs text-slate-500 mt-1">{description}</p>
        </>
    );

    const baseClasses = `bg-white p-6 rounded-xl border border-slate-200/60 shadow-sm transition-all duration-300 ${className}`;
    
    if (onClick) {
        return (
            <button 
                onClick={onClick}
                className={`${baseClasses} group text-left hover:shadow-lg hover:-translate-y-1 hover:border-blue-300/70 w-full`}
            >
                {cardContent}
            </button>
        );
    }
    
    return (
        <div className={baseClasses}>
            {cardContent}
        </div>
    );
};

export default MetricCard;