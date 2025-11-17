import React from 'react';

interface CheckboxProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  value?: string;
  disabled?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: boolean;
  'aria-describedby'?: string;
}

const Checkbox: React.FC<CheckboxProps> = ({ id, name, checked, onChange, label, value, disabled = false, onBlur, error = false, 'aria-describedby': ariaDescribedby }) => {
  return (
    <label htmlFor={id} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${checked ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 shadow-sm' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'} ${disabled ? 'cursor-not-allowed bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700' : ''} ${error ? 'border-red-400 bg-red-50 dark:border-red-500/50 dark:bg-red-900/20' : ''}`}>
      <input
        type="checkbox"
        id={id}
        name={name}
        value={value}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        onBlur={onBlur}
        aria-invalid={error}
        aria-describedby={ariaDescribedby}
        className="h-4 w-4 rounded text-blue-600 bg-slate-100 dark:bg-slate-600 border-slate-400 dark:border-slate-500 focus:ring-2 focus:ring-offset-2 focus:ring-blue-500/50 dark:focus:ring-offset-slate-800"
      />
      <span className={`ml-3 text-sm font-medium ${checked ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-200'} ${disabled ? 'text-slate-500 dark:text-slate-400' : ''}`}>{label}</span>
    </label>
  );
};

export default Checkbox;
