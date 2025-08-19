import React from 'react';

interface UfloLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

const UfloLogo: React.FC<UfloLogoProps> = ({ className, variant = 'light' }) => {
  const isDark = variant === 'dark';
  const mainColor = isDark ? '#e2e8f0' : '#1e293b'; // slate-200 : slate-800
  const subColor = isDark ? '#94a3b8' : '#475569';  // slate-400 : slate-600

  return (
    <svg 
      className={className} 
      viewBox="0 0 120 70" 
      xmlns="http://www.w3.org/2000/svg" 
      aria-label="UFLO Universidad Logo"
    >
      <text
        x="60"
        y="33"
        fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="38"
        fontWeight="bold"
        fill={mainColor}
        textAnchor="middle"
        dominantBaseline="middle"
      >
        UFLO
      </text>
      <text
        x="60"
        y="56"
        fontFamily="Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
        fontSize="10.5"
        fontWeight="500"
        fill={subColor}
        letterSpacing="0.5"
        textAnchor="middle"
        style={{ textTransform: 'uppercase' }}
      >
        Universidad
      </text>
    </svg>
  );
};

export default UfloLogo;
