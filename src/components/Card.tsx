import React from 'react';

interface CardProps {
  children: React.ReactNode;
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
      className={`bg-white rounded-2xl shadow-lg shadow-slate-200/40 p-6 sm:p-8 border border-slate-200/60 transition-all duration-300 ${className}`}
      style={style}
    >
      {(title || description || actions) && (
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
          {(title || description) && (
            <div className="flex items-start gap-4 flex-grow">
              {icon && (
                <div className="flex-shrink-0 bg-blue-100 text-blue-600 rounded-full h-12 w-12 flex items-center justify-center mt-1">
                  <span className="material-icons !text-3xl">{icon}</span>
                </div>
              )}
              <div>
                {title && (
                  <TitleTag className={`text-slate-900 text-2xl font-bold tracking-tight ${titleClassName}`}>
                    {title}
                  </TitleTag>
                )}
                {description && (
                  <p className="text-slate-600 mt-1 max-w-2xl">{description}</p>
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
