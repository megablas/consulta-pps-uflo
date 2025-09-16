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
} from '../constants';
import { fetchAllAirtableData } from '../services/airtableService';
import { parseToUTCDate, formatDate, normalizeStringForComparison } from '../utils/formatters';
import type { EstudianteFields, PracticaFields, LanzamientoPPSFields, InstitucionFields, ExecutiveReportData, AirtableRecord, ReportType, AnyReportData, TimelineMonthData, ComparativeExecutiveReportData } from '../types';


const fetchAllDataForReport = async () => {
    const [estudiantesRes, practicasRes, lanzamientosRes, institucionesRes] = await Promise.all([
        fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, 'Finalizaron', 'Creada', 'Fecha de Finalización']),
        fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [FIELD_ESTUDIANTE_LINK_PRACTICAS, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]),
        fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS]),
        fetchAllAirtableData<InstitucionFields>(AIRTABLE_TABLE_NAME_INSTITUCIONES, [FIELD_CONVENIO_NUEVO_INSTITUCIONES, FIELD_NOMBRE_INSTITUCIONES])
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

/**
 * Calculates a snapshot of "stock" metrics (like active students) for a specific point in time.
 */
const getMetricsSnapshot = (
    snapshotDate: Date,
    allEstudiantes: AirtableRecord<EstudianteFields>[],
    allPracticas: AirtableRecord<PracticaFields>[]
) => {
    const snapshotDay = new Date(snapshotDate);
    snapshotDay.setUTCHours(23, 59, 59, 999);

    const activeStudentRecords = allEstudiantes.filter(student => {
        const creationDate = parseToUTCDate(student.fields['Creada']);
        if (!creationDate || creationDate > snapshotDay) {
            return false;
        }

        const finalizationDate = parseToUTCDate(student.fields['Fecha de Finalización']);
        if (finalizationDate && student.fields['Finalizaron']) {
             if (finalizationDate < snapshotDay) {
                return false;
            }
        }
        return true;
    });

    const activeStudentIds = new Set(activeStudentRecords.map(s => s.id));

    const studentPracticeTypes = new Map<string, { hasRelevamiento: boolean; hasOther: boolean }>();
    allPracticas.forEach(p => {
        const studentIds = p.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [];
        const institucionRaw = p.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
        const institucion = String((Array.isArray(institucionRaw) ? institucionRaw[0] : institucionRaw) || '');
        const isRelevamiento = normalizeStringForComparison(institucion).includes('relevamiento');

        studentIds.forEach((id: string) => {
            if (!activeStudentIds.has(id)) return;
            if (!studentPracticeTypes.has(id)) {
                studentPracticeTypes.set(id, { hasRelevamiento: false, hasOther: false });
            }
            const types = studentPracticeTypes.get(id)!;
            if (isRelevamiento) types.hasRelevamiento = true;
            else types.hasOther = true;
        });
    });

    const studentsWithoutPpsExcludingRelevamiento = activeStudentRecords.filter(student => {
        const types = studentPracticeTypes.get(student.id);
        return !types || !types.hasOther;
    }).length;

    const studentIdsWithAnyPractice = new Set(studentPracticeTypes.keys());
    const studentsWithoutAnyPps = activeStudentRecords.filter(student => !studentIdsWithAnyPractice.has(student.id)).length;

    return {
        activeStudents: activeStudentRecords.length,
        studentsWithoutPpsExcludingRelevamiento,
        studentsWithoutAnyPps,
    };
};

/**
 * Calculates cumulative "flow" metrics from the start of the year up to a snapshot date.
 */
const calculateFlowMetrics = (
    snapshotEndDate: Date,
    yearStartDate: Date,
    allEstudiantes: AirtableRecord<EstudianteFields>[],
    allInstituciones: AirtableRecord<InstitucionFields>[],
    allLanzamientos: AirtableRecord<LanzamientoPPSFields>[]
) => {
    const newStudents = allEstudiantes.filter(s => {
        const creationDate = parseToUTCDate(s.fields['Creada']);
        return creationDate && creationDate >= yearStartDate && creationDate <= snapshotEndDate;
    }).length;

    const finishedStudents = allEstudiantes.filter(s => {
        const finalizationDate = parseToUTCDate(s.fields['Fecha de Finalización']);
        return s.fields['Finalizaron'] &&
               finalizationDate &&
               finalizationDate >= yearStartDate &&
               finalizationDate <= snapshotEndDate;
    }).length;
    
    const newAgreements = allInstituciones.filter(i => {
        const isMarkedAsNew = i.fields[FIELD_CONVENIO_NUEVO_INSTITUCIONES];
        if (!isMarkedAsNew) return false;
        
        const firstLaunchDate = allLanzamientos
            .filter(l => {
                const launchDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                return launchDate && launchDate.getUTCFullYear() === yearStartDate.getUTCFullYear() && normalizeStringForComparison(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS]).startsWith(normalizeStringForComparison(i.fields[FIELD_NOMBRE_INSTITUCIONES]));
            })
            .map(l => parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]))
            .filter((d): d is Date => d !== null)
            .sort((a, b) => a.getTime() - b.getTime())[0];
            
        return firstLaunchDate && firstLaunchDate >= yearStartDate && firstLaunchDate <= snapshotEndDate;
    });
    
    return {
        newStudents,
        finishedStudents,
        newAgreements: newAgreements.length,
    };
};

