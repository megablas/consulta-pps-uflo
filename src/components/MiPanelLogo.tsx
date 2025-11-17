import React from 'react';

interface MiPanelLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

const MiPanelLogo: React.FC<MiPanelLogoProps> = ({ className, variant = 'light' }) => {
  const isDark = variant === 'dark';

  // Professional color palette derived from existing theme
  const brandBlue = '#2563eb';      // blue-600
  const iconForeground = '#ffffff';
  
  const lightTextPrimary = '#1e293b'; // slate-800 for "Panel"
  const lightTextSecondary = '#475569'; // slate-600 for "Mi"

  const darkTextPrimary = '#e2e8f0';   // slate-200 for "Panel"
  const darkTextSecondary = '#94a3b8';  // slate-400 for "Mi"
  
  const miColor = isDark ? darkTextSecondary : lightTextSecondary;
  const panelColor = isDark ? darkTextPrimary : lightTextPrimary;

  return (
    <svg
      className={className}
      viewBox="0 0 180 70" // Adjusted for better horizontal spacing
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo de Mi Panel"
    >
      <g>
        {/* Icon: Represents a dashboard/panel with data */}
        <rect x="0" y="10" width="50" height="50" fill={brandBlue} rx="12" />
        
        {/* Abstract bars inside the icon */}
        <g transform="translate(0, 2)">
          <rect x="10" y="22" width="6" height="22" fill={iconForeground} rx="2" opacity="0.95" />
          <rect x="22" y="28" width="6" height="16" fill={iconForeground} rx="2" opacity="0.95" />
          <rect x="34" y="25" width="6" height="19" fill={iconForeground} rx="2" opacity="0.95" />
        </g>

        {/* Text: "Mi Panel" with different weights for hierarchy */}
        <text
          x="65" // Positioned to the right of the icon
          y="35" // Vertically centered with the icon
          fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
          fontSize="24"
          dominantBaseline="middle"
          letterSpacing="-0.5"
        >
          <tspan fontWeight="500" fill={miColor}>Mi</tspan>
          <tspan fontWeight="800" fill={panelColor} dx="0.2em">Panel</tspan>
        </text>
      </g>
    </svg>
  );
};

export default MiPanelLogo;
