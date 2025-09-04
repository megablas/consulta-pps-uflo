import React from 'react';

interface BarChartProps {
  data: { label: string; value: number }[];
  title: string;
  onBarClick: (label: string) => void;
}

const BarChart: React.FC<BarChartProps> = ({ data, title, onBarClick }) => {
  const maxValue = Math.max(...data.map(d => d.value), 0);
  
  if (data.length === 0) {
    return (
        <div>
            <h3 className="font-bold text-slate-800 text-center mb-2">{title}</h3>
            <div className="text-center text-sm text-slate-500 py-8 bg-slate-50 rounded-lg">
                No hay datos disponibles.
            </div>
        </div>
    );
  }

  return (
    <div>
      <h3 className="font-bold text-slate-800 text-center mb-4">{title}</h3>
      <div className="space-y-3">
        {data.map((item, index) => {
          const percentage = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
          return (
            <button
              key={item.label}
              onClick={() => onBarClick(item.label)}
              className="w-full group"
              aria-label={`Ver detalles para ${item.label} con ${item.value} cupos`}
            >
              <div className="flex items-center gap-4 text-sm">
                <div className="w-1/3 text-right font-semibold text-slate-600 truncate" title={item.label}>
                  {item.label}
                </div>
                <div className="w-2/3 flex items-center gap-2">
                  <div className="flex-grow bg-slate-200/70 rounded-full h-5 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-sky-400 to-blue-500 h-5 rounded-full text-right transition-all duration-1000 ease-out flex items-center justify-end pr-2"
                      style={{ 
                          width: `${percentage}%`,
                          animation: `grow-bar 0.8s ${index * 100}ms ease-out forwards`,
                          transformOrigin: 'left'
                      }}
                    >
                    </div>
                  </div>
                   <div className="w-10 text-left font-bold text-slate-800">{item.value}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
       <style>{`
            @keyframes grow-bar {
                from { transform: scaleX(0); }
                to { transform: scaleX(1); }
            }
        `}</style>
    </div>
  );
};

export default BarChart;