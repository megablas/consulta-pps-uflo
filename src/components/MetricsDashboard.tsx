import React, { useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { fetchAllAirtableData } from '../services/airtableService';
import type {
  EstudianteFields,
  PracticaFields,
  ConvocatoriaFields,
  LanzamientoPPSFields,
  InstitucionFields,
  AirtableRecord,
} from '../types';
import {
  AIRTABLE_TABLE_NAME_PRACTICAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
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
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_HORAS_PRACTICAS,
  FIELD_NOMBRE_PPS_CONVOCATORIAS,
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_CONVENIO_NUEVO_INSTITUCIONES,
  FIELD_ESTADO_PRACTICA,
  FIELD_ORIENTACION_LANZAMIENTOS,
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate, formatDate, getEspecialidadClasses } from '../utils/formatters';
import EmptyState from './EmptyState';
import StudentListModal from './StudentListModal';
import Card from './Card';
import Loader from './Loader';
import BarChart from './BarChart';
import Histogram from './Histogram';
import MetricCard from './MetricCard';

type StudentInfo = {
  legajo: string;
  nombre: string;
  institucion?: string;
  fechaFin?: string;
  ppsId?: string;
  [key: string]: any;
};

type ModalData = {
  title: string;
  students: StudentInfo[];
  headers?: { key: string; label: string }[];
  description?: React.ReactNode;
};

// Helpers robustos para valores Airtable (lookup/linked/formulas)
function getText(value: unknown): string {
  if (value == null) return '';
  if (Array.isArray(value)) {
    const first = value[0];
    if (first == null) return '';
    if (typeof first === 'object') {
      const maybeName = (first as any)?.name ?? (first as any)?.text ?? '';
      return typeof maybeName === 'string' ? maybeName : String(maybeName ?? '');
    }
    return typeof first === 'string' ? first : String(first);
  }
  return typeof value === 'string' ? value : String(value);
}

function getGroupName(raw: unknown): string {
  const s = getText(raw);
  const idx = s.indexOf(' - ');
  const head = idx >= 0 ? s.slice(0, idx) : s;
  return head.trim();
}

const fetchMetricsData = async () => {
  const convFields = [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS];

  const [estudiantesRes, practicasRes, convocatoriasRes, lanzamientosRes, institucionesRes] =
    await Promise.all([
      fetchAllAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [
        FIELD_LEGAJO_ESTUDIANTES,
        FIELD_NOMBRE_ESTUDIANTES,
        'Finalizaron',
        'Creada',
        'Fecha de Finalización',
      ]),
      fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [
        FIELD_NOMBRE_BUSQUEDA_PRACTICAS,
        FIELD_FECHA_INICIO_PRACTICAS,
        FIELD_FECHA_FIN_PRACTICAS,
        FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS,
        FIELD_ESTUDIANTE_LINK_PRACTICAS,
        FIELD_HORAS_PRACTICAS,
        FIELD_ESTADO_PRACTICA,
      ]),
      fetchAllAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, convFields),
      fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [
        FIELD_FECHA_INICIO_LANZAMIENTOS,
        FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
        FIELD_NOMBRE_PPS_LANZAMIENTOS,
        FIELD_ORIENTACION_LANZAMIENTOS,
      ]),
      fetchAllAirtableData<InstitucionFields>(AIRTABLE_TABLE_NAME_INSTITUCIONES, [
        FIELD_NOMBRE_INSTITUCIONES,
        FIELD_CONVENIO_NUEVO_INSTITUCIONES,
      ]),
    ]);

  if (
    estudiantesRes.error ||
    practicasRes.error ||
    convocatoriasRes.error ||
    lanzamientosRes.error ||
    institucionesRes.error
  ) {
    const errorResponse =
      estudiantesRes.error ||
      practicasRes.error ||
      convocatoriasRes.error ||
      lanzamientosRes.error ||
      institucionesRes.error;
    const errorMessage =
      typeof errorResponse?.error === 'string'
        ? errorResponse.error
        : errorResponse?.error.message || 'un error desconocido';
    throw new Error(`Error al cargar datos críticos para las métricas: ${errorMessage}`);
  }

  return {
    estudiantes: estudiantesRes.records.map((r) => ({ ...r.fields, id: r.id })),
    practicas: practicasRes.records.map((r) => ({ ...r.fields, id: r.id })),
    convocatorias: convocatoriasRes.records.map((r) => r.fields),
    lanzamientos: lanzamientosRes.records.map((r) => ({...r.fields, id: r.id})),
    institutions: institucionesRes.records.map((r) => r.fields),
  };
};

