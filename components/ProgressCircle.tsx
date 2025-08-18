import React from 'react';

interface ProgressCircleProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}

const ProgressCircle: React.FC<ProgressCircleProps> = ({ 
  value, 
  max, 
  size = 160, 
  strokeWidth = 14 
}) => {
  const percentage = max > 0 ? Math.max(0, Math.min((value / max) * 100, 100)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  const isComplete = percentage >= 100;
  
  const trackColor = 'text-slate-200';
  const progressColor = isComplete ? 'text-green-500' : 'text-blue-500';
  const textColor = isComplete ? 'text-green-700' : 'text-blue-800';


  return (
    <div 
        className="relative flex-shrink-0"
        style={{ width: size, height: size }}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
    >
      <svg className="w-full h-full transform -rotate-90" viewBox={`0 0 ${size} ${size}`}>
        {/* Track Circle */}
        <circle
          className={trackColor}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        {/* Progress Circle */}
        <circle
          className={`${progressColor} transition-all duration-700 ease-out`}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className={`text-4xl font-extrabold tracking-tight ${textColor}`}>
          {Math.round(percentage)}%
        </span>
        <span className="text-sm font-medium text-slate-500 -mt-1">
          Completado
        </span>
      </div>
    </div>
  );
};

export default ProgressCircle;