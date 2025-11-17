import React from 'react';

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  icon?: string;
  wrapperClassName?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ children, id, value, onChange, disabled = false, className = '', icon, wrapperClassName = '', ...props }, ref) => (
    <div className={`relative group ${wrapperClassName}`}>
      {icon && (
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors duration-300 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400">
          <span className="material-icons !text-lg text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400">{icon}</span>
        </div>
      )}
      <select
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        disabled={disabled}
        ref={ref}
        className={`appearance-none w-full rounded-lg border border-slate-300 dark:border-slate-600 py-3 pr-10 text-base text-slate-900 dark:text-slate-50 bg-white/50 dark:bg-slate-700/50 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50 dark:focus:ring-offset-slate-800 outline-none transition-all disabled:bg-slate-100 dark:disabled:bg-slate-800/50 ${icon ? 'pl-12' : 'pl-4'} ${className}`}
        {...props}
      >
        {children}
      </select>
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3">
        <span className="material-icons !text-lg text-slate-400 dark:text-slate-400">expand_more</span>
      </div>
    </div>
  )
);

Select.displayName = 'Select';
export default Select;
