import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { 
  Practica, SolicitudPPS, CriteriosCalculados, Orientacion, LanzamientoPPS, 
  Convocatoria, EstudianteFields, PracticaFields, SolicitudPPSFields, 
  LanzamientoPPSFields, ConvocatoriaFields, ALL_ORIENTACIONES
} from '../types';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION, ROTACION_OBJETIVO_ORIENTACIONES, AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, AIRTABLE_TABLE_NAME_PRACTICAS, FIELD_NOMBRE_BUSQUEDA_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_NOTA_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS, AIRTABLE_TABLE_NAME_PPS, FIELD_LEGAJO_PPS, FIELD_EMPRESA_PPS_SOLICITUD, FIELD_ESTADO_PPS, FIELD_NOTAS_PPS, FIELD_ULTIMA_ACTUALIZACION_PPS, AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS, FIELD_DIRECCION_LANZAMIENTOS, FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS, FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_TERMINO_CURSAR_CONVOCATORIAS, FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS, FIELD_FINALES_ADEUDA_CONVOCATORIAS, FIELD_OTRA_SITUACION_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_DNI_CONVOCATORIAS, FIELD_CORREO_CONVOCATORIAS, FIELD_FECHA_NACIMIENTO_CONVOCATORIAS, FIELD_TELEFONO_CONVOCATORIAS, FIELD_LEGAJO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS, FIELD_NOMBRE_ESTUDIANTES, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_ESTADO_PRACTICA, FIELD_GENERO_ESTUDIANTES, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, FIELD_HORAS_ACREDITADAS_CONVOCATORIAS, FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS } from '../constants';
import { fetchAirtableData, updateAirtableRecord, createAirtableRecord } from '../services/airtableService';
import { normalizeStringForComparison } from '../utils/formatters';
import type { AuthUser } from './AuthContext';

type UserGender = 'masculino' | 'femenino' | 'neutro';
interface DataContextType {
  practicas: Practica[];
  solicitudes: SolicitudPPS[];
  lanzamientos: LanzamientoPPS[];
  myEnrollments: Convocatoria[];
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

  fetchStudentData: (legajo?: string, nombre?: string) => void;
  handleOrientacionChange: (orientacion: Orientacion | "") => void;
  handleNotaChange: (practicaId: string, nota: string) => void;
  
  // Enrollment form state and handlers
  isEnrollmentFormOpen: boolean;
  enrollingId: string | null;
  selectedLanzamientoForEnrollment: LanzamientoPPS | null;
  handleInscribir: (lanzamiento: LanzamientoPPS) => void;
  closeEnrollmentForm: () => void;
  handleEnrollmentSubmit: (formData: any) => void;

  // Modal State
  modalInfo: { title: string; message: string } | null;
  showModal: (title: string, message: string) => void;
  closeModal: () => void;
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
  const [criterios, setCriterios] = useState<CriteriosCalculados>(initialCriterios);
  const [selectedOrientacion, setSelectedOrientacion] = useState<Orientacion | "">("");
  const [studentAirtableId, setStudentAirtableId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<EstudianteFields | null>(null);
  const [userGender, setUserGender] = useState<UserGender>('neutro');

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);
  const [studentNameForPanel, setStudentNameForPanel] = useState(user.nombre);

  const [isEnrollmentFormOpen, setIsEnrollmentFormOpen] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [selectedLanzamientoForEnrollment, setSelectedLanzamientoForEnrollment] = useState<LanzamientoPPS | null>(null);
  
  const [modalInfo, setModalInfo] = useState<{ title: string; message: string; } | null>(null);

  const showModal = (title: string, message: string) => setModalInfo({ title, message });
  const closeModal = () => setModalInfo(null);

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
          const studentFieldsToFetch = [
            FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES,
            FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES,
            FIELD_TELEFONO_ESTUDIANTES, FIELD_GENERO_ESTUDIANTES
          ];
          const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(
              AIRTABLE_TABLE_NAME_ESTUDIANTES,
              studentFieldsToFetch,
              `{${FIELD_LEGAJO_ESTUDIANTES}} = '${user.legajo}'`,
              1
          );
          if (studentError || studentRecords.length === 0) throw new Error("No se pudo encontrar la información del estudiante.");

          const studentRecord = studentRecords[0];
          const studentId = studentRecord.id;
          const studentName = studentRecord.fields[FIELD_NOMBRE_ESTUDIANTES] || user.nombre;
          const orientacionElegida = (studentRecord.fields[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] as Orientacion) || "";

          setStudentAirtableId(studentId);
          setStudentNameForPanel(studentName);
          setSelectedOrientacion(orientacionElegida);
          setStudentDetails(studentRecord.fields);
          
