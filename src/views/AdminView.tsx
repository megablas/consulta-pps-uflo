import React, { useState, useCallback, useMemo } from 'react';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import type { AirtableRecord, EstudianteFields } from '../types';
import StudentDashboard from './StudentDashboard';
import WelcomeBannerAdmin from '../components/WelcomeBannerAdmin';
import Tabs from '../components/Tabs';
import Loader from '../components/Loader';
import { StudentPanelProvider } from '../contexts/StudentPanelContext';

// Lazy load views to improve initial load time
const MetricsView = React.lazy(() => import('./admin/MetricsView'));
const GestionView = React.lazy(() => import('./admin/GestionView'));
const CorreccionView = React.lazy(() => import('./admin/CorreccionView'));
const HerramientasView = React.lazy(() => import('./admin/HerramientasView'));


interface StudentTabInfo {
    id: string; // legajo
    legajo: string;
    nombre: string;
}

interface AdminViewProps {
  isTestingMode?: boolean;
}

const AdminView: React.FC<AdminViewProps> = ({ isTestingMode = false }) => {
    const { authenticatedUser } = useAuth();
    const [studentTabs, setStudentTabs] = useState<StudentTabInfo[]>([]);
    const [activeTabId, setActiveTabId] = useState('metrics');

    const openStudentPanel = useCallback((student: AirtableRecord<EstudianteFields>) => {
        const legajo = student.fields.Legajo;
        const nombre = student.fields.Nombre;

        if (!legajo || !nombre) {
            alert('El registro del estudiante no tiene legajo o nombre.');
            return;
        }

        if (studentTabs.some(s => s.legajo === legajo)) {
            setActiveTabId(legajo);
            return;
        }

        const newStudentTab: StudentTabInfo = { id: legajo, legajo, nombre };
        setStudentTabs(prev => [...prev, newStudentTab]);
        setActiveTabId(legajo);
    }, [studentTabs]);

    const handleCloseTab = useCallback((tabId: string) => {
        setStudentTabs(prev => prev.filter(s => s.id !== tabId));
        if (activeTabId === tabId) {
            setActiveTabId('metrics');
        }
    }, [activeTabId]);

    const allTabs = useMemo(() => {
        const mainTabs = [
            { id: 'metrics', label: 'Métricas', icon: 'analytics', content: <MetricsView onStudentSelect={(student) => openStudentPanel({ id: '', createdTime: '', fields: { Legajo: student.legajo, Nombre: student.nombre }})} isTestingMode={isTestingMode} /> },
            { id: 'gestion', label: 'Gestión', icon: 'tune', content: <GestionView isTestingMode={isTestingMode} /> },
            { id: 'correccion', label: 'Corrección', icon: 'rule', content: <CorreccionView isTestingMode={isTestingMode} /> },
            { id: 'herramientas', label: 'Herramientas', icon: 'construction', content: <HerramientasView onStudentSelect={openStudentPanel} isTestingMode={isTestingMode} /> },
        ];

        const dynamicStudentTabs = studentTabs.map(student => ({
            id: student.id,
            label: student.nombre,
            icon: 'school',
            content: (
                <StudentPanelProvider legajo={isTestingMode ? '99999' : student.legajo}>
                    <StudentDashboard key={student.legajo} user={{...student, legajo: isTestingMode ? '99999' : student.legajo} as AuthUser} showExportButton />
                </StudentPanelProvider>
            ),
            isClosable: true,
        }));

        return [...mainTabs, ...dynamicStudentTabs];
    }, [studentTabs, openStudentPanel, isTestingMode]);

    return (
        <div className="space-y-6">
            <WelcomeBannerAdmin name={authenticatedUser?.nombre || 'Administrador'} />
            <React.Suspense fallback={<div className="flex justify-center p-8"><Loader /></div>}>
                <Tabs
                    tabs={allTabs}
                    activeTabId={activeTabId}
                    onTabChange={setActiveTabId}
                    onTabClose={handleCloseTab}
                />
            </React.Suspense>
        </div>
    );
};

export default AdminView;
