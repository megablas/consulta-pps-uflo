import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchAllAirtableData, updateAirtableRecords } from '../services/airtableService';
import type { LanzamientoPPS, InstitucionFields, LanzamientoPPSFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  AIRTABLE_TABLE_NAME_INSTITUCIONES,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_CONVENIO_NUEVO_INSTITUCIONES,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import { parseToUTCDate, normalizeStringForComparison } from '../utils/formatters';
import { lanzamientoPPSArraySchema } from '../schemas';
import Card from './Card';
import Toast from './Toast';

// Fetches all PPS launches and institutions from Airtable
const fetchConveniosData = async (): Promise<{ launches: LanzamientoPPS[], institutions: (InstitucionFields & { id: string })[] }> => {
    const [launchesRes, institutionsRes] = await Promise.all([
        fetchAllAirtableData<LanzamientoPPSFields>(
            AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
            [
                FIELD_NOMBRE_PPS_LANZAMIENTOS,
                FIELD_FECHA_INICIO_LANZAMIENTOS,
                FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
            ],
        ),
        fetchAllAirtableData<InstitucionFields>(
            AIRTABLE_TABLE_NAME_INSTITUCIONES,
            [FIELD_NOMBRE_INSTITUCIONES, FIELD_CONVENIO_NUEVO_INSTITUCIONES]
        )
    ]);

    if (launchesRes.error || institutionsRes.error) {
        const errorObj = (launchesRes.error || institutionsRes.error)?.error;
        const errorMsg = typeof errorObj === 'string'
            ? errorObj
            : (errorObj && typeof errorObj === 'object' && 'message' in errorObj)
                ? String((errorObj as { message: unknown }).message)
                : 'Error al obtener los datos';
        throw new Error(`Error al cargar datos de convenios: ${errorMsg}`);
    }
  
    const launchesValidation = lanzamientoPPSArraySchema.safeParse(launchesRes.records);
    if (!launchesValidation.success) {
        console.error('[Zod Validation Error in NuevosConvenios Launches]:', launchesValidation.error.issues);
        throw new Error('Error de validación de datos para los lanzamientos.');
    }

    return {
        launches: launchesValidation.data.map(r => ({ ...r.fields, id: r.id })),
        institutions: institutionsRes.records.map(r => ({...r.fields, id: r.id}))
    };
};

interface GroupedInstitutionInfo {
    id: string; 
    groupName: string;
    totalCupos: number;
    subPps: { name: string; cupos: number }[];
}

export const NuevosConvenios: React.FC = () => {
    const queryClient = useQueryClient();
    const [targetYear, setTargetYear] = useState(new Date().getFullYear());
    const { data, isLoading, error } = useQuery({
        queryKey: ['nuevosConveniosData'],
        queryFn: fetchConveniosData,
    });
    
    const [selection, setSelection] = useState<Map<string, boolean>>(new Map
