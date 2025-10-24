import React, { createContext, useContext, ReactNode, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useStudentData } from './useStudentData';
import { useStudentPracticas } from './useStudentPracticas';
import { useStudentSolicitudes } from './useStudentSolicitudes';
import { useConvocatorias } from './useConvocatorias';

import type { UseMutationResult } from '@tanstack/react-query';
import type {
    EstudianteFields, Practica, SolicitudPPS, LanzamientoPPS, Convocatoria, Orientacion, InformeTask, AirtableRecord
} from '../types';

interface StudentPanelContextType {
    // Data from hooks
    studentDetails: EstudianteFields | null;
    studentAirtableId: string | null;
    practicas: Practica[];
    solicitudes: SolicitudPPS[];
    lanzamientos: LanzamientoPPS[];
    myEnrollments: Convocatoria[];
    allLanzamientos: LanzamientoPPS[];
    institutionAddressMap: Map<string, string>;

    // Aggregated states
    isLoading: boolean;
    error: Error | null;

    // Mutations and refetch functions
    updateOrientation: UseMutationResult<any, Error, Orientacion | "", unknown>;
    updateInternalNotes: UseMutationResult<any, Error, string, unknown>;
    updateNota: UseMutationResult<(AirtableRecord<any> | null)[], Error, { practicaId: string; nota: string; convocatoriaId?: string; }, unknown>;
    enrollStudent: { mutate: (lanzamiento: LanzamientoPPS) => void; isPending: boolean; };
    confirmInforme: UseMutationResult<any, Error, InformeTask, { previousConvocatoriasData: any; previousPracticasData: any; }>;
    refetchAll: () => void;
}

const StudentPanelContext = createContext<StudentPanelContextType | undefined>(undefined);

/**
 * Provides all data related to a specific student panel.
 * This component acts as a single data-fetching orchestrator for the student dashboard.
 */
export const StudentPanelProvider: React.FC<{ legajo: string; children: ReactNode }> = ({ legajo, children }) => {
    const { isSuperUserMode } = useAuth();

    // Call all the individual data hooks in one central place.
    const { studentDetails, studentAirtableId, isStudentLoading, studentError, updateOrientation, updateInternalNotes, refetchStudent } = useStudentData(legajo);
    const { practicas, isPracticasLoading, practicasError, updateNota, refetchPracticas } = useStudentPracticas(legajo);
    const { solicitudes, isSolicitudesLoading, solicitudesError, refetchSolicitudes } = useStudentSolicitudes(legajo, studentAirtableId);
    const {
        lanzamientos, myEnrollments, allLanzamientos, isConvocatoriasLoading, convocatoriasError,
        enrollStudent, confirmInforme, refetchConvocatorias, institutionAddressMap
    } = useConvocatorias(legajo, studentAirtableId, isSuperUserMode);

    // Aggregate loading and error states into a single source of truth.
    const isLoading = isStudentLoading || isPracticasLoading || isSolicitudesLoading || isConvocatoriasLoading;
    const error = studentError || practicasError || solicitudesError || convocatoriasError;

    // Create a memoized function to refetch all data at once.
    const refetchAll = useCallback(() => {
        refetchStudent();
        refetchPracticas();
        refetchSolicitudes();
        refetchConvocatorias();
    }, [refetchStudent, refetchPracticas, refetchSolicitudes, refetchConvocatorias]);

    const value = {
        studentDetails,
        studentAirtableId,
        practicas,
        solicitudes,
        lanzamientos,
        myEnrollments,
        allLanzamientos,
        institutionAddressMap,
        isLoading,
        error,
        updateOrientation,
        updateInternalNotes,
        updateNota,
        enrollStudent,
        confirmInforme,
        refetchAll
    };

    return (
        <StudentPanelContext.Provider value={value as StudentPanelContextType}>
            {children}
        </StudentPanelContext.Provider>
    );
};

/**
 * Custom hook to consume the StudentPanelContext.
 * Components within the StudentPanelProvider tree can use this to access all student data.
 */
export const useStudentPanel = (): StudentPanelContextType => {
    const context = useContext(StudentPanelContext);
    if (!context) {
        throw new Error('useStudentPanel must be used within a StudentPanelProvider');
    }
    return context;
};