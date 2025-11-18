import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { LanzamientoPPS, Convocatoria, EstudianteFields, AirtableRecord, LanzamientoPPSFields, ConvocatoriaFields, PracticaFields } from '../types';
import { useQuery, useMutation } from '@tanstack/react-query';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import { getEspecialidadClasses } from '../utils/formatters';

// --- MOCK DATA ---
const mockStudents: AirtableRecord<EstudianteFields>[] = Array.from({ length: 25 }, (_, i) => ({
    id: `recStudent${i + 1}`,
    createdTime: '',
    fields: { 'Nombre': `Estudiante ${String.fromCharCode(65 + i)}`, 'Legajo': `T${1001 + i}` }
}));

const mockPracticas: AirtableRecord<PracticaFields>[] = [
    ...mockStudents.slice(0, 20).map((s, i) => ({
        id: `prac_${s.id}`,
        createdTime: '',
        fields: {
            'Estudiante Inscripto': [s.id],
            'Horas Realizadas': 20 + (i * 15) // Horas variadas de 20 a 305
        }
    }))
];

const mockLanzamientos: AirtableRecord<LanzamientoPPSFields>[] = [
    { id: 'lanz_sel_1', createdTime: '', fields: { 'Nombre PPS': 'Hospital de Simulación', 'Orientación': 'Clinica', 'Estado de Convocatoria': 'Cerrado' } },
    { id: 'lanz_sel_2', createdTime: '', fields: { 'Nombre PPS': 'Escuela de Pruebas', 'Orientación': 'Educacional', 'Estado de Convocatoria': 'Cerrado' } },
    { id: 'lanz_sel_3', createdTime: '', fields: { 'Nombre PPS': 'Empresa Ficticia S.A.', 'Orientación': 'Laboral', 'Estado de Convocatoria': 'Cerrado' } },
    { id: 'lanz_sel_4', createdTime: '', fields: { 'Nombre PPS': 'Centro Comunitario Demo', 'Orientación': 'Comunitaria', 'Estado de Convocatoria': 'Cerrado' } },
];

const mockConvocatorias: AirtableRecord<ConvocatoriaFields>[] = [
    // 15 inscriptos para Hospital
    ...mockStudents.slice(0, 15).map(s => ({ id: `conv_${s.id}`, createdTime: '', fields: { 'Lanzamiento Vinculado': ['lanz_sel_1'], 'Estudiante Inscripto': [s.id], 'Estado': 'Inscripto', '¿Terminó de cursar?': Math.random() > 0.5 ? 'Sí' : 'No', 'Finales que adeuda': `${Math.floor(Math.random() * 5)} Finales` } })),
    // 8 inscriptos para Escuela
    ...mockStudents.slice(15, 23).map(s => ({ id: `conv_${s.id}`, createdTime: '', fields: { 'Lanzamiento Vinculado': ['lanz_sel_2'], 'Estudiante Inscripto': [s.id], 'Estado': 'Inscripto', '¿Terminó de cursar?': 'No', 'Cursando Materias Electivas': 'Sí' } })),
];
// --- END MOCK DATA ---

type StudentInKanban = {
    id: string; // Convocatoria ID
    studentId: string;
    nombre: string;
    legajo: string;
    detail: string;
    totalHoras: number;
}

type KanbanColumnId = 'inscriptos' | 'seleccionados';

type KanbanColumn = {
    id: KanbanColumnId;
    title: string;
    studentIds: string[];
};

type KanbanColumns = {
    [key in KanbanColumnId]: KanbanColumn;
}

const StudentCard: React.FC<{ student: StudentInKanban, onDragStart: (e: React.DragEvent, studentId: string) => void }> = ({ student, onDragStart }) => {
    const hoursPercentage = Math.min((student.totalHoras / 250) * 100, 100);

    return (
        <div
            draggable
            onDragStart={(e) => onDragStart(e, student.id)}
            className="bg-white dark:bg-slate-800 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-md cursor-grab active:cursor-grabbing hover:-translate-y-0.5 hover:shadow-lg transition-all"
        >
            <div className="flex items-start justify-between">
                <div>
                    <p className="font-bold text-slate-800 dark:text-slate-100">{student.nombre}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">{student.legajo}</p>
                </div>
                <span className="material-icons text-slate-400 dark:text-slate-500 !text-base handle flex-shrink-0">drag_indicator</span>
            </div>
            <div className="mt-3 space-y-2">
                <div>
                    <div className="flex justify-between items-center text-xs mb-1">
                        <span className="font-semibold text-slate-600 dark:text-slate-300">Horas PPS</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">{student.totalHoras} / 250</span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5">
                        <div className="bg-blue-500 h-1.5 rounded-full" style={{ width: `${hoursPercentage}%` }} />
                    </div>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/50 p-2 rounded-md truncate" title={student.detail}>
                    <span className="font-semibold">Sit. Académica:</span> {student.detail}
                </p>
            </div>
        </div>
    );
};


