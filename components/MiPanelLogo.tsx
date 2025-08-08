import React from 'react';

interface MiPanelLogoProps {
  className?: string;
  variant?: 'light' | 'dark';
}

const MiPanelLogo: React.FC<MiPanelLogoProps> = ({ className, variant = 'light' }) => {
  const isDark = variant === 'dark';

  // Colors for light variant (no box)
  const lightTextColor = '#334155'; // slate-700
  const brandColor = '#3b82f6'; // blue-500

  // Colors for dark variant (with box)
  const darkTextColor = '#e2e8f0'; // slate-200
  const whiteColor = '#ffffff';

  const paFillColor = isDark ? whiteColor : brandColor;
  const textFillColor = isDark ? darkTextColor : lightTextColor;

  return (
    <svg
      className={className}
      viewBox="0 0 170 70"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="Logo de Mi Panel"
    >
      {isDark && (
        <>
          <defs>
            <linearGradient id="logo-gradient" x1="0.5" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#2563eb" /> {/* blue-600 */}
              <stop offset="100%" stopColor="#1d4ed8" /> {/* blue-700 */}
            </linearGradient>
          </defs>
          <rect x="0" y="0" width="70" height="70" fill="url(#logo-gradient)" rx="12" />
        </>
      )}

      {/* PA text */}
      <text
        x="35"
        y="37"
        fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontSize="38"
        fontWeight="800"
        fill={paFillColor}
        textAnchor="middle"
        dominantBaseline="middle"
        letterSpacing="-1"
      >
        PA
      </text>

      {/* MI text */}
      <text
        x="85"
        y="25"
        fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontSize="22"
        fontWeight="600"
        fill={textFillColor}
        textAnchor="start"
        dominantBaseline="central"
      >
        MI
      </text>

      {/* PANEL text */}
      <text
        x="85"
        y="49"
        fontFamily="'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
        fontSize="22"
        fontWeight="600"
        fill={textFillColor}
        textAnchor="start"
        dominantBaseline="central"
      >
        PANEL
      </text>
    </svg>
  );
};

export default MiPanelLogo;