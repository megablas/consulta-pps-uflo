import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';
import { fetchConvocatoriasData } from '../services/dataService';
import { createAirtableRecord, updateAirtableRecord } from '../services/airtableService';
import type { LanzamientoPPS, ConvocatoriaFields, InformeTask } from '../types';
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
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_PRACTICAS,
    FIELD_NOTA_PRACTICAS,
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
    
    const { lanzamientos = [], myEnrollments = [], allLanzamientos = [], institutionAddressMap = new Map() } = convocatoriasData || {};

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
        ...enrollmentMutation,
        mutate: (lanzamiento: LanzamientoPPS) => {
            openEnrollmentForm(lanzamiento, async (formData: any) => {
                setIsSubmittingEnrollment(true);
                await enrollmentMutation.mutateAsync({ formData, selectedLanzamiento: lanzamiento });
            });
        },
    };

    const confirmInforme = useMutation<any, Error, InformeTask, { previousConvocatoriasData: any, previousPracticasData: any }>({
        mutationFn: async (task: InformeTask) => {
            if (!task.practicaId) {
                // This case should be rare, but as a safeguard.
                throw new Error("No se encontró un registro de práctica asociado para actualizar la nota.");
            }
            const submissionDate = new Date().toISOString().split('T')[0];
            const updates = [];

            // 1. Update the Convocatoria record
            updates.push(
                updateAirtableRecord(AIRTABLE_TABLE_NAME_CONVOCATORIAS, task.convocatoriaId, {
                    [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true,
                    [FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS]: submissionDate
                })
            );

            // 2. Update the Practica record's status (Nota)
            updates.push(
                updateAirtableRecord(AIRTABLE_TABLE_NAME_PRACTICAS, task.practicaId, {
                    [FIELD_NOTA_PRACTICAS]: 'Entregado (sin corregir)'
                })
            );
            
            return Promise.all(updates);
        },
        onMutate: async (task: InformeTask) => {
            await queryClient.cancelQueries({ queryKey: ['convocatorias', legajo] });
            await queryClient.cancelQueries({ queryKey: ['practicas', legajo] });

            const previousConvocatoriasData = queryClient.getQueryData(['convocatorias', legajo]);
            const previousPracticasData = queryClient.getQueryData(['practicas', legajo]);
            
            const submissionDate = new Date().toISOString().split('T')[0];

            // Optimistically update convocatorias cache
            queryClient.setQueryData(['convocatorias', legajo], (oldData: any) => {
                if (!oldData) return oldData;
                const newMyEnrollments = oldData.myEnrollments.map((enrollment: any) => 
                    enrollment.id === task.convocatoriaId
                        ? { ...enrollment, [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true, [FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS]: submissionDate }
                        : enrollment
                );
                return { ...oldData, myEnrollments: newMyEnrollments };
            });

            // Optimistically update practicas cache
            if (task.practicaId) {
                queryClient.setQueryData(['practicas', legajo], (oldData: any) => {
                    if (!oldData) return oldData;
                    return oldData.map((practica: any) =>
                        practica.id === task.practicaId
                            ? { ...practica, fields: { ...practica.fields, [FIELD_NOTA_PRACTICAS]: 'Entregado (sin corregir)' } }
                            : practica
                    );
                });
            }

            return { previousConvocatoriasData, previousPracticasData };
        },
        onSuccess: () => {
            showModal('Confirmación Exitosa', 'Se ha registrado la entrega de tu informe.');
        },
        onError: (err, variables, context) => {
            if (context?.previousConvocatoriasData) {
                queryClient.setQueryData(['convocatorias', legajo], context.previousConvocatoriasData);
            }
            if (context?.previousPracticasData) {
                queryClient.setQueryData(['practicas', legajo], context.previousPracticasData);
            }
            showModal('Error', 'No se pudo confirmar la entrega. Se han revertido los cambios. Inténtalo de nuevo.');
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo] });
            queryClient.invalidateQueries({ queryKey: ['practicas', legajo] });
        },
    });

    return {
        lanzamientos,
        myEnrollments,
        allLanzamientos,
        institutionAddressMap,
        isConvocatoriasLoading,
        convocatoriasError,
        enrollStudent,
        confirmInforme,
        refetchConvocatorias,
    };
};