          const existingAirtableGender = studentRecord.fields[FIELD_GENERO_ESTUDIANTES] as string | undefined;
          let genderToSet: UserGender = 'neutro'; // Default to neutro

          if (existingAirtableGender) {
              const lowerGender = existingAirtableGender.toLowerCase().trim();
              if (lowerGender === 'varon') {
                  genderToSet = 'masculino';
              } else if (lowerGender === 'mujer') {
                  genderToSet = 'femenino';
              }
          }
          // If the field is empty or has a value other than 'varon' or 'mujer', it defaults to 'neutro'
          setUserGender(genderToSet);

          const lanzamientosFieldsToFetch = [
              FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS, FIELD_DIRECCION_LANZAMIENTOS,
              FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS,
              FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
              FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
          ];

          const [practicasResult, solicitudesResult, lanzamientosResult, enrollmentsResult] = await Promise.all([
              fetchAirtableData<PracticaFields>(
                  AIRTABLE_TABLE_NAME_PRACTICAS, 
                  [FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_FECHA_INICIO_PRACTICAS, FIELD_FECHA_FIN_PRACTICAS, FIELD_ESTADO_PRACTICA, FIELD_NOTA_PRACTICAS], 
                  `{${FIELD_NOMBRE_BUSQUEDA_PRACTICAS}} = '${studentName}'`
              ),
              fetchAirtableData<SolicitudPPSFields>(
                  AIRTABLE_TABLE_NAME_PPS, 
                  [FIELD_EMPRESA_PPS_SOLICITUD, FIELD_ESTADO_PPS, FIELD_NOTAS_PPS, FIELD_ULTIMA_ACTUALIZACION_PPS], 
                  `{${FIELD_LEGAJO_PPS}} = '${user.legajo}'`
              ),
              fetchAirtableData<LanzamientoPPSFields>(
                  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, 
                  lanzamientosFieldsToFetch,
                  `OR(OR({${FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS}} = 'Abierta', {${FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS}} = 'Abierto'), {${FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS}} = 'Cerrado')`
              ),
              fetchAirtableData<ConvocatoriaFields>(
                  AIRTABLE_TABLE_NAME_CONVOCATORIAS, 
                  [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS], 
                  `{${FIELD_LEGAJO_CONVOCATORIAS}} = ${user.legajo}`
              ),
          ]);
          
          if (practicasResult.error) console.error("Error fetching practicas:", practicasResult.error);
          const practicasData = practicasResult.records.map(r => ({ ...r.fields, id: r.id })) as Practica[];
          setPracticas(practicasData);

          if (solicitudesResult.error) console.error("Error fetching solicitudes:", solicitudesResult.error);
          const solicitudesData = solicitudesResult.records.map(r => ({ ...r.fields, id: r.id })) as SolicitudPPS[];
          setSolicitudes(solicitudesData);

          if (lanzamientosResult.error) console.error("Error fetching lanzamientos:", lanzamientosResult.error);
          const lanzamientosData = lanzamientosResult.records.map(r => ({ ...r.fields, id: r.id })) as LanzamientoPPS[];
          setLanzamientos(lanzamientosData);

          if (enrollmentsResult.error) console.error("Error fetching enrollments:", enrollmentsResult.error);
          const enrollmentsData = enrollmentsResult.records.map(r => ({ ...r.fields, id: r.id })) as Convocatoria[];
          setMyEnrollments(enrollmentsData);
          
