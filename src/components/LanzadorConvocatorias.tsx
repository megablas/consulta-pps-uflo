import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import type { InstitucionFields, LanzamientoPPSFields, AirtableRecord } from '../types';
import {
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
} from '../constants';
import Card from './Card';
import Loader from './Loader';
import Toast from './Toast';
import { ALL_ORIENTACIONES } from '../types';
import { normalizeStringForComparison } from '../utils/formatters';

const mockInstitutions = [
  { id: 'recInstMock1', fields: { 'Nombre': 'Hospital de Juguete' } },
  { id: 'recInstMock2', fields: { 'Nombre': 'Escuela de Pruebas' } },
  { id: 'recInstMock3', fields: { 'Nombre': 'Empresa Ficticia S.A.' } },
];

const mockLastLanzamiento = {
  id: 'recLanzMock1',
  fields: {
    'Orientación': 'Clinica',
    'Horas Acreditadas': 120,
    'Cupos disponibles': 5,
    'Informe': 'http://example.com/informe-mock',
    'Horario Seleccionado': 'Lunes y Miércoles 9 a 13hs',
  }
};

type FormData = {
    [key: string]: string | number | undefined | null;
    nombrePPS: string | undefined;
    fechaInicio: string | undefined;
    fechaFin: string | undefined;
    orientacion: string | undefined;
    horasAcreditadas: number | undefined;
    cuposDisponibles: number | undefined;
    informe: string | undefined;
    horarioSeleccionado: string | undefined;
    estadoConvocatoria: string | undefined;
};

const initialState: FormData = {
    nombrePPS: '',
    fechaInicio: '',
    fechaFin: '',
    orientacion: '',
    horasAcreditadas: 0,
    cuposDisponibles: 1,
    informe: '',
    horarioSeleccionado: '',
    estadoConvocatoria: 'Abierta',
};

interface LanzadorConvocatoriasProps {
  isTestingMode?: boolean;
}


