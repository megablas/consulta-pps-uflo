import React, { useState, useCallback } from 'react';
import AdminSearch from '../components/AdminSearch';
import SeguroGenerator from '../components/SeguroGenerator';
import Dashboard from '../components/Dashboard';
import { DataProvider } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import ConvocatoriaManager from '../components/ConvocatoriaManager';
import CorreccionPanel from '../components/CorreccionPanel';
import type { TabId } from '../types';


interface StudentTab {
    id: string; // legajo
    legajo: string;
    nombre: string;
}

const StudentDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('convocatorias');
    // The Dashboard for a student in the admin view is self-contained.
    // Its tab state doesn't need to be shared with other components like the footer.
    return <Dashboard activeTab={activeTab} onTabChange={setActiveTab} />;
};

const AdminView: React.FC = () => {
    const [studentTabs, setStudentTabs] = useState<StudentTab[]>([]);
    const [activeTabId, setActiveTabId] = useState('correccion');
    const { showModal } = useModal();

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
        // If the closed tab was active, switch to the default tab
        if (activeTabId === tabId) {
            setActiveTabId('correccion');
        }
    }, [activeTabId]);

    const allTabs = [
        {
            id: 'correccion',
            label: 'Corrección de Informes',
            icon: 'rule',
            isClosable: false,
            content: <CorreccionPanel />
        },
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
            content: <SeguroGenerator showModal={showModal} />
        },
        ...studentTabs.map(student => ({
            id: student.id,
            label: student.nombre,
            icon: 'school',
            isClosable: true,
            content: (
                <DataProvider key={student.legajo} user={student}>
                    <StudentDashboard />
                </DataProvider>
            )
        }))
    ];

    return (
        <Card>
            <Tabs
                tabs={allTabs}
                activeTabId={activeTabId}
                onTabChange={setActiveTabId}
                onTabClose={handleCloseTab}
            />
        </Card>
    );
};

export default AdminView;
