import React from 'react';
import { useTheme } from '../contexts/ThemeContext';

const ThemeToggle: React.FC = () => {
  const { setTheme, resolvedTheme } = useTheme();

  const cycleTheme = () => {
    const newTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
  };

  const icon = resolvedTheme === 'dark' ? 'dark_mode' : 'light_mode';
  const label = resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro';

  return (
    <button
      onClick={cycleTheme}
      className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400 font-semibold p-2.5 rounded-full transition-all duration-200 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center group"
      aria-label={label}
    >
      <span className="material-icons !text-xl sm:!text-2xl transition-transform duration-300 ease-out group-hover:rotate-12 group-hover:scale-110">
        {icon}
      </span>
    </button>
  );
};

export default ThemeToggle;