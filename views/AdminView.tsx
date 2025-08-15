import React, { useState, useCallback } from 'react';
import AdminSearch from '../components/AdminSearch';
import SeguroGenerator from '../components/SeguroGenerator';
import Dashboard from '../components/Dashboard';
import { DataProvider } from '../contexts/DataContext';
import Modal from '../components/Modal';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import ConvocatoriaManager from '../components/ConvocatoriaManager';


interface StudentTab {
    id: string; // legajo
    legajo: string;
    nombre: string;
}

const AdminView: React.FC = () => {
    const [studentTabs, setStudentTabs] = useState<StudentTab[]>([]);
    const [activeTabId, setActiveTabId] = useState('manager');
    
    const [modalInfo, setModalInfo] = React.useState<{title: string, message: string} | null>(null);

    const handleShowModal = useCallback((title: string, message: string) => {
        setModalInfo({ title, message });
    }, []);

    const handleStudentSelect = useCallback((student: { legajo: string, nombre: string }) => {
        if (studentTabs.some(s => s.legajo === student.legajo)) {
            setActiveTabId(student.legajo);
            return;
        }
        
        const newStudentTab: StudentTab = {
            id: student.legajo,
            legajo: student.legajo,
            nombre: student.nombre,
        };
        setStudentTabs(prev => [...prev, newStudentTab]);
        setActiveTabId(student.legajo);
    }, [studentTabs]);
    
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
            content: <div className="p-4"><AdminSearch onStudentSelect={handleStudentSelect} /></div>
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