import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { 
  Practica, SolicitudPPS, CriteriosCalculados, Orientacion, LanzamientoPPS, 
  Convocatoria, EstudianteFields, PracticaFields, SolicitudPPSFields, 
  LanzamientoPPSFields, ConvocatoriaFields, ALL_ORIENTACIONES, InformeTask
} from '../types';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION, ROTACION_OBJETIVO_ORIENTACIONES, AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, AIRTABLE_TABLE_NAME_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_NOTA_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS, AIRTABLE_TABLE_NAME_PPS, FIELD_LEGAJO_PPS, FIELD_EMPRESA_PPS_SOLICITUD, FIELD_ESTADO_PPS, FIELD_NOTAS_PPS, FIELD_ULTIMA_ACTUALIZACION_PPS, AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS, FIELD_DIRECCION_LANZAMIENTOS, FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS, FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_TERMINO_CURSAR_CONVOCATORIAS, FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS, FIELD_FINALES_ADEUDA_CONVOCATORIAS, FIELD_OTRA_SITUACION_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS as FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS, FIELD_DNI_CONVOCATORIAS, FIELD_CORREO_CONVOCATORIAS, FIELD_FECHA_NACIMIENTO_CONVOCATORIAS, FIELD_TELEFONO_CONVOCATORIAS, FIELD_LEGAJO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS, FIELD_NOMBRE_ESTUDIANTES, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_ESTADO_PRACTICA, FIELD_GENERO_ESTUDIANTES, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, FIELD_HORAS_ACREDITADAS_CONVOCATORIAS, FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS, FIELD_INFORME_LANZAMIENTOS, FIELD_INFORME_SUBIDO_CONVOCATORIAS, FIELD_NOMBRE_BUSQUEDA_PRACTICAS } from '../constants';
import { fetchAirtableData, updateAirtableRecord, createAirtableRecord, fetchAllAirtableData } from '../services/airtableService';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';
import type { AuthUser } from './AuthContext';
import { useModal } from './ModalContext';

type UserGender = 'masculino' | 'femenino' | 'neutro';

interface DataContextType {
  practicas: Practica[];
  solicitudes: SolicitudPPS[];
  lanzamientos: LanzamientoPPS[];
  myEnrollments: Convocatoria[];
  informeTasks: InformeTask[];
  criterios: CriteriosCalculados;
  selectedOrientacion: Orientacion | "";
  studentAirtableId: string | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  showSaveConfirmation: boolean;
  initialLoadCompleted: boolean;
  studentNameForPanel: string;
  studentDetails: EstudianteFields | null;
  userGender: UserGender;

