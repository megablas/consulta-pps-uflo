import React, { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { 
  Practica, SolicitudPPS, CriteriosCalculados, Orientacion, LanzamientoPPS, 
  Convocatoria, EstudianteFields, PracticaFields, SolicitudPPSFields, 
  LanzamientoPPSFields, ConvocatoriaFields, ALL_ORIENTACIONES
} from '../types';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION, ROTACION_OBJETIVO_ORIENTACIONES, AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, AIRTABLE_TABLE_NAME_PRACTICAS, FIELD_NOMBRE_BUSQUEDA_PRACTICAS, FIELD_HORAS_PRACTICAS, FIELD_NOTA_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS, AIRTABLE_TABLE_NAME_PPS, FIELD_LEGAJO_PPS, FIELD_EMPRESA_PPS_SOLICITUD, FIELD_ESTADO_PPS, FIELD_NOTAS_PPS, FIELD_ULTIMA_ACTUALIZACION_PPS, AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS, FIELD_DIRECCION_LANZAMIENTOS, FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS, FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_TERMINO_CURSAR_CONVOCATORIAS, FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS, FIELD_FINALES_ADEUDA_CONVOCATORIAS, FIELD_OTRA_SITUACION_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_DNI_CONVOCATORIAS, FIELD_CORREO_CONVOCATORIAS, FIELD_FECHA_NACIMIENTO_CONVOCATORIAS, FIELD_TELEFONO_CONVOCATORIAS, FIELD_LEGAJO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS } from '../constants';
import { fetchAirtableData, updateAirtableRecord, createAirtableRecord } from '../services/airtableService';
import { normalizeStringForComparison } from '../utils/formatters';
import type { AuthUser } from './AuthContext';

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

