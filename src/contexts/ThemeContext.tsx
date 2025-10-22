import React, { createContext, useState, useEffect, useContext, useMemo, ReactNode } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark';
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getInitialTheme = (): Theme => {
  if (typeof window !== 'undefined' && window.localStorage) {
    const storedPrefs = window.localStorage.getItem('theme');
    if (storedPrefs === 'dark') {
      return 'dark';
    }
  }
  return 'light';
};

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme);

  // The setTheme function is now the single source of truth for theme changes.
  const setTheme = (newTheme: Theme) => {
    try {
      window.localStorage.setItem('theme', newTheme);
      const root = window.document.documentElement;
      
      if (newTheme === 'dark') {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
      
      setThemeState(newTheme);
    } catch (e) {
      console.error("Could not save theme", e);
    }
  };
  
  // This effect synchronizes theme changes across browser tabs.
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme' && e.newValue && (e.newValue === 'light' || e.newValue === 'dark')) {
        setTheme(e.newValue as Theme);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const value = useMemo(() => ({ theme, setTheme, resolvedTheme: theme }), [theme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
