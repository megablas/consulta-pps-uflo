import React from 'react';

interface EmptyStateProps {
  icon: string;
  title: string;
  message: string;
  className?: string;
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, title, message, className = '' }) => {
  return (
    <div className={`text-center py-10 px-6 bg-slate-50/70 rounded-lg mt-2 border border-dashed border-slate-300 ${className}`}>
      <span className="material-icons text-slate-400 !text-5xl">{icon}</span>
      <p className="mt-4 font-semibold text-slate-700 text-lg">{title}</p>
      <p className="text-slate-500 text-sm mt-1 max-w-sm mx-auto">
        {message}
      </p>
    </div>
  );
};

export default EmptyState;
