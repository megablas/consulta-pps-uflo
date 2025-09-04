import React, { useState, useMemo } from 'react';
import { fetchAllAirtableData } from '../services/airtableService';
import type { Practica, EstudianteFields, ConvocatoriaFields, FinalizacionPPS, FinalizacionPPSFields, PracticaFields, LanzamientoPPSFields, Convocatoria, InstitucionFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_PRACTICAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_FINALIZACION,
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
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
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_HORAS_PRACTICAS,
  FIELD_NOMBRE_PPS_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_INSTITUCIONES,
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_CONVENIO_NUEVO_INSTITUCIONES,
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate, formatDate } from '../utils/formatters';
import EmptyState from './EmptyState';
import { useQuery } from '@tanstack/react-query';
import StudentListModal from './StudentListModal';
import { finalizacionPPSArraySchema } from '../schemas';
import Card from './Card';
import Loader from './Loader';
import BarChart from './BarChart';
import Histogram from './Histogram';
import MetricCard from './MetricCard';


interface StudentInfo {
    legajo: string;
    nombre: string;
    institucion?: string;
    fechaFin?: string;
    ppsId?: string;
    [key: string]: any;
}
interface ModalData {
    title: string;
    students: StudentInfo[];
    headers?: { key: string; label: string }[];
    description?: React.ReactNode;
}

const HeroMetric: React.FC<{ title: string; value: string | number; icon: string; description: string; onClick: () => void; color: 'blue' | 'indigo' | 'emerald' }> = ({ title, value, icon, description, onClick, color }) => {
    const colorClasses = {
        blue: 'from-blue-50 to-sky-100/50 border-blue-200/60 text-blue-700 hover:border-blue-300 hover:shadow-blue-500/10',
        indigo: 'from-indigo-50 to-purple-100/50 border-indigo-200/60 text-indigo-700 hover:border-indigo-300 hover:shadow-indigo-500/10',
        emerald: 'from-emerald-50 to-teal-100/50 border-emerald-200/60 text-emerald-700 hover:border-emerald-300 hover:shadow-emerald-500/10',
    };
    
    return (
        <button
            onClick={onClick}
            className={`group relative text-left w-full p-6 rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hero-metric-bg ${colorClasses[color]}`}
        >
            <div className="flex justify-between items-start">
                <div className="flex flex-col">
                    <p className="text-sm font-bold opacity-80">{title}</p>
                    <p className="text-6xl font-black text-slate-900 tracking-tighter mt-2">{value}</p>
                </div>
                <div className={`p-3 rounded-xl bg-white/50 shadow-sm border border-black/5 ${color === 'blue' ? 'text-blue-600' : color === 'indigo' ? 'text-indigo-600' : 'text-emerald-600'}`}>
                    <span className="material-icons !text-3xl">{icon}</span>
                </div>
            </div>
            <p className="text-xs opacity-70 mt-4">{description}</p>
        </button>
    );
};


const FunnelRow: React.FC<{ label: string; value: number; total: number; color: string; onClick: () => void; description: string; }> = ({ label, value, total, color, onClick, description }) => {
    const percentage = total > 0 ? (value / total) * 100 : 0;
    
    return (
        <button onClick={onClick} className="w-full text-left p-4 rounded-xl transition-all duration-200 hover:bg-slate-100/70 hover:shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex-1">
                    <p className="font-bold text-slate-800">{label}</p>
                    <p className="text-xs text-slate-500 mt-1">{description}</p>
                </div>
                <div className="flex-shrink-0 w-full sm:w-56 flex items-center gap-4">
                    <div className="w-full bg-slate-200/70 rounded-full h-2.5 shadow-inner">
                        <div className={`h-2.5 rounded-full transition-all duration-1000 ease-out ${color}`} style={{ width: `${percentage}%` }} />
                    </div>
                    <div className="text-right">
                        <p className="font-black text-lg text-slate-900 leading-none">{value}</p>
                        <p className="text-xs text-slate-500 leading-none">{total > 0 ? `${Math.round(percentage)}%` : 'N/A'}</p>
                    </div>
                </div>
            </div>
        </button>
    );
};


