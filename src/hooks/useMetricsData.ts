import { useQuery } from '@tanstack/react-query';
import {
    AIRTABLE_TABLE_NAME_ESTUDIANTES,
    AIRTABLE_TABLE_NAME_PRACTICAS,
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    AIRTABLE_TABLE_NAME_INSTITUCIONES,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_CONVENIO_NUEVO_INSTITUCIONES,
    FIELD_ESTUDIANTE_LINK_PRACTICAS,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
    FIELD_NOMBRE_INSTITUCIONES,
    FIELD_ORIENTACION_LANZAMIENTOS,
    // FIX: Add missing constants
    FIELD_HORAS_PRACTICAS,
    FIELD_FECHA_FIN_PRACTICAS,
    FIELD_ESPECIALIDAD_PRACTICAS,
} from '../constants';
import { fetchAllAirtableData } from '../services/airtableService';
import { parseToUTCDate, formatDate, normalizeStringForComparison } from '../utils/formatters';
import type { EstudianteFields, PracticaFields, LanzamientoPPSFields, InstitucionFields, AirtableRecord, StudentInfo } from '../types';

const getGroupName = (name: string | undefined): string => {
    if (!name) return 'Sin Nombre';
    return name.split(' - ')[0].trim();
};

export const useMetricsData = ({ targetYear, isTestingMode }: { targetYear: number; isTestingMode: boolean }) => {
    return useQuery({
        queryKey: ['metricsData', targetYear, isTestingMode],
        queryFn: async () => {
            if (isTestingMode) {
                // Return some mock metrics
                return {
                    cuposOfrecidos: { value: 120, list: [] },
                    alumnosActivos: { value: 150, list: [] },
                    alumnosFinalizados: { value: 15, list: [] },
                    alumnosEnPPS: { value: 75, list: [] },
                    alumnosProximosAFinalizar: { value: 20, list: [] },
                    alumnosSinNingunaPPS: { value: 10, list: [] },
                    alumnosParaAcreditar: { value: 5, list: [] },
                    ppsLanzadas: { value: 40, list: [] },
                    nuevosConvenios: { value: 5, list: [] },
                    activeInstitutions: { value: 30, list: [] },
                    cuposTotalesConRelevamiento: { value: 100, list: [] },
                    lanzamientosMesActual: [],
                };
            }

            const [estudiantesRes, practicasRes, lanzamientosRes, institucionesRes] = await Promise.all([
                fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES),
                fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS),
                fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS),
                fetchAllAirtableData<InstitucionFields>(AIRTABLE_TABLE_NAME_INSTITUCIONES)
            ]);

            const allEstudiantes = estudiantesRes.records;
            const allPracticas = practicasRes.records;
            const allLanzamientos = lanzamientosRes.records;
            const allInstitutions = institucionesRes.records;

            const today = new Date();
            
            // Alumnos Activos
            const alumnosActivosRecords = allEstudiantes.filter(student => {
                const finalizationDate = parseToUTCDate(student.fields['Fecha de Finalización']);
                if (finalizationDate && student.fields['Finalizaron']) {
                    return finalizationDate.getUTCFullYear() >= targetYear;
                }
                return true;
            });
            const alumnosActivos = {
                value: alumnosActivosRecords.length,
                list: alumnosActivosRecords.map(s => ({ nombre: s.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A', legajo: s.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A' }))
            };
            
            const activeStudentIds = new Set(alumnosActivosRecords.map(s => s.id));

            // Alumnos con alguna PPS
            const studentPracticeMap = new Map<string, {institucion?: string, fechaFin?: string}>();
            allPracticas.forEach(p => {
                const studentId = (p.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [])[0];
                const ppsNameRaw = p.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                const ppsName = Array.isArray(ppsNameRaw) ? ppsNameRaw[0] : String(ppsNameRaw || '');
                const fechaFin = p.fields[FIELD_FECHA_FIN_PRACTICAS];
                if (studentId && activeStudentIds.has(studentId)) {
                    studentPracticeMap.set(studentId, {institucion: ppsName, fechaFin});
                }
            });
            
            // Alumnos en PPS (con practica activa)
            const alumnosEnPPSRecords = allPracticas.filter(p => {
                const studentId = (p.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [])[0];
                if (!studentId || !activeStudentIds.has(studentId)) return false;
                // FIX: Corrected invalid property access `p.fields.Fecha de Finalización`
                const fechaFin = parseToUTCDate(p.fields[FIELD_FECHA_FIN_PRACTICAS]);
                return fechaFin ? fechaFin >= today : true;
            });
            const uniqueAlumnosEnPPSIds = new Set(alumnosEnPPSRecords.map(p => (p.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS]!)[0]));
            
            const alumnosEnPPSList = Array.from(uniqueAlumnosEnPPSIds).map(studentId => {
                const studentRecord = allEstudiantes.find(s => s.id === studentId);
                const practicaRecord = alumnosEnPPSRecords.find(p => (p.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS]!)[0] === studentId);
                const ppsNameRaw = practicaRecord?.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];

                return {
                    nombre: studentRecord?.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A',
                    legajo: studentRecord?.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                    institucion: Array.isArray(ppsNameRaw) ? ppsNameRaw[0] : String(ppsNameRaw || ''),
                    // FIX: Corrected invalid property access `practicaRecord?.fields.Fecha de Finalización`
                    fechaFin: formatDate(practicaRecord?.fields[FIELD_FECHA_FIN_PRACTICAS])
                };
            });

            const alumnosEnPPS = { value: uniqueAlumnosEnPPSIds.size, list: alumnosEnPPSList };
            
            // Alumnos sin NINGUNA PPS
            const alumnosSinNingunaPPSRecords = alumnosActivosRecords.filter(s => !studentPracticeMap.has(s.id));
            const alumnosSinNingunaPPS = {
                value: alumnosSinNingunaPPSRecords.length,
                list: alumnosSinNingunaPPSRecords.map(s => ({ nombre: s.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A', legajo: s.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A' }))
            };
            
            // Alumnos Finalizados
            const alumnosFinalizadosRecords = allEstudiantes.filter(s => {
                const finalizationDate = parseToUTCDate(s.fields['Fecha de Finalización']);
                return s.fields['Finalizaron'] && finalizationDate && finalizationDate.getUTCFullYear() === targetYear;
            });
            const alumnosFinalizados = {
                value: alumnosFinalizadosRecords.length,
                list: alumnosFinalizadosRecords.map(s => ({ nombre: s.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A', legajo: s.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A' }))
            };

            // Calculate hours per student
            const studentHours: { [key: string]: { totalHoras: number, orientaciones: Set<string> } } = {};
            allPracticas.forEach(p => {
                const studentId = (p.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [])[0];
                if (studentId && activeStudentIds.has(studentId)) {
                    if (!studentHours[studentId]) {
                        studentHours[studentId] = { totalHoras: 0, orientaciones: new Set() };
                    }
                    studentHours[studentId].totalHoras += p.fields[FIELD_HORAS_PRACTICAS] || 0;
                    if (p.fields[FIELD_ESPECIALIDAD_PRACTICAS]) {
                        studentHours[studentId].orientaciones.add(p.fields[FIELD_ESPECIALIDAD_PRACTICAS] as string);
                    }
                }
            });

            // Alumnos próximos a finalizar & para acreditar
            const alumnosProximosAFinalizarList: StudentInfo[] = [];
            const alumnosParaAcreditarList: StudentInfo[] = [];

            alumnosActivosRecords.forEach(s => {
                const hoursData = studentHours[s.id];
                if (hoursData) {
                    const studentInfo: StudentInfo = {
                        nombre: s.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A',
                        legajo: s.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                        totalHoras: hoursData.totalHoras,
                        orientaciones: Array.from(hoursData.orientaciones).join(', '),
                    };
                    const isEnCurso = alumnosEnPPS.list.some(p => p.legajo === studentInfo.legajo);
                    const cumpleHoras = hoursData.totalHoras >= 250;
                    const cumpleRotacion = hoursData.orientaciones.size >= 3;
                    
                    if (cumpleHoras && cumpleRotacion) {
                        alumnosParaAcreditarList.push(studentInfo);
                    } else if (hoursData.totalHoras >= 230 || (cumpleHoras && isEnCurso)) {
                        alumnosProximosAFinalizarList.push(studentInfo);
                    }
                }
            });
            const alumnosProximosAFinalizar = { value: alumnosProximosAFinalizarList.length, list: alumnosProximosAFinalizarList };
            const alumnosParaAcreditar = { value: alumnosParaAcreditarList.length, list: alumnosParaAcreditarList };

            // Lanzamientos
            const lanzamientosForYear = allLanzamientos.filter(l => {
                const startDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                return startDate && startDate.getUTCFullYear() === targetYear;
            });

            const ppsLanzadas = {
                value: lanzamientosForYear.length,
                list: lanzamientosForYear.map(l => ({ nombre: l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'N/A', legajo: l.fields[FIELD_ORIENTACION_LANZAMIENTOS] || 'N/A', cupos: l.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0 }))
            };
            const cuposOfrecidos = {
                value: lanzamientosForYear.reduce((acc, l) => acc + (l.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0),
                list: [] // Not used
            };
            const cuposTotalesConRelevamiento = {
                value: allPracticas.reduce((acc, p) => acc + (p.fields[FIELD_HORAS_PRACTICAS] || 0), 0), // Not really cupos, but total hours.
                list: []
            };

            // Nuevos Convenios & Active Institutions
            const institutionLaunchYears = new Map<string, number>();
            allLanzamientos.forEach(l => {
                const instName = l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS];
                const startDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                if (instName && startDate) {
                    const normalizedName = normalizeStringForComparison(instName);
                    const year = startDate.getUTCFullYear();
                    if (!institutionLaunchYears.has(normalizedName) || year < institutionLaunchYears.get(normalizedName)!) {
                        institutionLaunchYears.set(normalizedName, year);
                    }
                }
            });

            const nuevosConveniosList = allInstitutions.filter(i => {
                const normName = normalizeStringForComparison(i.fields[FIELD_NOMBRE_INSTITUCIONES]);
                return institutionLaunchYears.get(normName) === targetYear;
            });
            const nuevosConvenios = {
                value: nuevosConveniosList.length,
                list: nuevosConveniosList.map(i => ({ nombre: i.fields[FIELD_NOMBRE_INSTITUCIONES] || 'N/A', legajo: '' }))
            };
            
            const activeInstitutionsSet = new Set(lanzamientosForYear.map(l => normalizeStringForComparison(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '')));
            const activeInstitutionsList = allInstitutions.filter(i => activeInstitutionsSet.has(normalizeStringForComparison(i.fields[FIELD_NOMBRE_INSTITUCIONES])));
            const activeInstitutions = {
                value: activeInstitutionsSet.size,
                list: activeInstitutionsList.map(i => ({ nombre: i.fields[FIELD_NOMBRE_INSTITUCIONES] || 'N/A', legajo: ''}))
            };

            // Lanzamientos mes actual
            const currentMonth = new Date().getMonth();
            const lanzamientosMesActualGrouped = lanzamientosForYear
                .filter(l => {
                    const startDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    return startDate && startDate.getUTCMonth() === currentMonth;
                })
                .reduce((acc, l) => {
                    const groupName = getGroupName(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS]);
                    if (!acc[groupName]) {
                        acc[groupName] = { groupName, totalCupos: 0, variants: [] as { id: string, name: string, cupos: number }[] };
                    }
                    acc[groupName].totalCupos += l.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0;
                    acc[groupName].variants.push({ id: l.id, name: l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '', cupos: l.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0 });
                    return acc;
                }, {} as { [key: string]: { groupName: string, totalCupos: number, variants: { id: string, name: string, cupos: number }[] } });
            const lanzamientosMesActual = Object.values(lanzamientosMesActualGrouped);

            return {
                cuposOfrecidos,
                alumnosActivos,
                alumnosFinalizados,
                alumnosEnPPS,
                alumnosProximosAFinalizar,
                alumnosSinNingunaPPS,
                alumnosParaAcreditar,
                ppsLanzadas,
                nuevosConvenios,
                activeInstitutions,
                cuposTotalesConRelevamiento,
                lanzamientosMesActual
            };
        }
    });
};