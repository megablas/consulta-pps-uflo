import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Practica, SolicitudPPS, CriteriosCalculados, Orientacion, LanzamientoPPS, 
  Convocatoria, EstudianteFields, PracticaFields, SolicitudPPSFields, 
  LanzamientoPPSFields, ConvocatoriaFields, ALL_ORIENTACIONES, InformeTask, AirtableRecord, AirtableErrorResponse
} from '../types';
// FIX: Added missing constant import for FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS.
import { FIELD_LEGAJO_ESTUDIANTES, FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, AIRTABLE_TABLE_NAME_PRACTICAS, FIELD_NOTA_PRACTICAS, AIRTABLE_TABLE_NAME_PPS, FIELD_LEGAJO_PPS, FIELD_ULTIMA_ACTUALIZACION_PPS, AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS, FIELD_DIRECCION_LANZAMIENTOS, FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS, FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_TERMINO_CURSAR_CONVOCATORIAS, FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS, FIELD_FINALES_ADEUDA_CONVOCATORIAS, FIELD_OTRA_SITUACION_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS as FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS, FIELD_DNI_CONVOCATORIAS, FIELD_CORREO_CONVOCATORIAS, FIELD_FECHA_NACIMIENTO_CONVOCATORIAS, FIELD_TELEFONO_CONVOCATORIAS, FIELD_LEGAJO_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS, FIELD_NOMBRE_ESTUDIANTES, FIELD_FECHA_INICIO_PRACTICAS, FIELD_GENERO_ESTUDIANTES, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, FIELD_HORAS_ACREDITADAS_CONVOCATORIAS, FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS, FIELD_INFORME_LANZAMIENTOS, FIELD_INFORME_SUBIDO_CONVOCATORIAS, FIELD_NOMBRE_BUSQUEDA_PRACTICAS, AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS } from '../constants';
import { fetchAirtableData, updateAirtableRecord, createAirtableRecord, fetchAllAirtableData } from '../services/airtableService';
import { normalizeStringForComparison, parseToUTCDate } from '../utils/formatters';
import type { AuthUser } from './AuthContext';
import { useModal } from './ModalContext';
import { calculateCriterios, initialCriterios } from '../utils/criteriaCalculations';

// --- Type Definitions ---
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

  refetchStudentData: () => void;
  handleOrientacionChange: (orientacion: Orientacion | "") => void;
  handleNotaChange: (practicaId: string, nota: string, convocatoriaId?: string) => void;
  handleConfirmarInforme: (convocatoriaId: string) => void;
  handleEnrollmentSubmit: (formData: any, selectedLanzamiento: LanzamientoPPS) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- Fetcher Functions for TanStack Query ---
const fetchStudent = async (legajo: string): Promise<AirtableRecord<EstudianteFields>> => {
    const { records, error } = await fetchAirtableData<EstudianteFields>(AIRTABLE_TABLE_NAME_ESTUDIANTES, [], `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajo}'`, 1);
    if (error) throw new Error(`Error al buscar estudiante: ${typeof error.error === 'string' ? error.error : error.error.message}`);
    if (records.length === 0) throw new Error('No se encontró al estudiante con el legajo proporcionado.');
    return records[0];
};

// FIX: Rewrote as a standard async function to resolve a strange parsing error with async generic arrow functions.
async function fetchDataForUser<T>(tableName: string, legajo: string, searchField: string, fields: string[] = [], sortOptions: any[] = []) {
    const { records, error } = await fetchAllAirtableData<T>(tableName, fields, `SEARCH('${legajo}', ARRAYJOIN({${searchField}}))`, sortOptions.length > 0 ? sortOptions : undefined);
    if (error) throw new Error(`Error al cargar datos de ${tableName}: ${typeof error.error === 'string' ? error.error : error.error.message}`);
    return records.map(r => ({ ...r.fields, id: r.id }));
}

const fetchAllLanzamientos = async () => {
    const { records, error } = await fetchAllAirtableData<LanzamientoPPSFields>(AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [], undefined, [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }]);
    if (error) throw new Error(`Error al cargar lanzamientos: ${typeof error.error === 'string' ? error.error : error.error.message}`);
    return records.map(r => ({ ...r.fields, id: r.id }));
};

