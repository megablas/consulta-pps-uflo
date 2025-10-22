import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchStudentData } from '../services/dataService';
import { db } from '../lib/db';
import type { Orientacion } from '../types';
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
            return db.estudiantes.update(studentAirtableId, { orientacionElegida: orientacion || null });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['student', legajo] });
        },
        onError: (error) => showModal('Error', `No se pudo guardar tu orientación: ${error.message}`),
    });

    const updateInternalNotes = useMutation({
        mutationFn: (notes: string) => {
            if (!studentAirtableId) throw new Error("Student ID not available.");
            return db.estudiantes.update(studentAirtableId, { notasInternas: notes || null });
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