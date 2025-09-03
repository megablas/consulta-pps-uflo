import React from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: string;
  iconPosition?: 'left' | 'right';
  isLoading?: boolean;
}

const baseClasses = 'inline-flex items-center justify-center font-bold rounded-lg transition-all duration-200 ease-in-out shadow-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0';

const variantClasses: Record<ButtonVariant, string> = {
  primary: 'bg-blue-600 text-white hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:ring-blue-500 disabled:bg-slate-400',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:-translate-y-0.5 active:scale-95 active:bg-slate-100 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 hover:-translate-y-0.5 active:scale-95 active:bg-rose-800 focus:ring-rose-500 disabled:bg-rose-300',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'py-2 px-4 text-sm gap-2',
  md: 'py-2.5 px-6 text-base gap-2.5',
  lg: 'py-3 px-8 text-lg gap-3',
};

const iconSizeClasses: Record<ButtonSize, string> = {
    sm: '!text-base',
    md: '!text-lg',
    lg: '!text-xl',
};

const Button: React.FC<ButtonProps> = ({ 
    children, 
    variant = 'primary',
    size = 'md', 
    icon, 
    iconPosition = 'left',
    isLoading = false,
    disabled,
    className,
    ...props 
}) => {
  const finalClassName = [
    baseClasses,
    variantClasses[variant],
    sizeClasses[size],
    className,
  ].filter(Boolean).join(' ');

  const iconMarkup = icon && (
    <span className={`material-icons ${iconSizeClasses[size]}`}>{icon}</span>
  );

  return (
    <button className={finalClassName} disabled={disabled || isLoading} {...props}>
      {isLoading ? (
        <>
            <div className="w-5 h-5 border-2 border-white/50 border-t-white rounded-full animate-spin"></div>
            <span>Cargando...</span>
        </>
      ) : (
        <>
          {iconPosition === 'left' && iconMarkup}
          {children}
          {iconPosition === 'right' && iconMarkup}
        </>
      )}
    </button>
  );
};

export default Button;