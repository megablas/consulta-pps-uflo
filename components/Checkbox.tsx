import React from 'react';

interface CheckboxProps {
  id: string;
  name: string;
  checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string;
  disabled?: boolean;
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void;
  error?: boolean;
}

const Checkbox: React.FC<CheckboxProps> = ({ id, name, checked, onChange, label, disabled = false, onBlur, error = false }) => {
  return (
    <label htmlFor={id} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${checked ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-300 hover:border-blue-400'} ${disabled ? 'cursor-not-allowed bg-slate-100 border-slate-200' : ''} ${error ? 'border-red-400 bg-red-50' : ''}`}>
      <input
        type="checkbox"
        id={id}
        name={name}
        checked={checked}
        onChange={onChange}
        disabled={disabled}
        onBlur={onBlur}
        aria-invalid={error}
        className="h-4 w-4 rounded text-blue-600 border-slate-400 focus:ring-2 focus:ring-blue-500/50"
      />
      <span className={`ml-3 text-sm font-medium ${checked ? 'text-blue-900' : 'text-slate-700'} ${disabled ? 'text-slate-500' : ''}`}>{label}</span>
    </label>
  );
};

export default Checkbox;