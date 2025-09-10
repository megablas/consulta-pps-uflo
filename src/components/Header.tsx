import React, { useState, useEffect } from 'react';
import MiPanelLogo from './MiPanelLogo';
import UfloLogo from './UfloLogo';
import { useAuth } from '../contexts/AuthContext';
import ThemeToggle from './ThemeToggle';
import { useTheme } from '../contexts/ThemeContext';
import { usePwaInstall } from '../contexts/PwaInstallContext';

const AppHeader: React.FC = () => {
  const { authenticatedUser, logout, isSuperUserMode } = useAuth();
  const { resolvedTheme } = useTheme();
  const { canInstall, triggerInstall } = usePwaInstall();
  const isLoggedIn = !!authenticatedUser;
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Initial check
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  return (
    <header className={`no-print sticky top-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-xl transition-all duration-300 ${hasScrolled ? 'border-b border-slate-200/70 dark:border-slate-800 shadow-sm' : 'border-b border-transparent'}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
            {/* Left side */}
            <div className="flex-shrink-0">
                <MiPanelLogo className="h-14 w-auto" variant={resolvedTheme} />
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-4">
              {isSuperUserMode && (
                  <span className="hidden sm:inline-flex items-center bg-blue-100 text-blue-800 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full border border-blue-200/80 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-800">
                    Modo Administrador
                  </span>
              )}
              <div className="hidden sm:block">
                  <UfloLogo className="h-14 w-auto" variant={resolvedTheme} />
              </div>

              <ThemeToggle />
              
              {canInstall && (
                 <button
                    onClick={triggerInstall}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-semibold p-2.5 rounded-full transition-all duration-200 shadow-md border border-blue-700 flex items-center justify-center group"
                    aria-label="Instalar aplicación"
                    title="Instalar aplicación"
                  >
                    <span className="material-icons !text-xl sm:!text-2xl transition-transform duration-300 ease-out group-hover:scale-110">
                      install_mobile
                    </span>
                  </button>
              )}

              {isLoggedIn && (
                  <button
                    onClick={logout}
                    className="bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-900/50 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 font-semibold p-2.5 rounded-full transition-all duration-200 shadow-sm border border-slate-200/80 dark:border-slate-700 flex items-center justify-center"
                    aria-label="Cerrar sesión"
                  >
                    <span className="material-icons !text-xl sm:!text-2xl">logout</span>
                  </button>
              )}
            </div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;