  fetchStudentData: () => void;
  handleOrientacionChange: (orientacion: Orientacion | "") => void;
  handleNotaChange: (practicaId: string, nota: string) => void;
  handleConfirmarInforme: (convocatoriaId: string) => void;
  handleEnrollmentSubmit: (formData: any, selectedLanzamiento: LanzamientoPPS) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

const initialCriterios: CriteriosCalculados = {
    horasTotales: 0,
    horasFaltantes250: HORAS_OBJETIVO_TOTAL,
    cumpleHorasTotales: false,
    horasOrientacionElegida: 0,
    horasFaltantesOrientacion: HORAS_OBJETIVO_ORIENTACION,
    cumpleHorasOrientacion: false,
    orientacionesCursadasCount: 0,
    orientacionesUnicas: [],
    cumpleRotacion: false,
};

/**
 * Extracts the schedule part from a full string like "Device: Mon 9-12" -> "Mon 9-12"
 * @param fullSchedule The full schedule string.
 * @returns The extracted concise schedule.
 */
const extractSchedulePart = (fullSchedule: string): string => {
  if (!fullSchedule) return '';
  const parts = fullSchedule.split(':');
  if (parts.length > 1) {
    // Join all parts after the first colon to handle cases like "Time: 10:00 AM"
    return parts.slice(1).join(':').trim();
  }
  return fullSchedule;
};


export const DataProvider: React.FC<{ children: ReactNode, user: AuthUser }> = ({ children, user }) => {
  const [practicas, setPracticas] = useState<Practica[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudPPS[]>([]);
  const [lanzamientos, setLanzamientos] = useState<LanzamientoPPS[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Convocatoria[]>([]);
  const [informeTasks, setInformeTasks] = useState<InformeTask[]>([]);
  const [criterios, setCriterios] = useState<CriteriosCalculados>(initialCriterios);
  const [selectedOrientacion, setSelectedOrientacion] = useState<Orientacion | "">("");
  const [studentAirtableId, setStudentAirtableId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<EstudianteFields | null>(null);
  const [userGender, setUserGender] = useState<UserGender>('neutro');

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);
  const [studentNameForPanel, setStudentNameForPanel] = useState(user.nombre);

  const { showModal, closeEnrollmentForm, setEnrollingId } = useModal();

  const calculateCriterios = useCallback((allPracticas: Practica[], orientacionElegida: Orientacion | "") => {
      const horasTotales = allPracticas.reduce((acc, p) => acc + (p[FIELD_HORAS_PRACTICAS] || 0), 0);
      const cumpleHorasTotales = horasTotales >= HORAS_OBJETIVO_TOTAL;

      const practicasConOrientacionValida = allPracticas
        .map(p => p[FIELD_ESPECIALIDAD_PRACTICAS])
        .filter((o): o is string => !!o);

      const orientacionesUnicas = ALL_ORIENTACIONES.filter(canonicalOrientacion => {
          const normalizedCanonical = normalizeStringForComparison(canonicalOrientacion);
          return practicasConOrientacionValida.some(practicaOrientacion => 
              normalizeStringForComparison(practicaOrientacion) === normalizedCanonical
          );
      });

      const orientacionesCursadasCount = orientacionesUnicas.length;
      const cumpleRotacion = orientacionesCursadasCount >= ROTACION_OBJETIVO_ORIENTACIONES;

      let horasOrientacionElegida = 0;
      if (orientacionElegida) {
          horasOrientacionElegida = allPracticas
              .filter(p => normalizeStringForComparison(p[FIELD_ESPECIALIDAD_PRACTICAS]) === normalizeStringForComparison(orientacionElegida))
              .reduce((acc, p) => acc + (p[FIELD_HORAS_PRACTICAS] || 0), 0);
      }
      const cumpleHorasOrientacion = horasOrientacionElegida >= HORAS_OBJETIVO_ORIENTACION;
      
      setCriterios({
          horasTotales,
          horasFaltantes250: Math.max(0, HORAS_OBJETIVO_TOTAL - horasTotales),
          cumpleHorasTotales,
          horasOrientacionElegida,
          horasFaltantesOrientacion: Math.max(0, HORAS_OBJETIVO_ORIENTACION - horasOrientacionElegida),
          cumpleHorasOrientacion,
          orientacionesCursadasCount,
          orientacionesUnicas,
          cumpleRotacion,
      });
  }, []);

  const fetchStudentData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(
          AIRTABLE_TABLE_NAME_ESTUDIANTES, [], `{${FIELD_LEGAJO_ESTUDIANTES}} = '${user.legajo}'`, 1
      );
      if (studentError) throw new Error(`Error al buscar estudiante: ${typeof studentError.error === 'string' ? studentError.error : studentError.error.message}`);
      if (studentRecords.length === 0) throw new Error('No se encontró al estudiante con el legajo proporcionado.');
      
      const student = studentRecords[0];
      setStudentAirtableId(student.id);
      setSelectedOrientacion((student.fields[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] as Orientacion) || "");
      setStudentNameForPanel(student.fields[FIELD_NOMBRE_ESTUDIANTES] || user.nombre);
      setStudentDetails(student.fields);
      const gender = student.fields[FIELD_GENERO_ESTUDIANTES];
      if (gender === 'Mujer') setUserGender('femenino');
      else if (gender === 'Varon') setUserGender('masculino');
      else setUserGender('neutro');

      // Fetch related data in parallel
      const [practicasRes, ppsRes, convocatoriasRes, lanzamientosRes] = await Promise.all([
        fetchAllAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [], `{${FIELD_NOMBRE_BUSQUEDA_PRACTICAS}} = '${user.legajo}'`),
        fetchAirtableData<SolicitudPPSFields>(AIRTABLE_TABLE_NAME_PPS, [], `{${FIELD_LEGAJO_PPS}} = '${user.legajo}'`, 50, [{ field: FIELD_ULTIMA_ACTUALIZACION_PPS, direction: 'desc' }]),
        fetchAllAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS], `{${FIELD_LEGAJO_CONVOCATORIAS}} = ${user.legajo}`),
        fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [], undefined, [{field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc'}])
      ]);

      if (practicasRes.error) throw new Error('Error al cargar prácticas.');
      if (ppsRes.error) throw new Error('Error al cargar solicitudes de PPS.');
      if (convocatoriasRes.error) throw new Error('Error al cargar convocatorias.');
      if (lanzamientosRes.error) throw new Error('Error al cargar lanzamientos.');

      const allPracticas = practicasRes.records.map(r => ({ ...r.fields, id: r.id }));
      setPracticas(allPracticas);
      setSolicitudes(ppsRes.records.map(r => ({ ...r.fields, id: r.id })));
      
      const myEnrollmentsData = convocatoriasRes.records.map(r => ({ ...r.fields, id: r.id }));
      setMyEnrollments(myEnrollmentsData);

      const allLanzamientos = lanzamientosRes.records.map(r => ({ ...r.fields, id: r.id }));

      const openLanzamientos = allLanzamientos.filter(l => {
          const status = normalizeStringForComparison(l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
          
          if (status === 'abierta' || status === 'abierto') {
              return true;
          }
      
          const endDateString = l[FIELD_FECHA_FIN_LANZAMIENTOS];
          if (!status && endDateString) {
              const today = new Date();
              today.setHours(0, 0, 0, 0); // Normalize today to the start of the day
              
              const endDate = parseToUTCDate(endDateString);
              
              if (endDate) { // Check if endDate is not null (i.e., parsing was successful)
                  return endDate.getTime() >= today.getTime();
              }
          }
      
          return false;
      });
      setLanzamientos(openLanzamientos);

      const informeTasksData = myEnrollmentsData
        .map((enrollment): InformeTask | null => {
          const enrollmentStatus = normalizeStringForComparison(enrollment[FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS]);
          if (!enrollmentStatus.includes('seleccionado')) {
            return null;
          }
          
          const lanzamientoId = (enrollment[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
          if (!lanzamientoId) return null;

          const lanzamiento = allLanzamientos.find(l => l.id === lanzamientoId);
          if (!lanzamiento || !lanzamiento[FIELD_INFORME_LANZAMIENTOS] || !lanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS]) {
            return null;
          }
          
          const practicaVinculada = allPracticas.find(p => {
              const ppsNameRaw = p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
              const ppsName = Array.isArray(ppsNameRaw) ? ppsNameRaw[0] : ppsNameRaw;

              const practicaStartDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
              const lanzamientoStartDate = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);
              
              const isNameMatch = normalizeStringForComparison(ppsName) === normalizeStringForComparison(lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]);
              
              let isDateMatch = false;
              if (practicaStartDate && lanzamientoStartDate) {
                  isDateMatch = practicaStartDate.getTime() === lanzamientoStartDate.getTime();
              }

              return isNameMatch && isDateMatch;
          });
          
          const nota = practicaVinculada ? (practicaVinculada[FIELD_NOTA_PRACTICAS] || 'Sin calificar') : 'Sin calificar';

          return {
              convocatoriaId: enrollment.id,
              ppsName: lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Práctica sin nombre',
              informeLink: lanzamiento[FIELD_INFORME_LANZAMIENTOS],
              fechaFinalizacion: lanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS],
              informeSubido: !!enrollment[FIELD_INFORME_SUBIDO_CONVOCATORIAS],
              nota: nota,
          };
        })
        .filter((task): task is InformeTask => task !== null)
        .sort((a, b) => new Date(a.fechaFinalizacion).getTime() - new Date(b.fechaFinalizacion).getTime());

      setInformeTasks(informeTasksData);

      calculateCriterios(allPracticas, (student.fields[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] as Orientacion) || "");
      
    } catch (e: any) {
      setError(e.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsLoading(false);
      setInitialLoadCompleted(true);
    }
  }, [user.legajo, user.nombre, calculateCriterios]);

  const handleOrientacionChange = useCallback(async (orientacion: Orientacion | "") => {
    setSelectedOrientacion(orientacion);
    if (studentAirtableId) {
      const { error } = await updateAirtableRecord(
        AIRTABLE_TABLE_NAME_ESTUDIANTES,
        studentAirtableId,
        { [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: orientacion || null }
      );
      if (!error) {
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 2000);
        calculateCriterios(practicas, orientacion);
      } else {
        showModal('Error', 'No se pudo guardar tu orientación. Inténtalo de nuevo.');
      }
    }
  }, [studentAirtableId, practicas, calculateCriterios, showModal]);

  const handleNotaChange = useCallback(async (practicaId: string, nota: string) => {
    const valueToSend = nota === 'Sin calificar' ? null : nota;
    const { error } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_PRACTICAS, practicaId, {
      [FIELD_NOTA_PRACTICAS]: valueToSend
    });

    if (!error) {
      setPracticas(prev => prev.map(p => p.id === practicaId ? { ...p, [FIELD_NOTA_PRACTICAS]: nota } : p));
    } else {
      showModal('Error', 'No se pudo actualizar la nota.');
    }
  }, [showModal]);

  const handleConfirmarInforme = useCallback(async (convocatoriaId: string) => {
    const { error } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_CONVOCATORIAS, convocatoriaId, {
        [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true
    });
    
    if (error) {
        showModal('Error', 'No se pudo confirmar la entrega. Inténtalo de nuevo.');
    } else {
        showModal('Confirmación Exitosa', 'Se ha registrado la entrega de tu informe. Ahora pasará a corrección.');
        fetchStudentData(); // Refetch to update status
    }
  }, [showModal, fetchStudentData]);

  const handleEnrollmentSubmit = useCallback(async (formData: any, selectedLanzamiento: LanzamientoPPS) => {
    if (!studentAirtableId || !studentDetails) {
        showModal('Error', 'No se pudo identificar al estudiante. Por favor, recarga la página.');
        return;
    }
    
    setIsSubmitting(true);
    setEnrollingId(selectedLanzamiento.id);
    
    // The 'Fecha de Inicio' and 'Fecha de Finalización' fields are now native Airtable Date types.
    // The Airtable API always provides and expects dates in 'YYYY-MM-DD' format for these fields, regardless of the UI display format.
    // Therefore, we directly transfer the date strings from the Lanzamiento record to the new Convocatoria record without any conversion.
    const fechaInicio = selectedLanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS];
    const fechaFin = selectedLanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS];

    // Determine the selected schedule string
    const horarioSeleccionado = Array.isArray(formData.horarios) && formData.horarios.length > 0
      ? formData.horarios.join(', ')
      : selectedLanzamiento[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS] || 'No especificado';
      
    // Create new record for Convocatorias
    const newRecord: Partial<ConvocatoriaFields> = {
        [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [selectedLanzamiento.id],
        [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: [studentAirtableId],
        [FIELD_NOMBRE_PPS_CONVOCATORIAS]: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS],
        [FIELD_FECHA_INICIO_CONVOCATORIAS]: fechaInicio,
        [FIELD_FECHA_FIN_CONVOCATORIAS]: fechaFin,
        [FIELD_DIRECCION_CONVOCATORIAS]: selectedLanzamiento[FIELD_DIRECCION_LANZAMIENTOS],
        [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: horarioSeleccionado,
        [FIELD_ORIENTACION_CONVOCATORIAS]: selectedLanzamiento[FIELD_ORIENTACION_LANZAMIENTOS],
        [FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: selectedLanzamiento[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS],
        [FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS]: selectedLanzamiento[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS],
        [FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS]: 'Inscripto',
        // Copy student details
        [FIELD_LEGAJO_CONVOCATORIAS]: studentDetails[FIELD_LEGAJO_ESTUDIANTES] ? parseInt(studentDetails[FIELD_LEGAJO_ESTUDIANTES], 10) : undefined,
        [FIELD_DNI_CONVOCATORIAS]: studentDetails[FIELD_DNI_ESTUDIANTES] ? String(studentDetails[FIELD_DNI_ESTUDIANTES]) : undefined,
        [FIELD_CORREO_CONVOCATORIAS]: studentDetails[FIELD_CORREO_ESTUDIANTES],
        [FIELD_FECHA_NACIMIENTO_CONVOCATORIAS]: studentDetails[FIELD_FECHA_NACIMIENTO_ESTUDIANTES],
        [FIELD_TELEFONO_CONVOCATORIAS]: studentDetails[FIELD_TELEFONO_ESTUDIANTES],
        // Form data
        [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: formData.terminoDeCursar ? 'Sí' : 'No',
        [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: formData.cursandoElectivas ? 'Sí' : 'No',
        [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: formData.finalesAdeudados || null,
        [FIELD_OTRA_SITUACION_CONVOCATORIAS]: formData.otraSituacionAcademica,
    };

    const { record, error } = await createAirtableRecord<ConvocatoriaFields>(
        AIRTABLE_TABLE_NAME_CONVOCATORIAS,
        newRecord
    );
    
    setIsSubmitting(false);
    setEnrollingId(null);
    
    if (error) {
        showModal('Error en la Inscripción', `No se pudo completar tu inscripción. Por favor, inténtalo de nuevo. Error: ${typeof error.error === 'string' ? error.error : error.error.message}`);
    } else {
        closeEnrollmentForm();
        showModal('¡Inscripción Exitosa!', 'Tu postulación ha sido enviada correctamente. Recibirás un correo con la confirmación.');
        // Refetch data to show the new enrollment status
        fetchStudentData();
    }

  }, [studentAirtableId, studentDetails, showModal, closeEnrollmentForm, setEnrollingId, fetchStudentData]);

  const value = {
    practicas,
    solicitudes,
    lanzamientos,
    myEnrollments,
    informeTasks,
    criterios,
    selectedOrientacion,
    studentAirtableId,
    isLoading,
    isSubmitting,
    error,
    showSaveConfirmation,
    initialLoadCompleted,
    studentNameForPanel,
    studentDetails,
    userGender,
    
    fetchStudentData,
    handleOrientacionChange,
    handleNotaChange,
    handleConfirmarInforme,
    handleEnrollmentSubmit,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