const fetchMetricsData = async () => {
    const [estudiantesRes, practicasRes, convocatoriasRes, finalizacionesRes, lanzamientosRes, institucionesRes] = await Promise.all([
        fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES]),
        fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [FIELD_NOMBRE_BUSQUEDA_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_ESTUDIANTE_LINK_PRACTICAS, FIELD_HORAS_PRACTICAS]),
        fetchAllAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS]),
        fetchAllAirtableData<FinalizacionPPSFields>(AIRTABLE_TABLE_NAME_FINALIZACION, [FIELD_ESTUDIANTE_FINALIZACION]),
        fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS]),
        fetchAllAirtableData<InstitucionFields>(AIRTABLE_TABLE_NAME_INSTITUCIONES, [FIELD_NOMBRE_INSTITUCIONES, FIELD_CONVENIO_NUEVO_INSTITUCIONES])
    ]);

    if (estudiantesRes.error || practicasRes.error || convocatoriasRes.error || lanzamientosRes.error || institucionesRes.error) {
        const errorResponse = estudiantesRes.error || practicasRes.error || convocatoriasRes.error || lanzamientosRes.error || institucionesRes.error;
        const errorMessage = typeof errorResponse?.error === 'string' 
            ? errorResponse.error 
            : errorResponse?.error.message || 'un error desconocido';
        throw new Error(`Error al cargar datos críticos para las métricas: ${errorMessage}`);
    }

    let validatedFinalizaciones: FinalizacionPPS[] = [];
    if (finalizacionesRes.error) {
        console.warn(`No se pudieron cargar los datos de 'Finalizacion PPS', la métrica será 0.`);
    } else {
        const finalizacionesValidation = finalizacionPPSArraySchema.safeParse(finalizacionesRes.records);
        if (finalizacionesValidation.success) {
            validatedFinalizaciones = finalizacionesValidation.data.map(r => ({ ...r.fields, id: r.id, createdTime: r.createdTime }));
        }
    }

    return {
        estudiantes: estudiantesRes.records.map(r => ({ ...r.fields, id: r.id })),
        practicas: practicasRes.records.map(r => ({ ...r.fields, id: r.id })),
        convocatorias: convocatoriasRes.records.map(r => r.fields),
        finalizaciones: validatedFinalizaciones,
        lanzamientos: lanzamientosRes.records.map(r => r.fields),
        institutions: institucionesRes.records.map(r => r.fields),
    };
};

