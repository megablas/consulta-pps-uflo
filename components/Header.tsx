import React from 'react';
import MiPanelLogo from './MiPanelLogo';
import UfloLogo from './UfloLogo';
import { useAuth } from '../contexts/AuthContext';

const AppHeader: React.FC = () => {
  const { authenticatedUser, logout, isSuperUserMode } = useAuth();
  const isLoggedIn = !!authenticatedUser;

  return (
    <header className="sticky top-6 z-50 p-4 flex justify-between items-center border border-slate-200/80 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg shadow-slate-300/10 sm:py-4">
      <div className="flex-shrink-0">
          <MiPanelLogo className="h-10 sm:h-14 w-auto" />
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4">
         {isSuperUserMode && (
            <span className="bg-blue-100 text-blue-800 text-xs sm:text-sm font-semibold px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full border border-blue-200/80">
              {/* Show full text on larger screens */}
              <span className="hidden sm:inline">Modo Administrador</span>
              {/* Show "Admin" on smaller screens */}
              <span className="sm:hidden">Admin</span>
            </span>
         )}

         <div className="hidden sm:block">
            <UfloLogo className="h-14 w-auto" />
         </div>
         
         {isLoggedIn && (
            <button
              onClick={logout}
              className="bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-600 font-semibold p-2 sm:p-3 rounded-full transition-all duration-200 shadow-sm sm:shadow-md border border-slate-200/80 flex items-center justify-center"
              aria-label="Cerrar sesión"
            >
              <span className="material-icons !text-xl sm:!text-2xl">logout</span>
            </button>
         )}
      </div>
    </header>
  );
};

export default AppHeader;