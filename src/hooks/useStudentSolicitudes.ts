import { useQuery } from '@tanstack/react-query';
import { fetchSolicitudes } from '../services/dataService';

export const useStudentSolicitudes = (legajo: string, studentAirtableId: string | null) => {
    const { 
        data: solicitudes = [], 
        isLoading: isSolicitudesLoading, 
        error: solicitudesError, 
        refetch: refetchSolicitudes 
    } = useQuery({
        queryKey: ['solicitudes', legajo],
        queryFn: () => fetchSolicitudes(legajo, studentAirtableId),
        enabled: !!legajo, // The query runs as soon as we have a legajo
    });

    return {
        solicitudes,
        isSolicitudesLoading,
        solicitudesError,
        refetchSolicitudes
    };
};