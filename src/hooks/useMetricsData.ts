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
    FIELD_FECHA_INICIO_PRACTICAS,
    FIELD_FECHA_FIN_PRACTICAS,
    FIELD_HORAS_PRACTICAS,
    FIELD_ESPECIALIDAD_PRACTICAS,
} from '../constants';
import { fetchAllAirtableData } from '../services/airtableService';
import { parseToUTCDate, formatDate, normalizeStringForComparison } from '../utils/formatters';
import type { EstudianteFields, PracticaFields, LanzamientoPPSFields, InstitucionFields, AirtableRecord, StudentInfo, TimelineMonthData } from '../types';
import { estudianteArraySchema, institucionArraySchema, lanzamientoPPSArraySchema, practicaArraySchema } from '../schemas';

const getGroupName = (name: string | undefined): string => {
    if (!name) return 'Sin Nombre';
    return name.split(' - ')[0].trim();
};

const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

const processLaunchesForYear = (
    year: number,
    allLanzamientos: AirtableRecord<LanzamientoPPSFields>[]
): { totalCuposForYear: number; totalLaunchesForYear: number; launchesByMonth: TimelineMonthData[] } => {
    const launchesForYear = allLanzamientos.filter(launch => {
        const date = parseToUTCDate(launch.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        return date && date.getUTCFullYear() === year;
    });

    const totalCuposForYear = launchesForYear.reduce((sum, launch) => sum + (launch.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);

    const totalLaunchesForYearSet = new Set<string>();
    launchesForYear.forEach(launch => {
        const ppsName = launch.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        if (ppsName) {
            const groupName = getGroupName(ppsName);
            const date = parseToUTCDate(launch.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            if (date) {
                const monthIndex = date.getUTCMonth();
                totalLaunchesForYearSet.add(`${groupName}::${monthIndex}`);
            }
        }
    });
    const totalLaunchesForYear = totalLaunchesForYearSet.size;

    const monthlyData: { [key: number]: {
        cuposTotal: number;
        institutions: Map<string, { cupos: number; variants: string[] }>;
    } } = {};

    launchesForYear.forEach(launch => {
        const date = parseToUTCDate(launch.fields[FIELD_FECHA_INICIO_LANZAMIENTOS])!;
        const monthIndex = date.getUTCMonth();
        
        if (!monthlyData[monthIndex]) {
            monthlyData[monthIndex] = { cuposTotal: 0, institutions: new Map() };
        }
        
        const cupos = launch.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0;
        monthlyData[monthIndex].cuposTotal += cupos;
        
        const ppsName = launch.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        if (ppsName) {
            const groupName = getGroupName(ppsName);
            const institutionData = monthlyData[monthIndex].institutions.get(groupName) || { cupos: 0, variants: [] };
            institutionData.cupos += cupos;
            institutionData.variants.push(ppsName);
            monthlyData[monthIndex].institutions.set(groupName, institutionData);
        }
    });

    const launchesByMonth = MONTH_NAMES.map((monthName, index) => {
        const data = monthlyData[index];
        if (!data) return null;
        return {
            monthName,
            ppsCount: data.institutions.size,
            cuposTotal: data.cuposTotal,
            institutions: Array.from(data.institutions.entries()).map(([name, details]) => ({
                name,
                cupos: details.cupos,
                variants: details.variants.sort(),
            })).sort((a, b) => a.name.localeCompare(b.name)),
        };
    }).filter((item): item is TimelineMonthData => item !== null);

    return { totalCuposForYear, totalLaunchesForYear, launchesByMonth };
};


const fetchAllDataForReport = async () => {
    const [estudiantesRes, practicasRes, lanzamientosRes, institucionesRes] = await Promise.all([
        fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, estudianteArraySchema, [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, 'Finalizaron', 'Creada', 'Fecha de Finalización']),
        fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, practicaArraySchema, [FIELD_ESTUDIANTE_LINK_PRACTICAS, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS]),
        fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, lanzamientoPPSArraySchema, [FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS]),
        fetchAllAirtableData<InstitucionFields>(AIRTABLE_TABLE_NAME_INSTITUCIONES, institucionArraySchema, [FIELD_CONVENIO_NUEVO_INSTITUCIONES, FIELD_NOMBRE_INSTITUCIONES])
    ]);

    const error = estudiantesRes.error || practicasRes.error || lanzamientosRes.error || institucionesRes.error;
    if (error) {
        throw new Error('Error fetching data: ' + (typeof error.error === 'string' ? error.error : error.error.message));
    }

    return {
        estudiantes: estudiantesRes.records,
        practicas: practicasRes.records,
        lanzamientos: lanzamientosRes.records,
        instituciones: institucionesRes.records,
    };
};