          calculateCriterios(practicasData, orientacionElegida);

      } catch (e: any) {
          setError(e.message || "Ocurrió un error inesperado al cargar los datos.");
          console.error(e);
      } finally {
          setIsLoading(false);
          setInitialLoadCompleted(true);
      }
  }, [user.legajo, user.nombre, calculateCriterios]);

  const handleOrientacionChange = useCallback(async (orientacion: Orientacion | "") => {
    setSelectedOrientacion(orientacion);
    calculateCriterios(practicas, orientacion);
    if (studentAirtableId) {
        const { error } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_ESTUDIANTES, studentAirtableId, {
            [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: orientacion || null
        });
        if (error) {
            showModal('Error', 'No se pudo guardar la orientación seleccionada.');
        } else {
            setShowSaveConfirmation(true);
            setTimeout(() => setShowSaveConfirmation(false), 2000);
        }
    }
}, [practicas, studentAirtableId, calculateCriterios]);

  const handleNotaChange = useCallback(async (practicaId: string, nota: string) => {
    const updatedPracticas = practicas.map(p => p.id === practicaId ? { ...p, [FIELD_NOTA_PRACTICAS]: nota } : p);
    setPracticas(updatedPracticas);
    const { error } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_PRACTICAS, practicaId, { [FIELD_NOTA_PRACTICAS]: nota });
    if (error) {
        showModal('Error', `No se pudo guardar la nota para la práctica. ${typeof error.error === 'string' ? error.error : error.error.message}`);
        setPracticas(practicas); // Revert on error
    }
  }, [practicas]);

  const handleInscribir = useCallback((lanzamiento: LanzamientoPPS) => {
      setSelectedLanzamientoForEnrollment(lanzamiento);
      setIsEnrollmentFormOpen(true);
  }, []);

  const closeEnrollmentForm = useCallback(() => {
      setIsEnrollmentFormOpen(false);
      setSelectedLanzamientoForEnrollment(null);
      setEnrollingId(null);
  }, []);

  const handleEnrollmentSubmit = useCallback(async (formData: any) => {
      if (!selectedLanzamientoForEnrollment || !studentAirtableId || !studentDetails) {
        showModal('Error', 'No se puede procesar la inscripción. Faltan datos del estudiante o de la convocatoria.');
        return;
      }
      
      setIsSubmitting(true);
      setEnrollingId(selectedLanzamientoForEnrollment.id);

      try {
          const conciseHorarios = formData.horarios
              .map(extractSchedulePart)
              .join(', ');
          
          const enrollmentData: Partial<ConvocatoriaFields> = {
            [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [selectedLanzamientoForEnrollment.id],
            [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: [studentAirtableId],
            [FIELD_NOMBRE_PPS_CONVOCATORIAS]: selectedLanzamientoForEnrollment[FIELD_NOMBRE_PPS_LANZAMIENTOS],
            [FIELD_FECHA_INICIO_CONVOCATORIAS]: selectedLanzamientoForEnrollment[FIELD_FECHA_INICIO_LANZAMIENTOS],
            [FIELD_FECHA_FIN_CONVOCATORIAS]: selectedLanzamientoForEnrollment[FIELD_FECHA_FIN_LANZAMIENTOS],
            [FIELD_DIRECCION_CONVOCATORIAS]: selectedLanzamientoForEnrollment[FIELD_DIRECCION_LANZAMIENTOS],
            [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: conciseHorarios,
            [FIELD_ORIENTACION_CONVOCATORIAS]: selectedLanzamientoForEnrollment[FIELD_ORIENTACION_LANZAMIENTOS],
            [FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: selectedLanzamientoForEnrollment[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS],
            [FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS]: selectedLanzamientoForEnrollment[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS],
            [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Inscripto',
            [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: formData.terminoDeCursar ? 'Sí' : 'No',
            [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: formData.terminoDeCursar === false ? (formData.cursandoElectivas ? 'Sí' : 'No') : undefined,
            [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: formData.finalesAdeudados || undefined,
            [FIELD_OTRA_SITUACION_CONVOCATORIAS]: formData.otraSituacionAcademica,
            [FIELD_DNI_CONVOCATORIAS]: studentDetails[FIELD_DNI_ESTUDIANTES],
            [FIELD_CORREO_CONVOCATORIAS]: studentDetails[FIELD_CORREO_ESTUDIANTES],
            [FIELD_FECHA_NACIMIENTO_CONVOCATORIAS]: studentDetails[FIELD_FECHA_NACIMIENTO_ESTUDIANTES],
            [FIELD_TELEFONO_CONVOCATORIAS]: studentDetails[FIELD_TELEFONO_ESTUDIANTES],
            [FIELD_LEGAJO_CONVOCATORIAS]: user.legajo ? parseInt(user.legajo, 10) : undefined,
          };

          const { record, error } = await createAirtableRecord(AIRTABLE_TABLE_NAME_CONVOCATORIAS, enrollmentData);
          if (error || !record) throw new Error(typeof error?.error === 'string' ? error.error : error?.error.message || 'La inscripción no se pudo completar.');

          setMyEnrollments(prev => [...prev, { ...record.fields as Convocatoria, id: record.id }]);
          closeEnrollmentForm();
          showModal('¡Inscripción Exitosa!', 'Tu postulación ha sido enviada correctamente. Recibirás novedades por correo.');

      } catch (e: any) {
          showModal('Error en la Inscripción', e.message);
      } finally {
          setIsSubmitting(false);
          setEnrollingId(null);
      }
  }, [selectedLanzamientoForEnrollment, studentAirtableId, studentDetails, user.legajo]);

  const value: DataContextType = {
    practicas,
    solicitudes,
    lanzamientos,
    myEnrollments,
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
    isEnrollmentFormOpen,
    enrollingId,
    selectedLanzamientoForEnrollment,
    handleInscribir,
    closeEnrollmentForm,
    handleEnrollmentSubmit,
    modalInfo,
    showModal,
    closeModal,
  };

  return (
    <DataContext.Provider value={value}>
      {children}
    </DataContext.Provider>
  );
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};
