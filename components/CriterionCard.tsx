import React from 'react';

interface CriterionCardProps {
  children: React.ReactNode;
  isComplete: boolean;
  controls?: React.ReactNode;
}

const CriterionCard: React.FC<CriterionCardProps> = ({ children, isComplete, controls }) => {
  return (
    <div 
      className={`
        bg-white border rounded-xl p-5 flex flex-col justify-between 
        transition-all duration-300 ease-in-out 
        hover:shadow-xl hover:-translate-y-1.5 
        ${isComplete 
          ? 'border-blue-200/80 shadow-lg shadow-blue-100/50' 
          : 'border-slate-200/80 shadow-md shadow-slate-100/50'
        }
      `}
    >
      <div className="flex-grow flex flex-col">
        {children}
      </div>

      {controls && (
        <div className="mt-4">
          {controls}
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-200/60 flex items-center justify-end">
         <div 
           className={`
             flex items-center gap-2 text-xs font-semibold px-2.5 py-1 rounded-full
             transition-colors
             ${isComplete 
               ? 'text-blue-700 bg-blue-100' 
               : 'text-slate-500 bg-slate-100'
             }
           `}
         >
            <div className={`w-2 h-2 rounded-full transition-colors ${isComplete ? 'bg-blue-500' : 'bg-slate-400'}`}></div>
            <span>{isComplete ? 'Completo' : 'Pendiente'}</span>
         </div>
      </div>
    </div>
  );
};

export default CriterionCard;