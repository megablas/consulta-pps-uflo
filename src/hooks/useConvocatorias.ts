import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';
import { fetchConvocatoriasData } from '../services/dataService';
import { createAirtableRecord, updateAirtableRecord } from '../services/airtableService';
import type { LanzamientoPPS, ConvocatoriaFields } from '../types';
import {
    AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS,
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS,
    FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS,
    FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS,
    FIELD_HORAS_ACREDITADAS_CONVOCATORIAS, FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS,
    FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_LEGAJO_CONVOCATORIAS,
    FIELD_DNI_CONVOCATORIAS, FIELD_CORREO_CONVOCATORIAS,
    FIELD_FECHA_NACIMIENTO_CONVOCATORIAS, FIELD_TELEFONO_CONVOCATORIAS,
    FIELD_TERMINO_CURSAR_CONVOCATORIAS, FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS,
    FIELD_FINALES_ADEUDA_CONVOCATORIAS, FIELD_OTRA_SITUACION_CONVOCATORIAS,
    FIELD_LEGAJO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES,
    FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES,
    FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS, FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS
} from '../constants';

export const useConvocatorias = (legajo: string, studentAirtableId: string | null, isSuperUserMode: boolean) => {
    const queryClient = useQueryClient();
    const { showModal, openEnrollmentForm, closeEnrollmentForm, setIsSubmittingEnrollment } = useModal();

    const { 
        data: convocatoriasData, 
        isLoading: isConvocatoriasLoading, 
        error: convocatoriasError,
        refetch: refetchConvocatorias
    } = useQuery({
        queryKey: ['convocatorias', legajo, studentAirtableId],
        queryFn: () => fetchConvocatoriasData(legajo, studentAirtableId, isSuperUserMode),
        enabled: !!studentAirtableId || isSuperUserMode,
    });
    
    const { lanzamientos = [], myEnrollments = [], allLanzamientos = [] } = convocatoriasData || {};

    const enrollmentMutation = useMutation({
        mutationFn: ({ formData, selectedLanzamiento }: { formData: any, selectedLanzamiento: LanzamientoPPS }) => {
            const studentDetails = queryClient.getQueryData(['student', legajo]) as any;
            if (!studentAirtableId || !studentDetails?.studentDetails) throw new Error("No se pudo identificar al estudiante.");
            
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
                [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Inscripto',
                [FIELD_LEGAJO_CONVOCATORIAS]: studentDetails.studentDetails[FIELD_LEGAJO_ESTUDIANTES] ? parseInt(studentDetails.studentDetails[FIELD_LEGAJO_ESTUDIANTES], 10) : undefined,
                [FIELD_DNI_CONVOCATORIAS]: studentDetails.studentDetails[FIELD_DNI_ESTUDIANTES] ? Number(studentDetails.studentDetails[FIELD_DNI_ESTUDIANTES]) : undefined,
                [FIELD_CORREO_CONVOCATORIAS]: studentDetails.studentDetails[FIELD_CORREO_ESTUDIANTES],
                [FIELD_FECHA_NACIMIENTO_CONVOCATORIAS]: studentDetails.studentDetails[FIELD_FECHA_NACIMIENTO_ESTUDIANTES],
                [FIELD_TELEFONO_CONVOCATORIAS]: studentDetails.studentDetails[FIELD_TELEFONO_ESTUDIANTES],
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
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo] });
        },
        onError: (error) => showModal('Error en la Inscripción', `No se pudo completar tu inscripción. Error: ${error.message}`),
        onSettled: () => setIsSubmittingEnrollment(false),
    });

    const enrollStudent = {
        // FIX: The spread operator must come before the custom mutate function to ensure it's not overwritten.
        ...enrollmentMutation,
        mutate: (lanzamiento: LanzamientoPPS) => {
            openEnrollmentForm(lanzamiento, async (formData: any) => {
                setIsSubmittingEnrollment(true);
                await enrollmentMutation.mutateAsync({ formData, selectedLanzamiento: lanzamiento });
            });
        },
    };

    const confirmInforme = useMutation({
        mutationFn: (convocatoriaId: string) => updateAirtableRecord(AIRTABLE_TABLE_NAME_CONVOCATORIAS, convocatoriaId, { [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true }),
        onSuccess: () => {
            showModal('Confirmación Exitosa', 'Se ha registrado la entrega de tu informe.');
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo] });
        },
        onError: () => showModal('Error', 'No se pudo confirmar la entrega. Inténtalo de nuevo.'),
    });

    return {
        lanzamientos,
        myEnrollments,
        allLanzamientos,
        isConvocatoriasLoading,
        convocatoriasError,
        enrollStudent,
        confirmInforme,
        refetchConvocatorias,
    };
};
