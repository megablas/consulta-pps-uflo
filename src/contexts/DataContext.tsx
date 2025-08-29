import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Orientacion, LanzamientoPPS, 
  ConvocatoriaFields, AirtableRecord, AirtableErrorResponse
} from '../types';
import { 
  FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, AIRTABLE_TABLE_NAME_PRACTICAS, FIELD_NOTA_PRACTICAS, 
  AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS, 
  FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
  FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS,
  FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS, FIELD_HORAS_ACREDITADAS_CONVOCATORIAS,
  FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS as FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS,
  FIELD_LEGAJO_CONVOCATORIAS, FIELD_DNI_CONVOCATORIAS, FIELD_CORREO_CONVOCATORIAS, FIELD_FECHA_NACIMIENTO_CONVOCATORIAS,
  FIELD_TELEFONO_CONVOCATORIAS, FIELD_TERMINO_CURSAR_CONVOCATORIAS, FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS,
  FIELD_FINALES_ADEUDA_CONVOCATORIAS, FIELD_OTRA_SITUACION_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES,
  FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES,
  FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_DIRECCION_LANZAMIENTOS, FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS
} from '../constants';
import { updateAirtableRecord, createAirtableRecord } from '../services/airtableService';
import { getDashboardData, DashboardData } from '../services/dataService';
import type { AuthUser } from './AuthContext';
import { useModal } from './ModalContext';
import { initialCriterios } from '../utils/criteriaCalculations';

// --- Type Definitions ---
interface DataContextType extends DashboardData {
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  showSaveConfirmation: boolean;
  initialLoadCompleted: boolean;
  studentNameForPanel: string;
  selectedOrientacion: Orientacion | "";

  refetchStudentData: () => void;
  handleOrientacionChange: (orientacion: Orientacion | "") => void;
  handleNotaChange: (practicaId: string, nota: string, convocatoriaId?: string) => void;
  handleConfirmarInforme: (convocatoriaId: string) => void;
  handleEnrollmentSubmit: (formData: any, selectedLanzamiento: LanzamientoPPS) => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

// --- Main Data Provider Component ---
export const DataProvider: React.FC<{ children: ReactNode, user: AuthUser }> = ({ children, user }) => {
  const queryClient = useQueryClient();
  const { showModal, closeEnrollmentForm, setEnrollingId } = useModal();
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  
  // --- Centralized Query using the Data Service ---
  const { data, error, isLoading, isInitialLoading, isSuccess, isError, refetch } = useQuery<DashboardData, Error>({
    queryKey: ['dashboardData', user.legajo],
    queryFn: () => getDashboardData(user.legajo, user.role),
    staleTime: 60 * 1000, // 1 minute
    refetchOnWindowFocus: true,
    refetchOnMount: true,
    refetchOnReconnect: true,
    retry: 1, // Retry once on failure
  });
  
  // --- Derived State and Data Processing ---
  const dashboardData = data || {
    practicas: [],
    solicitudes: [],
    lanzamientos: [],
    myEnrollments: [],
    informeTasks: [],
    criterios: initialCriterios,
    studentDetails: null,
    studentAirtableId: null,
    userGender: 'neutro',
  };
  
  const studentDetails = dashboardData.studentDetails;
  const studentAirtableId = dashboardData.studentAirtableId;
  const selectedOrientacion = (studentDetails?.['Orientación Elegida'] || "") as Orientacion | "";
  const studentNameForPanel = studentDetails?.['Nombre'] || user.nombre;
  
  // --- Mutations ---
  const updateOrientationMutation = useMutation({
    mutationFn: (orientacion: Orientacion | "") => {
        if (!studentAirtableId) throw new Error("Student ID not available.");
        return updateAirtableRecord(AIRTABLE_TABLE_NAME_ESTUDIANTES, studentAirtableId, { [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: orientacion || null });
    },
    onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ['dashboardData', user.legajo] });
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
        queryClient.invalidateQueries({ queryKey: ['dashboardData', user.legajo] });
    },
    onError: () => showModal('Error', 'No se pudo actualizar la nota.'),
  });

  const confirmInformeMutation = useMutation({
    mutationFn: (convocatoriaId: string) => updateAirtableRecord(AIRTABLE_TABLE_NAME_CONVOCATORIAS, convocatoriaId, { [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true }),
    onSuccess: () => {
        showModal('Confirmación Exitosa', 'Se ha registrado la entrega de tu informe.');
        queryClient.invalidateQueries({ queryKey: ['dashboardData', user.legajo] });
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
        queryClient.invalidateQueries({ queryKey: ['dashboardData', user.legajo] });
    },
    onError: (error) => showModal('Error en la Inscripción', `No se pudo completar tu inscripción. Error: ${error.message}`),
    onSettled: () => setEnrollingId(null),
  });

  const isSubmitting = updateOrientationMutation.isPending || updateNotaMutation.isPending || confirmInformeMutation.isPending || enrollmentMutation.isPending;
  const initialLoadCompleted = isSuccess || isError;

  const value: DataContextType = {
    ...dashboardData,
    isLoading: isInitialLoading || isLoading,
    isSubmitting,
    error: error?.message || null,
    showSaveConfirmation,
    initialLoadCompleted,
    studentNameForPanel,
    selectedOrientacion,
    refetchStudentData: refetch,
    handleOrientacionChange: (orientacion) => updateOrientationMutation.mutate(orientacion),
    handleNotaChange: (practicaId, nota, convocatoriaId) => updateNotaMutation.mutate({ practicaId, nota, convocatoriaId }),
    handleConfirmarInforme: (convocatoriaId) => confirmInformeMutation.mutate(convocatoriaId),
    handleEnrollmentSubmit: async (formData, selectedLanzamiento) => {
      setEnrollingId(selectedLanzamiento.id);
      await enrollmentMutation.mutateAsync({ formData, selectedLanzamiento });
    },
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