// --- Main Data Provider Component ---
export const DataProvider: React.FC<{ children: ReactNode, user: AuthUser }> = ({ children, user }) => {
  const queryClient = useQueryClient();
  const { showModal, closeEnrollmentForm, setEnrollingId } = useModal();

  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  
  const isCorrector = user.role === 'SuperUser' || user.role === 'Jefe';
  
  // --- Queries ---
  const studentQuery = useQuery({
    queryKey: ['student', user.legajo],
    queryFn: () => fetchStudent(user.legajo),
    enabled: !isCorrector,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const studentAirtableId = studentQuery.data?.id ?? null;

  const practicasQuery = useQuery({
    queryKey: ['practicas', user.legajo],
    queryFn: () => fetchDataForUser<PracticaFields>(AIRTABLE_TABLE_NAME_PRACTICAS, user.legajo, FIELD_NOMBRE_BUSQUEDA_PRACTICAS),
    staleTime: 5 * 60 * 1000,
  });

  const solicitudesQuery = useQuery({
    queryKey: ['solicitudes', user.legajo],
    queryFn: () => fetchDataForUser<SolicitudPPSFields>(AIRTABLE_TABLE_NAME_PPS, user.legajo, FIELD_LEGAJO_PPS, [], [{ field: FIELD_ULTIMA_ACTUALIZACION_PPS, direction: 'desc' }]),
    enabled: !isCorrector,
    staleTime: 5 * 60 * 1000,
  });

  const convocatoriasQuery = useQuery({
    queryKey: ['convocatorias', user.legajo],
    queryFn: () => fetchDataForUser<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, user.legajo, FIELD_LEGAJO_CONVOCATORIAS, [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS]),
    enabled: !isCorrector,
    staleTime: 5 * 60 * 1000,
  });

  const lanzamientosQuery = useQuery({
    queryKey: ['lanzamientos'],
    queryFn: fetchAllLanzamientos,
    staleTime: 5 * 60 * 1000,
  });

  // --- Derived State and Data Processing ---
  const studentDetails = useMemo(() => studentQuery.data?.fields ?? null, [studentQuery.data]);

  // FIX: Explicitly set the return type of useMemo for `selectedOrientacion` to match the `DataContextType` interface.
  const selectedOrientacion = useMemo<Orientacion | "">(() => (studentDetails?.[FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES] as Orientacion) || "", [studentDetails]);
  
  const studentNameForPanel = useMemo(() => studentDetails?.[FIELD_NOMBRE_ESTUDIANTES] || user.nombre, [studentDetails, user.nombre]);
  
  const userGender = useMemo((): UserGender => {
      const gender = studentDetails?.[FIELD_GENERO_ESTUDIANTES];
      if (gender === 'Mujer') return 'femenino';
      if (gender === 'Varon') return 'masculino';
      return 'neutro';
  }, [studentDetails]);

  const visibleLanzamientos = useMemo(() => {
    const allLanzamientos = lanzamientosQuery.data || [];
    return allLanzamientos.filter(l => {
        const ppsName = l[FIELD_NOMBRE_PPS_LANZAMIENTOS];
        if (!(typeof ppsName === 'string' && ppsName.trim())) {
            return false;
        }

        if (isCorrector) {
            return true;
        }

        const status = normalizeStringForComparison(l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
        
        // HIDING RULE: 'Oculto' is ALWAYS hidden for students. This is the most important rule.
        if (status === 'oculto') {
            return false;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // SHOWING RULES: If any of these are true, the PPS will be shown.
        
        // Rule 1: 'Abierta' is always visible.
        if (status === 'abierta' || status === 'abierto') {
            return true;
        }
        
        // Rule 2: Any PPS with a future end date is visible.
        const endDate = parseToUTCDate(l[FIELD_FECHA_FIN_LANZAMIENTOS]);
        if (endDate && endDate.getTime() >= today.getTime()) {
            return true;
        }
        
        // Rule 3: Grace period for 'Cerrado' PPS. Show for 7 days AFTER the END date for result checking.
        if (status === 'cerrado' && endDate) {
            const gracePeriodEndDate = new Date(endDate.getTime());
            gracePeriodEndDate.setDate(gracePeriodEndDate.getDate() + 7); // Add 7 days
            if (today <= gracePeriodEndDate) {
                return true;
            }
        }
        
        // DEFAULT: If no showing rule was met, hide the PPS.
        return false;
    });
  }, [lanzamientosQuery.data, isCorrector]);

  const criterios = useMemo((): CriteriosCalculados => {
    const allPracticas = practicasQuery.data || [];
    return calculateCriterios(allPracticas, selectedOrientacion);
  }, [practicasQuery.data, selectedOrientacion]);

  const informeTasks = useMemo((): InformeTask[] => {
    const myEnrollmentsData = convocatoriasQuery.data || [];
    const allLanzamientos = lanzamientosQuery.data || [];
    const allPracticas = practicasQuery.data || [];
    if (isCorrector || myEnrollmentsData.length === 0 || allLanzamientos.length === 0) return [];
    
    return myEnrollmentsData.map((enrollment): InformeTask | null => {
      const lanzamientoId = (enrollment[FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS] || [])[0];
      const lanzamiento = allLanzamientos.find(l => l.id === lanzamientoId);
      
      if (!lanzamiento || !lanzamiento[FIELD_INFORME_LANZAMIENTOS] || !lanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS] || normalizeStringForComparison(enrollment[FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS]) !== 'seleccionado') {
        return null;
      }

      const practicaVinculada = allPracticas.find(p => {
          const ppsName = (p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS] as string[] | undefined)?.[0] ?? '';
          const practicaStartDate = parseToUTCDate(p[FIELD_FECHA_INICIO_PRACTICAS]);
          const lanzamientoStartDate = parseToUTCDate(lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS]);
          return normalizeStringForComparison(ppsName) === normalizeStringForComparison(lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]) &&
                 practicaStartDate?.getTime() === lanzamientoStartDate?.getTime();
      });

      return {
        convocatoriaId: enrollment.id,
        ppsName: lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'N/A',
        informeLink: lanzamiento[FIELD_INFORME_LANZAMIENTOS],
        fechaFinalizacion: lanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS],
        informeSubido: !!enrollment[FIELD_INFORME_SUBIDO_CONVOCATORIAS],
        nota: practicaVinculada?.[FIELD_NOTA_PRACTICAS] || 'Sin calificar',
      };
    }).filter((task): task is InformeTask => task !== null)
      .sort((a, b) => new Date(a.fechaFinalizacion).getTime() - new Date(b.fechaFinalizacion).getTime());

  }, [convocatoriasQuery.data, lanzamientosQuery.data, practicasQuery.data, isCorrector]);

  // --- Mutations ---
  const updateOrientationMutation = useMutation({
    mutationFn: (orientacion: Orientacion | "") => {
        if (!studentAirtableId) throw new Error("Student ID not available.");
        return updateAirtableRecord(AIRTABLE_TABLE_NAME_ESTUDIANTES, studentAirtableId, { [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: orientacion || null });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['student', user.legajo] });
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 2000);
    },
    onError: (error) => showModal('Error', `No se pudo guardar tu orientación: ${error.message}`),
  });

  const updateNotaMutation = useMutation<
    { record: AirtableRecord<any> | null; error: AirtableErrorResponse | null }[],
    Error,
    { practicaId: string; nota: string; convocatoriaId?: string }
  >({
    // FIX: Explicitly typed the mutation to handle multiple return paths with different array lengths and content types, resolving a type mismatch.
    mutationFn: ({ practicaId, nota, convocatoriaId }) => {
        if (nota === 'No Entregado' && convocatoriaId) {
            return Promise.all([
                updateAirtableRecord(AIRTABLE_TABLE_NAME_CONVOCATORIAS, convocatoriaId, { [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: false }),
                updateAirtableRecord(AIRTABLE_TABLE_NAME_PRACTICAS, practicaId, { [FIELD_NOTA_PRACTICAS]: 'No Entregado' })
            ]);
        }
        const valueToSend = nota === 'Sin calificar' ? null : nota;
        return updateAirtableRecord(AIRTABLE_TABLE_NAME_PRACTICAS, practicaId, { [FIELD_NOTA_PRACTICAS]: valueToSend }).then(res => [res]);
    },
    onSuccess: (_, variables) => {
        if (variables.nota === 'No Entregado') {
            showModal('Actualización Exitosa', 'El estado del informe se ha cambiado a "No Entregado".');
        }
        queryClient.invalidateQueries({ queryKey: ['practicas', user.legajo] });
        queryClient.invalidateQueries({ queryKey: ['convocatorias', user.legajo] });
    },
    onError: () => showModal('Error', 'No se pudo actualizar la nota.'),
  });

  const confirmInformeMutation = useMutation({
    mutationFn: (convocatoriaId: string) => updateAirtableRecord(AIRTABLE_TABLE_NAME_CONVOCATORIAS, convocatoriaId, { [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true }),
    onSuccess: () => {
        showModal('Confirmación Exitosa', 'Se ha registrado la entrega de tu informe.');
        queryClient.invalidateQueries({ queryKey: ['convocatorias', user.legajo] });
    },
    onError: () => showModal('Error', 'No se pudo confirmar la entrega. Inténtalo de nuevo.'),
  });

  const enrollmentMutation = useMutation({
    mutationFn: ({ formData, selectedLanzamiento }: { formData: any, selectedLanzamiento: LanzamientoPPS }) => {
        if (!studentAirtableId || !studentDetails) throw new Error("No se pudo identificar al estudiante.");
        const newRecord: Partial<ConvocatoriaFields> = {
            [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [selectedLanzamiento.id],
            [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: [studentAirtableId],
            [FIELD_NOMBRE_PPS_CONVOCATORIAS]: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS],
            [FIELD_FECHA_INICIO_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS],
            [FIELD_FECHA_FIN_CONVOCATORIAS]: selectedLanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS],
            [FIELD_DIRECCION_CONVOCATORIAS]: selectedLanzamiento[FIELD_DIRECCION_LANZAMIENTOS],
            [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: Array.isArray(formData.horarios) && formData.horarios.length > 0 ? formData.horarios.join('; ') : selectedLanzamiento[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS] || 'No especificado',
            [FIELD_ORIENTACION_CONVOCATORIAS]: selectedLanzamiento[FIELD_ORIENTACION_LANZAMIENTOS],
            [FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: selectedLanzamiento[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS],
            [FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS]: selectedLanzamiento[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS],
            [FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS]: 'Inscripto',
            [FIELD_LEGAJO_CONVOCATORIAS]: studentDetails[FIELD_LEGAJO_ESTUDIANTES] ? parseInt(studentDetails[FIELD_LEGAJO_ESTUDIANTES], 10) : undefined,
            [FIELD_DNI_CONVOCATORIAS]: studentDetails[FIELD_DNI_ESTUDIANTES] ? Number(studentDetails[FIELD_DNI_ESTUDIANTES]) : undefined,
            [FIELD_CORREO_CONVOCATORIAS]: studentDetails[FIELD_CORREO_ESTUDIANTES],
            [FIELD_FECHA_NACIMIENTO_CONVOCATORIAS]: studentDetails[FIELD_FECHA_NACIMIENTO_ESTUDIANTES],
            [FIELD_TELEFONO_CONVOCATORIAS]: studentDetails[FIELD_TELEFONO_ESTUDIANTES],
            [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: formData.terminoDeCursar ? 'Sí' : 'No',
            [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: formData.cursandoElectivas ? 'Sí' : 'No',
            [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: formData.finalesAdeudados || null,
            [FIELD_OTRA_SITUACION_CONVOCATORIAS]: formData.otraSituacionAcademica,
        };
        return createAirtableRecord<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, newRecord);
    },
    onSuccess: () => {
        closeEnrollmentForm();
        showModal('¡Inscripción Exitosa!', 'Tu postulación ha sido enviada correctamente.');
        queryClient.invalidateQueries({ queryKey: ['convocatorias', user.legajo] });
    },
    onError: (error) => showModal('Error en la Inscripción', `No se pudo completar tu inscripción. Error: ${error.message}`),
    onSettled: () => setEnrollingId(null),
  });

  // --- Combined Loading and Error States ---
  const isLoading = studentQuery.isLoading || practicasQuery.isLoading || convocatoriasQuery.isLoading || lanzamientosQuery.isLoading;
  const initialLoadCompleted = studentQuery.isSuccess || studentQuery.isError || practicasQuery.isSuccess || practicasQuery.isError;
  const error = studentQuery.error?.message || practicasQuery.error?.message || solicitudesQuery.error?.message || convocatoriasQuery.error?.message || lanzamientosQuery.error?.message || null;
  const isSubmitting = updateOrientationMutation.isPending || updateNotaMutation.isPending || confirmInformeMutation.isPending || enrollmentMutation.isPending;

  // --- Memoized Callbacks for Performance ---
  const refetchStudentData = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['student', user.legajo] });
  }, [queryClient, user.legajo]);

  const handleOrientacionChange = useCallback((orientacion: Orientacion | "") => {
    updateOrientationMutation.mutate(orientacion);
  }, [updateOrientationMutation]);

  const handleNotaChange = useCallback((practicaId: string, nota: string, convocatoriaId?: string) => {
    updateNotaMutation.mutate({ practicaId, nota, convocatoriaId });
  }, [updateNotaMutation]);

  const handleConfirmarInforme = useCallback((convocatoriaId: string) => {
    confirmInformeMutation.mutate(convocatoriaId);
  }, [confirmInformeMutation]);

  const handleEnrollmentSubmit = useCallback(async (formData: any, selectedLanzamiento: LanzamientoPPS) => {
    setEnrollingId(selectedLanzamiento.id);
    enrollmentMutation.mutate({ formData, selectedLanzamiento });
  }, [enrollmentMutation, setEnrollingId]);

  // --- Memoized Context Value ---
  const value = useMemo(() => ({
    practicas: practicasQuery.data || [],
    solicitudes: solicitudesQuery.data || [],
    lanzamientos: visibleLanzamientos,
    myEnrollments: convocatoriasQuery.data || [],
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
    refetchStudentData,
    handleOrientacionChange,
    handleNotaChange,
    handleConfirmarInforme,
    handleEnrollmentSubmit,
  }), [
    practicasQuery.data,
    solicitudesQuery.data,
    visibleLanzamientos,
    convocatoriasQuery.data,
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
    refetchStudentData,
    handleOrientacionChange,
    handleNotaChange,
    handleConfirmarInforme,
    handleEnrollmentSubmit,
  ]);


  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

export const useData = (): DataContextType => {
  const context = useContext(DataContext);
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};