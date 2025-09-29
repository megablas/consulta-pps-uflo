import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';
import { fetchConvocatoriasData } from '../services/dataService';
import { db } from '../lib/db';
import type { LanzamientoPPS, ConvocatoriaFields, InformeTask, Convocatoria } from '../types';
import {
    FIELD_LEGAJO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES,
    FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES,
    FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS,
    FIELD_DIRECCION_LANZAMIENTOS, FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_HORAS_ACREDITADAS_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
    FIELD_INFORME_SUBIDO_CONVOCATORIAS,
    FIELD_NOTA_PRACTICAS,
    FIELD_FECHA_ENTREGA_INFORME_CONVOCATORIAS,
    FIELD_TERMINO_CURSAR_CONVOCATORIAS,
    FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS,
    FIELD_FINALES_ADEUDA_CONVOCATORIAS,
    FIELD_OTRA_SITUACION_CONVOCATORIAS,
    // FIX: Added missing constant imports.
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
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
                terminoCursar: formData.terminoDeCursar === true ? 'Sí' : (formData.terminoDeCursar === false ? 'No' : undefined),
                cursandoElectivas: formData.cursandoElectivas === true ? 'Sí' : (formData.cursandoElectivas === false ? 'No' : undefined),
                finalesAdeuda: formData.finalesAdeudados,
                otraSituacion: formData.otraSituacionAcademica,
                informeSubido: false,
            };
            
            return db.convocatorias.create(newRecord);
        },
        onMutate: () => {
            setIsSubmittingEnrollment(true);
        },
        onSuccess: () => {
            showModal('¡Inscripción Exitosa!', 'Tu postulación ha sido registrada. Recibirás un correo electrónico cuando se publiquen los resultados de la selección.');
            closeEnrollmentForm();
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo, studentAirtableId] });
        },
        onError: (error) => {
            showModal('Error de Inscripción', `No se pudo completar tu postulación: ${error.message}`);
        },
        onSettled: () => {
            setIsSubmittingEnrollment(false);
        }
    });

    const confirmInforme = useMutation({
        mutationFn: async (task: InformeTask) => {
            const { convocatoriaId, practicaId } = task;
            const updateData = { informeSubido: true, fechaEntregaInforme: new Date().toISOString().split('T')[0] };
            
            if (practicaId) {
                await db.practicas.update(practicaId, { nota: 'Entregado (sin corregir)' });
            }
            
            return db.convocatorias.update(convocatoriaId, updateData);
        },
        onMutate: async (task: InformeTask) => {
            await queryClient.cancelQueries({ queryKey: ['convocatorias', legajo, studentAirtableId] });
            await queryClient.cancelQueries({ queryKey: ['practicas', legajo] });

            const previousConvocatoriasData = queryClient.getQueryData(['convocatorias', legajo, studentAirtableId]);
            const previousPracticasData = queryClient.getQueryData(['practicas', legajo]);

            queryClient.setQueryData(['convocatorias', legajo, studentAirtableId], (oldData: any) => {
                if (!oldData) return oldData;
                const newMyEnrollments = oldData.myEnrollments.map((e: Convocatoria) => 
                    e.id === task.convocatoriaId ? { ...e, [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true } : e
                );
                return { ...oldData, myEnrollments: newMyEnrollments };
            });

            if (task.practicaId) {
                queryClient.setQueryData(['practicas', legajo], (oldData: any) => 
                    oldData?.map((p: any) => 
                        p.id === task.practicaId ? { ...p, [FIELD_NOTA_PRACTICAS]: 'Entregado (sin corregir)' } : p
                    )
                );
            }
            
            return { previousConvocatoriasData, previousPracticasData };
        },
        onError: (err: Error, task, context) => {
            if (context?.previousConvocatoriasData) {
                queryClient.setQueryData(['convocatorias', legajo, studentAirtableId], context.previousConvocatoriasData);
            }
            if (context?.previousPracticasData) {
                queryClient.setQueryData(['practicas', legajo], context.previousPracticasData);
            }
            showModal('Error', `No se pudo confirmar la entrega: ${err.message}`);
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo, studentAirtableId] });
            queryClient.invalidateQueries({ queryKey: ['practicas', legajo] });
        }
    });

    const enrollStudent = useMutation({
        mutationFn: (selectedLanzamiento: LanzamientoPPS) => {
            return new Promise<void>((resolve, reject) => {
                openEnrollmentForm(selectedLanzamiento, async (formData) => {
                    try {
                        await enrollmentMutation.mutateAsync({ formData, selectedLanzamiento });
                        resolve();
                    } catch (error) {
                        reject(error);
                    }
                });
            });
        },
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
        institutionAddressMap
    };
};