const getGroupName = (name: string | undefined): string => {
    if (!name) return 'Sin Nombre';
    return name.split(' - ')[0].trim();
};

const processLaunchesForYear = (
    year: number,
    allLanzamientos: AirtableRecord<LanzamientoPPSFields>[]
): { totalCuposForYear: number; totalLaunchesForYear: number; launchesByMonth: TimelineMonthData[] } => {
    const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

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
            const monthIndex = parseToUTCDate(launch.fields[FIELD_FECHA_INICIO_LANZAMIENTOS])!.getUTCMonth();
            totalLaunchesForYearSet.add(`${groupName}::${monthIndex}`);
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

    const launchesByMonth: TimelineMonthData[] = MONTH_NAMES.map((monthName, index) => {
        const data = monthlyData[index];
        if (data) {
            return {
                monthName,
                ppsCount: data.institutions.size,
                cuposTotal: data.cuposTotal,
                institutions: Array.from(data.institutions.entries())
                    .map(([name, details]) => ({
                        name,
                        cupos: details.cupos,
                        variants: details.variants.sort(),
                    }))
                    .sort((a, b) => a.name.localeCompare(b.name)),
            };
        }
        return null;
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    return { totalCuposForYear, totalLaunchesForYear, launchesByMonth };
};

const generateComparativeSummary = (
    allLanzamientos: AirtableRecord<LanzamientoPPSFields>[]
): string => {
    
    const generalSummary = `
        <p>El presente reporte ofrece un análisis comparativo de la gestión de Prácticas Profesionales Supervisadas (PPS) entre el <strong>ciclo completo de 2024</strong> y el <strong>período transcurrido de 2025 (hasta ${formatDate(new Date().toISOString())})</strong>.</p>
        <p>Es importante destacar que, al ser 2025 un ciclo en curso, métricas como <strong>"Estudiantes Finalizados"</strong>, <strong>"PPS Nuevas Lanzadas"</strong> y <strong>"Cupos Totales Ofrecidos"</strong> están en constante crecimiento. Se proyecta que estos indicadores no solo alcanzarán, sino que superarán significativamente los valores de 2024, ampliando aún más la diferencia positiva observada hasta la fecha.</p>
    `;

    // Coordinator's Impact Analysis
    const coordinatorStartDate = new Date(Date.UTC(2024, 10, 1)); // November 1st, 2024

    // Period 1: Jan 1, 2024 -> Oct 31, 2024 (10 months)
    const preCoordinatorPeriod = allLanzamientos.filter(l => {
        const date = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        return date && date.getUTCFullYear() === 2024 && date.getUTCMonth() < 10;
    });

    // Period 2: Nov 1, 2024 -> Today
    const postCoordinatorPeriod = allLanzamientos.filter(l => {
        const date = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        return date && date >= coordinatorStartDate;
    });

    const preCoordinatorMonths = 10;
    const now = new Date();
    const postCoordinatorMonths = (now.getUTCFullYear() - coordinatorStartDate.getUTCFullYear()) * 12 + (now.getUTCMonth() - coordinatorStartDate.getUTCMonth()) + 1;

    // Pre-Coordinator Metrics
    const preLaunchesSet = new Set(preCoordinatorPeriod.map(l => {
        const ppsName = l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        const date = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        return ppsName && date ? `${getGroupName(ppsName)}::${date.getUTCMonth()}` : null;
    }).filter(Boolean));
    const preLaunchesCount = preLaunchesSet.size;
    const preCuposCount = preCoordinatorPeriod.reduce((sum, l) => sum + (l.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);
    const preAvgLaunchesPerMonth = (preLaunchesCount / preCoordinatorMonths).toFixed(1);
    const preAvgCuposPerMonth = (preCuposCount / preCoordinatorMonths).toFixed(1);
    
    // Post-Coordinator Metrics
    const postLaunchesSet = new Set(postCoordinatorPeriod.map(l => {
        const ppsName = l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        const date = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        return ppsName && date ? `${getGroupName(ppsName)}::${date.getUTCFullYear()}-${date.getUTCMonth()}` : null;
    }).filter(Boolean));
    const postLaunchesCount = postLaunchesSet.size;
    const postCuposCount = postCoordinatorPeriod.reduce((sum, l) => sum + (l.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);
    const postAvgLaunchesPerMonth = postCoordinatorMonths > 0 ? (postLaunchesCount / postCoordinatorMonths).toFixed(1) : '0.0';
    const postAvgCuposPerMonth = postCoordinatorMonths > 0 ? (postCuposCount / postCoordinatorMonths).toFixed(1) : '0.0';

    const preAvgLaunchesNum = parseFloat(preAvgLaunchesPerMonth);
    const postAvgLaunchesNum = parseFloat(postAvgLaunchesPerMonth);
    const preAvgCuposNum = parseFloat(preAvgCuposPerMonth);
    const postAvgCuposNum = parseFloat(postAvgCuposPerMonth);
    
    const launchIncreasePercentage = preAvgLaunchesNum > 0 ? (((postAvgLaunchesNum - preAvgLaunchesNum) / preAvgLaunchesNum) * 100).toFixed(0) : (postAvgLaunchesNum > 0 ? "100" : "0");
    const cuposIncreasePercentage = preAvgCuposNum > 0 ? (((postAvgCuposNum - preAvgCuposNum) / preAvgCuposNum) * 100).toFixed(0) : (postAvgCuposNum > 0 ? "100" : "0");

    const impactSummary = `
        <h3 style="font-size: 1.25em; font-weight: 700; margin-top: 1.5em; margin-bottom: 0.8em; padding-bottom: 0.4em; border-bottom: 1px solid #e2e8f0;">Impacto de la Nueva Gestión (Desde Noviembre 2024)</h3>
        <p>Desde el ingreso del nuevo coordinador en noviembre de 2024, se observa un <strong>incremento sustancial</strong> en la dinámica de las PPS. Analizando los promedios mensuales, la gestión ha mostrado los siguientes resultados:</p>
        <ul style="list-style-type: disc; padding-left: 1.5em; margin-top: 1em; margin-bottom: 1em;">
            <li style="margin-bottom: 0.5em;"><strong>Lanzamientos de PPS:</strong> El promedio mensual aumentó de <strong>${preAvgLaunchesPerMonth}</strong> a <strong>${postAvgLaunchesPerMonth}</strong>, representando un crecimiento del <strong>${launchIncreasePercentage}%</strong>.</li>
            <li style="margin-bottom: 0.5em;"><strong>Cupos Ofrecidos:</strong> El promedio mensual de cupos ascendió de <strong>${preAvgCuposPerMonth}</strong> a <strong>${postAvgCuposPerMonth}</strong>, un aumento del <strong>${cuposIncreasePercentage}%</strong>.</li>
        </ul>
        <p>Esta mejora se atribuye a una estrategia más proactiva en la búsqueda de nuevos convenios, la reactivación de vínculos existentes y una optimización en la gestión de las convocatorias para maximizar la oferta disponible para los estudiantes.</p>
    `;

    return generalSummary + impactSummary;
};


export const useExecutiveReportData = ({ reportType, enabled }: { reportType: ReportType | null; enabled: boolean; }) => {
    return useQuery<AnyReportData, Error>({
        queryKey: ['executiveReportData', reportType],
        queryFn: async () => {
            if (!reportType) {
                throw new Error("Report type must be provided.");
            }
            
            const allData = await fetchAllDataForReport();

            const generateSingleYearReport = (year: number): ExecutiveReportData => {
                const isCurrentYear = year === new Date().getFullYear();
                const snapshotDate = isCurrentYear ? new Date() : new Date(Date.UTC(year, 11, 31, 23, 59, 59, 999));
                const previousYearEnd = new Date(Date.UTC(year - 1, 11, 31, 23, 59, 59, 999));
                const yearStart = new Date(Date.UTC(year, 0, 1));
                
                const flowMetrics = calculateFlowMetrics(snapshotDate, yearStart, allData.estudiantes, allData.instituciones, allData.lanzamientos);
                const launchMetrics = processLaunchesForYear(year, allData.lanzamientos);
                const currentStock = getMetricsSnapshot(snapshotDate, allData.estudiantes, allData.practicas);
                const previousStock = getMetricsSnapshot(previousYearEnd, allData.estudiantes, allData.practicas);
                
                const newAgreementsList = allData.instituciones
                    .filter(i => {
                        const isMarkedAsNew = i.fields[FIELD_CONVENIO_NUEVO_INSTITUCIONES];
                        if (!isMarkedAsNew) return false;
                        const firstLaunchDate = allData.lanzamientos
                            .filter(l => normalizeStringForComparison(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS]).startsWith(normalizeStringForComparison(i.fields[FIELD_NOMBRE_INSTITUCIONES])))
                            .map(l => parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]))
                            .filter((d): d is Date => d !== null)
                            .sort((a, b) => a.getTime() - b.getTime())[0];
                        return firstLaunchDate && firstLaunchDate.getUTCFullYear() === year;
                    })
                    .map(i => i.fields[FIELD_NOMBRE_INSTITUCIONES] || 'N/A')
                    .sort();
                
                const summary = `<p>Análisis del ciclo ${year}. La "foto" actual es al ${formatDate(snapshotDate.toISOString())}, comparada con el cierre del ciclo anterior (${formatDate(previousYearEnd.toISOString())}). Se observó un cambio en estudiantes activos de ${previousStock.activeStudents} a ${currentStock.activeStudents}. Durante el ciclo, ingresaron ${flowMetrics.newStudents} estudiantes y finalizaron ${flowMetrics.finishedStudents}. Se lanzaron ${launchMetrics.totalLaunchesForYear} PPS y se firmaron ${newAgreementsList.length} convenios nuevos.</p>`;
                
                return {
                    reportType: 'singleYear',
                    year: year,
                    period: {
                        current: { start: formatDate(yearStart.toISOString()), end: formatDate(snapshotDate.toISOString()) },
                        previous: { start: `01/01/${year-1}`, end: formatDate(previousYearEnd.toISOString()) },
                    },
                    summary,
                    kpis: {
                        activeStudents: { current: currentStock.activeStudents, previous: previousStock.activeStudents },
                        studentsWithoutPpsExcludingRelevamiento: { current: currentStock.studentsWithoutPpsExcludingRelevamiento, previous: previousStock.studentsWithoutPpsExcludingRelevamiento },
                        studentsWithoutAnyPps: { current: currentStock.studentsWithoutAnyPps, previous: previousStock.studentsWithoutAnyPps },
                        newStudents: { current: flowMetrics.newStudents, previous: 0 },
                        finishedStudents: { current: flowMetrics.finishedStudents, previous: 0 },
                        newPpsLaunches: { current: launchMetrics.totalLaunchesForYear, previous: 0 },
                        totalOfferedSpots: { current: launchMetrics.totalCuposForYear, previous: 0 },
                        newAgreements: { current: newAgreementsList.length, previous: 0 },
                    },
                    launchesByMonth: launchMetrics.launchesByMonth,
                    newAgreementsList,
                };
            };
            
            if (reportType === '2024') return generateSingleYearReport(2024);
            if (reportType === '2025') return generateSingleYearReport(2025);
            
            if (reportType === 'comparative') {
                 const data2024 = generateSingleYearReport(2024);
                 const data2025 = generateSingleYearReport(2025);
                 const launches2024 = processLaunchesForYear(2024, allData.lanzamientos);
                 const launches2025 = processLaunchesForYear(2025, allData.lanzamientos);

                 return {
                    reportType: 'comparative',
                    summary: generateComparativeSummary(allData.lanzamientos),
                    kpis: {
                        activeStudents: { year2024: data2024.kpis.activeStudents.current, year2025: data2025.kpis.activeStudents.current },
                        studentsWithoutPpsExcludingRelevamiento: { year2024: data2024.kpis.studentsWithoutPpsExcludingRelevamiento.current, year2025: data2025.kpis.studentsWithoutPpsExcludingRelevamiento.current },
                        studentsWithoutAnyPps: { year2024: data2024.kpis.studentsWithoutAnyPps.current, year2025: data2025.kpis.studentsWithoutAnyPps.current },
                        newStudents: { year2024: data2024.kpis.newStudents.current, year2025: data2025.kpis.newStudents.current },
                        finishedStudents: { year2024: data2024.kpis.finishedStudents.current, year2025: data2025.kpis.finishedStudents.current },
                        newPpsLaunches: { year2024: launches2024.totalLaunchesForYear, year2025: launches2025.totalLaunchesForYear },
                        totalOfferedSpots: { year2024: launches2024.totalCuposForYear, year2025: launches2025.totalCuposForYear },
                        newAgreements: { year2024: data2024.kpis.newAgreements.current, year2025: data2025.kpis.newAgreements.current },
                    },
                    launchesByMonth: {
                        year2024: launches2024.launchesByMonth,
                        year2025: launches2025.launchesByMonth,
                    },
                    newAgreements: {
                        year2024: data2024.newAgreementsList,
                        year2025: data2025.newAgreementsList,
                    }
                } as ComparativeExecutiveReportData;
            }
            throw new Error('Invalid report type');
        },
        enabled: enabled && !!reportType,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
};
