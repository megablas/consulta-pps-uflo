import { useQuery } from '@tanstack/react-query';
import { fetchSolicitudes } from '../services/dataService';

export const useStudentSolicitudes = (legajo: string, studentAirtableId: string | null) => {
    const { 
        data: solicitudes = [], 
        isLoading: isSolicitudesLoading, 
        error: solicitudesError, 
        refetch: refetchSolicitudes 
    } = useQuery({
        queryKey: ['solicitudes', legajo, studentAirtableId],
        queryFn: () => fetchSolicitudes(legajo, studentAirtableId),
        enabled: !!studentAirtableId, // The query will not run until studentAirtableId is available
    });

    return {
        solicitudes,
        isSolicitudesLoading,
        solicitudesError,
        refetchSolicitudes
    };
};
