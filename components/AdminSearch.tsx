import React, { useState } from 'react';

interface AdminSearchProps {
  onSearch: (legajo: string) => void;
  isLoading: boolean;
}

const AdminSearch: React.FC<AdminSearchProps> = ({ onSearch, isLoading }) => {
  const [legajo, setLegajo] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!legajo.trim() || isLoading) return;
    onSearch(legajo.trim());
  };

  return (
    <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-grow">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <span className="material-icons text-slate-400">badge</span>
          </div>
          <input
            type="text"
            value={legajo}
            onChange={(e) => setLegajo(e.target.value)}
            disabled={isLoading}
            className="w-full rounded-lg border border-slate-300 p-3 pl-11 text-base text-slate-800 bg-white shadow-sm
                       placeholder-slate-400/80
                       focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all
                       disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed"
            placeholder="Número de legajo del estudiante"
            aria-label="Número de Legajo del Estudiante"
          />
        </div>
        <button
          type="submit"
          disabled={isLoading || !legajo.trim()}
          className="bg-blue-600 text-white font-bold text-base py-3 px-8 rounded-lg
                     transition-all duration-200 ease-in-out shadow-md
                     hover:bg-blue-700
                     active:bg-blue-800
                     focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                     disabled:bg-slate-400 disabled:text-slate-100 disabled:cursor-not-allowed disabled:shadow-none
                     flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>
              <span>Buscando...</span>
            </>
          ) : (
             <>
              <span className="material-icons !text-xl">search</span>
              <span>Buscar</span>
            </>
          )}
        </button>
      </form>
  );
};

export default AdminSearch;