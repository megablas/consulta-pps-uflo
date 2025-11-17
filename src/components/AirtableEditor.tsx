import React, { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { db } from '../lib/db';
import { schema } from '../lib/airtableSchema';
import type { AirtableRecord } from '../types';
import SubTabs from './SubTabs';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import RecordEditModal from './RecordEditModal';
import { formatDate, normalizeStringForComparison } from '../utils/formatters';
import Card from './Card';

const EDITABLE_TABLES = {
    lanzamientos: { 
        label: 'Lanzamientos', 
        icon: 'rocket_launch', 
        schema: schema.lanzamientos,
        displayFields: ['nombrePPS', 'fechaInicio'],
        fieldConfig: [
            { key: 'nombrePPS', label: 'Nombre PPS', type: 'text' as const },
            { key: 'fechaInicio', label: 'Fecha Inicio', type: 'date' as const },
            { key: 'fechaFin', label: 'Fecha Finalización', type: 'date' as const },
            { key: 'orientacion', label: 'Orientación', type: 'select' as const, options: ['Clinica', 'Educacional', 'Laboral', 'Comunitaria'] },
            { key: 'horasAcreditadas', label: 'Horas Acreditadas', type: 'number' as const },
            { key: 'cuposDisponibles', label: 'Cupos', type: 'number' as const },
            { key: 'estadoConvocatoria', label: 'Estado Convocatoria', type: 'select' as const, options: ['Abierta', 'Cerrado', 'Oculto'] },
            { key: 'estadoGestion', label: 'Estado Gestión', type: 'select' as const, options: ['Pendiente de Gestión', 'En Conversación', 'Relanzamiento Confirmado', 'No se Relanza', 'Archivado'] },
            { key: 'notasGestion', label: 'Notas de Gestión', type: 'textarea' as const },
        ]
    },
    estudiantes: { 
        label: 'Estudiantes', 
        icon: 'school', 
        schema: schema.estudiantes,
        displayFields: ['nombre', 'legajo'],
        fieldConfig: [
            { key: 'nombre', label: 'Nombre Completo', type: 'text' as const },
            { key: 'legajo', label: 'Legajo', type: 'text' as const },
            { key: 'dni', label: 'DNI', type: 'number' as const },
            { key: 'correo', label: 'Correo', type: 'email' as const },
            { key: 'telefono', label: 'Teléfono', type: 'tel' as const },
            { key: 'orientacionElegida', label: 'Orientación Elegida', type: 'select' as const, options: ['', 'Clinica', 'Educacional', 'Laboral', 'Comunitaria'] },
            { key: 'notasInternas', label: 'Notas Internas', type: 'textarea' as const },
        ]
    },
    instituciones: { 
        label: 'Instituciones', 
        icon: 'apartment', 
        schema: schema.instituciones,
        displayFields: ['nombre', 'telefono'],
        fieldConfig: [
            { key: 'nombre', label: 'Nombre', type: 'text' as const },
            { key: 'telefono', label: 'Teléfono', type: 'tel' as const },
            { key: 'direccion', label: 'Dirección', type: 'text' as const },
            { key: 'convenioNuevo', label: 'Convenio Nuevo', type: 'checkbox' as const },
        ]
    },
};

type TableKey = keyof typeof EDITABLE_TABLES;

const mockLanzamientosData = [
    { id: 'recLanzTest1', fields: { 'Nombre PPS': 'PPS de Prueba 1', 'Fecha Inicio': '2024-08-01', 'Orientación': 'Clinica', 'Cupos disponibles': 5 } },
    { id: 'recLanzTest2', fields: { 'Nombre PPS': 'PPS de Prueba 2', 'Fecha Inicio': '2024-09-01', 'Orientación': 'Educacional', 'Cupos disponibles': 3 } },
];
const mockEstudiantesData = [
    { id: 'recEstTest1', fields: { 'Nombre': 'Estudiante Test A', 'Legajo': 'T0001' } },
    { id: 'recEstTest2', fields: { 'Nombre': 'Estudiante Test B', 'Legajo': 'T0002' } },
];
const mockInstitucionesData = [
    { id: 'recInstTest1', fields: { 'Nombre': 'Institución de Prueba', 'Teléfono': '123456' } },
];

interface AirtableEditorProps {
  isTestingMode?: boolean;
}

const SortableHeader: React.FC<{
  label: string;
  sortKey: string;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  requestSort: (key: string) => void;
  className?: string;
}> = ({ label, sortKey, sortConfig, requestSort, className = "text-left" }) => {
  const isActive = sortConfig.key === sortKey;
  const icon = isActive ? (sortConfig.direction === 'asc' ? 'arrow_upward' : 'arrow_downward') : 'unfold_more';
  
  return (
    <th
      scope="col"
      className={`p-3 cursor-pointer select-none group transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-700/50 ${className}`}
      onClick={() => requestSort(sortKey)}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-slate-500 dark:text-slate-400">{label}</span>
        <span className={`material-icons !text-base transition-opacity ${isActive ? 'opacity-90 text-slate-800 dark:text-slate-200' : 'opacity-40 group-hover:opacity-70'}`}>{icon}</span>
      </div>
    </th>
  );
};

const AirtableEditor: React.FC<AirtableEditorProps> = ({ isTestingMode = false }) => {
    const [activeTable, setActiveTable] = useState<TableKey>('lanzamientos');
    const [editingRecord, setEditingRecord] = useState<AirtableRecord<any> | { isCreating: true } | null>(null);
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' }>({ key: '', direction: 'asc' });
    const queryClient = useQueryClient();

    const [mockData, setMockData] = useState({
        lanzamientos: mockLanzamientosData,
        estudiantes: mockEstudiantesData,
        instituciones: mockInstitucionesData,
    });
    
    const { data, isLoading, error } = useQuery({
        queryKey: ['airtableEditor', activeTable, isTestingMode],
        queryFn: () => {
             if (isTestingMode) {
                return Promise.resolve(mockData[activeTable] as AirtableRecord<any>[]);
            }
            return db[activeTable].getAll();
        },
    });

    const mutationOptions = {
        onSuccess: (message: string) => {
            setToastInfo({ message, type: 'success' as const });
            queryClient.invalidateQueries({ queryKey: ['airtableEditor', activeTable, isTestingMode] });
            setEditingRecord(null);
        },
        onError: (e: Error) => setToastInfo({ message: `Error: ${e.message}`, type: 'error' as const }),
    };

    const updateMutation = useMutation({
        mutationFn: ({ recordId, fields }: { recordId: string, fields: any }) => {
             if (isTestingMode) {
                console.log('TEST MODE: Simulating update:', { recordId, fields });
                setMockData(prev => {
                    const tableData = prev[activeTable];
                    const updatedData = tableData.map(record => {
                        if (record.id === recordId) {
                            const newFields = { ...record.fields };
                            const schema = EDITABLE_TABLES[activeTable].schema;
                            for (const key in fields) {
                                const airtableKey = (schema as any)[key] || key;
                                newFields[airtableKey] = fields[key];
                            }
                            return { ...record, fields: newFields };
                        }
                        return record;
                    });
                    return { ...prev, [activeTable]: updatedData as any };
                });
                return new Promise(resolve => setTimeout(() => resolve(null), 500));
            }
            return db[activeTable].update(recordId, fields);
        },
        ...mutationOptions,
        onSuccess: () => mutationOptions.onSuccess('Registro actualizado con éxito.'),
    });

    const createMutation = useMutation({
        mutationFn: (fields: any) => {
            if (isTestingMode) {
                const newRecord = { id: `rec_mock_${Date.now()}`, fields: {} as any };
                 const schema = EDITABLE_TABLES[activeTable].schema;
                for (const key in fields) {
                    const airtableKey = (schema as any)[key] || key;
                    newRecord.fields[airtableKey] = fields[key];
                }
                setMockData(prev => ({ ...prev, [activeTable]: [...prev[activeTable], newRecord] as any }));
                return new Promise(resolve => setTimeout(() => resolve(null), 500));
            }
            return db[activeTable].create(fields);
        },
        ...mutationOptions,
        onSuccess: () => mutationOptions.onSuccess('Registro creado con éxito.'),
    });

    const duplicateMutation = useMutation({
        mutationFn: (record: AirtableRecord<any>) => {
            const { id, createdTime, ...originalFields } = record.fields;
            const newFields: { [key: string]: any } = {};
            const schema = EDITABLE_TABLES[activeTable].schema as any;

            // Map Airtable field names back to dev-friendly keys for create function
            for (const airtableKey in originalFields) {
                const devKey = Object.keys(schema).find(key => schema[key] === airtableKey);
                if (devKey) {
                    newFields[devKey] = originalFields[airtableKey];
                }
            }

            const primaryFieldKey = EDITABLE_TABLES[activeTable].displayFields[0];
            if (newFields[primaryFieldKey]) {
                 newFields[primaryFieldKey] = `${newFields[primaryFieldKey]} (Copia)`;
            }

            if (isTestingMode) {
                console.log('TEST MODE: Duplicating record with fields:', newFields);
                const newRecord = { id: `rec_mock_dup_${Date.now()}`, fields: {} as any };
                for (const key in newFields) {
                    const airtableKey = (schema as any)[key] || key;
                    newRecord.fields[airtableKey] = newFields[key];
                }
                setMockData(prev => ({ ...prev, [activeTable]: [...prev[activeTable], newRecord] as any }));
                return new Promise(resolve => setTimeout(() => resolve(null), 500));
            }

            return db[activeTable].create(newFields);
        },
        ...mutationOptions,
        onSuccess: () => mutationOptions.onSuccess('Registro duplicado con éxito.'),
    });

    const tableTabs = Object.entries(EDITABLE_TABLES).map(([key, { label, icon }]) => ({ id: key, label, icon }));
    const activeTableConfig = EDITABLE_TABLES[activeTable];

    const processedData = useMemo(() => {
        if (!data) return [];
        
        const filtered = data.filter(record => {
            if (!searchTerm) return true;
            const normalizedSearch = normalizeStringForComparison(searchTerm);
            const primaryFieldKey = activeTableConfig.displayFields[0];
            const primaryFieldName = (activeTableConfig.schema as any)[primaryFieldKey] || primaryFieldKey;
            const primaryValue = record.fields[primaryFieldName];
            return normalizeStringForComparison(String(primaryValue || '')).includes(normalizedSearch);
        });

        if (sortConfig.key) {
            const sortFieldKey = sortConfig.key;
            const airtableSortField = (activeTableConfig.schema as any)[sortFieldKey] || sortFieldKey;
            
            filtered.sort((a, b) => {
                const valA = a.fields[airtableSortField];
                const valB = b.fields[airtableSortField];
                
                if (valA === null || valA === undefined) return 1;
                if (valB === null || valB === undefined) return -1;
                
                const comparison = String(valA).localeCompare(String(valB), undefined, { numeric: true });
                return sortConfig.direction === 'asc' ? comparison : -comparison;
            });
        }
        return filtered;
    }, [data, searchTerm, sortConfig, activeTableConfig]);
    
     const requestSort = (key: string) => {
        let direction: 'asc' | 'desc' = 'asc';
        if (sortConfig.key === key && sortConfig.direction === 'asc') {
            direction = 'desc';
        }
        setSortConfig({ key, direction });
    };

    return (
        <Card title="Editor de Base de Datos" icon="storage">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <div className="mt-4">
                <SubTabs tabs={tableTabs} activeTabId={activeTable} onTabChange={(id) => { setActiveTable(id as TableKey); setSearchTerm(''); setSortConfig({ key: '', direction: 'asc' }); }} />
            </div>

            <div className="mt-6 border-t border-slate-200/60 dark:border-slate-700/60 pt-6">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
                    <div className="relative w-full sm:w-72">
                        <input type="search" placeholder="Buscar en esta tabla..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg text-sm bg-white dark:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors" />
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 material-icons text-slate-400 dark:text-slate-500 !text-lg pointer-events-none">search</span>
                    </div>
                    <button onClick={() => setEditingRecord({ isCreating: true })} className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2 px-4 rounded-lg text-sm flex items-center justify-center gap-2 hover:bg-blue-700">
                        <span className="material-icons !text-base">add</span>
                        Añadir Registro
                    </button>
                </div>
                
                {isLoading && <Loader />}
                {error && <EmptyState icon="error" title="Error de Carga" message={error.message} />}
                {data && !isLoading && (
                    <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-700 rounded-lg">
                        <table className="w-full min-w-[600px] text-sm">
                            <thead className="bg-slate-50/70 dark:bg-slate-900/50">
                                <tr>
                                    {activeTableConfig.fieldConfig.map(field => (
                                        <SortableHeader key={field.key} label={field.label} sortKey={field.key} sortConfig={sortConfig} requestSort={requestSort} />
                                    ))}
                                    <th className="p-3 text-right font-semibold text-slate-500 dark:text-slate-400">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700">
                                {processedData.length > 0 ? processedData.map(record => {
                                    return (
                                        <tr key={record.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                            {activeTableConfig.fieldConfig.map(field => {
                                                const airtableKey = (activeTableConfig.schema as any)[field.key] || field.key;
                                                const value = record.fields[airtableKey];
                                                const displayValue = field.type === 'date' ? formatDate(value) : (typeof value === 'boolean' ? (value ? 'Sí' : 'No') : String(value || ''));
                                                return <td key={field.key} className="p-3 text-slate-700 dark:text-slate-300 truncate max-w-xs" title={displayValue}>{displayValue}</td>;
                                            })}
                                            <td className="p-3 text-right">
                                                <div className="inline-flex items-center gap-1">
                                                    <button onClick={() => duplicateMutation.mutate(record)} disabled={duplicateMutation.isPending} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400" aria-label="Duplicar">
                                                        <span className="material-icons !text-base">content_copy</span>
                                                    </button>
                                                    <button onClick={() => setEditingRecord(record)} className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400" aria-label="Editar">
                                                        <span className="material-icons !text-base">edit</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                }) : (
                                    <tr><td colSpan={activeTableConfig.fieldConfig.length + 1}><EmptyState icon="search_off" title="Sin Resultados" message="No hay registros que coincidan con tu búsqueda." /></td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {editingRecord && (
                <RecordEditModal
                    isOpen={!!editingRecord}
                    onClose={() => setEditingRecord(null)}
                    record={'isCreating' in editingRecord ? null : editingRecord}
                    tableConfig={activeTableConfig}
                    onSave={(recordId, fields) => {
                        if (recordId) {
                            updateMutation.mutate({ recordId, fields });
                        } else {
                            createMutation.mutate(fields);
                        }
                    }}
                    isSaving={updateMutation.isPending || createMutation.isPending}
                />
            )}
        </Card>
    );
};

export default AirtableEditor;
