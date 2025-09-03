import React, { useState, useMemo, useCallback } from 'react';
import AdminSearch from '../components/AdminSearch';
import SeguroGenerator from '../components/SeguroGenerator';
import { useModal } from '../contexts/ModalContext';
import ConvocatoriaManager from '../components/ConvocatoriaManager';
import CorreccionPanel from '../components/CorreccionPanel';
import ConvocatoriaStatusManager from '../components/ConvocatoriaStatusManager';
import RepitentesPanel from '../components/RepitentesPanel';
import StudentDashboard from './StudentDashboard';
import Tabs from '../components/Tabs';
import SubTabs from '../components/SubTabs';
import type { AuthUser } from '../contexts/AuthContext';
import MetricsDashboard from '../components/MetricsDashboard';

interface StudentTabInfo {
    id: string; // legajo
    legajo: string;
    nombre: string;
}

const AdminView: React.FC = () => {
    const [studentTabs, setStudentTabs] = useState<StudentTabInfo[]>([]);
    const [activeTabId, setActiveTabId] = useState('metrics');
    const [activeGestionTabId, setActiveGestionTabId] = useState('manager');
    const [activeHerramientasTabId, setActiveHerramientasTabId] = useState('repitentes');
    const { showModal } = useModal();

    const openStudentPanel = useCallback((student: { legajo: string, nombre: string }) => {
        if (studentTabs.some(s => s.legajo === student.legajo)) {
            setActiveTabId(student.legajo);
            return;
        }
        
        const newStudentTab: StudentTabInfo = {
            id: student.legajo,
            legajo: student.legajo,
            nombre: student.nombre,
        };
        setStudentTabs(prev => [...prev, newStudentTab]);
        setActiveTabId(student.legajo);
    }, [studentTabs]);
    
    const handleCloseTab = useCallback((tabId: string) => {
        setStudentTabs(prev => prev.filter(s => s.id !== tabId));
        if (activeTabId === tabId) {
            setActiveTabId('metrics'); // Fallback to a default tab
        }
    }, [activeTabId]);

    const allTabs = useMemo(() => {
        const gestionSubTabs = [
            { id: 'manager', label: 'Gestionar Prácticas', icon: 'dynamic_feed' },
            { id: 'status-manager', label: 'Control de Estados', icon: 'toggle_on' },
        ];
        
        const herramientasSubTabs = [
            { id: 'repitentes', label: 'Repitentes', icon: 'history_edu' },
            { id: 'search', label: 'Buscar Alumno', icon: 'person_search' },
            { id: 'insurance', label: 'Seguros', icon: 'shield' },
        ];
        
        const mainTabs = [
            {
                id: 'metrics',
                label: 'Métricas',
                icon: 'bar_chart',
                content: <MetricsDashboard />,
            },
            {
                id: 'correccion',
                label: 'Corrección',
                icon: 'rule',
                content: <CorreccionPanel />,
            },
            {
                id: 'gestion',
                label: 'Gestión PPS',
                icon: 'tune',
                content: (
                    <>
                        <SubTabs tabs={gestionSubTabs} activeTabId={activeGestionTabId} onTabChange={setActiveGestionTabId} />
                        <div className="mt-6">
                            {activeGestionTabId === 'manager' && <ConvocatoriaManager />}
                            {activeGestionTabId === 'status-manager' && <ConvocatoriaStatusManager />}
                        </div>
                    </>
                )
            },
            {
                id: 'herramientas',
                label: 'Herramientas',
                icon: 'build',
                content: (
                    <>
                        <SubTabs tabs={herramientasSubTabs} activeTabId={activeHerramientasTabId} onTabChange={setActiveHerramientasTabId} />
                         <div className="mt-6">
                            {activeHerramientasTabId === 'repitentes' && <RepitentesPanel />}
                            {activeHerramientasTabId === 'search' && <div className="p-4"><AdminSearch onStudentSelect={openStudentPanel} /></div>}
                            {activeHerramientasTabId === 'insurance' && <SeguroGenerator showModal={showModal} />}
                        </div>
                    </>
                )
            }
        ];

        const dynamicStudentTabs = studentTabs.map(student => ({
            id: student.id,
            label: student.nombre,
            icon: 'school',
            content: <StudentDashboard key={student.legajo} user={student as AuthUser} showExportButton />,
            isClosable: true,
        }));

        return [...mainTabs, ...dynamicStudentTabs];
    }, [studentTabs, activeGestionTabId, activeHerramientasTabId, openStudentPanel, showModal]);

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/60 animate-fade-in-up">
            <Tabs
                tabs={allTabs}
                activeTabId={activeTabId}
                onTabChange={setActiveTabId}
                onTabClose={handleCloseTab}
            />
        </div>
    );
};

export default AdminView;