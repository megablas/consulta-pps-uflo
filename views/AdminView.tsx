import React, { useState, useCallback } from 'react';
import AdminSearch from '../components/AdminSearch';
import SeguroGenerator from '../components/SeguroGenerator';
import Dashboard from '../components/Dashboard';
import { DataProvider } from '../contexts/DataContext';
import { AuthUser } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import { fetchAirtableData, fetchAllAirtableData, updateAirtableRecords } from '../services/airtableService';
import { 
    AIRTABLE_TABLE_NAME_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_TELEFONO_ESTUDIANTES,
    FIELD_NOMBRE_SEPARADO_ESTUDIANTES,
    FIELD_APELLIDO_SEPARADO_ESTUDIANTES,
} from '../constants';
import type { EstudianteFields } from '../types';
import AdminDashboard from '../components/AdminDashboard';
import { splitNameWithAI } from '../services/aiService';


interface StudentTab {
    id: string; // legajo
    legajo: string;
    nombre: string;
    isSuperUser?: boolean;
}

// Function moved here to resolve a build error
function formatPhoneNumber(phone?: string): string {
  if (!phone) return '';
  // Removes '+54', an optional space, an optional '9', and another optional space from the start.
  return phone.replace(/^\+54\s?9?\s?/, '').trim();
}

