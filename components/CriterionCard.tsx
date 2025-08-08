import React from 'react';

interface CriterionCardProps {
  children: React.ReactNode;
  isComplete: boolean;
  controls?: React.ReactNode;
}

const CriterionCard: React.FC<CriterionCardProps> = ({ children, isComplete, controls }) => {
  return (
    <div 
      style={{ willChange: 'transform, box-shadow' }}
      className={`
        bg-white border rounded-xl p-5 flex flex-col justify-between 
        transition-all duration-300 ease-in-out 
        hover:shadow-xl hover:-translate-y-1
        ${isComplete 
          ? 'border-blue-300/80 shadow-lg shadow-blue-500/10' 
          : 'border-slate-200/80 shadow-md shadow-slate-500/5'
        }
      `}
    >
      <div className="flex-grow flex flex-col relative">
        {isComplete && (
           <div className="absolute top-0 right-0 bg-blue-500 text-white rounded-full h-7 w-7 flex items-center justify-center -mt-2 -mr-2 shadow-md">
             <span className="material-icons !text-lg">check</span>
           </div>
        )}
        {children}
      </div>

      {controls && (
        <div className="mt-4 pt-4 border-t border-slate-200/70">
          {controls}
        </div>
      )}
    </div>
  );
};

export default CriterionCard;