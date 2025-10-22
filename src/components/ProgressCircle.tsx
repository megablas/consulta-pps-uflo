import React from 'react';

interface ProgressCircleProps {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
}

const ProgressCircle: React.FC<ProgressCircleProps> = React.memo(({ 
  value, 
  max, 
  size = 180, 
  strokeWidth = 18,
}) => {
  const percentage = max > 0 ? Math.max(0, Math.min((value / max) * 100, 100)) : 0;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  const isComplete = percentage >= 100;

  const progressGradientId = 'gradient-progress';
  const completeGradientId = 'gradient-complete';

  return (
    <div 
      className="relative flex-shrink-0 group"
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={`Progreso total: ${Math.round(percentage)}% completado`}
    >
      <div className={`absolute inset-0 rounded-full transition-all duration-700 ${isComplete ? 'animate-pulse-glow-emerald' : ''}`} />
      
      <svg 
        className="w-full h-full transform -rotate-90 relative z-10 transition-transform duration-300 group-hover:scale-[1.03]"
        viewBox={`0 0 ${size} ${size}`}
      >
        <defs>
          <linearGradient id={progressGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gradient-progress-from)" />
            <stop offset="100%" stopColor="var(--gradient-progress-to)" />
          </linearGradient>
          <linearGradient id={completeGradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--gradient-complete-from)" />
            <stop offset="100%" stopColor="var(--gradient-complete-to)" />
          </linearGradient>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="rgb(var(--color-primary) / 0.2)" />
          </filter>
        </defs>

        <circle
          className="text-slate-200 dark:text-slate-700"
          stroke="currentColor"
          strokeWidth={strokeWidth - 2}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          opacity="0.7"
        />

        <circle
          className="transition-all duration-1000 ease-out"
          stroke={`url(#${isComplete ? completeGradientId : progressGradientId})`}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
          style={{ filter: 'url(#shadow)' }}
        />
      </svg>
      
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center z-20">
        <span className={`text-6xl font-black tracking-tighter drop-shadow-sm transition-colors duration-500 ${isComplete ? 'text-emerald-500' : 'text-blue-600 dark:text-blue-400'}`}>
          {Math.round(percentage)}<span className="text-4xl opacity-50">%</span>
        </span>
        <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 -mt-1 tracking-wide">
          {Math.round(value)} / {max} hs
        </span>
      </div>
    </div>
  );
});

ProgressCircle.displayName = 'ProgressCircle';

export default ProgressCircle;