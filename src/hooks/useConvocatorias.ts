import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';
import { fetchConvocatoriasData } from '../services/dataService';
import { db } from '../lib/db';
import type { LanzamientoPPS, ConvocatoriaFields, InformeTask, Convocatoria, ConferenceActivity, JornadaBlockCounts } from '../types';
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
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    CONFERENCE_SHIFTS_BY_DAY,
    JORNADA_CAPACITIES,
    FIELD_ASISTENCIA_ESTUDIANTE,
    JORNADA_BLOCK_MAPPING,
    FIELD_ASISTENCIA_MODULO_ID,
} from '../constants';
import { useMemo } from 'react';

export const useConvocatorias = (legajo: string, studentAirtableId: string | null, isSuperUserMode: boolean) => {
    const queryClient = useQueryClient();
    const { 
        showModal, 
        openEnrollmentForm, closeEnrollmentForm, setIsSubmittingEnrollment,
        openJornadaModal, closeJornadaModal, setIsSubmittingJornada 
    } = useModal();

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

    const { data: asistencias = [], refetch: refetchAsistencias } = useQuery({
        queryKey: ['asistenciasJornada', legajo],
        queryFn: async () => {
            if (!studentAirtableId) return [];
            const records = await db.asistenciasJornada.getAll({
                filterByFormula: `FIND('${studentAirtableId}', ARRAYJOIN({${FIELD_ASISTENCIA_ESTUDIANTE}}))`
            });
            return records.map(r => ({ ...r.fields, id: r.id }));
        },
        enabled: !!studentAirtableId,
    });

    const { data: allAsistenciasJornada } = useQuery({
        queryKey: ['allAsistenciasJornada'],
        queryFn: async () => {
            const records = await db.asistenciasJornada.getAll();
            return records.map(r => ({...r.fields, id: r.id}));
        }
    });

    const jornadaBlockCounts = useMemo(() => {
        const counts: JornadaBlockCounts = new Map<string, number>();
        if (allAsistenciasJornada) {
            for (const asistencia of allAsistenciasJornada) {
                const moduleId = asistencia[FIELD_ASISTENCIA_MODULO_ID] as string;
                if (moduleId && JORNADA_BLOCK_MAPPING[moduleId as keyof typeof JORNADA_BLOCK_MAPPING]) {
                    const blockId = JORNADA_BLOCK_MAPPING[moduleId as keyof typeof JORNADA_BLOCK_MAPPING];
                    counts.set(blockId, (counts.get(blockId) || 0) + 1);
                }
            }
        }
        return counts;
    }, [allAsistenciasJornada]);

    const enrollmentMutation = useMutation({
        mutationFn: ({ formData, selectedLanzamiento }: { formData: any, selectedLanzamiento: LanzamientoPPS }) => {
            const studentDetails = queryClient.getQueryData(['student', legajo]) as any;
            if (!studentAirtableId || !studentDetails?.studentDetails) throw new Error("No se pudo identificar al estudiante.");
            
            const newRecord: Partial<ConvocatoriaFields> = {
                [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [selectedLanzamiento.id],
                [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: [studentAirtableId],
                [FIELD_NOMBRE_PPS_LANZAMIENTOS]: selectedLanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS],
                [FIELD_FECHA_INICIO_LANZAMIENTOS]: selectedLanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS],
                [FIELD_FECHA_FIN_LANZAMIENTOS]: selectedLanzamiento[FIELD_FECHA_FIN_LANZAMIENTOS],
                [FIELD_DIRECCION_LANZAMIENTOS]: selectedLanzamiento[FIELD_DIRECCION_LANZAMIENTOS],
                [FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]: formData.horarios.join('; '),
                [FIELD_ORIENTACION_LANZAMIENTOS]: selectedLanzamiento[FIELD_ORIENTACION_LANZAMIENTOS],
                [FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]: selectedLanzamiento[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS],
                [FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]: selectedLanzamiento[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS],
                [FIELD_LEGAJO_ESTUDIANTES]: studentDetails.studentDetails[FIELD_LEGAJO_ESTUDIANTES],
                [FIELD_DNI_ESTUDIANTES]: studentDetails.studentDetails[FIELD_DNI_ESTUDIANTES],
                [FIELD_CORREO_ESTUDIANTES]: studentDetails.studentDetails[FIELD_CORREO_ESTUDIANTES],
                [FIELD_FECHA_NACIMIENTO_ESTUDIANTES]: studentDetails.studentDetails[FIELD_FECHA_NACIMIENTO_ESTUDIANTES],
                [FIELD_TELEFONO_ESTUDIANTES]: studentDetails.studentDetails[FIELD_TELEFONO_ESTUDIANTES],
                [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: formData.terminoDeCursar ? "Sí" : "No",
                [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: formData.cursandoElectivas ? "Sí" : "No",
                [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: formData.finalesAdeudados,
                [FIELD_OTRA_SITUACION_CONVOCATORIAS]: formData.otraSituacionAcademica,
            };
            return db.convocatorias.create(newRecord as any);
        },
        onMutate: () => setIsSubmittingEnrollment(true),
        onSuccess: () => {
            closeEnrollmentForm();
            showModal('¡Inscripción Exitosa!', 'Tu postulación ha sido registrada. Recibirás un correo electrónico con los próximos pasos.');
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo] });
        },
        onError: (error) => showModal('Error de Inscripción', `No se pudo completar tu inscripción: ${error.message}`),
        onSettled: () => setIsSubmittingEnrollment(false),
    });

    const enrollStudent = {
        mutate: (selectedLanzamiento: LanzamientoPPS) => {
            openEnrollmentForm(selectedLanzamiento, (formData) => enrollmentMutation.mutateAsync({ formData, selectedLanzamiento }));
        },
        isPending: enrollmentMutation.isPending,
    };

    const enrollInJornadaMutation = useMutation({
        mutationFn: async ({ selectedShiftIds }: { selectedShiftIds: string[] }) => {
            if (!studentAirtableId) throw new Error("No se pudo identificar al estudiante.");
            if (selectedShiftIds.length === 0) throw new Error("No se seleccionó ningún turno.");
    
            // Re-fetch latest counts for race condition check
            const records = await db.asistenciasJornada.getAll();
            const latestAsistencias = records.map(r => r.fields);
            const latestCounts: JornadaBlockCounts = new Map<string, number>();
            for (const asistencia of latestAsistencias) {
                const moduleId = asistencia[FIELD_ASISTENCIA_MODULO_ID] as string;
                if (moduleId && JORNADA_BLOCK_MAPPING[moduleId as keyof typeof JORNADA_BLOCK_MAPPING]) {
                    const blockId = JORNADA_BLOCK_MAPPING[moduleId as keyof typeof JORNADA_BLOCK_MAPPING];
                    latestCounts.set(blockId, (latestCounts.get(blockId) || 0) + 1);
                }
            }
            
            // Validate capacity for each selected shift
            for (const shiftId of selectedShiftIds) {
                const capacity = JORNADA_CAPACITIES[shiftId as keyof typeof JORNADA_CAPACITIES];
                const currentCount = latestCounts.get(shiftId) || 0;
                if (currentCount >= capacity) {
                    const shiftInfo = CONFERENCE_SHIFTS_BY_DAY.flatMap(d => d.shifts).find(s => s.shift_id === shiftId);
                    throw new Error(`Los cupos para el turno "${shiftInfo?.name}" se agotaron. Por favor, actualiza tu selección.`);
                }
            }
    
            const activitiesToCreate = CONFERENCE_SHIFTS_BY_DAY
                .flatMap(day => day.shifts)
                .filter(shift => selectedShiftIds.includes(shift.shift_id))
                .flatMap(shift => shift.activities);
    
            if (activitiesToCreate.length === 0) throw new Error("Los turnos seleccionados no tienen actividades válidas.");
    
            const promises = activitiesToCreate.map(activity => {
                return db.asistenciasJornada.create({
                    estudianteLink: [studentAirtableId],
                    moduloId: activity.id,
                    moduloAsistido: activity.name,
                    fecha: activity.date,
                    orientacion: activity.orientation,
                    horas: activity.hours,
                    procesado: false,
                });
            });
    
            await Promise.all(promises);
        },
        onMutate: () => setIsSubmittingJornada(true),
        onSuccess: () => {
            closeJornadaModal();
            showModal('¡Inscripción a la Jornada Exitosa!', 'Tu inscripción a los turnos seleccionados ha sido confirmada. ¡Nos vemos en el evento!');
            queryClient.invalidateQueries({ queryKey: ['asistenciasJornada', legajo] });
            queryClient.invalidateQueries({ queryKey: ['allAsistenciasJornada'] });
        },
        onError: (error) => showModal('Error de Inscripción', `No se pudo completar tu inscripción a la jornada: ${error.message}`),
        onSettled: () => setIsSubmittingJornada(false),
    });

    const enrollInJornada = {
        mutate: (selectedLanzamiento: LanzamientoPPS) => {
            openJornadaModal(selectedLanzamiento, (selectedShiftIds) => enrollInJornadaMutation.mutateAsync({ selectedShiftIds }), jornadaBlockCounts);
        },
        isPending: enrollInJornadaMutation.isPending,
    };

    const confirmInforme = useMutation({
        mutationFn: async (task: InformeTask) => {
            if (!task.convocatoriaId) throw new Error("ID de convocatoria no encontrado.");
            const today = new Date().toISOString().split('T')[0];
            return db.convocatorias.update(task.convocatoriaId, { 
                informeSubido: true,
                fechaEntregaInforme: today 
            });
        },
        onMutate: async (task: InformeTask) => {
            await queryClient.cancelQueries({ queryKey: ['convocatorias', legajo] });
            await queryClient.cancelQueries({ queryKey: ['practicas', legajo] });
            
            const previousConvocatoriasData = queryClient.getQueryData(['convocatorias', legajo]);
            const previousPracticasData = queryClient.getQueryData(['practicas', legajo]);

            queryClient.setQueryData(['convocatorias', legajo], (old: any) => {
                const newMyEnrollments = old.myEnrollments.map((e: Convocatoria) => 
                    e.id === task.convocatoriaId ? { ...e, [FIELD_INFORME_SUBIDO_CONVOCATORIAS]: true } : e
                );
                return { ...old, myEnrollments: newMyEnrollments };
            });

            if (task.practicaId) {
                queryClient.setQueryData(['practicas', legajo], (old: any) => 
                    old.map((p: any) => p.id === task.practicaId ? { ...p, [FIELD_NOTA_PRACTICAS]: 'Entregado (sin corregir)' } : p)
                );
            }
            return { previousConvocatoriasData, previousPracticasData };
        },
        onSuccess: () => showModal('Confirmación Exitosa', 'Hemos recibido la confirmación de tu entrega. ¡Gracias!'),
        onError: (err, task, context) => {
            showModal('Error', `No se pudo confirmar la entrega: ${err.message}`);
            if (context?.previousConvocatoriasData) {
                queryClient.setQueryData(['convocatorias', legajo], context.previousConvocatoriasData);
            }
             if (context?.previousPracticasData) {
                queryClient.setQueryData(['practicas', legajo], context.previousPracticasData);
            }
        },
        onSettled: () => {
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo] });
            queryClient.invalidateQueries({ queryKey: ['practicas', legajo] });
        }
    });

    return {
        lanzamientos,
        myEnrollments,
        allLanzamientos,
        institutionAddressMap,
        asistencias,
        isConvocatoriasLoading: isConvocatoriasLoading || !asistencias || !allAsistenciasJornada,
        convocatoriasError,
        refetchConvocatorias,
        enrollStudent,
        confirmInforme,
        enrollInJornada,
        jornadaBlockCounts,
    };
};
