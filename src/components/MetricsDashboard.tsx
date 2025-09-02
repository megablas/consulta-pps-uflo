import React, { useState, useMemo } from 'react';
import { fetchAllAirtableData } from '../services/airtableService';
import type { Practica, EstudianteFields, ConvocatoriaFields, FinalizacionPPS, FinalizacionPPSFields, PracticaFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_PRACTICAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_FINALIZACION,
  FIELD_FECHA_INICIO_PRACTICAS,
  FIELD_FECHA_FIN_PRACTICAS,
  FIELD_LEGAJO_ESTUDIANTES,
  FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
  FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
  FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_ESTUDIANTE_LINK_PRACTICAS,
  FIELD_FECHA_INICIO_CONVOCATORIAS,
  FIELD_ESTUDIANTE_FINALIZACION,
} from '../constants';
import MetricCard from './MetricCard';
import { normalizeStringForComparison, parseToUTCDate, formatDate } from '../utils/formatters';
import EmptyState from './EmptyState';
import { useQuery } from '@tanstack/react-query';
import StudentListModal from './StudentListModal';
import { finalizacionPPSArraySchema } from '../schemas';

interface StudentInfo {
    legajo: string;
    nombre: string;
    institucion?: string;
    fechaFin?: string;
    ppsId?: string;
}
interface ModalData {
    title: string;
    students: StudentInfo[];
}

const fetchMetricsData = async () => {
    const [estudiantesRes, practicasRes, convocatoriasRes, finalizacionesRes] = await Promise.all([
        fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES]),
        fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [FIELD_NOMBRE_BUSQUEDA_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_ESTUDIANTE_LINK_PRACTICAS]),
        fetchAllAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS]),
        fetchAllAirtableData<FinalizacionPPSFields>(AIRTABLE_TABLE_NAME_FINALIZACION, [FIELD_ESTUDIANTE_FINALIZACION])
    ]);

    // Critical data checks
    if (estudiantesRes.error || practicasRes.error || convocatoriasRes.error) {
        const errorResponse = estudiantesRes.error || practicasRes.error || convocatoriasRes.error;
        const errorMessage = typeof errorResponse?.error === 'string' 
            ? errorResponse.error 
            : errorResponse?.error.message || 'un error desconocido';
        throw new Error(`Error al cargar datos críticos para las métricas: ${errorMessage}`);
    }

    let validatedFinalizaciones: FinalizacionPPS[] = [];
    if (finalizacionesRes.error) {
        // Log the non-critical error but don't stop the process
        const errorResponse = finalizacionesRes.error;
        const errorMessage = typeof errorResponse?.error === 'string' 
            ? errorResponse.error 
            : errorResponse?.error.message || 'un error desconocido';
        console.warn(`No se pudieron cargar los datos de 'Finalizacion PPS', la métrica será 0. Error: ${errorMessage}`);
    } else {
        const finalizacionesValidation = finalizacionPPSArraySchema.safeParse(finalizacionesRes.records);
        if (!finalizacionesValidation.success) {
            console.error('[Zod Validation Error in Finalizacion PPS]:', finalizacionesValidation.error.issues);
            // Proceed with empty array on validation failure
        } else {
            validatedFinalizaciones = finalizacionesValidation.data.map(r => ({ ...r.fields, id: r.id, createdTime: r.createdTime }));
        }
    }

    return {
        estudiantes: estudiantesRes.records.map(r => ({ ...r.fields, id: r.id })),
        practicas: practicasRes.records.map(r => ({ ...r.fields, id: r.id })),
        convocatorias: convocatoriasRes.records.map(r => r.fields),
        finalizaciones: validatedFinalizaciones,
    };
};


