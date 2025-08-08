import React from 'react';
import MiPanelLogo from './MiPanelLogo';
import UfloLogo from './UfloLogo';
import { useAuth } from '../contexts/AuthContext';

const AppHeader: React.FC = () => {
  const { authenticatedUser, logout, isSuperUserMode } = useAuth();
  const isLoggedIn = !!authenticatedUser;

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-200/70">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
            {/* Left side */}
            <div className="flex-shrink-0">
                <MiPanelLogo className="h-14 w-auto" />
            </div>
            
            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-4">
              {isSuperUserMode && (
                  <span className="hidden sm:inline-flex items-center bg-blue-100 text-blue-800 text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-full border border-blue-200/80">
                    Modo Administrador
                  </span>
              )}
              <div className="hidden sm:block">
                  <UfloLogo className="h-14 w-auto" />
              </div>
              
              {isLoggedIn && (
                  <button
                    onClick={logout}
                    className="bg-white hover:bg-rose-50 text-slate-500 hover:text-rose-600 font-semibold p-2.5 rounded-full transition-all duration-200 shadow-sm border border-slate-200/80 flex items-center justify-center"
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