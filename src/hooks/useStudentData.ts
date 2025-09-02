import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStudentData } from '../services/dataService';
import { updateAirtableRecord } from '../services/airtableService';
import type { Orientacion } from '../types';
import { AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES, FIELD_NOTAS_INTERNAS_ESTUDIANTES } from '../constants';
import { useModal } from '../contexts/ModalContext';

export const useStudentData = (legajo: string) => {
    const queryClient = useQueryClient();
    const { showModal } = useModal();

    const { 
        data, 
        isLoading: isStudentLoading, 
        error: studentError, 
        refetch: refetchStudent 
    } = useQuery({
        queryKey: ['student', legajo],
        queryFn: () => fetchStudentData(legajo),
    });

    const studentDetails = data?.studentDetails ?? null;
    const studentAirtableId = data?.studentAirtableId ?? null;

    const updateOrientation = useMutation({
        mutationFn: (orientacion: Orientacion | "") => {
            if (!studentAirtableId) throw new Error("Student ID not available.");
            return updateAirtableRecord(AIRTABLE_TABLE_NAME_ESTUDIANTES, studentAirtableId, { [FIELD_ORIENTACION_ELEGIDA_ESTUDIANTES]: orientacion || null });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student', legajo] });
        },
        onError: (error) => showModal('Error', `No se pudo guardar tu orientación: ${error.message}`),
    });

    const updateInternalNotes = useMutation({
        mutationFn: (notes: string) => {
            if (!studentAirtableId) throw new Error("Student ID not available.");
            return updateAirtableRecord(AIRTABLE_TABLE_NAME_ESTUDIANTES, studentAirtableId, { [FIELD_NOTAS_INTERNAS_ESTUDIANTES]: notes || null });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student', legajo] });
            showModal('Éxito', 'Las notas internas se han guardado correctamente.');
        },
        onError: (error) => showModal('Error', `No se pudieron guardar las notas: ${error.message}`),
    });

    return {
        studentDetails,
        studentAirtableId,
        isStudentLoading,
        studentError,
        updateOrientation,
        updateInternalNotes,
        refetchStudent
    };
};
