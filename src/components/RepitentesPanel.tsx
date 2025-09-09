import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { fetchAllAirtableData } from '../services/airtableService';
import type { Practica, PracticaFields, EstudianteFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_PRACTICAS,
  FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
  FIELD_ESPECIALIDAD_PRACTICAS,
  FIELD_FECHA_INICIO_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  FIELD_LEGAJO_ESTUDIANTES,
  FIELD_NOMBRE_ESTUDIANTES,
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import { formatDate, getEspecialidadClasses, normalizeStringForComparison } from '../utils/formatters';

interface RepeatedPracticeInfo {
  studentLegajo: string;
  studentName: string;
  institution: string;
  orientation: string;
  count: number;
  practices: Practica[];
}

const RepitentesPanel: React.FC = () => {
    const [repeatedPractices, setRepeatedPractices] = useState<RepeatedPracticeInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [practicasRes, estudiantesRes] = await Promise.all([
                fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [
                    FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
                    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
                    FIELD_ESPECIALIDAD_PRACTICAS,
                    FIELD_FECHA_INICIO_PRACTICAS,
                    FIELD_FECHA_FIN_PRACTICAS,
                ]),
                fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [
                    FIELD_LEGAJO_ESTUDIANTES,
                    FIELD_NOMBRE_ESTUDIANTES,
                ])
            ]);
            
            if (practicasRes.error || estudiantesRes.error) {
                throw new Error('No se pudieron cargar los datos de prácticas o estudiantes.');
            }

            const allPracticas = practicasRes.records.map(r => ({ ...r.fields, id: r.id }));
            const estudiantesMap = new Map<string, string>();
            estudiantesRes.records.forEach(r => {
                const legajo = r.fields[FIELD_LEGAJO_ESTUDIANTES];
                const nombre = r.fields[FIELD_NOMBRE_ESTUDIANTES];
                if (legajo && nombre) {
                    // Ensure the key is always a string for consistent lookups.
                    estudiantesMap.set(String(legajo), nombre);
                }
            });

            const practiceGroups = new Map<string, Practica[]>();
            for (const p of allPracticas) {
                const legajoArray = p[FIELD_NOMBRE_BUSQUEDA_PRACTICAS];
                const legajoValue = Array.isArray(legajoArray) ? legajoArray[0] : null;
                const legajo = legajoValue !== null ? String(legajoValue) : null;

                if (!legajo) continue;

                const institutionRaw = p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                const institution = (Array.isArray(institutionRaw) ? institutionRaw[0] : institutionRaw) || 'N/A';
                const orientation = p[FIELD_ESPECIALIDAD_PRACTICAS] || 'N/A';

                if (institution === 'N/A' || orientation === 'N/A') continue;

                const key = `${legajo}::${normalizeStringForComparison(institution)}::${normalizeStringForComparison(orientation)}`;
                
                if (!practiceGroups.has(key)) {
                    practiceGroups.set(key, []);
                }
                practiceGroups.get(key)!.push(p);
            }

            const results: RepeatedPracticeInfo[] = [];
            for (const [key, group] of practiceGroups.entries()) {
                if (group.length > 1) {
                    const [legajo, normInstitution, normOrientation] = key.split('::');
                    
                    const firstPractice = group[0];
                    // FIX: Ensure institution is a string to match the 'RepeatedPracticeInfo' type.
                    const institution = String((Array.isArray(firstPractice[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) ? firstPractice[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS][0] : firstPractice[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) || normInstitution);
                    const orientation = firstPractice[FIELD_ESPECIALIDAD_PRACTICAS] || normOrientation;

                    results.push({
                        studentLegajo: legajo,
                        studentName: estudiantesMap.get(legajo) || `Legajo ${legajo}`,
                        institution,
                        orientation,
                        count: group.length,
                        practices: group.sort((a, b) => new Date(a[FIELD_FECHA_INICIO_PRACTICAS]!).getTime() - new Date(b[FIELD_FECHA_INICIO_PRACTICAS]!).getTime()),
                    });
                }
            }
            
            results.sort((a, b) => a.studentName.localeCompare(b.studentName));
            
            setRepeatedPractices(results);
        } catch (e: any) {
            setError(e.message || "Ocurrió un error inesperado.");
        } finally {
            setLoading(false);
        }
    }, []);


    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleExport = () => {
        if (repeatedPractices.length === 0) return;

        // Flatten the data for the worksheet
        const exportData = repeatedPractices.flatMap(item =>
            item.practices.map(p => ({
                'Legajo': item.studentLegajo,
                'Nombre Alumno': item.studentName,
                'Institución': item.institution,
                'Orientación': item.orientation,
                'Fecha Inicio': formatDate(p[FIELD_FECHA_INICIO_PRACTICAS]),
                'Fecha Fin': formatDate(p[FIELD_FECHA_FIN_PRACTICAS]),
            }))
        );

        const ws = XLSX.utils.json_to_sheet(exportData);
        // Set column widths for better readability
        ws['!cols'] = [
            { wch: 10 }, // Legajo
            { wch: 30 }, // Nombre Alumno
            { wch: 40 }, // Institución
            { wch: 15 }, // Orientación
            { wch: 15 }, // Fecha Inicio
            { wch: 15 }, // Fecha Fin
        ];
        
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Repitentes');

        XLSX.writeFile(wb, 'Reporte_Repitentes_PPS.xlsx');
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader /></div>;
    }

    if (error) {
        return <EmptyState icon="error" title="Error al Cargar" message={error} />;
    }

    if (repeatedPractices.length === 0) {
        return <EmptyState icon="person_search" title="No se encontraron repitentes" message="No hay estudiantes que hayan realizado la misma PPS (misma institución y orientación) más de una vez." />;
    }

    return (
        <div className="animate-fade-in-up space-y-6 p-4 bg-slate-50/50 dark:bg-slate-800/50 rounded-lg">
             <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-2">
                <div className="flex items-start gap-4">
                    <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-full h-12 w-12 flex items-center justify-center mt-1">
                        <span className="material-icons !text-3xl">history_edu</span>
                    </div>
                    <div>
                        <h2 className="text-slate-900 dark:text-slate-50 text-2xl font-bold tracking-tight">Estudiantes con PPS Repetidas</h2>
                        <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">Esta lista muestra estudiantes que han cursado la misma práctica (misma institución y orientación) más de una vez.</p>
                    </div>
                </div>
                <div>
                    <button
                        onClick={handleExport}
                        disabled={repeatedPractices.length === 0}
                        className="bg-green-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-green-700"
                    >
                        <span className="material-icons !text-base">download</span>
                        <span>Exportar a Excel</span>
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {repeatedPractices.map((item, index) => {
                    const especialidadVisuals = getEspecialidadClasses(item.orientation);
                    return (
                        <div key={`${item.studentLegajo}-${index}`} className="bg-white dark:bg-slate-800 rounded-xl border border-slate-200/80 dark:border-slate-700 shadow-sm transition-all duration-300 hover:shadow-lg hover:-translate-y-px group">
                            <div className="p-4 border-b border-slate-200/60 dark:border-slate-700 flex justify-between items-start gap-3">
                                <div>
                                    <h4 className="font-extrabold tracking-tight text-slate-800 dark:text-slate-100">{item.studentName}</h4>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 font-mono">Legajo: {item.studentLegajo}</p>
                                </div>
                                <span className="text-xs font-bold text-red-700 bg-red-100 dark:bg-red-900/50 dark:text-red-200 px-2 py-1 rounded-full ring-1 ring-red-200 dark:ring-red-700">REPITENTE</span>
                            </div>
                            <div className="p-4">
                                <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">Detalle de la repetición:</p>
                                <div className="bg-slate-50/70 dark:bg-slate-700/50 p-3 rounded-lg border border-slate-200/70 dark:border-slate-600/50">
                                    <div className="flex justify-between items-center">
                                        <p className="font-semibold text-slate-900 dark:text-slate-50">{item.institution}</p>
                                        <span className={`${especialidadVisuals.tag} shadow-sm`}>{item.orientation}</span>
                                    </div>
                                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Realizada <span className="font-bold">{item.count}</span> veces</p>
                                    <ul className="mt-2 text-xs text-slate-600 dark:text-slate-300 space-y-1">
                                        {item.practices.map(p => (
                                            <li key={p.id} className="flex items-center gap-2">
                                                <span className="material-icons !text-sm text-slate-400 dark:text-slate-500">arrow_right</span>
                                                <span>{formatDate(p[FIELD_FECHA_INICIO_PRACTICAS])} al {formatDate(p[FIELD_FECHA_FIN_PRACTICAS])}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default RepitentesPanel;