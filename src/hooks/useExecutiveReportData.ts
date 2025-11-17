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
import type { EstudianteFields, PracticaFields, LanzamientoPPSFields, InstitucionFields, AirtableRecord, StudentInfo, TimelineMonthData, AnyReportData, ExecutiveReportData, ComparativeExecutiveReportData, ReportType } from '../types';
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
        const studentIds = (p.fields[FIELD_ESTUDIANTE_LINK_PRACTICAS] as any) || [];
        const institucionRaw = (p.fields[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] as any);
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

    const studentIdsWithAnyPractice = new Set(studentPracticeTypes.keys());
    const studentsWithoutAnyPps = activeStudentRecords.filter(student => !studentIdsWithAnyPractice.has(student.id)).length;

    return {
        activeStudents: activeStudentRecords.length,
        studentsWithoutAnyPps,
    };
};

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
                return launchDate && launchDate.getUTCFullYear() === yearStartDate.getUTCFullYear() && normalizeStringForComparison(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').startsWith(normalizeStringForComparison(i.fields[FIELD_NOMBRE_INSTITUCIONES]));
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

const MOCK_REPORT_DATA: ExecutiveReportData = {
    reportType: 'singleYear',
    year: new Date().getFullYear(),
    period: {
        current: { start: '01/01/2024', end: '31/12/2024' },
        previous: { start: '', end: '31/12/2023' },
    },
    summary: '<p>This is a mock summary for the test environment.</p>',
    kpis: {
        activeStudents: { current: 150, previous: 140 },
        studentsWithoutAnyPps: { current: 10, previous: 15 },
        newStudents: { current: 30, previous: 0 },
        finishedStudents: { current: 25, previous: 0 },
        newPpsLaunches: { current: 40, previous: 0 },
        totalOfferedSpots: { current: 120, previous: 0 },
        newAgreements: { current: 5, previous: 0 },
    },
    launchesByMonth: [],
    newAgreementsList: ['Mock Institution A', 'Mock Institution B'],
};

const MOCK_COMPARATIVE_REPORT_DATA: ComparativeExecutiveReportData = {
    reportType: 'comparative',
    summary: '<p>This is a mock comparative summary for the test environment.</p>',
    kpis: {
        activeStudents: { year2024: 140, year2025: 150 },
        studentsWithoutAnyPps: { year2024: 15, year2025: 10 },
        finishedStudents: { year2024: 20, year2025: 25 },
        newStudents: { year2024: 28, year2025: 30 },
        newPpsLaunches: { year2024: 35, year2025: 40 },
        totalOfferedSpots: { year2024: 110, year2025: 120 },
        newAgreements: { year2024: 4, year2025: 5 },
    },
    launchesByMonth: {
        year2024: [],
        year2025: [],
    },
    newAgreements: {
        year2024: ['Mock Old Agreement'],
        year2025: ['Mock New Agreement'],
    },
};
const useExecutiveReportData = ({ reportType, enabled = false, isTestingMode = false }: { reportType: ReportType | null; enabled?: boolean; isTestingMode?: boolean; }) => {
    return useQuery<AnyReportData, Error>({
        queryKey: ['executiveReportData', reportType, isTestingMode],
        queryFn: async () => {
            if (isTestingMode) {
                if (reportType === 'comparative') {
                    return MOCK_COMPARATIVE_REPORT_DATA;
                }
                return MOCK_REPORT_DATA;
            }
            if (!reportType) throw new Error("A report type must be selected.");

            const allData = await fetchAllDataForReport();

            const generateSingleYearReport = (year: number): ExecutiveReportData => {
                const yearStartDate = new Date(Date.UTC(year, 0, 1));
                const yearEndDate = new Date(Date.UTC(year + 1, 0, 1));
                yearEndDate.setUTCDate(yearEndDate.getUTCDate() - 1);
                
                const previousYearEndDate = new Date(Date.UTC(year, 0, 1));
                previousYearEndDate.setUTCDate(previousYearEndDate.getUTCDate() - 1);

                const currentSnapshot = getMetricsSnapshot(yearEndDate, allData.estudiantes, allData.practicas);
                const previousSnapshot = getMetricsSnapshot(previousYearEndDate, allData.estudiantes, allData.practicas);
                
                const flowMetrics = calculateFlowMetrics(yearEndDate, yearStartDate, allData.estudiantes, allData.instituciones, allData.lanzamientos);
                
                const launchesData = processLaunchesForYear(year, allData.lanzamientos);

                const newAgreementsList = allData.instituciones
                    .filter(i => {
                        if (!i.fields[FIELD_CONVENIO_NUEVO_INSTITUCIONES]) return false;
                        const firstLaunch = allData.lanzamientos
                            .filter(l => normalizeStringForComparison(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || '').startsWith(normalizeStringForComparison(i.fields[FIELD_NOMBRE_INSTITUCIONES])))
                            .map(l => parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]))
                            .filter((d): d is Date => d !== null)
                            .sort((a,b) => a.getTime() - b.getTime())[0];
                        return firstLaunch && firstLaunch.getUTCFullYear() === year;
                    })
                    .map(i => i.fields[FIELD_NOMBRE_INSTITUCIONES] || 'N/A');
                
                return {
                    reportType: 'singleYear',
                    year: year,
                    period: {
                        current: { start: formatDate(yearStartDate.toISOString())!, end: formatDate(yearEndDate.toISOString())! },
                        previous: { start: '', end: formatDate(previousYearEndDate.toISOString())! },
                    },
                    summary: `Este es un resumen autogenerado para el ciclo ${year}.`,
                    kpis: {
                        activeStudents: { current: currentSnapshot.activeStudents, previous: previousSnapshot.activeStudents },
                        studentsWithoutAnyPps: { current: currentSnapshot.studentsWithoutAnyPps, previous: previousSnapshot.studentsWithoutAnyPps },
                        newStudents: { current: flowMetrics.newStudents, previous: 0 },
                        finishedStudents: { current: flowMetrics.finishedStudents, previous: 0 },
                        newPpsLaunches: { current: launchesData.totalLaunchesForYear, previous: 0 },
                        totalOfferedSpots: { current: launchesData.totalCuposForYear, previous: 0 },
                        newAgreements: { current: flowMetrics.newAgreements, previous: 0 },
                    },
                    launchesByMonth: launchesData.launchesByMonth,
                    newAgreementsList: newAgreementsList,
                };
            };

            if (reportType === '2024' || reportType === '2025') {
                return generateSingleYearReport(parseInt(reportType, 10));
            }

            if (reportType === 'comparative') {
                const data2024 = generateSingleYearReport(2024);
                const data2025 = generateSingleYearReport(2025);
                return {
                    reportType: 'comparative',
                    summary: `Comparación de métricas clave entre los ciclos 2024 y 2025.`,
                    kpis: {
                         activeStudents: { year2024: data2024.kpis.activeStudents.current, year2025: data2025.kpis.activeStudents.current },
                         studentsWithoutAnyPps: { year2024: data2024.kpis.studentsWithoutAnyPps.current, year2025: data2025.kpis.studentsWithoutAnyPps.current },
                         finishedStudents: { year2024: data2024.kpis.finishedStudents.current, year2025: data2025.kpis.finishedStudents.current },
                         newStudents: { year2024: data2024.kpis.newStudents.current, year2025: data2025.kpis.newStudents.current },
                         newPpsLaunches: { year2024: data2024.kpis.newPpsLaunches.current, year2025: data2025.kpis.newPpsLaunches.current },
                         totalOfferedSpots: { year2024: data2024.kpis.totalOfferedSpots.current, year2025: data2025.kpis.totalOfferedSpots.current },
                         newAgreements: { year2024: data2024.kpis.newAgreements.current, year2025: data2025.kpis.newAgreements.current },
                    },
                    launchesByMonth: {
                        year2024: data2024.launchesByMonth,
                        year2025: data2025.launchesByMonth,
                    },
                    newAgreements: {
                        year2024: data2024.newAgreementsList,
                        year2025: data2025.newAgreementsList,
                    },
                };
            }
            throw new Error(`Invalid report type: ${reportType}`);
        },
        enabled: enabled,
    });
};

export default useExecutiveReportData;