const LanzadorConvocatorias: React.FC<LanzadorConvocatoriasProps> = ({ isTestingMode = false }) => {
    const [formData, setFormData] = useState<FormData>(initialState);
    const [instiSearch, setInstiSearch] = useState('');
    const [selectedInstitution, setSelectedInstitution] = useState<AirtableRecord<InstitucionFields> | null>(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const queryClient = useQueryClient();

    const { data: institutions = [], isLoading: isLoadingInstitutions } = useQuery<AirtableRecord<InstitucionFields>[]>({
        queryKey: ['allInstitutionsForLauncher', isTestingMode],
        queryFn: () => {
            if (isTestingMode) {
                return Promise.resolve(mockInstitutions as AirtableRecord<InstitucionFields>[]);
            }
            return db.instituciones.getAll({ fields: [FIELD_NOMBRE_INSTITUCIONES] });
        },
    });

    const { data: lastLanzamiento, isLoading: isLoadingLastLanzamiento } = useQuery({
        queryKey: ['lastLanzamiento', selectedInstitution?.id, isTestingMode],
        queryFn: async () => {
            if (!selectedInstitution) return null;
            if (isTestingMode) {
                if (mockInstitutions.some(i => i.id === selectedInstitution.id)) {
                    return mockLastLanzamiento as AirtableRecord<LanzamientoPPSFields>;
                }
                return null;
            }
            const records = await db.lanzamientos.get({
                filterByFormula: `{${FIELD_NOMBRE_PPS_LANZAMIENTOS}} = "${selectedInstitution.fields[FIELD_NOMBRE_INSTITUCIONES]?.replace(/"/g, '\\"')}"`,
                sort: [{ field: 'Fecha Inicio', direction: 'desc' }],
                maxRecords: 1,
            });
            return records[0] || null;
        },
        enabled: !!selectedInstitution,
    });

    const createLaunchMutation = useMutation({
        mutationFn: (newLaunchData: FormData) => {
            if (isTestingMode) {
                console.log('TEST MODE: Simulating launch creation with data:', newLaunchData);
                return new Promise(resolve => setTimeout(() => resolve(null), 1000));
            }
            return db.lanzamientos.create(newLaunchData as any);
        },
        onSuccess: () => {
            setToastInfo({ message: 'Convocatoria lanzada con éxito.', type: 'success' });
            setFormData(initialState);
            setInstiSearch('');
            setSelectedInstitution(null);
            if (!isTestingMode) {
                queryClient.invalidateQueries({ queryKey: ['allLanzamientos'] });
            }
        },
        onError: (error: any) => {
            setToastInfo({ message: `Error al lanzar: ${error.message}`, type: 'error' });
        },
    });

    const filteredInstitutions = useMemo(() => {
        if (!instiSearch) return [];
        const normalizedSearch = normalizeStringForComparison(instiSearch);
        return institutions
            .filter(inst => normalizeStringForComparison(inst.fields[FIELD_NOMBRE_INSTITUCIONES]).includes(normalizedSearch))
            .slice(0, 7);
    }, [instiSearch, institutions]);

    const handleSelectInstitution = (inst: AirtableRecord<InstitucionFields>) => {
        setSelectedInstitution(inst);
        setInstiSearch(inst.fields[FIELD_NOMBRE_INSTITUCIONES] || '');
        setFormData(prev => ({ ...prev, nombrePPS: inst.fields[FIELD_NOMBRE_INSTITUCIONES] || '' }));
        setIsDropdownOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };
    
    const handleLoadLastData = () => {
        if (!lastLanzamiento) return;
        setFormData(prev => ({
            ...prev,
            orientacion: lastLanzamiento.fields.Orientación,
            horasAcreditadas: lastLanzamiento.fields['Horas Acreditadas'],
            cuposDisponibles: lastLanzamiento.fields['Cupos disponibles'],
            informe: lastLanzamiento.fields.Informe,
            horarioSeleccionado: lastLanzamiento.fields['Horario Seleccionado'],
        }));
        setToastInfo({ message: 'Datos de la última convocatoria cargados.', type: 'success' });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.nombrePPS || !formData.fechaInicio || !formData.orientacion || !formData.horasAcreditadas) {
            setToastInfo({ message: 'Por favor, complete los campos requeridos.', type: 'error' });
            return;
        }
        createLaunchMutation.mutate(formData);
    };

    return (
        <Card title="Lanzador de Convocatorias" icon="rocket_launch" description="Crea y publica una nueva oportunidad de PPS.">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <form onSubmit={handleSubmit} className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700/60 space-y-6">
                
                {/* Institution Search */}
                <div className="relative">
                    <label htmlFor="instiSearch" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Institución</label>
                    <input
                        id="instiSearch"
                        type="text"
                        value={instiSearch}
                        onChange={(e) => {
                            setInstiSearch(e.target.value);
                            setSelectedInstitution(null);
                            setIsDropdownOpen(true);
                        }}
                        onFocus={() => setIsDropdownOpen(true)}
                        placeholder="Escribe para buscar una institución..."
                        className="w-full form-input"
                        autoComplete="off"
                        required
                    />
                    {isDropdownOpen && filteredInstitutions.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white dark:bg-slate-800 rounded-md shadow-lg border border-slate-200 dark:border-slate-600">
                            <ul>
                                {filteredInstitutions.map(inst => (
                                    <li key={inst.id} onClick={() => handleSelectInstitution(inst)} className="p-3 hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer">
                                        {inst.fields[FIELD_NOMBRE_INSTITUCIONES]}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>

                {/* Load Last Data Button */}
                {isLoadingLastLanzamiento && <Loader />}
                {lastLanzamiento && (
                    <div className="flex justify-end">
                        <button type="button" onClick={handleLoadLastData} className="text-sm font-semibold text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 flex items-center gap-1">
                            <span className="material-icons !text-base">history</span>
                            Cargar datos de la última convocatoria
                        </button>
                    </div>
                )}

                {/* Date Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="fechaInicio" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Inicio</label>
                        <input type="date" name="fechaInicio" id="fechaInicio" value={formData.fechaInicio || ''} onChange={handleChange} className="w-full form-input" required/>
                    </div>
                    <div>
                        <label htmlFor="fechaFin" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Fecha de Finalización</label>
                        <input type="date" name="fechaFin" id="fechaFin" value={formData.fechaFin || ''} onChange={handleChange} className="w-full form-input" />
                    </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div>
                        <label htmlFor="orientacion" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Orientación</label>
                        <select name="orientacion" id="orientacion" value={formData.orientacion || ''} onChange={handleChange} className="w-full form-input" required>
                            <option value="" disabled>Seleccionar...</option>
                            {ALL_ORIENTACIONES.map(o => <option key={o} value={o}>{o}</option>)}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="horasAcreditadas" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Horas Acreditadas</label>
                        <input type="number" name="horasAcreditadas" id="horasAcreditadas" value={formData.horasAcreditadas || ''} onChange={handleChange} className="w-full form-input" required />
                    </div>
                    <div>
                        <label htmlFor="cuposDisponibles" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Cupos</label>
                        <input type="number" name="cuposDisponibles" id="cuposDisponibles" value={formData.cuposDisponibles || ''} onChange={handleChange} className="w-full form-input" required min="1"/>
                    </div>
                </div>

                {/* Text Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="horarioSeleccionado" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Horarios</label>
                        <input type="text" name="horarioSeleccionado" id="horarioSeleccionado" placeholder="Ej: Lunes y Miércoles de 9 a 13hs" value={formData.horarioSeleccionado || ''} onChange={handleChange} className="w-full form-input" />
                    </div>
                     <div>
                        <label htmlFor="informe" className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Link del Informe (Campus)</label>
                        <input type="url" name="informe" id="informe" placeholder="https://..." value={formData.informe || ''} onChange={handleChange} className="w-full form-input" />
                    </div>
                </div>
                
                {/* Submit Button */}
                <div className="pt-4 flex justify-end">
                    <button type="submit" disabled={createLaunchMutation.isPending} className="bg-blue-600 text-white font-bold py-3 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 flex items-center gap-2 hover:bg-blue-700">
                         {createLaunchMutation.isPending ? (
                             <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin"/><span>Lanzando...</span></>
                         ) : (
                             <><span className="material-icons !text-base">rocket_launch</span><span>Lanzar Convocatoria</span></>
                         )}
                    </button>
                </div>
            </form>
            <style>{`
                .form-input {
                    display: block;
                    width: 100%;
                    border-radius: 0.5rem;
                    border: 1px solid #cbd5e1;
                    padding: 0.75rem 1rem;
                    font-size: 0.875rem;
                    background-color: #f8fafc;
                    box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
                    transition: all 0.2s;
                }
                .dark .form-input {
                    background-color: #1e293b;
                    border-color: #475569;
                    color: #f1f5f9;
                }
                .form-input:focus {
                    outline: none;
                    border-color: #3b82f6;
                    box-shadow: 0 0 0 2px rgb(59 130 246 / 0.2);
                }
            `}</style>
        </Card>
    );
};

export default LanzadorConvocatorias;