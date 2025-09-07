import React, { useState, useMemo } from 'react';
import { fetchAllAirtableData } from '../services/airtableService';
import type { Practica, EstudianteFields, ConvocatoriaFields, FinalizacionPPS, FinalizacionPPSFields, PracticaFields, LanzamientoPPSFields, Convocatoria, InstitucionFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_PRACTICAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_FINALIZACION,
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  AIRTABLE_TABLE_NAME_INSTITUCIONES,
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
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_CONVENIO_NUEVO_INSTITUCIONES,
  FIELD_ESTADO_PRACTICA,
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
    const convFields = [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS];
    const [estudiantesRes, practicasRes, convocatoriasRes, finalizacionesRes, lanzamientosRes, institucionesRes] = await Promise.all([
        fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, 'Finalizaron', 'Creada']),
        fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [FIELD_NOMBRE_BUSQUEDA_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_ESTUDIANTE_LINK_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_ESTADO_PRACTICA]),
        fetchAllAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, convFields),
        fetchAllAirtableData<FinalizacionPPSFields>(AIRTABLE_TABLE_NAME_FINALIZACION, [FIELD_ESTUDIANTE_FINALIZACION]),
        fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS]),
        fetchAllAirtableData<InstitucionFields>(AIRTABLE_TABLE_NAME_INSTITUCIONES, [FIELD_NOMBRE_INSTITUCIONES, FIELD_CONVENIO_NUEVO_INSTITUCIONES])
    ]);

    if (estudiantesRes.error || practicasRes.error || convocatoriasRes.error || finalizacionesRes.error || lanzamientosRes.error || institucionesRes.error) {
        const errorResponse = estudiantesRes.error || practicasRes.error || convocatoriasRes.error || finalizacionesRes.error || lanzamientosRes.error || institucionesRes.error;
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
        const startOfTargetYear = new Date(Date.UTC(targetYear, 0, 1));
        const endOfTargetYear = new Date(Date.UTC(targetYear + 1, 0, 1));
        
        const allActiveStudents = estudiantes.filter(student => !student['Finalizaron']);

        const finalizacionesBeforeThisYear = finalizaciones.filter(finalizacion => {
            const finalizacionDate = parseToUTCDate(finalizacion.createdTime);
            return finalizacionDate && finalizacionDate < startOfTargetYear;
        });
        const finalizedStudentIdsBeforeThisYear = new Set(finalizacionesBeforeThisYear.flatMap(f => f[FIELD_ESTUDIANTE_FINALIZACION] || []));
        
        const studentsAtStartOfYear = estudiantes.filter(student => {
            const creationDate = parseToUTCDate(student['Creada']);
            const esPreexistente = !creationDate || creationDate < startOfTargetYear;
            const noFinalizadoAntes = !finalizedStudentIdsBeforeThisYear.has(student.id);
            return esPreexistente && noFinalizadoAntes;
        });

        const newStudentsThisYear = estudiantes.filter(student => {
            const creationDate = parseToUTCDate(student['Creada']);
            return creationDate && creationDate.getUTCFullYear() === targetYear;
        });

        const finalizacionesThisYear = finalizaciones.filter(finalizacion => {
            const finalizacionDate = parseToUTCDate(finalizacion.createdTime);
            return finalizacionDate && finalizacionDate >= startOfTargetYear && finalizacionDate < endOfTargetYear;
        });

        let currentStudentCount = studentsAtStartOfYear.length;
        let maxStudentCount = currentStudentCount;
        type StudentCountEvent = { date: Date; type: 'increment' | 'decrement' };
        const events: StudentCountEvent[] = [];

        newStudentsThisYear.forEach(student => {
            const creationDate = parseToUTCDate(student['Creada']);
            if (creationDate) {
                events.push({ date: creationDate, type: 'increment' });
            }
        });

        finalizacionesThisYear.forEach(finalizacion => {
            const finalizacionDate = parseToUTCDate(finalizacion.createdTime)!;
            const studentIds = finalizacion[FIELD_ESTUDIANTE_FINALIZACION] || [];
            studentIds.forEach(() => {
                 events.push({ date: finalizacionDate, type: 'decrement' });
            });
        });

        events.sort((a, b) => a.date.getTime() - b.date.getTime());

        events.forEach(event => {
            if (event.type === 'increment') {
                currentStudentCount++;
            } else {
                currentStudentCount--;
            }
            if (currentStudentCount > maxStudentCount) {
                maxStudentCount = currentStudentCount;
            }
        });
        
        const alumnosActivosList = allActiveStudents.map(student => ({
            legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
            nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`,
        })).sort((a, b) => a.nombre.localeCompare(b.nombre));

        const nuevosAlumnosList = newStudentsThisYear.map(student => ({
            legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
            nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`,
            fechaIngreso: formatDate(student['Creada']),
        })).sort((a,b) => a.nombre.localeCompare(b.nombre));

        const alumnosInicioCicloList = studentsAtStartOfYear.map(student => ({
            legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
            nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`,
        })).sort((a,b) => a.nombre.localeCompare(b.nombre));

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
        
        const activeStudentIds = new Set(allActiveStudents.map(s => s.id));
        
        const studentFirstApplication = new Map<string, Date>();
        convocatorias.forEach(c => {
            const studentIds = c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
            if (Array.isArray(studentIds)) {
                studentIds.forEach(id => {
                    if(activeStudentIds.has(id)) {
                        const startDate = parseToUTCDate(c[FIELD_FECHA_INICIO_CONVOCATORIAS]);
                        if (startDate) {
                            if (!studentFirstApplication.has(id) || startDate < studentFirstApplication.get(id)!) {
                                studentFirstApplication.set(id, startDate);
                            }
                        }
                    }
                });
            }
        });

        const studentsWithActivePPS_Set = new Set<string>();
        const activePPSPracticas: { studentId: string, practica: (PracticaFields & { id: string }) }[] = [];
        
        practicas.forEach(p => {
            const estado = p[FIELD_ESTADO_PRACTICA];
            const fechaFinStr = p[FIELD_FECHA_FIN_PRACTICAS];

            if (normalizeStringForComparison(estado) === 'en curso' && fechaFinStr) {
                const fechaFin = parseToUTCDate(fechaFinStr);
                if (fechaFin && fechaFin.getUTCFullYear() >= targetYear) {
                    const studentIds = p[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [];
                    studentIds.forEach((id: string) => {
                        if (activeStudentIds.has(id)) {
                            studentsWithActivePPS_Set.add(id);
                            activePPSPracticas.push({ studentId: id, practica: p });
                        }
                    });
                }
            }
        });
        
        const alumnosEnPPSList = Array.from(studentsWithActivePPS_Set).map(id => {
            const student = studentMapById.get(id);
            const studentActivePracticas = activePPSPracticas.filter(p => p.studentId === id).map(p => p.practica);
            studentActivePracticas.sort((a,b) => (parseToUTCDate(b[FIELD_FECHA_FIN_PRACTICAS]!)?.getTime() ?? 0) - (parseToUTCDate(a[FIELD_FECHA_FIN_PRACTICAS]!)?.getTime() ?? 0));
            const relevantPractica = studentActivePracticas[0];

            return {
                legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}`,
                institucion: String((Array.isArray(relevantPractica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) ? relevantPractica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS][0] : relevantPractica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) || 'N/A'),
                fechaFin: formatDate(relevantPractica[FIELD_FECHA_FIN_PRACTICAS]),
                ppsId: relevantPractica.id
            };
        }).sort((a, b) => a.nombre.localeCompare(b.nombre));

        const studentPracticeTypes = new Map<string, { hasRelevamiento: boolean; hasOther: boolean }>();
        practicas.forEach(p => {
            const studentIds = p[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [];
            const institucionRaw = p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
            const institucion = String((Array.isArray(institucionRaw) ? institucionRaw[0] : institucionRaw) || '');
            const isRelevamiento = normalizeStringForComparison(institucion).includes('relevamiento');

            studentIds.forEach((id: string) => {
                if (!studentPracticeTypes.has(id)) {
                    studentPracticeTypes.set(id, { hasRelevamiento: false, hasOther: false });
                }
                const types = studentPracticeTypes.get(id)!;
                if (isRelevamiento) {
                    types.hasRelevamiento = true;
                } else {
                    types.hasOther = true;
                }
            });
        });
        
        const alumnosSinPPSList = allActiveStudents.filter(student => {
            const types = studentPracticeTypes.get(student.id);
            return !types || !types.hasOther;
        }).map(student => {
            return { legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        const studentIdsWithAnyPractice = new Set(studentPracticeTypes.keys());
        const alumnosSinNingunaPPSList = allActiveStudents.filter(student => {
            return !studentIdsWithAnyPractice.has(student.id);
        }).map(student => {
            return { legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));
        
        const finalizedStudentIdsThisYear = new Set(finalizacionesThisYear.flatMap(f => f[FIELD_ESTUDIANTE_FINALIZACION] || []));
        const alumnosFinalizadosList = Array.from(finalizedStudentIdsThisYear).map(id => {
            const student = studentMapById.get(id);
            return { legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}` };
        }).sort((a,b) => a.nombre.localeCompare(b.nombre));

        const studentTotalHours = practicas.reduce((acc, p) => {
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
            if (hours >= 250) return;
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
        practicas.forEach(p => {
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
                legajo: '—',
                cupos: totalCupos,
            };
        });

        return {
            alumnosEnPPS: { value: studentsWithActivePPS_Set.size, list: alumnosEnPPSList },
            alumnosActivos: { value: allActiveStudents.length, list: alumnosActivosList },
            alumnosSinPPS: { value: alumnosSinPPSList.length, list: alumnosSinPPSList },
            alumnosSinNingunaPPS: { value: alumnosSinNingunaPPSList.length, list: alumnosSinNingunaPPSList },
            alumnosFinalizados: { value: finalizedStudentIdsThisYear.size, list: alumnosFinalizadosList },
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
            alumnosInicioCiclo: { value: studentsAtStartOfYear.length, list: alumnosInicioCicloList },
            nuevosAlumnos: { value: newStudentsThisYear.length, list: nuevosAlumnosList },
            picoAlumnos: { value: maxStudentCount },
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
                    <HeroMetric title="Estudiantes Activos" value={metrics.alumnosActivos.value} icon="school" description="Total de estudiantes que actualmente no han finalizado sus estudios." onClick={() => setModalData({ title: 'Estudiantes Activos', students: metrics.alumnosActivos.list })} color="blue" />
                    <HeroMetric title="Alumnos Finalizados" value={metrics.alumnosFinalizados.value} icon="military_tech" description="Estudiantes que solicitaron la acreditación final de PPS." onClick={() => setModalData({ title: 'Alumnos Finalizados (Ciclo 2025)', students: metrics.alumnosFinalizados.list })} color="emerald" />
                </div>

                <Card icon="filter_alt" title="Embudo de Estudiantes" description="Desglose de los estudiantes activos.">
                    <div className="mt-4 space-y-2 divide-y divide-slate-200/60">
                         <FunnelRow label="Con PPS Activa" value={metrics.alumnosEnPPS.value} total={metrics.alumnosActivos.value} color="bg-emerald-500" description="Estudiantes con una práctica activa durante el ciclo." onClick={() => setModalData({ title: 'Alumnos con PPS Activa', students: metrics.alumnosEnPPS.list, headers: [{key: 'nombre', label: 'Nombre'}, {key: 'legajo', label: 'Legajo'}, {key: 'institucion', label: 'Institución'}, {key: 'fechaFin', label: 'Finaliza'}] })} />
                         <FunnelRow label="Activos sin PPS (excl. Relevamiento)" value={metrics.alumnosSinPPS.value} total={metrics.alumnosActivos.value} color="bg-amber-500" description="Estudiantes activos que aún no tienen una PPS de campo registrada." onClick={() => setModalData({ title: 'Alumnos sin PPS (excl. Relevamiento)', students: metrics.alumnosSinPPS.list })} />
                         <FunnelRow label="Activos sin NINGUNA PPS (Total)" value={metrics.alumnosSinNingunaPPS.value} total={metrics.alumnosActivos.value} color="bg-rose-500" description="Estudiantes activos que no tienen NINGUNA práctica registrada (incl. Relevamiento)." onClick={() => setModalData({ title: 'Alumnos sin NINGUNA PPS (Total)', students: metrics.alumnosSinNingunaPPS.list })} />
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
                            <div className="bg-white p-4 rounded-xl border border-slate-200/60 shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <span className="material-icons">groups</span>
                                    </div>
                                    <h3 className="text-base font-semibold text-slate-700">Población Estudiantil 2025</h3>
                                </div>
                                <div className="mt-2 space-y-1">
                                    <button 
                                        onClick={() => setModalData({ title: 'Alumnos al Inicio del Ciclo 2025', students: metrics.alumnosInicioCiclo.list })}
                                        className="w-full p-2 rounded-lg hover:bg-slate-100/70 text-left transition-colors flex justify-between items-baseline group"
                                    >
                                        <span className="text-sm text-slate-600 font-medium group-hover:text-slate-800">Alumnos al inicio del ciclo</span>
                                        <span className="text-2xl font-black text-slate-800 tracking-tighter">{metrics.alumnosInicioCiclo.value}</span>
                                    </button>
                                    <div className="border-t border-slate-200/70 mx-2"></div>
                                    <button 
                                        onClick={() => setModalData({ title: 'Nuevos Ingresos en 2025', students: metrics.nuevosAlumnos.list, headers: [{key: 'nombre', label: 'Nombre'}, {key: 'legajo', label: 'Legajo'}, {key: 'fechaIngreso', label: 'Fecha Ingreso'}] })}
                                        className="w-full p-2 rounded-lg hover:bg-slate-100/70 text-left transition-colors flex justify-between items-baseline group"
                                    >
                                        <span className="text-sm text-slate-600 font-medium group-hover:text-slate-800">Nuevos ingresos en el ciclo</span>
                                        <span className="text-2xl font-black text-slate-800 tracking-tighter">{metrics.nuevosAlumnos.value}</span>
                                    </button>
                                    <div className="border-t border-slate-200/70 mx-2"></div>
                                    <div
                                        className="w-full p-2 text-left flex justify-between items-baseline"
                                        title="El número máximo de estudiantes activos simultáneamente durante el ciclo."
                                    >
                                        <span className="text-sm text-slate-600 font-medium">Pico de alumnos en el ciclo</span>
                                        <span className="text-2xl font-black text-slate-800 tracking-tighter">{metrics.picoAlumnos.value}</span>
                                    </div>
                                </div>
                            </div>
                         </div>
                    </Card>
                </div>
            </div>
        </>
    );
};

export default MetricsDashboard;