export const DataProvider: React.FC<{ children: ReactNode, user: AuthUser }> = ({ children, user }) => {
  const [practicas, setPracticas] = useState<Practica[]>([]);
  const [solicitudes, setSolicitudes] = useState<SolicitudPPS[]>([]);
  const [lanzamientos, setLanzamientos] = useState<LanzamientoPPS[]>([]);
  const [myEnrollments, setMyEnrollments] = useState<Convocatoria[]>([]);
  const [criterios, setCriterios] = useState<CriteriosCalculados>(initialCriterios);
  const [selectedOrientacion, setSelectedOrientacion] = useState<Orientacion | "">("");
  const [studentAirtableId, setStudentAirtableId] = useState<string | null>(null);
  const [studentNameForPanel, setStudentNameForPanel] = useState<string>(user.nombre);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [initialLoadCompleted, setInitialLoadCompleted] = useState(false);
  
  const [isEnrollmentFormOpen, setIsEnrollmentFormOpen] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [selectedLanzamientoForEnrollment, setSelectedLanzamientoForEnrollment] = useState<LanzamientoPPS | null>(null);
  const [modalInfo, setModalInfo] = useState<{ title: string; message: string } | null>(null);

  const showModal = (title: string, message: string) => setModalInfo({ title, message });
  const closeModal = () => setModalInfo(null);

  const calculateCriterios = useCallback((currentPracticas: Practica[], currentOrientacion: Orientacion | "") => {
    let totalHoras = 0;
    const matchedNormalizedOrientacionesEnumSet = new Set<string>();

    currentPracticas.forEach(p => {
      totalHoras += p[FIELD_HORAS_PRACTICAS] || 0;
      const especialidadPractica = p[FIELD_ESPECIALIDAD_PRACTICAS];

      if (especialidadPractica) {
        const normalizedEspecialidadFromPractice = normalizeStringForComparison(especialidadPractica); 
        for (const orientacionEnumValue of ALL_ORIENTACIONES) {
          if (normalizeStringForComparison(orientacionEnumValue) === normalizedEspecialidadFromPractice) {
            matchedNormalizedOrientacionesEnumSet.add(normalizeStringForComparison(orientacionEnumValue)); 
            break;
          }
        }
      }
    });

    let horasEnOrientacion = 0;
    if (currentOrientacion) {
      const normalizedSelectedActualOrientacion = normalizeStringForComparison(currentOrientacion); 
      currentPracticas.forEach(p => {
        const especialidadPractica = p[FIELD_ESPECIALIDAD_PRACTICAS];
        if (especialidadPractica) {
            const normalizedEspecialidadFromPractice = normalizeStringForComparison(especialidadPractica);
            if (normalizedEspecialidadFromPractice === normalizedSelectedActualOrientacion) {
              horasEnOrientacion += p[FIELD_HORAS_PRACTICAS] || 0;
            }
        }
      });
    }
    
    const horasFaltantesOrientacion = Math.max(0, HORAS_OBJETIVO_ORIENTACION - horasEnOrientacion);

    const newCriterios: CriteriosCalculados = {
      horasTotales: totalHoras,
      horasFaltantes250: Math.max(0, HORAS_OBJETIVO_TOTAL - totalHoras),
      cumpleHorasTotales: totalHoras >= HORAS_OBJETIVO_TOTAL,
      horasOrientacionElegida: horasEnOrientacion,
      horasFaltantesOrientacion: horasFaltantesOrientacion,
      cumpleHorasOrientacion: currentOrientacion ? horasEnOrientacion >= HORAS_OBJETIVO_ORIENTACION : false,
      orientacionesCursadasCount: matchedNormalizedOrientacionesEnumSet.size,
      orientacionesUnicas: Array.from(matchedNormalizedOrientacionesEnumSet).map(normalizedEnum => {
        const originalEnumValue = ALL_ORIENTACIONES.find(o => normalizeStringForComparison(o) === normalizedEnum);
        return originalEnumValue || (normalizedEnum.charAt(0).toUpperCase() + normalizedEnum.slice(1));
      }),
      cumpleRotacion: matchedNormalizedOrientacionesEnumSet.size >= ROTACION_OBJETIVO_ORIENTACIONES,
    };
    setCriterios(newCriterios);
  }, []);

  useEffect(() => {
    calculateCriterios(practicas, selectedOrientacion);
  }, [practicas, selectedOrientacion, calculateCriterios]);

  const resetStateForDataFetch = () => {
    setPracticas([]);
    setSolicitudes([]);
    setLanzamientos([]);
    setMyEnrollments([]);
    setSelectedOrientacion("");
    setStudentAirtableId(null);
    setCriterios(initialCriterios);
    setError(null);
  };
  
  const fetchStudentData = useCallback(async (searchLegajo?: string, searchName?: string) => {
    setIsLoading(true);
    resetStateForDataFetch();

    const legajoToFetch = searchLegajo || user.legajo;
    
    try {
        const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(
            AIRTABLE_TABLE_NAME_ESTUDIANTES,
            [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, 'Nombre'],
            `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajoToFetch}'`, 1
        );
        if (studentError) {
          const message = typeof studentError.error === 'string' ? studentError.error : studentError.error.message;
          throw new Error(`Error al buscar estudiante: ${message}`);
        }
        
        let studentName = searchName || user.nombre;
        let studentId: string | null = null;
        
        if (studentRecords.length > 0) {
            const studentRecord = studentRecords[0];
            studentId = studentRecord.id;
            studentName = studentRecord.fields['Nombre'] || studentName;
            setStudentAirtableId(studentId);
            setStudentNameForPanel(studentName);
            const savedOrientacion = studentRecord.fields[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] as Orientacion | "";
            if (savedOrientacion) setSelectedOrientacion(savedOrientacion);
        } else {
             setStudentNameForPanel(studentName);
        }
        
        const [practicasRes, solicitudesRes, enrollmentsRes, lanzamientosRes] = await Promise.all([
             fetchAirtableData<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, [FIELD_NOMBRE_BUSQUEDA_PRACTICAS, FIELD_HORAS_PRACTICAS, 'Nombre (de Institución)', 'Fecha de Inicio', 'Fecha de Finalización', 'Estado', 'Especialidad', FIELD_NOTA_PRACTICAS], `{${FIELD_NOMBRE_BUSQUEDA_PRACTICAS}} = '${studentName}'`),
             fetchAirtableData<SolicitudPPSFields>(AIRTABLE_TABLE_NAME_PPS, [FIELD_EMPRESA_PPS_SOLICITUD, FIELD_ESTADO_PPS, FIELD_NOTAS_PPS, FIELD_ULTIMA_ACTUALIZACION_PPS],`{${FIELD_LEGAJO_PPS}} = '${legajoToFetch.trim()}'`),
             studentId ? fetchAirtableData<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS], `FIND('${studentId}', ARRAYJOIN({${FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS}}))`) : Promise.resolve({ records: [], error: null }),
             !user.isSuperUser ? fetchAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS, FIELD_DIRECCION_LANZAMIENTOS, FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS, FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS], `{${FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS}} = 'Abierto'`, 100, [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }]) : Promise.resolve({ records: [], error: null })
        ]);

        if (practicasRes.error) {
          const message = typeof practicasRes.error.error === 'string' ? practicasRes.error.error : practicasRes.error.error.message;
          throw new Error(`Error cargando prácticas: ${message}`);
        }
        setPracticas(practicasRes.records.map(r => ({ ...r.fields, id: r.id })));
        
        if (solicitudesRes.error) {
          const message = typeof solicitudesRes.error.error === 'string' ? solicitudesRes.error.error : solicitudesRes.error.error.message;
          throw new Error(`Error cargando solicitudes: ${message}`);
        }
        const sortedSolicitudes = solicitudesRes.records.map(r => ({ ...r.fields, id: r.id })).sort((a,b) => new Date(b[FIELD_ULTIMA_ACTUALIZACION_PPS]!).getTime() - new Date(a[FIELD_ULTIMA_ACTUALIZACION_PPS]!).getTime());
        setSolicitudes(sortedSolicitudes);

        if (enrollmentsRes.error) {
          const message = typeof enrollmentsRes.error.error === 'string' ? enrollmentsRes.error.error : enrollmentsRes.error.error.message;
          throw new Error(`Error cargando inscripciones: ${message}`);
        }
        setMyEnrollments(enrollmentsRes.records.map(r => ({...r.fields, id: r.id})));

        if (lanzamientosRes.error) {
          const message = typeof lanzamientosRes.error.error === 'string' ? lanzamientosRes.error.error : lanzamientosRes.error.error.message;
          throw new Error(`Error cargando convocatorias: ${message}`);
        }
        setLanzamientos(lanzamientosRes.records.map(r => ({ ...r.fields, id: r.id })));

    } catch (e: any) {
        console.error("Error fetching data:", e);
        setError(e.message || 'Ocurrió un error inesperado al cargar los datos.');
    } finally {
        setIsLoading(false);
        setInitialLoadCompleted(true);
    }
  }, [user]);

  const handleOrientacionChange = async (orientacion: Orientacion | "") => {
    setSelectedOrientacion(orientacion);
    setShowSaveConfirmation(true);
    setTimeout(() => setShowSaveConfirmation(false), 2000);

    if (studentAirtableId) {
        const { error: updateError } = await updateAirtableRecord<EstudianteFields>(
            AIRTABLE_TABLE_NAME_ESTUDIANTES, studentAirtableId, { [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: orientacion || null }
        );
        if (updateError) {
            console.error("Failed to update chosen orientation:", updateError);
            showModal('Error de Sincronización', 'No se pudo guardar la orientación elegida.');
        }
    }
  };

  const handleNotaChange = async (practicaId: string, nota: string) => {
      const originalPracticas = [...practicas];
      const updatedPracticas = practicas.map(p => p.id === practicaId ? { ...p, [FIELD_NOTA_PRACTICAS]: nota } : p);
      setPracticas(updatedPracticas);
      
      const { error: updateError } = await updateAirtableRecord(AIRTABLE_TABLE_NAME_PRACTICAS, practicaId, { [FIELD_NOTA_PRACTICAS]: nota === 'Sin calificar' ? null : nota });
      if (updateError) {
          setPracticas(originalPracticas);
          showModal('Error de Guardado', 'No se pudo guardar la calificación. Inténtalo de nuevo.');
      }
  };
  
  const handleInscribir = async (lanzamiento: LanzamientoPPS) => {
    if (!studentAirtableId) {
      showModal('Error de Usuario', 'No se pudo identificar tu ID de estudiante. Por favor, recarga la página.');
      return;
    }
    setEnrollingId(lanzamiento.id);
    if (myEnrollments.some(e => (e[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || []).includes(lanzamiento.id))) {
        showModal('Ya Inscripto', `Ya te encuentras inscripto en "${lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]}".`);
        setEnrollingId(null);
        return;
    }
    setSelectedLanzamientoForEnrollment(lanzamiento);
    setIsEnrollmentFormOpen(true);
    setEnrollingId(null);
  };

  const closeEnrollmentForm = () => {
    setIsEnrollmentFormOpen(false);
    setSelectedLanzamientoForEnrollment(null);
  }

  const handleEnrollmentSubmit = async (formData: any) => {
     if (!studentAirtableId || !selectedLanzamientoForEnrollment) {
      showModal('Error de Proceso', 'Falta información clave. Recarga la página.');
      return;
    }
    setIsSubmitting(true);
    closeEnrollmentForm();

    try {
      const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES], `RECORD_ID() = '${studentAirtableId}'`, 1);
      if (studentError || studentRecords.length === 0) throw new Error("No se pudieron recuperar los datos del estudiante.");
      
      const studentData = studentRecords[0].fields;
      const template = selectedLanzamientoForEnrollment;
      const newEnrollmentRecord: Partial<ConvocatoriaFields> = {
        [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [template.id],
        [FIELD_NOMBRE_PPS_CONVOCATORIAS]: template[FIELD_NOMBRE_PPS_LANZAMIENTOS],
        [FIELD_FECHA_INICIO_CONVOCATORIAS]: template[FIELD_FECHA_INICIO_LANZAMIENTOS],
        [FIELD_FECHA_FIN_CONVOCATORIAS]: template[FIELD_FECHA_FIN_LANZAMIENTOS],
        [FIELD_DIRECCION_CONVOCATORIAS]: template[FIELD_DIRECCION_LANZAMIENTOS],
        [FIELD_ORIENTACION_CONVOCATORIAS]: template[FIELD_ORIENTACION_LANZAMIENTOS],
        [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: [studentAirtableId],
        [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Inscripto',
        [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: formData.horarios.join(', ') || undefined,
        [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: formData.terminoDeCursar === true ? 'Sí' : (formData.terminoDeCursar === false ? 'No' : undefined),
        [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: formData.cursandoElectivas === true ? 'Sí' : (formData.cursandoElectivas === false ? 'No' : undefined),
        [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: formData.finalesAdeudados || undefined,
        [FIELD_OTRA_SITUACION_CONVOCATORIAS]: formData.otraSituacionAcademica || undefined,
        [FIELD_DNI_CONVOCATORIAS]: studentData[FIELD_DNI_ESTUDIANTES],
        [FIELD_CORREO_CONVOCATORIAS]: studentData[FIELD_CORREO_ESTUDIANTES],
        [FIELD_FECHA_NACIMIENTO_CONVOCATORIAS]: studentData[FIELD_FECHA_NACIMIENTO_ESTUDIANTES],
        [FIELD_TELEFONO_CONVOCATORIAS]: studentData[FIELD_TELEFONO_ESTUDIANTES],
        [FIELD_LEGAJO_CONVOCATORIAS]: Number(user.legajo),
      };

      const { record, error: createError } = await createAirtableRecord<Partial<ConvocatoriaFields>>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, newEnrollmentRecord);
      if (createError || !record) {
        const message = createError?.error ? (typeof createError.error === 'string' ? createError.error : createError.error.message) : 'Error desconocido';
        throw new Error(`Hubo un problema al registrar tu solicitud: ${message}`);
      }

      const newEnrollment: Convocatoria = { ...record.fields as ConvocatoriaFields, id: record.id };
      setMyEnrollments(prev => [...prev, newEnrollment]);
      showModal('¡Inscripción Exitosa!', `Te has inscripto correctamente en "${template[FIELD_NOMBRE_PPS_LANZAMIENTOS]}".`);

    } catch (e: any) {
      showModal('Error de Inscripción', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DataContext.Provider value={{ 
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
        closeModal
    }}>
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