import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllAirtableData, updateAirtableRecord } from '../services/airtableService';
import type { LanzamientoPPS } from '../types';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS
} from '../constants';
import Loader from './Loader';
import EmptyState from './EmptyState';
import { formatDate, getStatusVisuals, getEspecialidadClasses } from '../utils/formatters';
import Toast from './Toast';

const STATUS_OPTIONS = ['Abierto', 'Cerrado', 'Oculto'];

const ConvocatoriaManager: React.FC = () => {
    const [lanzamientos, setLanzamientos] = useState<LanzamientoPPS[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const { records, error: fetchError } = await fetchAllAirtableData<LanzamientoPPS>(
            AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
            [
                FIELD_NOMBRE_PPS_LANZAMIENTOS,
                FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
                FIELD_FECHA_INICIO_LANZAMIENTOS,
                FIELD_ORIENTACION_LANZAMIENTOS,
            ],
            undefined, // No formula to fetch all
            [{ field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc' }]
        );

        if (fetchError) {
            setError('No se pudieron cargar las convocatorias. ' + (typeof fetchError.error === 'string' ? fetchError.error : fetchError.error.message));
        } else {
            const mappedRecords = records.map(r => ({ ...r.fields, id: r.id }));
            setLanzamientos(mappedRecords);
        }
        setIsLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleStatusChange = useCallback(async (id: string, newStatus: string) => {
        setUpdatingId(id);

        const originalLanzamientos = [...lanzamientos];
        const updatedLanzamientos = lanzamientos.map(l => 
            l.id === id ? { ...l, [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: newStatus } : l
        );
        setLanzamientos(updatedLanzamientos);

        const { error: updateError } = await updateAirtableRecord(
            AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
            id,
            { [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: newStatus }
        );

        if (updateError) {
            setLanzamientos(originalLanzamientos); // Revert on error
            setToastInfo({ message: 'Error al actualizar el estado.', type: 'error' });
        } else {
            setToastInfo({ message: 'Estado actualizado exitosamente.', type: 'success' });
        }
        setUpdatingId(null);
    }, [lanzamientos]);

    const renderContent = () => {
        if (isLoading) {
            return <Loader />;
        }
        if (error) {
            return <EmptyState icon="error" title="Error al Cargar" message={error} />;
        }
        if (lanzamientos.length === 0) {
            return <EmptyState icon="upcoming_off" title="Sin Convocatorias" message="No se encontraron lanzamientos de PPS en Airtable." />;
        }
        return (
            <div className="overflow-x-auto">
                <table className="w-full min-w-[800px] border-collapse">
                    <thead>
                        <tr className="border-b-2 border-slate-200">
                            <th className="p-4 text-left font-semibold text-slate-500 uppercase text-xs tracking-wider">Nombre PPS</th>
                            <th className="p-4 text-center font-semibold text-slate-500 uppercase text-xs tracking-wider">Orientación</th>
                            <th className="p-4 text-center font-semibold text-slate-500 uppercase text-xs tracking-wider">Fecha Inicio</th>
                            <th className="p-4 text-center font-semibold text-slate-500 uppercase text-xs tracking-wider">Estado Actual</th>
                            <th className="p-4 text-center font-semibold text-slate-500 uppercase text-xs tracking-wider">Cambiar Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lanzamientos.map(l => {
                            const status = l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS] || 'N/A';
                            const visuals = getStatusVisuals(status);
                            return (
                                <tr key={l.id} className="transition-colors duration-200 hover:bg-slate-50/50 border-b border-slate-200/60 last:border-b-0">
                                    <td className="p-4 align-middle font-semibold text-slate-800">{l[FIELD_NOMBRE_PPS_LANZAMIENTOS]}</td>
                                    <td className="p-4 align-middle text-center">
                                        <span className={getEspecialidadClasses(l[FIELD_ORIENTACION_LANZAMIENTOS]).tag}>
                                            {l[FIELD_ORIENTACION_LANZAMIENTOS] || 'N/A'}
                                        </span>
                                    </td>
                                    <td className="p-4 align-middle text-center text-slate-600">{formatDate(l[FIELD_FECHA_INICIO_LANZAMIENTOS])}</td>
                                    <td className="p-4 align-middle text-center">
                                        <span className={`${visuals.labelClass} gap-1.5`}>
                                            <span className="material-icons !text-sm">{visuals.icon}</span>
                                            <span>{status}</span>
                                        </span>
                                    </td>
                                    <td className="p-2 align-middle w-48">
                                        <select
                                            value={status}
                                            onChange={(e) => handleStatusChange(l.id, e.target.value)}
                                            disabled={updatingId === l.id}
                                            className={`w-full text-sm rounded-lg border-slate-300/80 p-2 text-slate-800 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-200 disabled:cursor-wait ${updatingId === l.id ? 'ring-2 ring-blue-400 border-blue-400' : ''}`}
                                            aria-label={`Cambiar estado para ${l[FIELD_NOMBRE_PPS_LANZAMIENTOS]}`}
                                        >
                                            {STATUS_OPTIONS.map(option => (
                                                <option key={option} value={option}>{option}</option>
                                            ))}
                                        </select>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        );
    }

    return (
        <div className="animate-fade-in-up space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <div>
                <h3 className="text-2xl font-bold text-slate-800">Gestionar Convocatorias de PPS</h3>
                <p className="text-slate-600 max-w-2xl mt-1">
                    Controla la visibilidad y el estado de las convocatorias para los estudiantes.
                </p>
            </div>
            {renderContent()}
        </div>
    );
};

export default ConvocatoriaManager;