export const useMetricsData = ({ targetYear, isTestingMode = false }: { targetYear: number; isTestingMode?: boolean; }) => {
    return useQuery({
        queryKey: ['metricsData', targetYear, isTestingMode],
        queryFn: async () => {
            if (isTestingMode) {
                const mockList = [{ legajo: 'T0001', nombre: 'Estudiante de Prueba' }];
                return {
                    alumnosActivos: { value: 150, list: mockList },
                    alumnosEnPPS: { value: 85, list: mockList },
                    alumnosProximosAFinalizar: { value: 20, list: mockList },
                    alumnosSinNingunaPPS: { value: 10, list: mockList },
                    alumnosConPpsEsteAno: { value: 22, list: mockList },
                    alumnosActivosSinPpsEsteAno: { value: 128, list: mockList },
                    alumnosParaAcreditar: { value: 5, list: mockList },
                    alumnosFinalizados: { value: 15, list: mockList },
                    ppsLanzadas: { value: 40, list: [] },
                    nuevosConvenios: { value: 5, list: mockList },
                    activeInstitutions: { value: 25, list: mockList },
                    cuposOfrecidos: { value: 120, list: [] },
                    cuposTotalesConRelevamiento: { value: 95, list: [] },
                    lanzamientosMesActual: [],
                };
            }
            const { estudiantes, practicas, lanzamientos, instituciones } = await fetchAllDataForReport();
            
            // --- Calculos ---
            const today = new Date();
            
            // FILTROS
            const activeStudentRecords = estudiantes.filter(student => {
                // Un estudiante está activo si NO ha finalizado.
                const haFinalizado = student.fields['Finalizaron'];
                // Corregimos la lógica: cualquier estudiante con "Finalizaron" marcado como true, está inactivo.
                return !haFinalizado;
            });
            
            // METRICAS
            const alumnosActivos = {
                value: activeStudentRecords.length,
                list: activeStudentRecords.map(s => ({ legajo: s.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: s.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A' }))
            };

            const studentPractices = new Map<string, AirtableRecord<PracticaFields>[]>();
            practicas.forEach(p => {
                ((p.fields as any)[FIELD_ESTUDIANTE_LINK_PRACTICAS] || []).forEach((studentId: string) => {
                    if (!studentPractices.has(studentId)) studentPractices.set(studentId, []);
                    studentPractices.get(studentId)!.push(p);
                });
            });

            const alumnosSinNingunaPPSList = activeStudentRecords.filter(s => !studentPractices.has(s.id)).map(s => ({ legajo: s.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: s.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A' }));
            const alumnosSinNingunaPPS = {
                value: alumnosSinNingunaPPSList.length,
                list: alumnosSinNingunaPPSList
            };

            const practicasDelAno = practicas.filter(p => {
                const startDate = parseToUTCDate(p.fields[FIELD_FECHA_INICIO_PRACTICAS]);
                return startDate && startDate.getUTCFullYear() === targetYear;
            });
            
            const studentIdsConPpsEsteAno = new Set<string>();
            practicasDelAno.forEach(p => {
                ((p.fields as any)[FIELD_ESTUDIANTE_LINK_PRACTICAS] || []).forEach((studentId: string) => {
                    studentIdsConPpsEsteAno.add(studentId);
                });
            });

            const estudiantesMap = new Map(estudiantes.map(e => [e.id, e.fields]));
            const alumnosConPpsEsteAnoList = Array.from(studentIdsConPpsEsteAno).map(id => {
                const student = estudiantesMap.get(id);
                return {
                    legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                    nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || 'N/A'
                };
            }).sort((a, b) => a.nombre.localeCompare(b.nombre));

            const alumnosConPpsEsteAno = {
                value: alumnosConPpsEsteAnoList.length,
                list: alumnosConPpsEsteAnoList
            };

            const studentLegajosConPpsEsteAno = new Set(alumnosConPpsEsteAnoList.map(s => s.legajo));

            const alumnosActivosSinPpsEsteAnoList = alumnosActivos.list.filter(
                student => !studentLegajosConPpsEsteAno.has(student.legajo)
            );

            const alumnosActivosSinPpsEsteAno = {
                value: alumnosActivosSinPpsEsteAnoList.length,
                list: alumnosActivosSinPpsEsteAnoList,
            };

            const alumnosFinalizadosList = estudiantes.filter(s => {
                const finalizationDate = parseToUTCDate(s.fields['Fecha de Finalización']);
                return s.fields['Finalizaron'] && finalizationDate && finalizationDate.getUTCFullYear() === targetYear;
            }).map(s => ({ legajo: s.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: s.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A' }));
            const alumnosFinalizados = {
                value: alumnosFinalizadosList.length,
                list: alumnosFinalizadosList
            };

            const alumnosEnPPSList: StudentInfo[] = [];
            activeStudentRecords.forEach(s => {
                const practices = studentPractices.get(s.id) || [];
                const activePractice = practices.find(p => {
                    const endDate = parseToUTCDate(p.fields[FIELD_FECHA_FIN_PRACTICAS]);
                    return endDate && endDate >= today;
                });
                if (activePractice) {
                    const institucionRaw = activePractice.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
                    const institucion = Array.isArray(institucionRaw) ? institucionRaw[0] : institucionRaw;
                    alumnosEnPPSList.push({ 
                        legajo: s.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', 
                        nombre: s.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A',
                        institucion: institucion as string || 'N/A',
                        fechaFin: formatDate(activePractice.fields[FIELD_FECHA_FIN_PRACTICAS]),
                        ppsId: activePractice.id,
                    });
                }
            });
            const alumnosEnPPS = { value: alumnosEnPPSList.length, list: alumnosEnPPSList };
            
            const alumnosProximosAFinalizarList: StudentInfo[] = [];
            const alumnosParaAcreditarList: StudentInfo[] = [];

            activeStudentRecords.forEach(s => {
                const practices = studentPractices.get(s.id) || [];
                const totalHoras = practices.reduce((sum, p) => sum + (p.fields[FIELD_HORAS_PRACTICAS] || 0), 0);
                const orientaciones = [...new Set(practices.map(p => p.fields[FIELD_ESPECIALIDAD_PRACTICAS]).filter(Boolean))];
                const hasActivePractice = alumnosEnPPS.list.some(p => p.legajo === s.fields[FIELD_LEGAJO_ESTUDIANTES]);

                const cumpleHoras = totalHoras >= 250;
                const cumpleRotacion = orientaciones.length >= 3;

                const studentInfo = {
                    legajo: s.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                    nombre: s.fields[FIELD_NOMBRE_ESTUDIANTES] || 'N/A',
                    totalHoras,
                    orientaciones: orientaciones.join(', '),
                };
                
                if (cumpleHoras && cumpleRotacion) {
                    alumnosParaAcreditarList.push(studentInfo);
                } else if (totalHoras >= 230 || (cumpleHoras && hasActivePractice)) {
                    alumnosProximosAFinalizarList.push(studentInfo);
                }
            });

            const ppsLanzadasData = processLaunchesForYear(targetYear, lanzamientos);
            const ppsLanzadasListRaw = ppsLanzadasData.launchesByMonth.flatMap(month => 
                month.institutions.map(inst => ({
                    nombre: inst.name,
                    info: `${month.monthName} (${inst.cupos} cupos)`,
                    cupos: inst.cupos
                }))
            );
            const uniquePpsLanzadasMap = new Map<string, any>();
            ppsLanzadasListRaw.forEach(item => {
                const existing = uniquePpsLanzadasMap.get(item.nombre);
                if (existing) {
                    existing.cupos += item.cupos;
                    existing.info += `; ${item.info}`;
                } else {
                    uniquePpsLanzadasMap.set(item.nombre, { ...item, legajo: '' });
                }
            });
            const ppsLanzadas = {
                value: ppsLanzadasData.totalLaunchesForYear,
                list: Array.from(uniquePpsLanzadasMap.values()).sort((a, b) => a.nombre.localeCompare(b.nombre))
            };

            const cuposOfrecidos = { value: ppsLanzadasData.totalCuposForYear, list: [] };

            const cuposTotalesConRelevamiento = {
                value: lanzamientos.filter(l => {
                    const startDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    const name = l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '';
                    return startDate && startDate.getUTCFullYear() === targetYear && !normalizeStringForComparison(name).includes('relevamiento');
                }).reduce((sum, l) => sum + (l.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0),
                list: []
            };

            const nuevosConveniosList = instituciones.filter(i => {
                if (!i.fields[FIELD_CONVENIO_NUEVO_INSTITUCIONES]) return false;
                const institutionName = i.fields[FIELD_NOMBRE_INSTITUCIONES];
                if (!institutionName) return false;
                const normalizedInstName = normalizeStringForComparison(institutionName);
                return lanzamientos.some(l => {
                    const launchDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                    return launchDate && launchDate.getUTCFullYear() === targetYear && 
                           normalizeStringForComparison(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').startsWith(normalizedInstName);
                });
            }).map(i => {
                const institutionName = i.fields[FIELD_NOMBRE_INSTITUCIONES] || 'N/A';
                const normalizedInstName = normalizeStringForComparison(institutionName);
                const cupos = lanzamientos
                    .filter(l => {
                        const launchDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                        return launchDate && launchDate.getUTCFullYear() === targetYear && 
                               normalizeStringForComparison(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').startsWith(normalizedInstName);
                    })
                    .reduce((sum, l) => sum + (l.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);
                
                // FIX: Added 'legajo' property to satisfy the StudentInfo type for modal display.
                return { nombre: institutionName, cupos, legajo: '' };
            });
            const nuevosConvenios = {
                value: nuevosConveniosList.length,
                list: nuevosConveniosList
            };
            
            const launchesThisYear = lanzamientos.filter(l => {
                const date = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                return date && date.getUTCFullYear() === targetYear;
            });
            const institutionsData = new Map<string, { cupos: number, orientaciones: Set<string> }>();
            launchesThisYear.forEach(launch => {
                const groupName = getGroupName(launch.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS]);
                const data = institutionsData.get(groupName) || { cupos: 0, orientaciones: new Set() };
                data.cupos += launch.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0;
                const orientacion = launch.fields[FIELD_ORIENTACION_LANZAMIENTOS];
                if (orientacion) {
                    data.orientaciones.add(orientacion);
                }
                institutionsData.set(groupName, data);
            });
            const activeInstitutionsList = Array.from(institutionsData.entries()).map(([name, data]) => ({
                nombre: name,
                legajo: Array.from(data.orientaciones).join(', ') || 'N/A',
                cupos: data.cupos,
            }));
            const activeInstitutions = {
                value: activeInstitutionsList.length,
                list: activeInstitutionsList
            };

            const currentMonth = new Date().getMonth();
            const lanzamientosMesActual = ppsLanzadasData.launchesByMonth.find(m => MONTH_NAMES.indexOf(m.monthName) === currentMonth)?.institutions.map(i => ({
                groupName: i.name,
                totalCupos: i.cupos,
                variants: i.variants.map((v, idx) => ({ id: `${i.name}-${idx}`, name: v, cupos: 0 }))
            })) || [];

            return {
                alumnosActivos,
                alumnosEnPPS,
                alumnosProximosAFinalizar: { value: alumnosProximosAFinalizarList.length, list: alumnosProximosAFinalizarList },
                alumnosSinNingunaPPS,
                alumnosConPpsEsteAno,
                alumnosActivosSinPpsEsteAno,
                alumnosParaAcreditar: { value: alumnosParaAcreditarList.length, list: alumnosParaAcreditarList },
                alumnosFinalizados,
                ppsLanzadas,
                nuevosConvenios,
                activeInstitutions,
                cuposOfrecidos,
                cuposTotalesConRelevamiento,
                lanzamientosMesActual,
            };
        }
    });
};
