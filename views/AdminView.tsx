import React, { useState, useCallback } from 'react';
import AdminSearch from '../components/AdminSearch';
import SeguroGenerator from '../components/SeguroGenerator';
import Dashboard from '../components/Dashboard';
import { DataProvider } from '../contexts/DataContext';
import { AuthUser } from '../contexts/AuthContext';
import Modal from '../components/Modal';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import { fetchAirtableData } from '../services/airtableService';
import { 
    AIRTABLE_TABLE_NAME_ESTUDIANTES, 
    FIELD_LEGAJO_ESTUDIANTES, 
    FIELD_NOMBRE_ESTUDIANTES,
} from '../constants';
import type { EstudianteFields } from '../types';
import ConvocatoriaManager from '../components/ConvocatoriaManager';


interface StudentTab {
    id: string; // legajo
    legajo: string;
    nombre: string;
    isSuperUser?: boolean;
}

const AdminView: React.FC = () => {
    const [studentTabs, setStudentTabs] = useState<StudentTab[]>([]);
    const [activeTabId, setActiveTabId] = useState('manager');
    
    const [isLoading, setIsLoading] = useState(false);
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
            setActiveTabId('manager');
        }
    }, [activeTabId]);

    const allTabs = [
        {
            id: 'manager',
            label: 'Gestionar PPS',
            icon: 'tune',
            isClosable: false,
            content: <ConvocatoriaManager />
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