import React from 'react';

interface HistogramData {
    label: string;
    value: number;
    students: any[];
}
interface HistogramProps {
  data: HistogramData[];
  title: string;
  onBarClick: (label: string, students: any[]) => void;
}

const Histogram: React.FC<HistogramProps> = ({ data, title, onBarClick }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  
  return (
    <div>
      <h3 className="font-bold text-slate-800 text-center mb-4">{title}</h3>
      <div className="flex justify-around items-end h-48 gap-2 px-2 border-b border-l border-slate-200 pb-2">
        {data.map((bin, index) => {
          const heightPercentage = maxValue > 0 ? (bin.value / maxValue) * 100 : 0;
          return (
            <div key={bin.label} className="flex-1 flex flex-col items-center justify-end h-full">
              <button
                onClick={() => onBarClick(bin.label, bin.students)}
                className="w-full h-full flex items-end justify-center group"
                aria-label={`${bin.value} alumnos en el rango ${bin.label}`}
              >
                <div
                  className="w-3/4 bg-gradient-to-b from-blue-400 to-blue-600 rounded-t-md transition-all duration-300 group-hover:from-blue-500 group-hover:to-blue-700 group-hover:shadow-lg"
                  style={{ 
                    height: `${heightPercentage}%`,
                    animation: `grow-bar-vertical 0.8s ${index * 100}ms ease-out forwards`,
                    transformOrigin: 'bottom'
                  }}
                >
                    <div className="relative h-full">
                        <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-xs font-bold text-slate-700 opacity-0 group-hover:opacity-100 transition-opacity">
                            {bin.value}
                        </span>
                    </div>
                </div>
              </button>
              <div className="text-center text-xs text-slate-500 mt-1.5 whitespace-nowrap">{bin.label}</div>
            </div>
          );
        })}
      </div>
      <style>{`
            @keyframes grow-bar-vertical {
                from { transform: scaleY(0); }
                to { transform: scaleY(1); }
            }
        `}</style>
    </div>
  );
};

export default Histogram;