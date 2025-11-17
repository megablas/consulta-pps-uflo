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
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200/60 dark:border-slate-700/60 shadow-sm animate-pulse">
        <div className="flex justify-between items-start">
            <div className="w-10 h-10 rounded-lg bg-slate-200 dark:bg-slate-700"></div>
            <div className="w-8 h-4 rounded-md bg-slate-200 dark:bg-slate-700"></div>
        </div>
        <div className="mt-4 h-10 w-1/2 rounded-md bg-slate-200 dark:bg-slate-700"></div>
        <div className="mt-2 h-4 w-3/4 rounded-md bg-slate-200 dark:bg-slate-700"></div>
    </div>
);


const MetricCard: React.FC<MetricCardProps> = ({ title, value, icon, description, isLoading, className, onClick }) => {
    if (isLoading) {
        return <MetricCardSkeleton />;
    }
    
    const cardContent = (
        <>
            <div className="flex justify-between items-start">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-lg">
                    <span className="material-icons">{icon}</span>
                </div>
                {onClick && (
                    <div className="p-1 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-full group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 group-hover:text-blue-700 dark:group-hover:text-blue-200 transition-colors">
                        <span className="material-icons !text-base">open_in_new</span>
                    </div>
                )}
            </div>
            <p className="text-4xl font-black text-slate-800 dark:text-slate-50 mt-4 tracking-tighter">{value}</p>
            <h3 className="text-base font-semibold text-slate-700 dark:text-slate-200 mt-1">{title}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </>
    );

    const baseClasses = `bg-white dark:bg-slate-800 p-6 rounded-xl border border-slate-200/60 dark:border-slate-700 shadow-sm transition-all duration-300 ${className}`;
    
    if (onClick) {
        return (
            <button 
                onClick={onClick}
                className={`${baseClasses} group text-left hover:shadow-lg hover:-translate-y-1 hover:border-blue-300/70 dark:hover:border-blue-600/70 w-full`}
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