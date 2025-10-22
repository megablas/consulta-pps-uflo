import React, { useState, useCallback, useMemo } from 'react';
import AdminSearch from '../components/AdminSearch';
import ConvocatoriaManager from '../components/ConvocatoriaManager';
import CorreccionPanel from '../components/CorreccionPanel';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import StudentDashboard from './StudentDashboard';
import Tabs from '../components/Tabs';
import { MetricsDashboard } from '../components/MetricsDashboard';
import TimelineView from '../components/TimelineView';
import SubTabs from '../components/SubTabs';
import type { AirtableRecord, EstudianteFields } from '../types';
import WelcomeBannerAdmin from '../components/WelcomeBannerAdmin';
import { StudentPanelProvider } from '../contexts/StudentPanelContext';

interface StudentTabInfo {
    id: string; // legajo
    legajo: string;
    nombre: string;
}

const DirectivoView: React.FC = () => {
    const { authenticatedUser } = useAuth();
    const [studentTabs, setStudentTabs] = useState<StudentTabInfo[]>([]);
    
    const jefeOrientations = authenticatedUser?.orientaciones || [];
    const initialTabId = 'metrics';
    const [activeTabId, setActiveTabId] = useState(initialTabId);
    const [activeMetricsTabId, setActiveMetricsTabId] = useState('dashboard');

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
        
        const newStudentTab: StudentTabInfo = {
            id: legajo,
            legajo: legajo,
            nombre: nombre,
        };
        setStudentTabs(prev => [...prev, newStudentTab]);
        setActiveTabId(legajo);
    }, [studentTabs]);
    
    const handleCloseTab = useCallback((tabId: string) => {
        setStudentTabs(prev => prev.filter(s => s.id !== tabId));
        if (activeTabId === tabId) {
            setActiveTabId(initialTabId);
        }
    }, [activeTabId, initialTabId]);

    const allTabs = useMemo(() => {
        const metricsSubTabs = [
            { id: 'dashboard', label: 'Dashboard', icon: 'bar_chart' },
            { id: 'timeline', label: 'Línea de Tiempo', icon: 'timeline' },
        ];

        const mainTabs = [
            {
                id: 'metrics',
                label: 'Métricas',
                icon: 'analytics',
                content: (
                    <>
                        <SubTabs tabs={metricsSubTabs} activeTabId={activeMetricsTabId} onTabChange={setActiveMetricsTabId} />
                        <div className="mt-6">
                            {activeMetricsTabId === 'dashboard' && <MetricsDashboard onStudentSelect={(student) => openStudentPanel({ id: '', createdTime: '', fields: { Legajo: student.legajo, Nombre: student.nombre }})} />}
                            {activeMetricsTabId === 'timeline' && <TimelineView />}
                        </div>
                    </>
                ),
            },
            {
                id: 'correccion',
                label: 'Corrección',
                icon: 'rule',
                content: <CorreccionPanel />,
            },
            ...(jefeOrientations.length > 0 ? [{
                id: 'manager-jefe',
                label: 'Gestión PPS',
                icon: 'tune',
                content: <ConvocatoriaManager forcedOrientations={jefeOrientations} />,
            }] : []),
            {
                id: 'search',
                label: 'Buscar Alumno',
                icon: 'person_search',
                content: <div className="p-4"><AdminSearch onStudentSelect={openStudentPanel} /></div>,
            }
        ];

        const dynamicStudentTabs = studentTabs.map(student => ({
            id: student.id,
            label: student.nombre,
            icon: 'school',
            content: (
                <StudentPanelProvider legajo={student.legajo}>
                    <StudentDashboard key={student.legajo} user={student as AuthUser} showExportButton />
                </StudentPanelProvider>
            ),
            isClosable: true,
        }));

        return [...mainTabs, ...dynamicStudentTabs];

    }, [studentTabs, jefeOrientations, openStudentPanel, activeMetricsTabId]);

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/60 animate-fade-in-up">
            <WelcomeBannerAdmin name={authenticatedUser?.nombre || 'Directivo'} />
            <div>
                <Tabs
                    tabs={allTabs}
                    activeTabId={activeTabId}
                    onTabChange={setActiveTabId}
                    onTabClose={handleCloseTab}
                />
            </div>
        </div>
    );
};

export default DirectivoView;
