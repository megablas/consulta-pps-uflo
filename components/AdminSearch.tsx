import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAirtableData } from '../services/airtableService';
import { 
    AIRTABLE_TABLE_NAME_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES,
} from '../constants';
import type { EstudianteFields } from '../types';

interface AdminSearchProps {
  onStudentSelect: (student: { legajo: string, nombre: string }) => void;
}

const AdminSearch: React.FC<AdminSearchProps> = ({ onStudentSelect }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<EstudianteFields[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchMatches = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    // Escape double quotes and convert to lowercase for a guaranteed case-insensitive search
    const cleanedTerm = term.replace(/"/g, '\\"').toLowerCase();
    
    // Wrap the {Nombre} field in LOWER() to match against the lowercased search term.
    // This makes the search robustly case-insensitive.
    const formula = `OR(
        SEARCH("${cleanedTerm}", LOWER({${FIELD_NOMBRE_ESTUDIANTES}})),
        SEARCH("${cleanedTerm}", {${FIELD_LEGAJO_ESTUDIANTES}} & '')
    )`;

    const { records, error } = await fetchAirtableData<EstudianteFields>(
        AIRTABLE_TABLE_NAME_ESTUDIANTES,
        [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES],
        formula,
        7 // max 7 results
    );
    
    if (!error) {
      setResults(records.map(r => r.fields));
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchMatches(searchTerm);
    }, 300); // Debounce time

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm, fetchMatches]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (student: EstudianteFields) => {
    const legajo = student[FIELD_LEGAJO_ESTUDIANTES];
    const nombre = student[FIELD_NOMBRE_ESTUDIANTES];
    if (legajo && nombre) {
      onStudentSelect({ legajo, nombre });
      setSearchTerm('');
      setResults([]);
      setIsDropdownOpen(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
  };

  const showDropdown = isDropdownOpen && searchTerm.length > 0;

  return (
    <div ref={searchContainerRef} className="relative w-full max-w-lg mx-auto">
        <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5">
            <span className="material-icons text-slate-400">search</span>
        </div>
        <input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setIsDropdownOpen(true)}
            className="w-full rounded-lg border border-slate-300 p-3 pl-11 text-base text-slate-800 bg-white shadow-sm
                       placeholder-slate-400/80
                       focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            placeholder="Buscar por Legajo o Nombre..."
            aria-label="Buscar Estudiante"
            autoComplete="off"
        />
        {showDropdown && (
            <div className="absolute z-10 mt-2 w-full bg-white rounded-lg shadow-2xl border border-slate-200/70 overflow-hidden max-h-80 overflow-y-auto animate-fade-in-up" style={{ animationDuration: '200ms' }}>
                {isLoading ? (
                    <div className="p-4 flex items-center justify-center text-slate-500">
                        <div className="border-2 border-slate-200 border-t-blue-500 rounded-full w-5 h-5 animate-spin mr-2"></div>
                        Buscando...
                    </div>
                ) : results.length > 0 ? (
                    <ul>
                        {results.map((student, index) => (
                            <li key={student[FIELD_LEGAJO_ESTUDIANTES] || index}>
                                <button
                                    onClick={() => handleSelect(student)}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex justify-between items-center"
                                >
                                    <span className="font-medium text-slate-800">{student[FIELD_NOMBRE_ESTUDIANTES]}</span>
                                    <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">{student[FIELD_LEGAJO_ESTUDIANTES]}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                     <div className="p-4 text-center text-slate-500">
                        No se encontraron resultados para "{searchTerm}".
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default AdminSearch;