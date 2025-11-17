import React, { useState, useEffect, useRef, useCallback } from 'react';
import { fetchAirtableData } from '../services/airtableService';
import { 
    AIRTABLE_TABLE_NAME_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES,
} from '../constants';
import type { EstudianteFields, AirtableRecord } from '../types';
import { estudianteArraySchema } from '../schemas';
import Input from './Input';

const MOCK_STUDENTS_FOR_SEARCH: AirtableRecord<EstudianteFields>[] = [
    { id: 'recTest1', createdTime: '', fields: { 'Legajo': 'T0001', 'Nombre': 'Tester Alfa' } },
    { id: 'recTest2', createdTime: '', fields: { 'Legajo': 'T0002', 'Nombre': 'Beta Tester' } },
    { id: 'recTest3', createdTime: '', fields: { 'Legajo': 'T0003', 'Nombre': 'Gama Tester' } },
];

interface AdminSearchProps {
  onStudentSelect: (student: AirtableRecord<EstudianteFields>) => void;
  onSearchChange?: (term: string) => Promise<void>;
  isTestingMode?: boolean;
}

const AdminSearch: React.FC<AdminSearchProps> = ({ onStudentSelect, onSearchChange, isTestingMode = false }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<AirtableRecord<EstudianteFields>[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  const fetchMatches = useCallback(async (term: string) => {
    if (onSearchChange) {
        await onSearchChange(term);
        return;
    }

    if (term.length < 2) {
      setResults([]);
      return;
    }
    setIsLoading(true);
    
    if (isTestingMode) {
        setTimeout(() => {
            const lowerTerm = term.toLowerCase();
            const filtered = MOCK_STUDENTS_FOR_SEARCH.filter(s => 
                s.fields.Nombre?.toLowerCase().includes(lowerTerm) || 
                s.fields.Legajo?.toLowerCase().includes(lowerTerm)
            );
            setResults(filtered);
            setIsLoading(false);
        }, 300);
        return;
    }
    
    const cleanedTerm = term.replace(/"/g, '\\"').toLowerCase();
    const formula = `OR(
        SEARCH("${cleanedTerm}", LOWER({${FIELD_NOMBRE_ESTUDIANTES}})),
        SEARCH("${cleanedTerm}", {${FIELD_LEGAJO_ESTUDIANTES}} & '')
    )`;
    const { records, error } = await fetchAirtableData<EstudianteFields>(
        AIRTABLE_TABLE_NAME_ESTUDIANTES,
        estudianteArraySchema,
        [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES],
        formula,
        7
    );
    
    if (!error) {
      setResults(records);
    }
    setIsLoading(false);
  }, [onSearchChange, isTestingMode]);

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

  const handleSelect = (student: AirtableRecord<EstudianteFields>) => {
    onStudentSelect(student);
    setSearchTerm('');
    setResults([]);
    setIsDropdownOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    if (!isDropdownOpen) {
      setIsDropdownOpen(true);
    }
  };

  const showDropdown = isDropdownOpen && searchTerm.length > 0 && !onSearchChange;

  const placeholderText = isTestingMode
    ? "Buscar (ej: Tester Alfa, T0001)"
    : "Buscar por Legajo o Nombre...";

  return (
    <div ref={searchContainerRef} className="relative w-full max-w-lg mx-auto">
        <Input
            type="text"
            value={searchTerm}
            onChange={handleInputChange}
            onFocus={() => setIsDropdownOpen(true)}
            placeholder={placeholderText}
            icon="search"
            aria-label="Buscar Estudiante"
            autoComplete="off"
            className="text-base"
        />
        {showDropdown && (
            <div className="absolute z-10 mt-2 w-full bg-white dark:bg-slate-800 rounded-lg shadow-2xl border border-slate-200/70 dark:border-slate-700 overflow-hidden max-h-80 overflow-y-auto animate-fade-in-up" style={{ animationDuration: '200ms' }}>
                {isLoading ? (
                    <div className="p-4 flex items-center justify-center text-slate-500 dark:text-slate-400">
                        <div className="border-2 border-slate-200 dark:border-slate-600 border-t-blue-500 rounded-full w-5 h-5 animate-spin mr-2"></div>
                        Buscando...
                    </div>
                ) : results.length > 0 ? (
                    <ul>
                        {results.map((student) => (
                            <li key={student.id}>
                                <button
                                    onClick={() => handleSelect(student)}
                                    className="w-full text-left px-4 py-3 hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors flex justify-between items-center"
                                >
                                    <span className="font-medium text-slate-800 dark:text-slate-100">{student.fields[FIELD_NOMBRE_ESTUDIANTES]}</span>
                                    <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full">{student.fields[FIELD_LEGAJO_ESTUDIANTES]}</span>
                                </button>
                            </li>
                        ))}
                    </ul>
                ) : (
                     <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                        No se encontraron resultados para "{searchTerm}".
                    </div>
                )}
            </div>
        )}
    </div>
  );
};

export default AdminSearch;