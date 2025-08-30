import React, { useState, useCallback } from 'react';
import AdminSearch from '../components/AdminSearch';
import SeguroGenerator from '../components/SeguroGenerator';
import { useModal } from '../contexts/ModalContext';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import ConvocatoriaManager from '../components/ConvocatoriaManager';
import CorreccionPanel from '../components/CorreccionPanel';
import ConvocatoriaStatusManager from '../components/ConvocatoriaStatusManager';
import RepitentesPanel from '../components/RepitentesPanel';
import StudentDashboard from './StudentDashboard'; // Import the new reusable component
import type { AuthUser } from '../contexts/AuthContext';


interface StudentTab {
    id: string; // legajo
    legajo: string;
    nombre: string;
}

const AdminView: React.FC = () => {
    const [studentTabs, setStudentTabs] = useState<StudentTab[]>([]);
    const [activeTabId, setActiveTabId] = useState('correccion');
    const { showModal } = useModal();

    const openStudentPanel = useCallback((student: { legajo: string, nombre: string }) => {
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
            id: 'repitentes',
            label: 'Repitentes de PPS',
            icon: 'history_edu',
            isClosable: false,
            content: <RepitentesPanel />
        },
        {
            id: 'status-manager',
            label: 'Control de Convocatorias',
            icon: 'toggle_on',
            isClosable: false,
            content: <ConvocatoriaStatusManager />
        },
        {
            id: 'search',
            label: 'Buscar Estudiante',
            icon: 'person_search',
            isClosable: false,
            content: (
                <div className="p-4">
                    <AdminSearch onStudentSelect={openStudentPanel} />
                </div>
            )
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
                <StudentDashboard 
                    key={student.legajo} 
                    user={student as AuthUser} 
                    showExportButton 
                />
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
