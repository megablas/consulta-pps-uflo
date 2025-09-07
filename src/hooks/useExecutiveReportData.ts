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
import type { EstudianteFields, PracticaFields, LanzamientoPPSFields, InstitucionFields, ExecutiveReportData, AirtableRecord } from '../types';


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
const calculateCumulativeMetrics = (
    snapshotEndDate: Date,
    yearStartDate: Date,
    allEstudiantes: AirtableRecord<EstudianteFields>[],
    allLanzamientos: AirtableRecord<LanzamientoPPSFields>[],
    allInstituciones: AirtableRecord<InstitucionFields>[]
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

    const ppsLaunched = allLanzamientos.filter(l => {
        const launchDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
        return launchDate && launchDate >= yearStartDate && launchDate <= snapshotEndDate;
    });

    const newPpsLaunches = ppsLaunched.length;
    const totalOfferedSpots = ppsLaunched.reduce((sum, l) => sum + (l.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);
    
    const newAgreements = allInstituciones.filter(i => {
        const isMarkedAsNew = i.fields[FIELD_CONVENIO_NUEVO_INSTITUCIONES];
        if (!isMarkedAsNew) return false;
        
        const firstLaunchDate = allLanzamientos
            .filter(l => {
                const launchDate = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
                return launchDate && launchDate.getUTCFullYear() === 2025 && normalizeStringForComparison(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS]).startsWith(normalizeStringForComparison(i.fields[FIELD_NOMBRE_INSTITUCIONES]));
            })
            .map(l => parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]))
            .filter((d): d is Date => d !== null)
            .sort((a, b) => a.getTime() - b.getTime())[0];
            
        return firstLaunchDate && firstLaunchDate >= yearStartDate && firstLaunchDate <= snapshotEndDate;
    });
    
    return {
        newStudents,
        finishedStudents,
        newPpsLaunches,
        totalOfferedSpots,
        newAgreements: newAgreements.length,
        newAgreementsList: newAgreements.map(i => i.fields[FIELD_NOMBRE_INSTITUCIONES] || 'N/A').sort(),
        ppsLaunchedInPeriod: ppsLaunched
            .map(l => ({
                name: l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'N/A',
                spots: l.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0,
                date: formatDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]),
                orientation: l.fields[FIELD_ORIENTACION_LANZAMIENTOS] || 'N/A',
            }))
            .sort((a, b) => parseToUTCDate(a.date)!.getTime() - parseToUTCDate(b.date)!.getTime())
    };
};


export const useExecutiveReportData = (startDateStr: string, endDateStr: string, enabled: boolean) => {
    return useQuery<ExecutiveReportData, Error>({
        queryKey: ['executiveReport', startDateStr, endDateStr],
        queryFn: async () => {
            const currentStart = parseToUTCDate(startDateStr)!;
            currentStart.setUTCHours(0, 0, 0, 0);
            
            const currentEnd = parseToUTCDate(endDateStr)!;
            currentEnd.setUTCHours(23, 59, 59, 999);
            
            const previousEnd = new Date(currentStart);
            previousEnd.setUTCDate(previousEnd.getUTCDate() - 1);
            previousEnd.setUTCHours(23, 59, 59, 999);
            
            const yearStart = new Date(Date.UTC(2025, 0, 1));
            
            const allData = await fetchAllDataForReport();

            const currentCumulativeMetrics = calculateCumulativeMetrics(currentEnd, yearStart, allData.estudiantes, allData.lanzamientos, allData.instituciones);
            const previousCumulativeMetrics = calculateCumulativeMetrics(previousEnd, yearStart, allData.estudiantes, allData.lanzamientos, allData.instituciones);
            
            const currentStockMetrics = getMetricsSnapshot(currentEnd, allData.estudiantes, allData.practicas);
            const previousStockMetrics = getMetricsSnapshot(previousEnd, allData.estudiantes, allData.practicas);

            const summary = `
                <p>Comparando el estado acumulado desde el inicio del ciclo hasta el <strong>${formatDate(previousEnd.toISOString())}</strong> (período anterior) con el estado al <strong>${formatDate(endDateStr)}</strong> (período actual).</p>
                <p>La población de estudiantes activos pasó de <strong>${previousStockMetrics.activeStudents}</strong> a <strong>${currentStockMetrics.activeStudents}</strong>. Al cierre del período, <strong>${currentStockMetrics.studentsWithoutAnyPps}</strong> estudiantes no tenían ninguna PPS registrada.</p>
                <p>Desde el inicio del año, los ingresos acumulados aumentaron de <strong>${previousCumulativeMetrics.newStudents}</strong> a <strong>${currentCumulativeMetrics.newStudents}</strong>, y los estudiantes finalizados de <strong>${previousCumulativeMetrics.finishedStudents}</strong> a <strong>${currentCumulativeMetrics.finishedStudents}</strong>.</p>
                <p>En cuanto a la oferta acumulada, se pasó de <strong>${previousCumulativeMetrics.newPpsLaunches}</strong> a <strong>${currentCumulativeMetrics.newPpsLaunches}</strong> PPS lanzadas, y de <strong>${previousCumulativeMetrics.newAgreements}</strong> a <strong>${currentCumulativeMetrics.newAgreements}</strong> convenios nuevos.</p>
            `.replace(/\s+/g, ' ').trim();

            return {
                period: {
                    current: { start: formatDate(startDateStr), end: formatDate(endDateStr) },
                    previous: { start: '01/01/2025', end: formatDate(previousEnd.toISOString()) },
                },
                summary,
                kpis: {
                    activeStudents: { current: currentStockMetrics.activeStudents, previous: previousStockMetrics.activeStudents },
                    studentsWithoutPpsExcludingRelevamiento: { current: currentStockMetrics.studentsWithoutPpsExcludingRelevamiento, previous: previousStockMetrics.studentsWithoutPpsExcludingRelevamiento },
                    studentsWithoutAnyPps: { current: currentStockMetrics.studentsWithoutAnyPps, previous: previousStockMetrics.studentsWithoutAnyPps },
                    newStudents: { current: currentCumulativeMetrics.newStudents, previous: previousCumulativeMetrics.newStudents },
                    finishedStudents: { current: currentCumulativeMetrics.finishedStudents, previous: previousCumulativeMetrics.finishedStudents },
                    newPpsLaunches: { current: currentCumulativeMetrics.newPpsLaunches, previous: previousCumulativeMetrics.newPpsLaunches },
                    totalOfferedSpots: { current: currentCumulativeMetrics.totalOfferedSpots, previous: previousCumulativeMetrics.totalOfferedSpots },
                    newAgreements: { current: currentCumulativeMetrics.newAgreements, previous: previousCumulativeMetrics.newAgreements },
                },
                ppsLaunchedInPeriod: currentCumulativeMetrics.ppsLaunchedInPeriod,
                newAgreementsList: currentCumulativeMetrics.newAgreementsList,
            };
        },
        enabled: enabled,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
    });
};