const MetricsDashboard: React.FC = () => {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['metricsDashboardData'],
        queryFn: fetchMetricsData
    });
    
    const [modalData, setModalData] = useState<ModalData | null>(null);

    const metrics = useMemo(() => {
        if (!data) {
            return {
                alumnosEnPPS: { value: 0, list: [] },
                alumnosActivos: { value: 0, list: [] },
                alumnosSinPPS: { value: 0, list: [] },
                alumnosSinNingunaPPS: { value: 0, list: [] },
                alumnosFinalizados: { value: 0, list: [] },
            };
        }

        const { estudiantes, practicas, convocatorias, finalizaciones } = data;
        
        const studentMapById = new Map<string, any>();
        const studentMapByLegajo = new Map<string, any>();
        estudiantes.forEach(e => {
            if (e.id) studentMapById.set(e.id, e);
            if (e[FIELD_LEGAJO_ESTUDIANTES]) studentMapByLegajo.set(String(e[FIELD_LEGAJO_ESTUDIANTES]), e);
        });

        const targetYear = 2025;

        // 1. Alumnos con PPS activa durante el ciclo 2025
        const startOfYear = new Date(Date.UTC(targetYear, 0, 1));
        const endOfYear = new Date(Date.UTC(targetYear, 11, 31, 23, 59, 59));
        const activeStudentsInPPSLegajos = new Set<string>();
        const activePPSDetails: { legajo: string; institucion: string; fechaFin: string; ppsId: string; }[] = [];

        practicas.forEach(p => {
            const startDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
            const endDate = parseToUTCDate(p[FIELD_FECHA_FIN_PRACTICAS]);
            if (startDate && endDate && startDate <= endOfYear && endDate >= startOfYear) {
                const legajoArray = p[FIELD_NOMBRE_BUSQUEDA_PRACTICAS] as (string | number)[] | undefined;
                const legajo = legajoArray ? String(legajoArray[0]) : null;
                if(legajo) {
                    activeStudentsInPPSLegajos.add(legajo);
                    const institucionRaw = p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                    const institucion = (Array.isArray(institucionRaw) ? institucionRaw[0] : institucionRaw) || 'N/A';
                    
                    activePPSDetails.push({
                        legajo,
                        institucion: String(institucion),
                        fechaFin: formatDate(p[FIELD_FECHA_FIN_PRACTICAS]),
                        ppsId: p.id,
                    });
                }
            }
        });
        const alumnosEnPPSList = activePPSDetails.map(detail => {
            const student = studentMapByLegajo.get(detail.legajo);
            return { 
                ...detail,
                nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `Legajo ${detail.legajo}` 
            };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        // 2. Estudiantes activos (con alguna inscripción en 2025)
        const activeStudentIdsThisYear = new Set<string>();
        convocatorias.forEach(c => {
            const startDate = parseToUTCDate(c[FIELD_FECHA_INICIO_CONVOCATORIAS]);
            if (startDate && startDate.getUTCFullYear() === targetYear) {
                const studentIds = c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
                if (Array.isArray(studentIds)) {
                    studentIds.forEach(id => activeStudentIdsThisYear.add(id));
                }
            }
        });
        const alumnosActivosList = Array.from(activeStudentIdsThisYear).map(id => {
            const student = studentMapById.get(id);
            return { legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        // 3. Alumnos sin PPS (excluyendo "Relevamiento...")
        const relevamientoName = "Relevamiento del Ejercicio Profesional en Psicología";
        const studentsWithRealPPSIds = new Set<string>();
        practicas.forEach(p => {
            const startDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
            if(startDate && startDate.getUTCFullYear() === targetYear) {
                const institucionRaw = p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                const institucion = Array.isArray(institucionRaw) ? institucionRaw[0] : institucionRaw;
                if (normalizeStringForComparison(institucion) !== normalizeStringForComparison(relevamientoName)) {
                    const studentIdArray = p[FIELD_ESTUDIANTE_LINK_PRACTICAS] as string[] | undefined;
                    const studentId = studentIdArray?.[0];
                    if (studentId) studentsWithRealPPSIds.add(studentId);
                }
            }
        });

        const alumnosSinPPSIds = new Set(activeStudentIdsThisYear);
        studentsWithRealPPSIds.forEach(id => alumnosSinPPSIds.delete(id));
        const alumnosSinPPSList = Array.from(alumnosSinPPSIds).map(id => {
            const student = studentMapById.get(id);
            return { legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        // 4. Alumnos sin NINGUNA PPS (incluyendo "Relevamiento...")
        const studentsWithAnyPPSIds = new Set<string>();
        practicas.forEach(p => {
            const startDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
            if(startDate && startDate.getUTCFullYear() === targetYear) {
                const studentIdArray = p[FIELD_ESTUDIANTE_LINK_PRACTICAS] as string[] | undefined;
                const studentId = studentIdArray?.[0];
                if (studentId) studentsWithAnyPPSIds.add(studentId);
            }
        });
        const alumnosSinNingunaPPSIds = new Set(activeStudentIdsThisYear);
        studentsWithAnyPPSIds.forEach(id => alumnosSinNingunaPPSIds.delete(id));
        const alumnosSinNingunaPPSList = Array.from(alumnosSinNingunaPPSIds).map(id => {
            const student = studentMapById.get(id);
            return { legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        // 5. Alumnos Finalizados (con registro en 'Finalizacion PPS' en 2025)
        const finishedStudentIdsThisYear = new Set<string>();
        if (finalizaciones) {
            finalizaciones.forEach(f => {
                const recordDate = parseToUTCDate(f.createdTime);
                if (recordDate && recordDate.getUTCFullYear() === targetYear) {
                    const studentIds = f[FIELD_ESTUDIANTE_FINALIZACION];
                    if (Array.isArray(studentIds)) {
                        studentIds.forEach(id => finishedStudentIdsThisYear.add(id));
                    }
                }
            });
        }
        const alumnosFinalizadosList = Array.from(finishedStudentIdsThisYear).map(id => {
            const student = studentMapById.get(id);
            return { legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        return {
            alumnosEnPPS: { value: activeStudentsInPPSLegajos.size, list: alumnosEnPPSList },
            alumnosActivos: { value: activeStudentIdsThisYear.size, list: alumnosActivosList },
            alumnosSinPPS: { value: alumnosSinPPSIds.size, list: alumnosSinPPSList },
            alumnosSinNingunaPPS: { value: alumnosSinNingunaPPSIds.size, list: alumnosSinNingunaPPSList },
            alumnosFinalizados: { value: finishedStudentIdsThisYear.size, list: alumnosFinalizadosList },
        };
    }, [data]);

    if (error) {
        return <EmptyState icon="error" title="Error al Cargar Métricas" message={error.message} action={<button onClick={() => refetch()}>Reintentar</button>} />;
    }

    return (
        <>
            <StudentListModal 
                isOpen={!!modalData}
                onClose={() => setModalData(null)}
                title={modalData?.title || ''}
                students={modalData?.students || []}
            />
            <div className="animate-fade-in-up">
                 <div className="mb-8 text-center">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Estadísticas del Ciclo 2025</h2>
                    <p className="text-slate-600 mt-2 max-w-2xl mx-auto">Un resumen del estado de los estudiantes y las Prácticas Profesionales Supervisadas.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                    <MetricCard
                        title="Alumnos en PPS"
                        value={metrics.alumnosEnPPS.value}
                        icon="groups"
                        description="Estudiantes con una práctica activa durante el ciclo."
                        isLoading={isLoading}
                        onClick={() => setModalData({ title: 'Alumnos en PPS (Ciclo 2025)', students: metrics.alumnosEnPPS.list })}
                    />
                     <MetricCard
                        title="Estudiantes Activos"
                        value={metrics.alumnosActivos.value}
                        icon="school"
                        description="Total de estudiantes con al menos una inscripción."
                        isLoading={isLoading}
                        onClick={() => setModalData({ title: 'Estudiantes Activos (Ciclo 2025)', students: metrics.alumnosActivos.list })}
                    />
                     <MetricCard
                        title="Alumnos Finalizados"
                        value={metrics.alumnosFinalizados.value}
                        icon="military_tech"
                        description="Estudiantes que solicitaron la acreditación final de PPS."
                        isLoading={isLoading}
                        onClick={() => setModalData({ title: 'Alumnos Finalizados (Ciclo 2025)', students: metrics.alumnosFinalizados.list })}
                    />
                    <MetricCard
                        title="Alumnos sin PPS"
                        value={metrics.alumnosSinPPS.value}
                        icon="person_search"
                        description="Activos sin PPS (excl. Relevamiento)."
                        isLoading={isLoading}
                        onClick={() => setModalData({ title: 'Alumnos sin PPS (excl. Relevamiento)', students: metrics.alumnosSinPPS.list })}
                    />
                    <MetricCard
                        title="Alumnos sin NINGUNA PPS"
                        value={metrics.alumnosSinNingunaPPS.value}
                        icon="person_off"
                        description="Activos que no han realizado ninguna práctica."
                        isLoading={isLoading}
                        onClick={() => setModalData({ title: 'Alumnos sin NINGUNA PPS (Total)', students: metrics.alumnosSinNingunaPPS.list })}
                    />
                </div>
            </div>
        </>
    );
};

export default MetricsDashboard;