const MetricsDashboard: React.FC = () => {
    const { data, isLoading, error, refetch } = useQuery({
        queryKey: ['metricsDashboardData'],
        queryFn: fetchMetricsData
    });
    
    const [modalData, setModalData] = useState<ModalData | null>(null);

    const metrics = useMemo(() => {
        if (!data) return null;

        const { estudiantes, practicas, convocatorias, finalizaciones, lanzamientos, institutions } = data;
        const studentMapById = new Map<string, any>(estudiantes.map(e => [e.id, e]));
        const studentMapByLegajo = new Map<string, any>(estudiantes.map(e => [String(e[FIELD_LEGAJO_ESTUDIANTES]), e]));

        const targetYear = 2025;

        const lanzamientos2025 = lanzamientos.filter(l => parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS])?.getUTCFullYear() === targetYear);
        const ppsLanzadasCount = lanzamientos2025.length;

        const cuposOfrecidos = lanzamientos2025
            .filter(l => !normalizeStringForComparison(l[FIELD_NOMBRE_PPS_LANZAMIENTOS]).includes("relevamiento"))
            .reduce((sum, l) => sum + (l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);
            
        const convocatorias2025 = convocatorias.filter(c => parseToUTCDate(c[FIELD_FECHA_INICIO_CONVOCATORIAS])?.getUTCFullYear() === targetYear);
        const totalInscripciones = convocatorias2025.reduce((sum, c) => {
            const studentIds = c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
            return sum + (Array.isArray(studentIds) ? studentIds.length : 0);
        }, 0);
        const presionInscripcion = cuposOfrecidos > 0 ? Math.round((totalInscripciones / cuposOfrecidos) * 100) : 0;
        
        const listaPostulaciones: StudentInfo[] = [];
        convocatorias2025.forEach(c => {
            const studentIds = c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
            if (Array.isArray(studentIds)) {
                studentIds.forEach(id => {
                    const student = studentMapById.get(id);
                    if (student) {
                        listaPostulaciones.push({
                            legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                            nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}`,
                            institucion: (Array.isArray(c[FIELD_NOMBRE_PPS_CONVOCATORIAS]) ? c[FIELD_NOMBRE_PPS_CONVOCATORIAS][0] : c[FIELD_NOMBRE_PPS_CONVOCATORIAS]) || 'N/A',
                            fechaInscripcion: formatDate(c[FIELD_FECHA_INICIO_CONVOCATORIAS])
                        });
                    }
                });
            }
        });
        listaPostulaciones.sort((a,b) => a.nombre.localeCompare(b.nombre));

        const ppsLanzadasList: StudentInfo[] = Array.from(
            lanzamientos2025.reduce((map, l) => {
                const name = l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Sin Nombre';
                if (!map.has(name)) map.set(name, { count: 0, cupos: 0 });
                const entry = map.get(name)!;
                entry.count += 1;
                entry.cupos += l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0;
                return map;
            }, new Map<string, { count: number, cupos: number }>()),
            ([name, data]) => ({ nombre: name, legajo: `Lanzada ${data.count} ${data.count > 1 ? 'veces' : 'vez'}`, cupos: data.cupos })
        ).sort((a, b) => a.nombre.localeCompare(b.nombre));

        const practicas2025 = practicas.filter(p => {
            const startDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
            return startDate && startDate.getUTCFullYear() === targetYear;
        });

        const activeStudentsInPPSLegajos = new Set<string>();
        const activePPSDetails: StudentInfo[] = [];
        practicas2025.forEach(p => {
            const institucion = (Array.isArray(p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) ? p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS][0] : p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) || 'N/A';
            if (normalizeStringForComparison(institucion).includes("relevamiento")) return;
            const legajo = String((Array.isArray(p[FIELD_NOMBRE_BUSQUEDA_PRACTICAS]) ? p[FIELD_NOMBRE_BUSQUEDA_PRACTICAS][0] : p[FIELD_NOMBRE_BUSQUEDA_PRACTICAS]) || '');
            if(legajo) {
                activeStudentsInPPSLegajos.add(legajo);
                const student = studentMapByLegajo.get(legajo);
                activePPSDetails.push({ legajo, nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `Legajo ${legajo}`, institucion: String(institucion), fechaFin: formatDate(p[FIELD_FECHA_FIN_PRACTICAS]), ppsId: p.id });
            }
        });
        const alumnosEnPPSList = activePPSDetails.sort((a,b) => a.nombre.localeCompare(b.nombre));

        const activeStudentIdsThisYear = new Set<string>();
        const studentFirstApplication = new Map<string, Date>();
        convocatorias.forEach(c => {
            const startDate = parseToUTCDate(c[FIELD_FECHA_INICIO_CONVOCATORIAS]);
            if (startDate && startDate.getUTCFullYear() === targetYear) {
                const studentIds = c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
                if (Array.isArray(studentIds)) {
                    studentIds.forEach(id => {
                        activeStudentIdsThisYear.add(id);
                        if (!studentFirstApplication.has(id) || startDate < studentFirstApplication.get(id)!) {
                            studentFirstApplication.set(id, startDate);
                        }
                    });
                }
            }
        });
        const alumnosActivosList = Array.from(activeStudentIdsThisYear).map(id => {
            const student = studentMapById.get(id);
            return { legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        const studentsWithRealPPSIds = new Set(practicas2025.filter(p => !normalizeStringForComparison((Array.isArray(p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) ? p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS][0] : p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS])).includes('relevamiento')).flatMap(p => p[FIELD_ESTUDIANTE_LINK_PRACTICAS] || []));
        const alumnosSinPPSList = Array.from(activeStudentIdsThisYear).filter(id => !studentsWithRealPPSIds.has(id)).map(id => {
            const student = studentMapById.get(id);
            return { legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        const studentsWithAnyPPSIds = new Set(practicas2025.flatMap(p => p[FIELD_ESTUDIANTE_LINK_PRACTICAS] || []));
        const alumnosSinNingunaPPSList = Array.from(activeStudentIdsThisYear).filter(id => !studentsWithAnyPPSIds.has(id)).map(id => {
            const student = studentMapById.get(id);
            return { legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        const finishedStudentIdsThisYear = new Set<string>();
        finalizaciones.forEach(f => {
            if (parseToUTCDate(f.createdTime)?.getUTCFullYear() === targetYear) {
                (f[FIELD_ESTUDIANTE_FINALIZACION] || []).forEach(id => finishedStudentIdsThisYear.add(id));
            }
        });
        const alumnosFinalizadosList = Array.from(finishedStudentIdsThisYear).map(id => {
            const student = studentMapById.get(id);
            return { legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        const studentTotalHours = practicas2025.reduce((acc, p) => {
            const legajo = String((Array.isArray(p[FIELD_NOMBRE_BUSQUEDA_PRACTICAS]) ? p[FIELD_NOMBRE_BUSQUEDA_PRACTICAS][0] : p[FIELD_NOMBRE_BUSQUEDA_PRACTICAS]) || '');
            if (legajo) {
                acc.set(legajo, (acc.get(legajo) || 0) + (p[FIELD_HORAS_PRACTICAS] || 0));
            }
            return acc;
        }, new Map<string, number>());

        const hourBins = {
            '0-50 hs': { count: 0, students: [] as StudentInfo[] }, '51-100 hs': { count: 0, students: [] as StudentInfo[] },
            '101-150 hs': { count: 0, students: [] as StudentInfo[] }, '151-200 hs': { count: 0, students: [] as StudentInfo[] },
            '201-249 hs': { count: 0, students: [] as StudentInfo[] },
        };

        studentTotalHours.forEach((hours, legajo) => {
            if (hours >= 250) return; // Excluir finalizados
            const student = studentMapByLegajo.get(legajo);
            const studentInfo = { legajo, nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `Legajo ${legajo}`, totalHoras: Math.round(hours) };
            if (hours >= 201) hourBins['201-249 hs'].students.push(studentInfo);
            else if (hours >= 151) hourBins['151-200 hs'].students.push(studentInfo);
            else if (hours >= 101) hourBins['101-150 hs'].students.push(studentInfo);
            else if (hours >= 51) hourBins['51-100 hs'].students.push(studentInfo);
            else hourBins['0-50 hs'].students.push(studentInfo);
        });
        Object.keys(hourBins).forEach(key => hourBins[key as keyof typeof hourBins].count = hourBins[key as keyof typeof hourBins].students.length);

        const topInstitutions = Array.from(
            lanzamientos2025
                .filter(l => !normalizeStringForComparison(l[FIELD_NOMBRE_PPS_LANZAMIENTOS]).includes("relevamiento"))
                .reduce((map, l) => {
                    const name = l[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Sin Nombre';
                    map.set(name, (map.get(name) || 0) + (l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0));
                    return map;
                }, new Map<string, number>()),
            ([label, value]) => ({ label, value })
        ).sort((a, b) => b.value - a.value).slice(0, 5);

        const timeToPlacementDurations: number[] = [];
        const studentFirstPracticeDate = new Map<string, Date>();
        practicas2025.forEach(p => {
            const studentId = (p[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [])[0];
            const startDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
            if (studentId && startDate) {
                if (!studentFirstPracticeDate.has(studentId) || startDate < studentFirstPracticeDate.get(studentId)!) {
                    studentFirstPracticeDate.set(studentId, startDate);
                }
            }
        });

        studentFirstPracticeDate.forEach((practiceDate, studentId) => {
            const appDate = studentFirstApplication.get(studentId);
            if (appDate) {
                const diff = (practiceDate.getTime() - appDate.getTime()) / (1000 * 3600 * 24);
                if (diff >= 0) timeToPlacementDurations.push(diff);
            }
        });
        const avgTimeToPlacement = timeToPlacementDurations.length > 0 ? Math.round(timeToPlacementDurations.reduce((a, b) => a + b, 0) / timeToPlacementDurations.length) : 0;
        
        const nuevosConveniosInstitutions = institutions
            .filter(inst => inst[FIELD_CONVENIO_NUEVO_INSTITUCIONES] && inst[FIELD_NOMBRE_INSTITUCIONES]);

        const nuevosConveniosList = nuevosConveniosInstitutions.map(inst => {
            const instName = inst[FIELD_NOMBRE_INSTITUCIONES]!;
            const getGroupName = (name: string) => name.split(' - ')[0].trim();
            const normInstGroupName = normalizeStringForComparison(getGroupName(instName));

            const totalCupos = lanzamientos2025
                .filter(l => normalizeStringForComparison(getGroupName(l[FIELD_NOMBRE_PPS_LANZAMIENTOS])).startsWith(normInstGroupName))
                .reduce((sum, l) => sum + (l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);
                
            return {
                nombre: instName,
                // FIX: Add a placeholder 'legajo' property to satisfy the StudentInfo type, as this list is not of students.
                legajo: '—',
                cupos: totalCupos,
            };
        });

        return {
            alumnosEnPPS: { value: activeStudentsInPPSLegajos.size, list: alumnosEnPPSList },
            alumnosActivos: { value: activeStudentIdsThisYear.size, list: alumnosActivosList },
            alumnosSinPPS: { value: alumnosSinPPSList.length, list: alumnosSinPPSList },
            alumnosSinNingunaPPS: { value: alumnosSinNingunaPPSList.length, list: alumnosSinNingunaPPSList },
            alumnosFinalizados: { value: finishedStudentIdsThisYear.size, list: alumnosFinalizadosList },
            ppsLanzadas: { value: ppsLanzadasCount, list: ppsLanzadasList },
            cuposOfrecidos: { value: cuposOfrecidos },
            presionInscripcion,
            listaPostulaciones,
            distribucionHoras: Object.entries(hourBins).map(([label, data]) => ({ label, value: data.count, students: data.students.sort((a,b) => b.totalHoras - a.totalHoras) })),
            topInstitutions,
            avgTimeToPlacement,
            nuevosConvenios: {
                value: nuevosConveniosList.length,
                list: nuevosConveniosList
            },
        };
    }, [data]);

    if (error) return <EmptyState icon="error" title="Error al Cargar Métricas" message={error.message} action={<button onClick={() => refetch()}>Reintentar</button>} />;
    if (isLoading || !metrics) return <div className="flex justify-center p-8"><Loader /></div>;

    return (
        <>
            <StudentListModal isOpen={!!modalData} onClose={() => setModalData(null)} title={modalData?.title || ''} students={modalData?.students || []} headers={modalData?.headers} description={modalData?.description} />
            <div className="animate-fade-in-up space-y-8">
                 <div className="text-center">
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">Estadísticas del Ciclo 2025</h2>
                    <p className="text-slate-600 mt-2 max-w-2xl mx-auto">Un resumen del estado de los estudiantes y las Prácticas Profesionales Supervisadas.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <HeroMetric title="Cupos Ofrecidos" value={metrics.cuposOfrecidos.value} icon="supervisor_account" description="Plazas disponibles en PPS de campo lanzadas en el ciclo." onClick={() => setModalData({ title: 'PPS Lanzadas (Ciclo 2025)', students: metrics.ppsLanzadas.list, headers: [{ key: 'nombre', label: 'Institución' }, { key: 'legajo', label: 'Info' }, { key: 'cupos', label: 'Cupos' }] })} color="indigo" />
                    <HeroMetric title="Estudiantes Activos" value={metrics.alumnosActivos.value} icon="school" description="Total de estudiantes con al menos una inscripción en el ciclo." onClick={() => setModalData({ title: 'Estudiantes Activos (Ciclo 2025)', students: metrics.alumnosActivos.list })} color="blue" />
                    <HeroMetric title="Alumnos Finalizados" value={metrics.alumnosFinalizados.value} icon="military_tech" description="Estudiantes que solicitaron la acreditación final de PPS." onClick={() => setModalData({ title: 'Alumnos Finalizados (Ciclo 2025)', students: metrics.alumnosFinalizados.list })} color="emerald" />
                </div>

                <Card icon="filter_alt" title="Embudo de Estudiantes" description="Desglose de los estudiantes activos en el ciclo lectivo.">
                    <div className="mt-4 space-y-2 divide-y divide-slate-200/60">
                         <FunnelRow label="Con PPS Activa" value={metrics.alumnosEnPPS.value} total={metrics.alumnosActivos.value} color="bg-emerald-500" description="Estudiantes con una práctica activa durante el ciclo." onClick={() => setModalData({ title: 'Alumnos con PPS Activa', students: metrics.alumnosEnPPS.list, headers: [{key: 'nombre', label: 'Nombre'}, {key: 'legajo', label: 'Legajo'}, {key: 'institucion', label: 'Institución'}, {key: 'fechaFin', label: 'Finaliza'}] })} />
                         <FunnelRow label="Activos sin PPS (excl. Relevamiento)" value={metrics.alumnosSinPPS.value} total={metrics.alumnosActivos.value} color="bg-amber-500" description="Estudiantes activos que aún no tienen una PPS de campo registrada." onClick={() => setModalData({ title: 'Alumnos sin PPS (excl. Relevamiento)', students: metrics.alumnosSinPPS.list })} />
                         <FunnelRow label="Activos sin NINGUNA PPS (Total)" value={metrics.alumnosSinNingunaPPS.value} total={metrics.alumnosActivos.value} color="bg-rose-500" description="Estudiantes activos que no han realizado ninguna práctica este ciclo." onClick={() => setModalData({ title: 'Alumnos sin NINGUNA PPS (Total)', students: metrics.alumnosSinNingunaPPS.list })} />
                    </div>
                </Card>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <Card icon="assessment" title="Análisis de PPS e Instituciones">
                        <div className="space-y-6 mt-4">
                             <MetricCard
                                title="Convenios Nuevos (2025)"
                                value={metrics.nuevosConvenios.value}
                                icon="handshake"
                                description="Instituciones marcadas como un nuevo convenio para este ciclo."
                                isLoading={false}
                                className="bg-slate-50/50"
                                onClick={() => setModalData({ 
                                    title: 'Convenios Nuevos (Confirmados 2025)', 
                                    students: metrics.nuevosConvenios.list,
                                    headers: [{ key: 'nombre', label: 'Institución' }, {key: 'cupos', label: 'Cupos Ofrecidos (2025)'}]
                                })}
                            />
                            <MetricCard
                                title="Presión de Inscripción"
                                value={`${metrics.presionInscripcion}%`}
                                icon="how_to_reg"
                                description="Ratio de postulaciones totales vs. cupos de campo ofrecidos. Un valor >100% indica alta demanda."
                                isLoading={false}
                                className="bg-slate-50/50"
                                onClick={() => setModalData({ 
                                    title: 'Lista de Todas las Postulaciones (Ciclo 2025)', 
                                    students: metrics.listaPostulaciones,
                                    headers: [
                                        { key: 'nombre', label: 'Nombre' },
                                        { key: 'legajo', label: 'Legajo' },
                                        { key: 'institucion', label: 'Postuló a' },
                                        { key: 'fechaInscripcion', label: 'Fecha' }
                                    ]
                                })}
                            />
                            <BarChart 
                                data={metrics.topInstitutions} 
                                title="Top 5 Instituciones por Cupos" 
                                onBarClick={(label) => setModalData({ 
                                    title: `Alumnos en ${label}`, 
                                    students: metrics.alumnosEnPPS.list.filter(s => s.institucion === label),
                                    headers: [{key: 'nombre', label: 'Nombre'}, {key: 'legajo', label: 'Legajo'}, {key: 'fechaFin', label: 'Finaliza'}]
                                })}
                            />
                        </div>
                    </Card>
                    <Card icon="query_stats" title="Distribución y Progreso de Alumnos">
                         <div className="space-y-6 mt-4">
                            <Histogram 
                                data={metrics.distribucionHoras} 
                                title="Distribución de Alumnos por Horas"
                                onBarClick={(label, students) => setModalData({
                                    title: `Alumnos en el rango: ${label}`,
                                    students,
                                    headers: [{ key: 'nombre', label: 'Nombre' }, { key: 'legajo', label: 'Legajo' }, { key: 'totalHoras', label: 'Horas Totales' }]
                                })}
                            />
                            <MetricCard
                                title="Tiempo Promedio para Conseguir Práctica"
                                value={`${metrics.avgTimeToPlacement} días`}
                                icon="timer"
                                description="Tiempo promedio desde la primera inscripción hasta el inicio de la primera PPS."
                                isLoading={false}
                                className="bg-slate-50/50"
                            />
                         </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default MetricsDashboard;