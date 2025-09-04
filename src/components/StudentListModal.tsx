import React, { useState, useMemo } from 'react';

interface StudentInfo {
    legajo: string;
    nombre: string;
    institucion?: string;
    fechaFin?: string;
    ppsId?: string;
    [key: string]: any; // Allow other properties
}

interface StudentListModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    students: StudentInfo[];
    headers?: { key: string; label: string }[];
    description?: React.ReactNode;
}

const StudentListModal: React.FC<StudentListModalProps> = ({ isOpen, onClose, title, students, headers, description }) => {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredStudents = useMemo(() => {
        if (!searchTerm.trim()) {
            return students;
        }
        const lowercasedFilter = searchTerm.toLowerCase();
        return students.filter(student =>
            Object.values(student).some(value => 
                String(value).toLowerCase().includes(lowercasedFilter)
            )
        );
    }, [students, searchTerm]);
    
    if (!isOpen) return null;

    const renderTable = () => (
        <table className="w-full text-sm text-left">
            <thead className="bg-slate-100/70 text-xs text-slate-500 uppercase">
                <tr>
                    {headers!.map(header => (
                        <th key={header.key} scope="col" className="px-4 py-3 font-semibold tracking-wider">{header.label}</th>
                    ))}
                </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-200/70">
                {filteredStudents.map((student, index) => (
                    <tr key={student.ppsId || `${student.legajo}-${index}`} className="hover:bg-slate-50/70 transition-colors">
                        {headers!.map(header => (
                            <td key={header.key} className="px-4 py-3 text-slate-700">{student[header.key]}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </table>
    );

    const renderList = () => (
        <ul className="divide-y divide-slate-200/70">
            {filteredStudents.map((student, index) => (
                <li key={student.ppsId || `${student.legajo}-${index}`} className="p-4 transition-colors hover:bg-slate-100/70 rounded-lg">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-y-3">
                        <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-800 truncate" title={student.nombre}>{student.nombre}</p>
                            {student.institucion && (
                                <div className="mt-1.5 flex items-center gap-2 text-sm text-slate-600">
                                    <span className="material-icons !text-base text-slate-400">business</span>
                                    <span className="truncate" title={student.institucion}>{student.institucion}</span>
                                </div>
                            )}
                        </div>
                        <div className="flex-shrink-0 flex flex-row sm:flex-col items-start sm:items-end gap-x-6 gap-y-1.5">
                            <div className="flex items-center gap-2 text-sm text-slate-500">
                                <span className="material-icons !text-base text-slate-400">badge</span>
                                <span className="font-mono">{student.legajo}</span>
                            </div>
                            {student.fechaFin && (
                                <div className="flex items-center gap-2 text-sm text-slate-500">
                                    <span className="material-icons !text-base text-slate-400">event_busy</span>
                                    <span>{student.fechaFin}</span>
                                </div>
                            )}
                        </div>
                    </div>
                </li>
            ))}
        </ul>
    );

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up"
            aria-labelledby="student-list-modal-title" role="dialog" aria-modal="true" onClick={onClose}
        >
            <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-2xl shadow-lg w-full max-w-3xl transform transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/70">
                <div className="p-6 flex-shrink-0 border-b border-slate-200">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <h2 id="student-list-modal-title" className="text-xl font-bold text-slate-800">{title}</h2>
                            <p className="text-sm text-slate-500 mt-1">{filteredStudents.length} de {students.length} resultados</p>
                            {description && <div className="mt-2 text-xs p-2 bg-slate-100 rounded-md text-slate-600">{description}</div>}
                        </div>
                        <button type="button" onClick={onClose} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors" aria-label="Cerrar modal">
                            <span className="material-icons !text-xl">close</span>
                        </button>
                    </div>
                    <div className="relative mt-4">
                        <input type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Buscar..." className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg text-sm bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"/>
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 !text-lg pointer-events-none">search</span>
                    </div>
                </div>
                <div className="overflow-y-auto flex-grow bg-slate-50/50">
                    {filteredStudents.length > 0 ? (
                        <div className={headers ? 'p-0' : 'p-2 sm:p-4'}>
                            {headers ? renderTable() : renderList()}
                        </div>
                    ) : (
                        <div className="text-center py-12 px-6">
                            <p className="text-slate-500">No se encontraron resultados que coincidan con la búsqueda.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentListModal;