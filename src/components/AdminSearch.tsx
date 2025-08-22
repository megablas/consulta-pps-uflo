import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAirtableData } from '../services/airtableService';
import { 
    AIRTABLE_TABLE_NAME_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES,
} from '../constants';
import type { EstudianteFields, AirtableRecord } from '../types';

interface AdminSearchProps {
  onViewStudent: (student: { legajo: string, nombre: string }) => void;
  onEnrollStudent?: (student: AirtableRecord<EstudianteFields>) => void;
}

const AdminSearch: React.FC<AdminSearchProps> = ({ onViewStudent, onEnrollStudent }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<AirtableRecord<EstudianteFields>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchMatches = useCallback(async (term: string) => {
    if (term.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    const cleanedTerm = term.replace(/"/g, '\\"').toLowerCase();
    
    const formula = `OR(
        SEARCH("${cleanedTerm}", LOWER({${FIELD_NOMBRE_ESTUDIANTES}})),
        SEARCH("${cleanedTerm}", {${FIELD_LEGAJO_ESTUDIANTES}} & '')
    )`;

    const { records, error } = await fetchAirtableData<EstudianteFields>(
        AIRTABLE_TABLE_NAME_ESTUDIANTES,
        [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES],
        formula,
        7
    );
    
    if (!error) {
      setResults(records);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchMatches(searchTerm);
    }, 300);

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
                        {results.map((student) => (
                             <li key={student.id} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex justify-between items-center">
                                <div>
                                    <span className="font-medium text-slate-800">{student.fields[FIELD_NOMBRE_ESTUDIANTES]}</span>
                                    <span className="text-sm text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full ml-2">{student.fields[FIELD_LEGAJO_ESTUDIANTES]}</span>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                    onClick={() => {
                                        onViewStudent({ legajo: student.fields[FIELD_LEGAJO_ESTUDIANTES]!, nombre: student.fields[FIELD_NOMBRE_ESTUDIANTES]! });
                                        setIsDropdownOpen(false);
                                        setSearchTerm('');
                                        setResults([]);
                                    }}
                                    className="px-3 py-1 text-sm font-semibold text-blue-700 bg-blue-100 rounded-md hover:bg-blue-200 transition-colors"
                                    >
                                    Ver Panel
                                    </button>
                                    {onEnrollStudent && (
                                    <button
                                        onClick={() => {
                                            onEnrollStudent(student);
                                            setIsDropdownOpen(false);
                                            setSearchTerm('');
                                            setResults([]);
                                        }}
                                        className="px-3 py-1 text-sm font-semibold text-emerald-700 bg-emerald-100 rounded-md hover:bg-emerald-200 transition-colors"
                                    >
                                        Inscribir
                                    </button>
                                    )}
                                </div>
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