// Encapsula toda la lógica de métricas; incluye coerción segura de Lookups
function computeMetrics(data: Awaited<ReturnType<typeof fetchMetricsData>>, targetYear: number) {
  const { estudiantes, practicas, convocatorias, lanzamientos, institutions } = data;

  const studentMapById = new Map<string, any>(estudiantes.map((e) => [e.id, e]));

  const startOfTargetYear = new Date(Date.UTC(targetYear, 0, 1));
  const endOfTargetYear = new Date(Date.UTC(targetYear + 1, 0, 1));
  
  const studentsAtStartOfYear = estudiantes.filter((student) => {
    const creationDate = parseToUTCDate(student['Creada']);
    const finalizationDate = parseToUTCDate(student['Fecha de Finalización']);
    
    // Condition 1: Must have been created before the target year starts.
    const wasCreatedBefore = !creationDate || creationDate < startOfTargetYear;
    if (!wasCreatedBefore) {
        return false;
    }

    // Condition 2: Must not have a finalization date before the target year starts.
    if (student['Finalizaron'] && finalizationDate && finalizationDate < startOfTargetYear) {
        return false;
    }
    
    return true;
  });

  const allActiveStudents = estudiantes.filter((student) => !student['Finalizaron']);

  const newStudentsThisYear = estudiantes.filter((student) => {
    const creationDate = parseToUTCDate(student['Creada']);
    return creationDate && creationDate.getUTCFullYear() === targetYear;
  });

  const finalizacionesThisYear = estudiantes.filter(student => {
    const finalizationDate = parseToUTCDate(student['Fecha de Finalización']);
    return student['Finalizaron'] && finalizationDate && finalizationDate >= startOfTargetYear && finalizationDate < endOfTargetYear;
  });


  // Pico de alumnos
  let currentStudentCount = studentsAtStartOfYear.length;
  let maxStudentCount = currentStudentCount;
  type StudentCountEvent = { date: Date; type: 'increment' | 'decrement' };
  const events: StudentCountEvent[] = [];
  newStudentsThisYear.forEach((student) => {
    const creationDate = parseToUTCDate(student['Creada']);
    if (creationDate) events.push({ date: creationDate, type: 'increment' });
  });
  finalizacionesThisYear.forEach((student) => {
    const finalizationDate = parseToUTCDate(student['Fecha de Finalización']);
    if (finalizationDate) {
        events.push({ date: finalizationDate, type: 'decrement' });
    }
  });
  events.sort((a, b) => a.date.getTime() - b.date.getTime());
  events.forEach((event) => {
    currentStudentCount += event.type === 'increment' ? 1 : -1;
    if (currentStudentCount > maxStudentCount) maxStudentCount = currentStudentCount;
  });

  const alumnosActivosList = allActiveStudents
    .map((student) => ({
      legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
      nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const nuevosAlumnosList = newStudentsThisYear
    .map((student) => ({
      legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
      nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`,
      fechaIngreso: formatDate(student['Creada']),
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const alumnosInicioCicloList = studentsAtStartOfYear
    .map((student) => ({
      legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
      nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const lanzamientosYear = lanzamientos.filter(
    (l) => parseToUTCDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS])?.getUTCFullYear() === targetYear
  );
  const ppsLanzadasCount = lanzamientosYear.length;
  
  const ultimas5Lanzadas = [...lanzamientosYear]
    .sort((a, b) => {
        const dateA = parseToUTCDate(a[FIELD_FECHA_INICIO_LANZAMIENTOS])?.getTime() ?? 0;
        const dateB = parseToUTCDate(b[FIELD_FECHA_INICIO_LANZAMIENTOS])?.getTime() ?? 0;
        return dateB - dateA;
    })
    .slice(0, 5);

  // --- CÁLCULO DE CUPOS OFRECIDOS ---
  // Se calcula el total de cupos de PPS lanzadas en el año, excluyendo las de "Relevamiento Profesional".
  // Este es el valor principal que se muestra en la tarjeta.
  const cuposOfrecidosSinRelevamiento = lanzamientosYear
    .filter(
      (l) =>
        !normalizeStringForComparison(getText(l[FIELD_NOMBRE_PPS_LANZAMIENTOS])).includes('relevamiento')
    )
    .reduce((sum, l) => sum + (l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);
  
  // Se calcula el total de cupos, incluyendo las de "Relevamiento Profesional", para la descripción de la tarjeta.
  const cuposTotalesConRelevamiento = lanzamientosYear.reduce((sum, l) => sum + (l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);

  const convocatoriasYear = convocatorias.filter(
    (c) => parseToUTCDate(c[FIELD_FECHA_INICIO_CONVOCATORIAS])?.getUTCFullYear() === targetYear
  );
  const totalInscripciones = convocatoriasYear.reduce((sum, c) => {
    const studentIds = c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
    return sum + (Array.isArray(studentIds) ? studentIds.length : 0);
  }, 0);
  const presionInscripcion = cuposOfrecidosSinRelevamiento > 0 ? Math.round((totalInscripciones / cuposOfrecidosSinRelevamiento) * 100) : 0;

  const listaPostulaciones: StudentInfo[] = [];
  convocatoriasYear.forEach((c) => {
    const studentIds = c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
    if (Array.isArray(studentIds)) {
      studentIds.forEach((id) => {
        const student = studentMapById.get(id);
        if (student) {
          listaPostulaciones.push({
            legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
            nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}`,
            institucion: getText(c[FIELD_NOMBRE_PPS_CONVOCATORIAS]) || 'N/A',
            fechaInscripcion: formatDate(c[FIELD_FECHA_INICIO_CONVOCATORIAS]),
          });
        }
      });
    }
  });
  listaPostulaciones.sort((a, b) => a.nombre.localeCompare(b.nombre));

  const ppsLanzadasList: StudentInfo[] = Array.from(
    lanzamientosYear.reduce((map, l) => {
      const name = getText(l[FIELD_NOMBRE_PPS_LANZAMIENTOS]) || 'Sin Nombre';
      if (!map.has(name)) map.set(name, { count: 0, cupos: 0 });
      const entry = map.get(name)!;
      entry.count += 1;
      entry.cupos += l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0;
      return map;
    }, new Map<string, { count: number; cupos: number }>()),
    ([name, data]) => ({
      nombre: name,
      legajo: `Lanzada ${data.count} ${data.count > 1 ? 'veces' : 'vez'}`,
      cupos: data.cupos,
    })
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const activeStudentIds = new Set(allActiveStudents.map((s) => s.id));

  const studentFirstApplication = new Map<string, Date>();
  convocatorias.forEach((c) => {
    const studentIds = c[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS];
    if (Array.isArray(studentIds)) {
      studentIds.forEach((id) => {
        if (activeStudentIds.has(id)) {
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
  const activePPSPracticas: { studentId: string; practica: PracticaFields & { id: string } }[] = [];

  practicas.forEach((p) => {
    const estado = p[FIELD_ESTADO_PRACTICA];
    const fechaFinStr = p[FIELD_FECHA_FIN_PRACTICAS];
    if (normalizeStringForComparison(getText(estado)) === 'en curso' && fechaFinStr) {
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

  const alumnosEnPPSList = Array.from(studentsWithActivePPS_Set)
    .map((id) => {
      const student = studentMapById.get(id);
      const studentActivePracticas = activePPSPracticas
        .filter((p) => p.studentId === id)
        .map((p) => p.practica);
      studentActivePracticas.sort(
        (a, b) =>
          (parseToUTCDate(b[FIELD_FECHA_FIN_PRACTICAS]!)?.getTime() ?? 0) -
          (parseToUTCDate(a[FIELD_FECHA_FIN_PRACTICAS]!)?.getTime() ?? 0)
      );
      const relevantPractica = studentActivePracticas[0];
      const instText = getText(relevantPractica[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS]) || 'N/A';

      return {
        legajo: student?.[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
        nombre: student?.[FIELD_NOMBRE_ESTUDIANTES] || `ID ${id}`,
        institucion: instText,
        fechaFin: formatDate(relevantPractica[FIELD_FECHA_FIN_PRACTICAS]),
        ppsId: relevantPractica.id,
      };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const studentPracticeTypes = new Map<string, { hasRelevamiento: boolean; hasOther: boolean }>();
  practicas.forEach((p) => {
    const studentIds = p[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [];
    const institucionRaw = p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
    const institucion = getText(institucionRaw);
    const isRelevamiento = normalizeStringForComparison(institucion).includes('relevamiento');
    studentIds.forEach((id: string) => {
      if (!studentPracticeTypes.has(id)) {
        studentPracticeTypes.set(id, { hasRelevamiento: false, hasOther: false });
      }
      const types = studentPracticeTypes.get(id)!;
      if (isRelevamiento) types.hasRelevamiento = true;
      else types.hasOther = true;
    });
  });

  const alumnosSinPPSList = allActiveStudents
    .filter((student) => {
      const types = studentPracticeTypes.get(student.id);
      return !types || !types.hasOther;
    })
    .map((student) => ({
      legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
      nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const studentIdsWithAnyPractice = new Set(studentPracticeTypes.keys());
  const alumnosSinNingunaPPSList = allActiveStudents
    .filter((student) => !studentIdsWithAnyPractice.has(student.id))
    .map((student) => ({
      legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
      nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const alumnosFinalizadosList = finalizacionesThisYear
    .map((student) => ({
      legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
      nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`,
    }))
    .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const studentTotalHoursById = practicas.reduce((acc, p) => {
    const studentIds = p[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [];
    const hours = p[FIELD_HORAS_PRACTICAS] || 0;
    studentIds.forEach((id: string) => {
        acc.set(id, (acc.get(id) || 0) + hours);
    });
    return acc;
  }, new Map<string, number>());

  const hourBins: { [key: string]: { count: number; students: StudentInfo[] } } = {
    '0-50 hs': { count: 0, students: [] },
    '51-100 hs': { count: 0, students: [] },
    '101-150 hs': { count: 0, students: [] },
    '151-200 hs': { count: 0, students: [] },
    '201-249 hs': { count: 0, students: [] },
    '250+ hs': { count: 0, students: [] },
  };

  allActiveStudents.forEach(student => {
    const hours = studentTotalHoursById.get(student.id) || 0;
    const studentInfo = { legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A', nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`, totalHoras: Math.round(hours) };
    if (hours >= 250) hourBins['250+ hs'].students.push(studentInfo);
    else if (hours >= 201) hourBins['201-249 hs'].students.push(studentInfo);
    else if (hours >= 151) hourBins['151-200 hs'].students.push(studentInfo);
    else if (hours >= 101) hourBins['101-150 hs'].students.push(studentInfo);
    else if (hours >= 51) hourBins['51-100 hs'].students.push(studentInfo);
    else hourBins['0-50 hs'].students.push(studentInfo);
  });
  Object.keys(hourBins).forEach((key) => (hourBins[key as keyof typeof hourBins].count = hourBins[key as keyof typeof hourBins].students.length));

  const topInstitutions = Array.from(
    lanzamientosYear
      .filter(
        (l) => !normalizeStringForComparison(getText(l[FIELD_NOMBRE_PPS_LANZAMIENTOS])).includes('relevamiento')
      )
      .reduce((map, l) => {
        const name = getText(l[FIELD_NOMBRE_PPS_LANZAMIENTOS]) || 'Sin Nombre';
        map.set(name, (map.get(name) || 0) + (l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0));
        return map;
      }, new Map<string, number>()),
    ([label, value]) => ({ label, value })
  )
    .sort((a, b) => b.value - a.value)
    .slice(0, 5);

  const timeToPlacementDurations: number[] = [];
  const studentFirstPracticeDate = new Map<string, Date>();
  practicas.forEach((p) => {
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
  const avgTimeToPlacement =
    timeToPlacementDurations.length > 0
      ? Math.round(timeToPlacementDurations.reduce((a, b) => a + b, 0) / timeToPlacementDurations.length)
      : 0;

  const nuevosConveniosInstitutions = institutions.filter(
    (inst) => inst[FIELD_CONVENIO_NUEVO_INSTITUCIONES] && inst[FIELD_NOMBRE_INSTITUCIONES]
  );
  const nuevosConveniosList = nuevosConveniosInstitutions.map((inst) => {
    const instName = getText(inst[FIELD_NOMBRE_INSTITUCIONES]) || '—';
    const normInstGroupName = normalizeStringForComparison(getGroupName(instName));
    const totalCupos = lanzamientosYear
      .filter((l) => {
        const launchGroup = normalizeStringForComparison(getGroupName(getText(l[FIELD_NOMBRE_PPS_LANZAMIENTOS])));
        return launchGroup.startsWith(normInstGroupName);
      })
      .reduce((sum, l) => sum + (l[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0), 0);

    return {
      nombre: instName,
      legajo: '—',
      cupos: totalCupos,
    };
  });

  const studentsWithPracticeEnCurso = new Set<string>();
    practicas.forEach(p => {
        const estado = p[FIELD_ESTADO_PRACTICA];
        if (normalizeStringForComparison(getText(estado)) === 'en curso') {
            const studentIds = p[FIELD_ESTUDIANTE_LINK_PRACTICAS] || [];
            studentIds.forEach((id: string) => studentsWithPracticeEnCurso.add(id));
        }
    });

    const alumnosProximosAFinalizarList = allActiveStudents
        .filter(student => {
            const totalHours = studentTotalHoursById.get(student.id) || 0;
            const hasPracticeEnCurso = studentsWithPracticeEnCurso.has(student.id);
            const conditionA = totalHours >= 230 && totalHours < 250;
            const conditionB = totalHours >= 250 && hasPracticeEnCurso;
            return conditionA || conditionB;
        })
        .map(student => ({
            legajo: student[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
            nombre: student[FIELD_NOMBRE_ESTUDIANTES] || `ID ${student.id}`,
            totalHoras: Math.round(studentTotalHoursById.get(student.id) || 0),
        }))
        .sort((a, b) => a.nombre.localeCompare(b.nombre));

  const activeInstitutionsMap = new Map<string, { groupName: string, orientations: Set<string> }>();
  lanzamientosYear.forEach(l => {
      const instName = getText(l[FIELD_NOMBRE_PPS_LANZAMIENTOS]);
      const orientation = getText(l[FIELD_ORIENTACION_LANZAMIENTOS]);
      if (instName) {
          const groupName = getGroupName(instName);
          const normGroupName = normalizeStringForComparison(groupName);

          if (!activeInstitutionsMap.has(normGroupName)) {
              activeInstitutionsMap.set(normGroupName, { groupName: groupName, orientations: new Set<string>() });
          }
          if (orientation) {
              orientation.split(',').forEach(o => {
                  const trimmedO = o.trim();
                  if (trimmedO) {
                      activeInstitutionsMap.get(normGroupName)!.orientations.add(trimmedO);
                  }
              });
          }
      }
  });

  const activeInstitutionsList = Array.from(activeInstitutionsMap.values()).map(data => ({
      nombre: data.groupName,
      legajo: Array.from(data.orientations).join(', '),
  })).sort((a, b) => a.nombre.localeCompare(b.nombre));

  return {
    alumnosEnPPS: { value: studentsWithActivePPS_Set.size, list: alumnosEnPPSList },
    alumnosActivos: { value: allActiveStudents.length, list: alumnosActivosList },
    alumnosSinPPS: { value: alumnosSinPPSList.length, list: alumnosSinPPSList },
    alumnosSinNingunaPPS: { value: alumnosSinNingunaPPSList.length, list: alumnosSinNingunaPPSList },
    alumnosFinalizados: { value: finalizacionesThisYear.length, list: alumnosFinalizadosList },
    ppsLanzadas: { value: ppsLanzadasCount, list: ppsLanzadasList },
    cuposOfrecidos: { value: cuposOfrecidosSinRelevamiento },
    cuposTotalesConRelevamiento: { value: cuposTotalesConRelevamiento },
    presionInscripcion,
    listaPostulaciones,
    distribucionHoras: Object.entries(hourBins).map(([label, data]) => ({
      label,
      value: (data as any).count,
      students: (data as any).students.sort((a: any, b: any) => b.totalHoras - a.totalHoras),
    })),
    topInstitutions,
    avgTimeToPlacement,
    nuevosConvenios: { value: nuevosConveniosList.length, list: nuevosConveniosList },
    alumnosInicioCiclo: { value: studentsAtStartOfYear.length, list: alumnosInicioCicloList },
    nuevosAlumnos: { value: newStudentsThisYear.length, list: nuevosAlumnosList },
    picoAlumnos: { value: maxStudentCount },
    ultimas5Lanzadas,
    alumnosProximosAFinalizar: { value: alumnosProximosAFinalizarList.length, list: alumnosProximosAFinalizarList },
    activeInstitutions: { value: activeInstitutionsMap.size, list: activeInstitutionsList },
  };
}

// UI helpers
const HeroMetric: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  description: string;
  onClick: () => void;
  color: 'blue' | 'indigo' | 'emerald';
}> = ({ title, value, icon, description, onClick, color }) => {
  const colorClasses = {
    blue: 'from-blue-50 to-sky-100/50 border-blue-200/60 text-blue-700 hover:border-blue-300 hover:shadow-blue-500/10 dark:from-blue-900/20 dark:to-sky-900/20 dark:border-blue-800/60 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:shadow-blue-500/10',
    indigo:
      'from-indigo-50 to-purple-100/50 border-indigo-200/60 text-indigo-700 hover:border-indigo-300 hover:shadow-indigo-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 dark:border-indigo-800/60 dark:text-indigo-300 dark:hover:border-indigo-700 dark:hover:shadow-indigo-500/10',
    emerald:
      'from-emerald-50 to-teal-100/50 border-emerald-200/60 text-emerald-700 hover:border-emerald-300 hover:shadow-emerald-500/10 dark:from-emerald-900/20 dark:to-teal-900/20 dark:border-emerald-800/60 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:shadow-emerald-500/10',
  };
  return (
    <button
      onClick={onClick}
      className={`group relative text-left w-full p-6 rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 dark:focus-visible:ring-offset-slate-900 ${colorClasses[color]}`}
      aria-label={title}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <p className="text-sm font-bold opacity-80">{title}</p>
          <p className="text-5xl md:text-6xl font-black text-slate-900 dark:text-slate-50 tracking-tighter mt-2">{value}</p>
        </div>
        <div
          className={`p-3 rounded-xl bg-white/50 dark:bg-slate-900/30 shadow-sm border border-black/5 dark:border-white/5 ${
            color === 'blue' ? 'text-blue-600 dark:text-blue-400' : color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <span className="material-icons !text-3xl" aria-hidden="true">
            {icon}
          </span>
        </div>
      </div>
      <p className="text-xs opacity-70 mt-4 dark:text-current dark:opacity-60">{description}</p>
    </button>
  );
};

const FunnelRow: React.FC<{
  label: string;
  value: number;
  total: number;
  color: string;
  onClick: () => void;
  description: string;
}> = ({ label, value, total, color, onClick, description }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl transition-all duration-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600"
      aria-label={`${label}: ${value} (${total > 0 ? Math.round(percentage) : 'N/A'}%)`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
        <div className="flex-shrink-0 w-full sm:w-64 flex items-center gap-4">
          <div className="w-full bg-slate-200/70 dark:bg-slate-700 rounded-full h-2.5 shadow-inner" aria-hidden="true">
            <div className={`h-2.5 rounded-full transition-all duration-700 ease-out ${color}`} style={{ width: `${percentage}%` }} />
          </div>
          <div className="text-right">
            <p className="font-black text-lg text-slate-900 dark:text-slate-50 leading-none">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-none">{total > 0 ? `${Math.round(percentage)}%` : 'N/A'}</p>
          </div>
        </div>
      </div>
    </button>
  );
};

// Skeletons
const SkeletonBlock = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`} />
);

const Tabs: React.FC<{ active: string; onChange: (t: string) => void }> = ({ active, onChange }) => {
  const tabs = [
    { key: 'overview', label: 'Resumen', icon: 'dashboard' },
    { key: 'students', label: 'Estudiantes', icon: 'groups' },
    { key: 'institutions', label: 'Instituciones', icon: 'apartment' },
  ];
  return (
    <div className="mt-4">
      <div className="inline-flex p-1 rounded-xl border bg-white dark:bg-slate-800/50 dark:border-slate-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-800 ${
              active === t.key ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            aria-pressed={active === t.key}
          >
            <span className="material-icons !text-base">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </div>
    </div>
  );
};

interface MetricsDashboardProps {
  onStudentSelect?: (student: { legajo: string; nombre: string }) => void;
}

const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ onStudentSelect }) => {
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [proximosModalOpen, setProximosModalOpen] = useState(false);
  const [targetYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'institutions'>('overview');

  const openModal = useCallback((payload: ModalData) => setModalData(payload), []);
  const closeModal = useCallback(() => setModalData(null), []);

  const { data: metrics, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ['metricsDashboardData', targetYear],
    queryFn: () => fetchMetricsData(),
    select: (raw) => computeMetrics(raw, targetYear),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <EmptyState
          icon="error"
          title="Error al cargar métricas"
          message={(error as any).message}
          action={
            <button
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <span className="material-icons">refresh</span>
              Reintentar
            </button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <StudentListModal
        isOpen={!!modalData}
        onClose={closeModal}
        title={modalData?.title || ''}
        students={modalData?.students || []}
        headers={modalData?.headers}
        description={modalData?.description}
      />
      
      {metrics && (
        <StudentListModal
          isOpen={proximosModalOpen}
          onClose={() => setProximosModalOpen(false)}
          title="Alumnos Próximos a Finalizar"
          students={metrics.alumnosProximosAFinalizar.list}
          headers={[
              { key: 'nombre', label: 'Nombre' },
              { key: 'legajo', label: 'Legajo' },
              { key: 'totalHoras', label: 'Horas Totales' },
          ]}
          onStudentClick={(student) => {
              if (onStudentSelect) {
                  onStudentSelect({ legajo: student.legajo, nombre: student.nombre });
                  setProximosModalOpen(false);
              }
          }}
        />
      )}

      <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Dashboard de Resumen
          </h2>
          {isFetching && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              <span className="material-icons !text-base animate-spin-slow">autorenew</span>
              Actualizando
            </span>
          )}
      </div>

      <Tabs active={activeTab} onChange={(t) => setActiveTab(t as any)} />

      {/* HERO METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {isLoading || !metrics ? (
          <>
            <SkeletonBlock className="h-44" />
            <SkeletonBlock className="h-44" />
            <SkeletonBlock className="h-44" />
          </>
        ) : (
          <>
            <HeroMetric
              title="Cupos Ofrecidos"
              value={metrics.cuposOfrecidos.value}
              icon="supervisor_account"
              description={`El número con relevamiento profesional es: ${metrics.cuposTotalesConRelevamiento.value}`}
              onClick={() =>
                openModal({
                  title: `PPS Lanzadas (${targetYear})`,
                  students: metrics.ppsLanzadas.list,
                  headers: [
                    { key: 'nombre', label: 'Institución' },
                    { key: 'legajo', label: 'Info' },
                    { key: 'cupos', label: 'Cupos' },
                  ],
                })
              }
              color="indigo"
            />
            <HeroMetric
              title="Estudiantes Activos"
              value={metrics.alumnosActivos.value}
              icon="school"
              description="Total de estudiantes que aún no finalizan."
              onClick={() => openModal({ title: 'Estudiantes Activos', students: metrics.alumnosActivos.list })}
              color="blue"
            />
            <HeroMetric
              title="Alumnos Finalizados"
              value={metrics.alumnosFinalizados.value}
              icon="military_tech"
              description="Solicitaron acreditación final de PPS."
              onClick={() => openModal({ title: `Alumnos Finalizados (${targetYear})`, students: metrics.alumnosFinalizados.list })}
              color="emerald"
            />
          </>
        )}
      </div>

      {/* CONTENT TABS */}
      {isLoading || !metrics ? (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-80" />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card icon="filter_alt" title="Embudo de Estudiantes" description="Desglose de los estudiantes activos.">
                <div className="mt-4 space-y-2 divide-y divide-slate-200/60 dark:divide-slate-700/60">
                  <FunnelRow
                    label="Con PPS Activa"
                    value={metrics.alumnosEnPPS.value}
                    total={metrics.alumnosActivos.value}
                    color="bg-emerald-500"
                    description="Estudiantes con una práctica activa durante el ciclo."
                    onClick={() =>
                      openModal({
                        title: 'Alumnos con PPS Activa',
                        students: metrics.alumnosEnPPS.list,
                        headers: [
                          { key: 'nombre', label: 'Nombre' },
                          { key: 'legajo', label: 'Legajo' },
                          { key: 'institucion', label: 'Institución' },
                          { key: 'fechaFin', label: 'Finaliza' },
                        ],
                      })
                    }
                  />
                  <FunnelRow
                    label="Próximos a Finalizar"
                    value={metrics.alumnosProximosAFinalizar.value}
                    total={metrics.alumnosActivos.value}
                    color="bg-sky-500"
                    description="Con 230+ horas o con 250+ y práctica en curso."
                    onClick={() => setProximosModalOpen(true)}
                  />
                  <FunnelRow
                    label="Activos sin PPS (excl. Relevamiento)"
                    value={metrics.alumnosSinPPS.value}
                    total={metrics.alumnosActivos.value}
                    color="bg-amber-500"
                    description="Aún no tienen PPS de campo registrada."
                    onClick={() =>
                      openModal({
                        title: 'Alumnos sin PPS (excl. Relevamiento)',
                        students: metrics.alumnosSinPPS.list,
                      })
                    }
                  />
                  <FunnelRow
                    label="Activos sin NINGUNA PPS (Total)"
                    value={metrics.alumnosSinNingunaPPS.value}
                    total={metrics.alumnosActivos.value}
                    color="bg-rose-500"
                    description="No tienen ninguna práctica registrada (incl. Relevamiento)."
                    onClick={() =>
                      openModal({
                        title: 'Alumnos sin NINGUNA PPS (Total)',
                        students: metrics.alumnosSinNingunaPPS.list,
                      })
                    }
                  />
                </div>
              </Card>

              <Card icon="assessment" title="Análisis de PPS e Instituciones" description="Oferta, demanda y convenios.">
                <div className="space-y-6 mt-4">
                  <MetricCard
                    title="Convenios con Instituciones Nuevas"
                    value={metrics.nuevosConvenios.value}
                    icon="handshake"
                    description={`Instituciones nuevas con PPS lanzadas en ${targetYear}.`}
                    isLoading={false}
                    className="bg-slate-50/50 dark:bg-slate-800/50"
                    onClick={() =>
                      openModal({
                        title: `Convenios Con Instituciones Nuevas (${targetYear})`,
                        students: metrics.nuevosConvenios.list,
                        headers: [
                          { key: 'nombre', label: 'Institución' },
                          { key: 'cupos', label: 'Cupos Ofrecidos' },
                        ],
                      })
                    }
                  />
                  <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700">
                    <h3 className="font-bold text-slate-800 dark:text-slate-100 text-center mb-4">Últimas 5 PPS Lanzadas</h3>
                    <div className="space-y-3">
                        {(metrics.ultimas5Lanzadas as any[]).map((launch) => {
                            const especialidadVisuals = getEspecialidadClasses(launch[FIELD_ORIENTACION_LANZAMIENTOS]);
                            return (
                                <div key={launch.id} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-700 shadow-sm">
                                    <div className="flex-1 min-w-0">
                                        <p className="font-semibold text-slate-800 dark:text-slate-100 text-sm truncate">{launch[FIELD_NOMBRE_PPS_LANZAMIENTOS]}</p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400">{formatDate(launch[FIELD_FECHA_INICIO_LANZAMIENTOS])}</p>
                                    </div>
                                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                                        <span className={`${especialidadVisuals.tag} shadow-sm`}>{launch[FIELD_ORIENTACION_LANZAMIENTOS]}</span>
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-700 px-2 py-1 rounded-md">{launch[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]} cupos</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                  </div>
                </div>
              </Card>

              <Card icon="signal_cellular_alt" title="Distribución por Horas" description="Progreso de horas acumuladas de los estudiantes activos.">
                  <div className="mt-4">
                      <Histogram
                        data={metrics.distribucionHoras}
                        title="Distribución de Alumnos por Horas"
                        onBarClick={(label, students) =>
                          openModal({
                            title: `Alumnos en el rango: ${label}`,
                            students,
                            headers: [
                              { key: 'nombre', label: 'Nombre' },
                              { key: 'legajo', label: 'Legajo' },
                              { key: 'totalHoras', label: 'Horas Totales' },
                            ],
                          })
                        }
                      />
                  </div>
              </Card>
              <Card icon="groups" title="Población Estudiantil" description="Movimiento de la cohorte durante el ciclo.">
                  <div className="mt-4 p-4 bg-white dark:bg-slate-800/50 rounded-xl">
                    <div className="space-y-2">
                      <button
                        onClick={() =>
                          openModal({ title: `Alumnos al Inicio (${targetYear})`, students: metrics.alumnosInicioCiclo.list })
                        }
                        className="w-full p-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50 text-left transition-colors flex justify-between items-baseline group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
                      >
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-100">
                          Alumnos al inicio del ciclo
                        </span>
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-50 tracking-tighter">
                          {metrics.alumnosInicioCiclo.value}
                        </span>
                      </button>

                      <div className="border-t border-slate-200/70 dark:border-slate-700 mx-2" />

                      <button
                        onClick={() =>
                          openModal({
                            title: `Nuevos Ingresos (${targetYear})`,
                            students: metrics.nuevosAlumnos.list,
                            headers: [
                              { key: 'nombre', label: 'Nombre' },
                              { key: 'legajo', label: 'Legajo' },
                              { key: 'fechaIngreso', label: 'Fecha Ingreso' },
                            ],
                          })
                        }
                        className="w-full p-2 rounded-lg hover:bg-slate-100/70 dark:hover:bg-slate-700/50 text-left transition-colors flex justify-between items-baseline group focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300"
                      >
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium group-hover:text-slate-800 dark:group-hover:text-slate-100">
                          Nuevos ingresos en el ciclo
                        </span>
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-50 tracking-tighter">{metrics.nuevosAlumnos.value}</span>
                      </button>

                      <div className="border-t border-slate-200/70 dark:border-slate-700 mx-2" />

                      <div
                        className="w-full p-2 text-left flex justify-between items-baseline"
                        title="Máximo de estudiantes activos simultáneamente durante el ciclo."
                      >
                        <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">Pico de alumnos en el ciclo</span>
                        <span className="text-2xl font-black text-slate-800 dark:text-slate-50 tracking-tighter">{metrics.picoAlumnos.value}</span>
                      </div>
                    </div>
                  </div>
              </Card>
            </div>
          )}

          {activeTab === 'students' && (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card icon="group_work" title="Situación de Estudiantes" description="Accesos rápidos a cohortes específicas.">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <MetricCard
                    title="Con PPS Activa"
                    value={metrics.alumnosEnPPS.value}
                    icon="play_circle"
                    description="Actualmente cursando una práctica."
                    isLoading={false}
                    onClick={() =>
                      openModal({
                        title: 'Alumnos con PPS Activa',
                        students: metrics.alumnosEnPPS.list,
                        headers: [
                          { key: 'nombre', label: 'Nombre' },
                          { key: 'legajo', label: 'Legajo' },
                          { key: 'institucion', label: 'Institución' },
                          { key: 'fechaFin', label: 'Finaliza' },
                        ],
                      })
                    }
                  />
                  <MetricCard
                    title="Sin PPS (campo)"
                    value={metrics.alumnosSinPPS.value}
                    icon="hourglass_empty"
                    description="Sin PPS de campo registrada."
                    isLoading={false}
                    onClick={() => openModal({ title: 'Alumnos sin PPS (excl. Relevamiento)', students: metrics.alumnosSinPPS.list })}
                  />
                  <MetricCard
                    title="Sin ninguna PPS"
                    value={metrics.alumnosSinNingunaPPS.value}
                    icon="block"
                    description="Sin prácticas de ningún tipo."
                    isLoading={false}
                    onClick={() =>
                      openModal({ title: 'Alumnos sin NINGUNA PPS (Total)', students: metrics.alumnosSinNingunaPPS.list })
                    }
                  />
                  <MetricCard
                    title="Finalizados"
                    value={metrics.alumnosFinalizados.value}
                    icon="verified"
                    description="Solicitud de acreditación final."
                    isLoading={false}
                    onClick={() => openModal({ title: `Alumnos Finalizados (${targetYear})`, students: metrics.alumnosFinalizados.list })}
                  />
                </div>
              </Card>

              <Card icon="timer" title="Tiempos y Progreso" description="Tiempo medio hasta asignación y distribución de horas.">
                <div className="mt-4 space-y-6">
                  <MetricCard
                    title="Tiempo medio a PPS"
                    value={`${metrics.avgTimeToPlacement} días`}
                    icon="schedule"
                    description="Desde primera postulación a primera PPS."
                    isLoading={false}
                  />
                  <Histogram
                    data={metrics.distribucionHoras}
                    title="Distribución de Alumnos por Horas"
                    onBarClick={(label, students) =>
                      openModal({
                        title: `Alumnos en el rango: ${label}`,
                        students,
                        headers: [
                          { key: 'nombre', label: 'Nombre' },
                          { key: 'legajo', label: 'Legajo' },
                          { key: 'totalHoras', label: 'Horas Totales' },
                        ],
                      })
                    }
                  />
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'institutions' && (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card icon="apartment" title="Oferta de Campo" description="Cupos ofrecidos y PPS lanzadas.">
                <div className="mt-4 space-y-6">
                  <MetricCard
                    title="Cupos ofrecidos"
                    value={metrics.cuposOfrecidos.value}
                    icon="event_seat"
                    description={`El número con relevamiento profesional es: ${metrics.cuposTotalesConRelevamiento.value}`}
                    isLoading={false}
                    onClick={() =>
                      openModal({
                        title: `PPS Lanzadas (${targetYear})`,
                        students: metrics.ppsLanzadas.list,
                        headers: [
                          { key: 'nombre', label: 'Institución' },
                          { key: 'legajo', label: 'Info' },
                          { key: 'cupos', label: 'Cupos' },
                        ],
                      })
                    }
                  />
                   <MetricCard
                    title="Instituciones Activas"
                    value={metrics.activeInstitutions.value}
                    icon="business_center"
                    description={`Instituciones con PPS lanzadas en ${targetYear}.`}
                    isLoading={false}
                    onClick={() => openModal({
                        title: `Instituciones Activas (${targetYear})`,
                        students: metrics.activeInstitutions.list,
                        headers: [
                            { key: 'nombre', label: 'Institución' },
                            { key: 'legajo', label: 'Orientaciones' }
                        ]
                    })}
                  />
                  <BarChart
                    data={metrics.topInstitutions}
                    title="Top 5 Instituciones por Cupos"
                    onBarClick={(label) =>
                      openModal({
                        title: `Alumnos en ${label}`,
                        students: metrics.alumnosEnPPS.list.filter((s) => s.institucion === label),
                        headers: [
                          { key: 'nombre', label: 'Nombre' },
                          { key: 'legajo', label: 'Legajo' },
                          { key: 'fechaFin', label: 'Finaliza' },
                        ],
                      })
                    }
                  />
                </div>
              </Card>

              <Card icon="handshake" title="Convenios Con Instituciones Nuevas" description="Instituciones nuevas con PPS lanzadas este año.">
                  <div className="mt-4 space-y-2">
                      {metrics.nuevosConvenios.list.length > 0 ? metrics.nuevosConvenios.list.map((convenio) => (
                          <div
                              key={convenio.nombre}
                              className="flex items-center justify-between p-3 bg-white dark:bg-slate-800/50 rounded-lg border border-slate-200/60 dark:border-slate-700 shadow-sm"
                          >
                              <div className="flex items-center gap-3">
                                  <span className="material-icons text-emerald-500">verified</span>
                                  <span className="font-semibold text-slate-800 dark:text-slate-100 text-sm">{convenio.nombre}</span>
                              </div>
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200 bg-slate-200/80 dark:bg-slate-700 px-2 py-1 rounded-md">{convenio.cupos} cupos</span>
                          </div>
                      )) : (
                          <p className="text-center text-sm text-slate-500 dark:text-slate-400 py-4">No hay nuevos convenios para mostrar este año.</p>
                      )}
                  </div>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
};

export default MetricsDashboard;