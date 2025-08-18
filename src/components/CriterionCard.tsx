import React, { useMemo } from 'react';

interface CriterionCardProps {
  children: React.ReactNode;
  isComplete: boolean;
  controls?: React.ReactNode;
  /** Variante visual del criterio */
  variant?: 'default' | 'success' | 'warning' | 'info';
  /** Permite deshabilitar animaciones hover */
  disableHover?: boolean;
  /** Título opcional para accesibilidad */
  title?: string;
  /** Callback cuando se hace click en la card (opcional) */
  onClick?: () => void;
}

type CardVariant = {
  borderClass: string;
  shadowClass: string;
  badgeClass: string;
  icon: string;
};

const CriterionCard: React.FC<CriterionCardProps> = ({ 
  children, 
  isComplete, 
  controls,
  variant = 'default',
  disableHover = false,
  title,
  onClick
}) => {
  
  // Configuración de variantes con memoización
  const variantConfig = useMemo((): Record<string, CardVariant> => ({
    default: {
      borderClass: 'border-blue-300/80',
      shadowClass: 'shadow-lg shadow-blue-500/10',
      badgeClass: 'bg-gradient-to-r from-blue-500 to-blue-600 text-white',
      icon: 'check'
    },
    success: {
      borderClass: 'border-emerald-300/80',
      shadowClass: 'shadow-lg shadow-emerald-500/10',
      badgeClass: 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white',
      icon: 'check'
    },
    warning: {
      borderClass: 'border-amber-300/80',
      shadowClass: 'shadow-lg shadow-amber-500/10',
      badgeClass: 'bg-gradient-to-r from-amber-500 to-amber-600 text-white',
      icon: 'warning'
    },
    info: {
      borderClass: 'border-sky-300/80',
      shadowClass: 'shadow-lg shadow-sky-500/10',
      badgeClass: 'bg-gradient-to-r from-sky-500 to-sky-600 text-white',
      icon: 'info'
    }
  }), []);

  // Estilos computados con memoización
  const cardStyles = useMemo(() => {
    const currentVariant = variantConfig[variant] || variantConfig.default;
    
    const baseClasses = `
      relative bg-white border rounded-xl p-5 flex flex-col justify-between 
      transition-all duration-300 ease-in-out
      focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-2
    `;
    
    const hoverClasses = !disableHover ? 'hover:shadow-xl hover:-translate-y-1 hover:scale-[1.02]' : '';
    const clickableClasses = onClick ? 'cursor-pointer active:transform active:scale-[0.98]' : '';
    
    const statusClasses = isComplete 
      ? `${currentVariant.borderClass} ${currentVariant.shadowClass}` 
      : 'border-slate-200/80 shadow-md shadow-slate-500/5 hover:border-slate-300/80';
    
    return `${baseClasses} ${hoverClasses} ${clickableClasses} ${statusClasses}`.trim();
  }, [isComplete, variant, disableHover, onClick, variantConfig]);

  // Badge de completado
  const CompletionBadge: React.FC = () => {
    if (!isComplete) return null;
    
    const currentVariant = variantConfig[variant] || variantConfig.default;
    
    return (
      <div 
        className={`absolute -top-3 -right-3 ${currentVariant.badgeClass} rounded-full h-7 w-7 flex items-center justify-center shadow-lg border-2 border-white transition-all duration-300 hover:scale-110 hover:rotate-12`}
        aria-label="Criterio completado"
      >
        <span className="material-icons !text-lg animate-pulse">
          {currentVariant.icon}
        </span>
      </div>
    );
  };

  // Separador entre contenido y controles
  const ControlsSeparator: React.FC = () => (
    <div className="mt-4 pt-4 border-t border-slate-200/70 transition-colors duration-200 hover:border-slate-300/70" />
  );

  // Manejador de click
  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Indicador visual de progreso
  const ProgressIndicator: React.FC = () => {
    if (isComplete) return null;
    
    return (
      <div className="absolute top-0 left-0 w-full h-1 bg-slate-200 rounded-t-xl overflow-hidden">
        <div className="h-full bg-gradient-to-r from-slate-300 to-slate-400 w-0 transition-all duration-1000 ease-out group-hover:w-1/3" />
      </div>
    );
  };

  return (
    <article 
      style={{ willChange: 'transform, box-shadow' }}
      className={`${cardStyles} group`}
      onClick={handleClick}
      title={title}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      <CompletionBadge />
      <ProgressIndicator />
      
      {/* Contenido principal */}
      <div className="flex-grow flex flex-col justify-center relative z-10">
        {children}
      </div>
      
      {/* Controles */}
      {controls && (
        <>
          <ControlsSeparator />
          <div className="relative z-10 transition-opacity duration-200 group-hover:opacity-100 opacity-90">
            {controls}
          </div>
        </>
      )}
      
      {/* Overlay para efecto visual cuando es clickeable */}
      {onClick && (
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-blue-50/0 hover:to-blue-50/30 transition-all duration-300 rounded-xl pointer-events-none" />
      )}
    </article>
  );
};

export default CriterionCard;