const AdminView: React.FC = () => {
    const [studentTabs, setStudentTabs] = useState<StudentTab[]>([]);
    const [activeTabId, setActiveTabId] = useState('dashboard');
    
    const [isLoading, setIsLoading] = useState(false);
    const [isCleaningPhones, setIsCleaningPhones] = useState(false);
    const [isSplittingNames, setIsSplittingNames] = useState(false);
    const [modalInfo, setModalInfo] = React.useState<{title: string, message: string} | null>(null);

    const handleShowModal = useCallback((title: string, message: string) => {
        setModalInfo({ title, message });
    }, []);

    const handleSearch = useCallback(async (legajo: string) => {
        if (studentTabs.some(s => s.legajo === legajo)) {
            setActiveTabId(legajo);
            return;
        }

        setIsLoading(true);

        try {
            const { records, error } = await fetchAirtableData<EstudianteFields>(
                AIRTABLE_TABLE_NAME_ESTUDIANTES,
                [FIELD_NOMBRE_ESTUDIANTES],
                `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajo}'`,
                1
            );
            if (error) throw new Error(`Error al buscar: ${typeof error.error === 'string' ? error.error : error.error.message}`);

            if (records.length > 0 && records[0].fields[FIELD_NOMBRE_ESTUDIANTES]) {
                const studentRecord = records[0];
                const newStudent: StudentTab = {
                    id: legajo,
                    legajo: legajo,
                    nombre: studentRecord.fields[FIELD_NOMBRE_ESTUDIANTES]!,
                };
                setStudentTabs(prev => [...prev, newStudent]);
                setActiveTabId(legajo);
            } else {
                handleShowModal('Sin Resultados', `No se encontró un estudiante con el legajo ${legajo}.`);
            }
        } catch (e: any) {
            console.error('[AdminSearch] Error:', e);
            handleShowModal('Error de Búsqueda', e.message || 'Ocurrió un error al buscar al estudiante.');
        } finally {
            setIsLoading(false);
        }
    }, [studentTabs, handleShowModal]);
    
    const handleCloseTab = useCallback((tabId: string) => {
        setStudentTabs(prev => prev.filter(s => s.id !== tabId));
        // If the closed tab was active, switch to the search tab
        if (activeTabId === tabId) {
            setActiveTabId('dashboard');
        }
    }, [activeTabId]);

    const handleCleanPhoneNumbers = useCallback(async () => {
        const confirmation = window.confirm(
            "¿Estás seguro de que quieres limpiar los números de teléfono en la tabla 'Estudiantes'?\n\nEsta acción eliminará el prefijo '+54' de todos los números de teléfono. Esta operación no se puede deshacer."
        );
        if (!confirmation) return;
    
        setIsCleaningPhones(true);
        handleShowModal('Iniciando Limpieza', 'El proceso de limpieza de números de teléfono ha comenzado.');
        await new Promise(resolve => setTimeout(resolve, 50));
    
        try {
            handleShowModal('Paso 1 de 3: Obteniendo datos', 'Cargando todos los registros de estudiantes desde Airtable. Esto puede tardar...');
            await new Promise(resolve => setTimeout(resolve, 50));
    
            const { records: allStudents, error: fetchError } = await fetchAllAirtableData<EstudianteFields>(
                AIRTABLE_TABLE_NAME_ESTUDIANTES,
                [FIELD_TELEFONO_ESTUDIANTES]
            );
    
            if (fetchError) {
                 const errorMessage = typeof fetchError.error === 'string' ? fetchError.error : fetchError.error.message;
                 throw new Error(`Error al obtener estudiantes: ${errorMessage}`);
            }
            
            handleShowModal('Paso 2 de 3: Analizando datos', `Analizando ${allStudents.length} registros para encontrar números de teléfono para actualizar.`);
            await new Promise(resolve => setTimeout(resolve, 50));
    
            const recordsToUpdate = allStudents
                .map(record => {
                    const phone = record.fields[FIELD_TELEFONO_ESTUDIANTES];
                    if (phone && typeof phone === 'string' && /^\+54/.test(phone)) {
                        const newPhone = formatPhoneNumber(phone);
                        if (newPhone !== phone) {
                            return { id: record.id, fields: { [FIELD_TELEFONO_ESTUDIANTES]: newPhone }};
                        }
                    }
                    return null;
                })
                .filter(Boolean) as { id: string; fields: Partial<EstudianteFields> }[];
    
            if (recordsToUpdate.length === 0) {
                handleShowModal('Limpieza Completa', 'No se encontraron números de teléfono que necesitaran ser actualizados. Todos los números ya están en el formato correcto.');
                setIsCleaningPhones(false);
                return;
            }
    
            handleShowModal('Paso 3 de 3: Actualizando la base de datos', `Se encontraron ${recordsToUpdate.length} números para actualizar. Enviando cambios en lotes.`);
            await new Promise(resolve => setTimeout(resolve, 50));
    
            const batchSize = 10;
            let updatedCount = 0;
            for (let i = 0; i < recordsToUpdate.length; i += batchSize) {
                const batch = recordsToUpdate.slice(i, i + batchSize);
                
                handleShowModal('Paso 3 de 3: Actualizando la base de datos', `Actualizando lote ${Math.floor(i / batchSize) + 1} de ${Math.ceil(recordsToUpdate.length / batchSize)}... (${updatedCount}/${recordsToUpdate.length} actualizados)`);
                await new Promise(resolve => setTimeout(resolve, 50));
    
                const { error: updateError } = await updateAirtableRecords(
                    AIRTABLE_TABLE_NAME_ESTUDIANTES,
                    batch
                );
    
                if (updateError) {
                    const errorMessage = typeof updateError.error === 'string' ? updateError.error : updateError.error.message;
                    throw new Error(`Error al actualizar un lote de registros: ${errorMessage}. Se actualizaron ${updatedCount} registros antes del error.`);
                }
                updatedCount += batch.length;
            }
            
            handleShowModal('¡Éxito!', `Se han actualizado ${updatedCount} números de teléfono correctamente.`);
    
        } catch (e: any) {
            handleShowModal('Error en la Limpieza', e.message);
        } finally {
            setIsCleaningPhones(false);
        }
    }, [handleShowModal]);

    const handleSplitAndFillNames = useCallback(async () => {
        const confirmation = window.confirm(
            "¿Estás seguro de que quieres procesar los nombres de los estudiantes?\n\nEsta acción utilizará la IA para separar los nombres completos en 'Nombre' y 'Apellido' para todos los estudiantes que aún no los tengan. Esto puede consumir créditos de la API."
        );
        if (!confirmation) return;

        setIsSplittingNames(true);
        handleShowModal('Iniciando Procesamiento de Nombres', 'El proceso ha comenzado.');

        try {
            handleShowModal('Paso 1 de 3: Obteniendo datos', 'Buscando estudiantes con nombres sin procesar...');
            const filterFormula = `OR({${FIELD_NOMBRE_SEPARADO_ESTUDIANTES}} = '', {${FIELD_APELLIDO_SEPARADO_ESTUDIANTES}} = '', AND({${FIELD_NOMBRE_SEPARADO_ESTUDIANTES}} = BLANK(), {${FIELD_APELLIDO_SEPARADO_ESTUDIANTES}} = BLANK()))`;
            
            const { records: studentsToProcess, error: fetchError } = await fetchAllAirtableData<EstudianteFields>(
                AIRTABLE_TABLE_NAME_ESTUDIANTES,
                [FIELD_NOMBRE_ESTUDIANTES],
                filterFormula
            );
            if (fetchError) throw new Error(`Error al obtener estudiantes: ${typeof fetchError.error === 'string' ? fetchError.error : fetchError.error.message}`);
            
            if (studentsToProcess.length === 0) {
                handleShowModal('Proceso Completo', 'No se encontraron estudiantes que necesiten procesamiento de nombre. Todos los registros están actualizados.');
                setIsSplittingNames(false);
                return;
            }
            
            handleShowModal('Paso 2 de 3: Procesando con IA', `Se encontraron ${studentsToProcess.length} estudiantes. Procesando nombres... Esto puede tardar.`);
            
            const recordsToUpdate: { id: string; fields: Partial<EstudianteFields> }[] = [];
            for (const record of studentsToProcess) {
                const fullName = record.fields[FIELD_NOMBRE_ESTUDIANTES];
                if (fullName) {
                    const { nombre, apellido } = await splitNameWithAI(fullName);
                    recordsToUpdate.push({
                        id: record.id,
                        fields: {
                            [FIELD_NOMBRE_SEPARADO_ESTUDIANTES]: nombre,
                            [FIELD_APELLIDO_SEPARADO_ESTUDIANTES]: apellido,
                        }
                    });
                }
            }

            handleShowModal('Paso 3 de 3: Actualizando la base de datos', `Procesamiento con IA finalizado. Actualizando ${recordsToUpdate.length} registros en la base de datos...`);
            
            const batchSize = 10;
            let updatedCount = 0;
            for (let i = 0; i < recordsToUpdate.length; i += batchSize) {
                const batch = recordsToUpdate.slice(i, i + batchSize);
                await updateAirtableRecords(AIRTABLE_TABLE_NAME_ESTUDIANTES, batch);
                updatedCount += batch.length;
                handleShowModal('Paso 3 de 3: Actualizando...', `Actualizados ${updatedCount} de ${recordsToUpdate.length} registros...`);
            }
            
            handleShowModal('¡Éxito!', `Se han procesado y actualizado ${updatedCount} nombres de estudiantes.`);

        } catch (e: any) {
            handleShowModal('Error en el Procesamiento', e.message);
        } finally {
            setIsSplittingNames(false);
        }

    }, [handleShowModal]);
    
    const allTabs = [
        {
            id: 'dashboard',
            label: 'Dashboard',
            icon: 'dashboard',
            isClosable: false,
            content: <AdminDashboard />
        },
        {
            id: 'search',
            label: 'Buscar Estudiante',
            icon: 'person_search',
            isClosable: false,
            content: <AdminSearch onSearch={handleSearch} isLoading={isLoading} />
        },
        {
            id: 'insurance',
            label: 'Generador de Seguros',
            icon: 'shield',
            isClosable: false,
            content: <SeguroGenerator showModal={handleShowModal} />
        },
        {
            id: 'tools',
            label: 'Herramientas',
            icon: 'build',
            isClosable: false,
            content: (
                 <div className="animate-fade-in-up space-y-6">
                    <div>
                        <h3 className="text-xl font-bold text-slate-800">Herramientas de Administrador</h3>
                        <p className="text-slate-600 max-w-2xl mt-1">Acciones que modifican datos de forma masiva en la base de datos. Usar con precaución.</p>
                    </div>

                    <div className="p-5 border-l-4 border-amber-400 bg-amber-50 rounded-r-lg">
                        <h4 className="font-semibold text-amber-800 text-lg">Procesar Nombres con IA</h4>
                        <p className="text-sm text-amber-700 mt-1 max-w-xl">
                            Esta herramienta utiliza IA para separar los nombres completos en "Nombre" y "Apellido" y los guarda en Airtable.
                             Esto acelera la generación de reportes. <strong>Esta acción es irreversible y puede consumir créditos de la API.</strong>
                        </p>
                        <button
                            onClick={handleSplitAndFillNames}
                            disabled={isSplittingNames}
                            className="mt-4 bg-amber-600 text-white font-bold py-2.5 px-5 rounded-lg text-sm transition-all shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 focus:ring-offset-amber-50"
                        >
                            {isSplittingNames ? (
                                <>
                                    <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>
                                    <span>Procesando Nombres...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons !text-base">auto_awesome</span>
                                    <span>Procesar Nombres Faltantes</span>
                                </>
                            )}
                        </button>
                    </div>

                    <div className="p-5 border-l-4 border-rose-400 bg-rose-50 rounded-r-lg">
                        <h4 className="font-semibold text-rose-800 text-lg">Limpiar Números de Teléfono</h4>
                        <p className="text-sm text-rose-700 mt-1 max-w-xl">
                            Esta acción recorrerá todos los registros en la tabla 'Estudiantes' y eliminará el prefijo '+54' de los números de teléfono. 
                            Es útil para estandarizar los datos. <strong>Esta acción es irreversible.</strong>
                        </p>
                        <button
                            onClick={handleCleanPhoneNumbers}
                            disabled={isCleaningPhones}
                            className="mt-4 bg-rose-600 text-white font-bold py-2.5 px-5 rounded-lg text-sm transition-all shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-rose-500 focus:ring-offset-rose-50"
                        >
                            {isCleaningPhones ? (
                                <>
                                    <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>
                                    <span>Limpiando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons !text-base">cleaning_services</span>
                                    <span>Iniciar Limpieza de Teléfonos</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            )
        },
        ...studentTabs.map(student => ({
            id: student.id,
            label: student.nombre,
            icon: 'school',
            isClosable: true,
            content: (
                <DataProvider key={student.legajo} user={student}>
                    <Dashboard />
                </DataProvider>
            )
        }))
    ];

    return (
        <>
             <Modal
                isOpen={!!modalInfo}
                title={modalInfo?.title || ''}
                message={modalInfo?.message || ''}
                onClose={() => setModalInfo(null)}
            />
            <Card>
                <Tabs
                    tabs={allTabs}
                    activeTabId={activeTabId}
                    onTabChange={setActiveTabId}
                    onTabClose={handleCloseTab}
                />
            </Card>
        </>
    );
};

export default AdminView;