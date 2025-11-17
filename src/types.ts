import { z } from 'zod';
import {
    estudianteFieldsSchema,
    practicaFieldsSchema,
    solicitudPPSFieldsSchema,
    lanzamientoPPSFieldsSchema,
    convocatoriaFieldsSchema,
    institucionFieldsSchema,
    penalizacionFieldsSchema,
    finalizacionPPSFieldsSchema,
    authUserFieldsSchema,
    ALL_ORIENTACIONES,
} from './schemas';

import {
    FIELD_PENALIZACION_ESTUDIANTE_LINK,
    FIELD_PENALIZACION_TIPO,
    FIELD_PENALIZACION_FECHA,
    FIELD_PENALIZACION_NOTAS,
    FIELD_PENALIZACION_PUNTAJE,
    FIELD_PENALIZACION_CONVOCATORIA_LINK
} from './constants';

// --- Airtable Base Types ---
export interface AirtableRecord<T> {
  id: string;
  createdTime: string;
  fields: T;
}

export interface AirtableResponse<T> {
  records: AirtableRecord<T>[];
  offset?: string;
}

export interface AirtableError {
  type: string;
  message: string;
}

export interface AirtableErrorResponse {
  error: AirtableError | string;
}

// --- App-specific Types ---

export type Orientacion = typeof ALL_ORIENTACIONES[number];
export { ALL_ORIENTACIONES }; // Re-export

export type TabId = 'inicio' | 'informes' | 'solicitudes' | 'practicas' | 'profile' | 'calendario';

export interface CriteriosCalculados {
  horasTotales: number;
  horasFaltantes250: number;
  cumpleHorasTotales: boolean;
  horasOrientacionElegida: number;
  horasFaltantesOrientacion: number;
  cumpleHorasOrientacion: boolean;
  orientacionesCursadasCount: number;
  orientacionesUnicas: string[];
  cumpleRotacion: boolean;
}

// --- Table Fields Interfaces (Inferred from Zod) ---

export type EstudianteFields = z.infer<typeof estudianteFieldsSchema>;
export type PracticaFields = z.infer<typeof practicaFieldsSchema>;
export type SolicitudPPSFields = z.infer<typeof solicitudPPSFieldsSchema>;
export type LanzamientoPPSFields = z.infer<typeof lanzamientoPPSFieldsSchema>;
export type ConvocatoriaFields = z.infer<typeof convocatoriaFieldsSchema>;
export type InstitucionFields = z.infer<typeof institucionFieldsSchema>;
export type FinalizacionPPSFields = z.infer<typeof finalizacionPPSFieldsSchema>;
export type PenalizacionFields = z.infer<typeof penalizacionFieldsSchema>;
export type AuthUserFields = z.infer<typeof authUserFieldsSchema>;

export type Penalizacion = PenalizacionFields;

// Types with ID
export type Practica = PracticaFields & { id: string };
export type SolicitudPPS = SolicitudPPSFields & { id: string };
export type LanzamientoPPS = LanzamientoPPSFields & { id: string };
export type Convocatoria = ConvocatoriaFields & { id: string };

// --- Component-specific & complex types ---

export interface InformeTask {
  convocatoriaId: string;
  practicaId?: string;
  ppsName: string;
  informeLink?: string;
  fechaFinalizacion: string;
  informeSubido: boolean;
  nota?: string | null;
  fechaEntregaInforme?: string | null;
}

export type SelectedStudent = { nombre: string; legajo: string };
export type GroupedSeleccionados = { [key: string]: SelectedStudent[] };

export interface InformeCorreccionStudent {
  studentId: string;
  studentName: string;
  convocatoriaId: string;
  practicaId?: string | null;
  informeSubido: boolean | null;
  nota: string;
  lanzamientoId: string;
  orientacion?: string | null;
  fechaInicio?: string | null;
  fechaFinalizacionPPS?: string | null;
  fechaEntregaInforme?: string | null;
}

export interface InformeCorreccionPPS {
  lanzamientoId: string;
  ppsName: string | null;
  orientacion: string | null;
  informeLink?: string | null;
  fechaFinalizacion?: string | null;
  students: InformeCorreccionStudent[];
}

export interface FlatCorreccionStudent extends InformeCorreccionStudent {
    ppsName: string | null;
    informeLink?: string | null;
    correctionDeadline?: string;
}

export interface CalendarEvent {
    id: string;
    name: string;
    schedule: string;
    orientation: string;
    location: string;
    colorClasses: {
        tag: string;
        dot: string;
    };
    startDate?: string | null;
    endDate?: string | null;
}

export type ReportType = '2024' | '2025' | 'comparative';

export interface TimelineMonthData {
    monthName: string;
    ppsCount: number;
    cuposTotal: number;
    institutions: { name: string; cupos: number; variants: string[] }[];
}

interface KPISnapshot {
    current: number;
    previous: number;
}

export interface ExecutiveReportData {
    reportType: 'singleYear';
    year: number;
    period: {
        current: { start: string; end: string };
        previous: { start: string; end: string };
    };
    summary: string;
    kpis: {
        activeStudents: KPISnapshot;
        studentsWithoutAnyPps: KPISnapshot;
        newStudents: KPISnapshot;
        finishedStudents: KPISnapshot;
        newPpsLaunches: KPISnapshot;
        totalOfferedSpots: KPISnapshot;
        newAgreements: KPISnapshot;
    };
    launchesByMonth: TimelineMonthData[];
    newAgreementsList: string[];
}

interface KPIComparison {
    year2024: number;
    year2025: number;
}
export interface ComparativeExecutiveReportData {
    reportType: 'comparative';
    summary: string;
    kpis: {
        activeStudents: KPIComparison;
        studentsWithoutAnyPps: KPIComparison;
        finishedStudents: KPIComparison;
        newStudents: KPIComparison;
        newPpsLaunches: KPIComparison;
        totalOfferedSpots: KPIComparison;
        newAgreements: KPIComparison;
    };
    launchesByMonth: {
        year2024: TimelineMonthData[];
        year2025: TimelineMonthData[];
    };
    newAgreements: {
        year2024: string[];
        year2025: string[];
    };
}

export type AnyReportData = ExecutiveReportData | ComparativeExecutiveReportData;

export interface StudentInfo {
  legajo: string;
  nombre: string;
  institucion?: string;
  fechaFin?: string;
  ppsId?: string;
  [key: string]: any; // Allow other properties
}