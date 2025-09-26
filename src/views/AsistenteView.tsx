import React, { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminSearch from '../components/AdminSearch';
import Card from '../components/Card';
import Loader from '../components/Loader';
import EmptyState from '../components/EmptyState';
import Toast from '../components/Toast';
import { db } from '../lib/db';
import { fetchAirtableData } from '../services/airtableService';
import { 
    CONFERENCE_PPS_NAME, 
    CONFERENCE_MODULES, 
    AIRTABLE_TABLE_NAME_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_ASISTENCIA_ESTUDIANTE,
    FIELD_ASISTENCIA_MODULO_ID,
    FIELD_ASISTENCIA_MODULO_NOMBRE,
    FIELD_ASISTENCIA_FECHA,
    FIELD_ASISTENCIA_ORIENTACION,
    FIELD_ASISTENCIA_HORAS
} from '../constants';
import type { AirtableRecord, EstudianteFields, ConferenceModule, PracticaFields, AsistenciaJornadaFields } from '../types';
import { getEspecialidadClasses, formatDate } from '../utils/formatters';

interface RecentlyRegistered {
    studentId: string;
    studentName: string;
    module: ConferenceModule;
    asistenciaId: string;
    timestamp: number;
}

const AsistenteView: React.FC = () => {
    const [selectedModuleId, setSelectedModuleId] = useState<string>(CONFERENCE_MODULES[0].id);
    const [searchResults, setSearchResults] = useState<AirtableRecord<EstudianteFields>[]>([]);
    const [isSearching, setIsSearching] = useState(false);
    const [recentlyRegistered, setRecentlyRegistered] = useState<RecentlyRegistered[]>([]);
    const [toastInfo, setToastInfo] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const queryClient = useQueryClient();

    const { data: conferenceLaunch, isLoading: isLoadingLaunch, error: launchError } = useQuery({
        queryKey: ['conferenceLaunch', CONFERENCE_PPS_NAME],
        queryFn: async () => {
            const records = await db.lanzamientos.get({
                filterByFormula: `{Nombre PPS} = '${CONFERENCE_PPS_NAME}'`,
                maxRecords: 1,
            });
            
            if (records.length > 0) {
                return records[0];
            }

            console.warn(`Master launch for "${CONFERENCE_PPS_NAME}" not found. Creating it now...`);
            
            const newLaunchData = {
                nombrePPS: CONFERENCE_PPS_NAME,
                fechaInicio: '2025-10-07',
                fechaFin: '2025-10-09',
                orientacion: 'Comunitaria',
                estadoConvocatoria: 'Cerrado',
                horasAcreditadas: 30,
            };

            const createdRecord = await db.lanzamientos.create(newLaunchData);

            if (!createdRecord) {
                throw new Error(`No se pudo crear automáticamente el registro maestro para "${CONFERENCE_PPS_NAME}". Por favor, créelo manualmente en la tabla 'Lanzamientos de PPS' de Airtable.`);
            }

            console.log(`Successfully created master launch record with ID: ${createdRecord.id}`);
            return createdRecord;
        },
        retry: false,
    });

    const registrationMutation = useMutation({
        mutationFn: async ({ student, module }: { student: AirtableRecord<EstudianteFields>, module: ConferenceModule }) => {
            if (!conferenceLaunch) throw new Error("El lanzamiento de la conferencia no está cargado.");
            
            const existingAttendance = await db.asistenciasJornada.get({
                filterByFormula: `AND(FIND('${student.id}', ARRAYJOIN({${FIELD_ASISTENCIA_ESTUDIANTE}})), {${FIELD_ASISTENCIA_MODULO_ID}} = '${module.id}')`,
                maxRecords: 1
            });

            if (existingAttendance.length > 0) {
                throw new Error('Este estudiante ya tiene registrada la asistencia a este módulo.');
            }

            const newAttendance = {
                estudianteLink: [student.id],
                moduloId: module.id,
                moduloAsistido: module.name,
                fecha: module.date,
                orientacion: module.orientation,
                horas: module.hours,
            };

            const createdRecord = await db.asistenciasJornada.create(newAttendance);
            if (!createdRecord) throw new Error("No se pudo crear el registro de asistencia.");
            
            return { student, module, asistenciaId: createdRecord.id };
        },
        onSuccess: ({ student, module, asistenciaId }) => {
            setToastInfo({ message: `Asistencia registrada para ${student.fields.Nombre} en ${module.name}.`, type: 'success' });
            setRecentlyRegistered(prev => [{
                studentId: student.id,
                studentName: student.fields.Nombre || 'N/A',
                module,
                asistenciaId: asistenciaId,
                timestamp: Date.now()
            }, ...prev].slice(0, 5));
        },
        onError: (error: Error) => {
            setToastInfo({ message: error.message, type: 'error' });
        }
    });

    const undoMutation = useMutation({
        mutationFn: (asistenciaId: string) => db.asistenciasJornada.delete(asistenciaId),
        onSuccess: (_, asistenciaId) => {
            setToastInfo({ message: 'Registro de asistencia deshecho.', type: 'success' });
            setRecentlyRegistered(prev => prev.filter(r => r.asistenciaId !== asistenciaId));
        },
        onError: (error: Error) => {
            setToastInfo({ message: `No se pudo deshacer: ${error.message}`, type: 'error' });
        }
    });

    const handleSearch = useCallback(async (term: string) => {
        if (term.length < 3) {
            setSearchResults([]);
            return;
        }
        setIsSearching(true);
        const cleanedTerm = term.replace(/"/g, '\\"').toLowerCase();
        const formula = `OR(
            SEARCH("${cleanedTerm}", LOWER({${FIELD_NOMBRE_ESTUDIANTES}})),
            SEARCH("${cleanedTerm}", {${FIELD_LEGAJO_ESTUDIANTES}} & '')
        )`;

        const { records } = await fetchAirtableData<EstudianteFields>(
            AIRTABLE_TABLE_NAME_ESTUDIANTES,
            [FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES],
            formula,
            10
        );
        setSearchResults(records);
        setIsSearching(false);
    }, []);

    const selectedModule = useMemo(() => CONFERENCE_MODULES.find(m => m.id === selectedModuleId)!, [selectedModuleId]);

    if (isLoadingLaunch) return <div className="p-8 flex justify-center"><Loader /></div>;
    if (launchError) return <EmptyState icon="error" title="Error de Configuración" message={launchError.message} />;

    return (
        <div className="space-y-6 animate-fade-in-up">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            
            <Card icon="how_to_reg" title="Registro de Asistencia a Jornada" description="Selecciona un módulo y busca al estudiante para registrar su asistencia. La acreditación final se hará por un administrador.">
                <div className="mt-6 pt-6 border-t border-slate-200/60 dark:border-slate-700 space-y-6">
                    <div>
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 block">1. Seleccionar Módulo</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
                            {CONFERENCE_MODULES.map(module => (
                                <button
                                    key={module.id}
                                    onClick={() => setSelectedModuleId(module.id)}
                                    className={`p-3 rounded-lg text-sm font-semibold text-center transition-all duration-200 border-2 ${selectedModuleId === module.id ? 'bg-blue-600 text-white border-blue-700 shadow-md' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-slate-50 dark:hover:bg-slate-600'}`}
                                >
                                    {module.name}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2 block">2. Buscar Estudiante</label>
                        <AdminSearch onStudentSelect={() => {}} onSearchChange={handleSearch} />
                    </div>

                    <div className="min-h-[150px]">
                        {isSearching ? <div className="flex justify-center p-4"><Loader /></div> :
                         searchResults.length > 0 ? (
                            <ul className="space-y-2 max-h-64 overflow-y-auto">
                                {searchResults.map(student => (
                                    <li key={student.id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                                        <div>
                                            <p className="font-semibold">{student.fields.Nombre}</p>
                                            <p className="text-sm text-slate-500 font-mono">{student.fields.Legajo}</p>
                                        </div>
                                        <button 
                                            onClick={() => registrationMutation.mutate({ student, module: selectedModule })}
                                            disabled={registrationMutation.isPending}
                                            className="bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow hover:bg-emerald-700 disabled:bg-slate-400"
                                        >
                                            Registrar Asistencia
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-sm text-slate-500 pt-8">Escribe un nombre o legajo para buscar...</p>
                        )}
                    </div>
                </div>
            </Card>

            <Card icon="history" title="Registros Recientes">
                <div className="mt-4 pt-4 border-t border-slate-200/60 dark:border-slate-700">
                    {recentlyRegistered.length > 0 ? (
                        <ul className="space-y-3">
                            {recentlyRegistered.map(item => (
                                <li key={item.timestamp} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg animate-fade-in-up" style={{animationDuration: '300ms'}}>
                                    <div>
                                        <p className="font-semibold">{item.studentName}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">Registrado en: {item.module.name} ({item.module.orientation})</p>
                                    </div>
                                    <button
                                        onClick={() => undoMutation.mutate(item.asistenciaId)}
                                        disabled={undoMutation.isPending}
                                        className="text-sm font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-800 dark:hover:text-rose-300 disabled:opacity-50"
                                    >
                                        Deshacer
                                    </button>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <EmptyState icon="person_add_disabled" title="Sin Actividad" message="Los últimos estudiantes registrados aparecerán aquí." />
                    )}
                </div>
            </Card>
        </div>
    );
};

export default AsistenteView;