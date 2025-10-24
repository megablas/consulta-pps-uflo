import React from 'react';

interface CardProps {
  children?: React.ReactNode;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: string;
  actions?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  titleAs?: 'h1' | 'h2' | 'h3';
  titleClassName?: string;
}

const Card: React.FC<CardProps> = ({
  children,
  title,
  description,
  icon,
  actions,
  className = '',
  style,
  titleAs = 'h2',
  titleClassName = ''
}) => {

  const TitleTag = titleAs;

  return (
    <div
      className={`bg-white dark:bg-slate-800/50 dark:backdrop-blur-sm rounded-2xl shadow-lg shadow-slate-200/40 dark:shadow-black/20 p-6 sm:p-8 border border-slate-200/60 dark:border-slate-700/80 transition-all duration-300 hover:shadow-xl hover:-translate-y-px ${className}`}
      style={style}
    >
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          {(title || description) && (
            <div className="flex items-start gap-4 flex-grow">
              {icon && (
                <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-full h-12 w-12 flex items-center justify-center mt-1">
                  <span className="material-icons !text-3xl">{icon}</span>
                </div>
              )}
              <div>
                {title && (
                  <TitleTag className={`text-slate-900 dark:text-slate-50 text-2xl font-bold tracking-tight ${titleClassName}`}>
                    {title}
                  </TitleTag>
                )}
                {description && (
                  <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">{description}</p>
                )}
              </div>
            </div>
          )}
          {actions && (
            <div className="flex-shrink-0 self-start sm:self-center">
                {actions}
            </div>
          )}
        </div>
      )}
      {children}
    </div>
  );
};

export default Card;