const SeleccionadorConvocatorias: React.FC<{ isTestingMode?: boolean }> = ({ isTestingMode }) => {
    const [selectedLanzamiento, setSelectedLanzamiento] = useState<AirtableRecord<LanzamientoPPSFields> | null>(null);
    const [columns, setColumns] = useState<KanbanColumns | null>(null);
    const [studentsMap, setStudentsMap] = useState<Map<string, StudentInKanban>>(new Map());
    const [isDirty, setIsDirty] = useState(false);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const { data, isLoading } = useQuery({
        queryKey: ['seleccionadorData', isTestingMode],
        queryFn: async () => {
            // En modo real, aquí irían las llamadas a db.lanzamientos.getAll(), etc.
            const convocatoriasByLanzamiento = mockConvocatorias.reduce((acc, conv) => {
                const lanzId = conv.fields['Lanzamiento Vinculado']?.[0];
                if (lanzId) {
                    if (!acc[lanzId]) acc[lanzId] = [];
                    acc[lanzId].push(conv);
                }
                return acc;
            }, {} as Record<string, AirtableRecord<ConvocatoriaFields>[]>);

            return {
                lanzamientos: mockLanzamientos,
                convocatoriasByLanzamiento,
                students: mockStudents,
                practicas: mockPracticas,
            };
        },
        enabled: isTestingMode, // Solo corre en modo prueba
    });
    
    const saveMutation = useMutation({
        mutationFn: async (updatedColumns: KanbanColumns) => {
            console.log('SIMULATING SAVE:');
            console.log('Seleccionados:', updatedColumns.seleccionados.studentIds.map(id => studentsMap.get(id)?.nombre));
            await new Promise(res => setTimeout(res, 1000));
        },
        onSuccess: () => {
            setToastInfo({ message: 'Cambios guardados con éxito (simulado).', type: 'success' });
            setIsDirty(false);
        },
        onError: () => setToastInfo({ message: 'Error al guardar (simulado).', type: 'error' }),
    });

    const handleSelectLanzamiento = (lanz: AirtableRecord<LanzamientoPPSFields>) => {
        setSelectedLanzamiento(lanz);
        const enrolledConvocatorias = data?.convocatoriasByLanzamiento[lanz.id] || [];
        const studentMap = new Map(data?.students.map(s => [s.id, s.fields]));
        
        const studentHoursMap = new Map<string, number>();
        (data?.practicas || []).forEach(practica => {
            const studentId = practica.fields['Estudiante Inscripto']?.[0];
            const hours = practica.fields['Horas Realizadas'] || 0;
            if (studentId) {
                studentHoursMap.set(studentId, (studentHoursMap.get(studentId) || 0) + hours);
            }
        });

        const newStudentsMap = new Map<string, StudentInKanban>();
        const initialStudentIds: string[] = [];

        enrolledConvocatorias.forEach(conv => {
            const studentId = conv.fields['Estudiante Inscripto']?.[0];
            const student = studentId ? studentMap.get(studentId) : null;
            if (student) {
                const detail = conv.fields['¿Terminó de cursar?'] === 'Sí'
                    ? `Finales adeudados: ${conv.fields['Finales que adeuda'] || 'N/A'}`
                    : `Cursando electivas: ${conv.fields['Cursando Materias Electivas'] || 'N/A'}`;
                
                newStudentsMap.set(conv.id, {
                    id: conv.id,
                    studentId,
                    nombre: student['Nombre'] || 'Sin Nombre',
                    legajo: student['Legajo'] || 'S/L',
                    detail,
                    totalHoras: studentHoursMap.get(studentId) || 0,
                });
                initialStudentIds.push(conv.id);
            }
        });
        
        setStudentsMap(newStudentsMap);
        setColumns({
            inscriptos: { id: 'inscriptos', title: 'Inscriptos', studentIds: initialStudentIds },
            seleccionados: { id: 'seleccionados', title: 'Seleccionados', studentIds: [] },
        });
        setIsDirty(false);
    };

    const handleDragStart = (e: React.DragEvent, studentConvId: string) => {
        e.dataTransfer.setData('studentConvId', studentConvId);
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
    };

    const handleDrop = (e: React.DragEvent, targetColumnId: KanbanColumnId) => {
        e.preventDefault();
        const studentConvId = e.dataTransfer.getData('studentConvId');
        if (!studentConvId || !columns) return;
        
        const newColumns = { ...columns };
        let sourceColumnId: KanbanColumnId | null = null;
        
        for (const colId in newColumns) {
            const typedColId = colId as KanbanColumnId;
            const studentIndex = newColumns[typedColId].studentIds.indexOf(studentConvId);
            if (studentIndex !== -1) {
                sourceColumnId = typedColId;
                newColumns[typedColId].studentIds.splice(studentIndex, 1);
                break;
            }
        }
        
        if (sourceColumnId !== targetColumnId) {
            newColumns[targetColumnId].studentIds.push(studentConvId);
            setColumns(newColumns);
            setIsDirty(true);
        }
    };
    
    if (isLoading) return <Loader />;
    if (!data) return <EmptyState icon="error" title="Error" message="No se pudieron cargar los datos de prueba." />;

    if (!selectedLanzamiento) {
        return (
            <div className="animate-fade-in-up">
                {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
                <h3 className="text-xl font-bold mb-4">Selecciona una Convocatoria</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {data.lanzamientos.map(lanz => {
                        const inscriptosCount = data.convocatoriasByLanzamiento[lanz.id]?.length || 0;
                        const especialidadVisuals = getEspecialidadClasses(lanz.fields['Orientación']);
                        return (
                            <button key={lanz.id} onClick={() => handleSelectLanzamiento(lanz)} className="text-left p-4 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all">
                                <div className="flex justify-between items-start">
                                    <h4 className="font-bold text-slate-800 dark:text-slate-100">{lanz.fields['Nombre PPS']}</h4>
                                    <span className={especialidadVisuals.tag}>{lanz.fields['Orientación']}</span>
                                </div>
                                <div className="mt-4 flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                                    <span className="material-icons">groups</span>
                                    <span>{inscriptosCount} Inscriptos</span>
                                </div>
                            </button>
                        )
                    })}
                </div>
            </div>
        );
    }
    
    return (
        <div className="animate-fade-in-up">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => setSelectedLanzamiento(null)} className="flex items-center gap-1 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100">
                    <span className="material-icons">arrow_back</span>
                    Volver
                </button>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100">{selectedLanzamiento.fields['Nombre PPS']}</h3>
                {isDirty && (
                     <button onClick={() => saveMutation.mutate(columns!)} disabled={saveMutation.isPending} className="bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center gap-2 disabled:bg-slate-400">
                        {saveMutation.isPending ? <div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/> : <span className="material-icons !text-base">save</span>}
                        {saveMutation.isPending ? 'Guardando...' : 'Guardar Cambios'}
                    </button>
                )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* FIX: Explicitly cast the result of `Object.values(columns)` to `KanbanColumn[]` to resolve TypeScript errors where properties like 'id', 'title', and 'studentIds' were not found on the inferred 'unknown' type. */}
                {columns && (Object.values(columns) as KanbanColumn[]).map(column => (
                    <div 
                        key={column.id}
                        onDragOver={handleDragOver}
                        onDrop={(e) => handleDrop(e, column.id)}
                        className={`rounded-xl border-2 transition-all duration-300 ${column.id === 'seleccionados' ? 'bg-emerald-50/50 dark:bg-emerald-900/20 border-emerald-500/50' : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'} p-4`}
                    >
                        <h4 className="font-bold text-slate-700 dark:text-slate-200 mb-4 flex items-center justify-between">
                            <span>{column.title}</span>
                            <span className={`text-sm font-semibold w-7 h-7 flex items-center justify-center rounded-full ${column.id === 'seleccionados' ? 'bg-emerald-200 dark:bg-emerald-800 text-emerald-800 dark:text-emerald-100' : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'}`}>
                                {column.studentIds.length}
                            </span>
                        </h4>
                        <div className="space-y-3 min-h-[300px]">
                            {column.studentIds.map(id => {
                                const student = studentsMap.get(id);
                                return student ? <StudentCard key={id} student={student} onDragStart={handleDragStart} /> : null;
                            })}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SeleccionadorConvocatorias;
