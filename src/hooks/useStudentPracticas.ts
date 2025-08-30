import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchPracticas } from '../services/dataService';
import { updateAirtableRecord } from '../services/airtableService';
import type { AirtableRecord, AirtableErrorResponse } from '../types';
import { 
    AIRTABLE_TABLE_NAME_PRACTICAS, FIELD_NOTA_PRACTICAS, 
    AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_INFORME_SUBIDO_CONVOCATORIAS 
} from '../constants';
import { useModal } from '../contexts/ModalContext';

export const useStudentPracticas = (legajo: string) => {
    const queryClient = useQueryClient();
    const { showModal } = useModal();

    const { 
        data: practicas = [], 
        isLoading: isPracticasLoading, 
        error: practicasError, 
        refetch: refetchPracticas 
    } = useQuery({
        queryKey: ['practicas', legajo],
        queryFn: () => fetchPracticas(legajo),
    });

    const updateNota = useMutation<
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
            queryClient.invalidateQueries({ queryKey: ['practicas', legajo] });
            queryClient.invalidateQueries({ queryKey: ['convocatorias', legajo] });
        },
        onError: () => showModal('Error', 'No se pudo actualizar la nota.'),
    });

    return {
        practicas,
        isPracticasLoading,
        practicasError,
        updateNota,
        refetchPracticas
    };
};
