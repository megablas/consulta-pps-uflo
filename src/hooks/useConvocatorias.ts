import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';
import { fetchConvocatoriasData } from '../services/dataService';
import { db } from '../lib/db';
import type { LanzamientoPPS, ConvocatoriaFields, InformeTask } from '../types';
import {
    FIELD_LEGAJO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES,
    FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES,
    FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS, FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_INFORME_SUBIDO_CONVOCATORIAS,
    FIELD_NOTA_PRACTICAS,
    // FIX: Imported missing constant
    FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
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
            
            // FIX: Removed incorrect type annotation and subsequent cast. TypeScript can now infer the correct type.
            const newRecord = {
                lanzamientoVinculado: [selectedLanzamiento.id],
                estudianteInscripto: [studentAirtableId],
                nombrePPS: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                fechaInicio: selectedLanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS],
                fechaFin: selectedLanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS],
                direccion: selectedLanzamiento[FIELD_DIRECCION_LANZAMIENTOS],
                horario: Array.isArray(formData.horarios) && formData.horarios.length > 0 ? formData.horarios.join('; ') : selectedLanzamiento[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS] || 'No especificado',
                orientacion: selectedLanzamiento[FIELD_ORIENTACION_LANZAMIENTOS],
                horasAcreditadas: selectedLanzamiento[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS],
                cuposDisponibles: selectedLanzamiento[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS],
                estadoInscripcion: 'Inscripto',
                legajo: studentDetails.studentDetails[FIELD_LEGAJO_ESTUDIANTES] ? parseInt(studentDetails.studentDetails[FIELD_LEGAJO_ESTUDIANTES], 10) : undefined,
                dni: studentDetails.studentDetails[FIELD_DNI_ESTUDIANTES] ? Number(studentDetails.studentDetails[FIELD_DNI_ESTUDIANTES]) : undefined,
                correo: studentDetails.studentDetails[FIELD_CORREO_ESTUDIANTES],
                fechaNacimiento: studentDetails.studentDetails[FIELD_FECHA_NACIMIENTO_ESTUDIANTES],
                telefono: studentDetails.studentDetails[FIELD_TELEFONO_ESTUDIANTES],
                terminoCursar: formData.terminoDeCursar ? 'Sí' : 'No',
                cursandoElectivas: formData.cursandoElectivas ? 'Sí' : 'No',
                finalesAdeuda: formData.finalesAdeudados || null,
                otraSituacion: formData.otraSituacionAcademica,
            };
            return db.convocatorias.create(newRecord);
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
                throw new Error("No se encontró un registro de práctica asociado para actualizar la nota.");
            }
            const submissionDate = new Date().toISOString().split('T')[0];
            const updates = [];

            updates.push(db.convocatorias.update(task.convocatoriaId, {
                informeSubido: true,
                fechaEntregaInforme: submissionDate
            }));

            updates.push(db.practicas.update(task.practicaId, {
                nota: 'Entregado (sin corregir)'
            }));
            
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