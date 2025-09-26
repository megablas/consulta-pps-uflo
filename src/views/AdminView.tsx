import React, { useState, useCallback, useMemo } from 'react';
import type { AuthUser } from '../contexts/AuthContext';
import StudentDashboard from './StudentDashboard';
import Tabs from '../components/Tabs';
import SubTabs from '../components/SubTabs';
import MetricsDashboard from '../components/MetricsDashboard';
import TimelineView from '../components/TimelineView';
import CorreccionPanel from '../components/CorreccionPanel';
import ConvocatoriaManager from '../components/ConvocatoriaManager';
import ConvocatoriaStatusManager from '../components/ConvocatoriaStatusManager';
import AdminSearch from '../components/AdminSearch';
import SeguroGenerator from '../components/SeguroGenerator';
import NuevosConvenios from '../components/NuevosConvenios';
import RepitentesPanel from '../components/RepitentesPanel';
import ExecutiveReportGenerator from '../components/ExecutiveReportGenerator';
import PenalizationManager from '../components/PenalizationManager';
import { useModal } from '../contexts/ModalContext';
import type { AirtableRecord, EstudianteFields } from '../types';
import AcreditacionJornada from '../components/AcreditacionJornada';

interface StudentTabInfo {
    id: string; // legajo
    legajo: string;
    nombre: string;
}

const AdminView: React.FC = () => {
    const [studentTabs, setStudentTabs] = useState<StudentTabInfo[]>([]);
    const [activeTabId, setActiveTabId] = useState('metrics');
    
    const [activeMetricsTabId, setActiveMetricsTabId] = useState('dashboard');
    const [activeGestionTabId, setActiveGestionTabId] = useState('manager');
    const [activeHerramientasTabId, setActiveHerramientasTabId] = useState('repitentes');
    const { showModal } = useModal();


    const openStudentPanel = useCallback((student: AirtableRecord<EstudianteFields>) => {
        const legajo = student.fields.Legajo;
        const nombre = student.fields.Nombre;

        if (!legajo || !nombre) {
            showModal('Error', 'El registro del estudiante no tiene legajo o nombre.');
            return;
        }

        if (!studentTabs.some(s => s.legajo === legajo)) {
            const newStudentTab: StudentTabInfo = {
                id: legajo,
                legajo: legajo,
                nombre: nombre,
            };
            setStudentTabs(prev => [...prev, newStudentTab]);
        }
        setActiveTabId(legajo);
    }, [studentTabs, showModal]);

    const handleCloseTab = useCallback((tabId: string) => {
        setStudentTabs(prev => prev.filter(s => s.id !== tabId));
        if (activeTabId === tabId) {
            setActiveTabId('metrics'); // Fallback to a default tab
        }
    }, [activeTabId]);

    const allTabs = useMemo(() => {
        const metricsSubTabs = [
            { id: 'dashboard', label: 'Dashboard', icon: 'bar_chart' },
            { id: 'timeline', label: 'Línea de Tiempo', icon: 'timeline' },
        ];
        
        const gestionSubTabs = [
            { id: 'manager', label: 'Gestionar Prácticas', icon: 'dynamic_feed' },
            { id: 'status-manager', label: 'Control de Estados', icon: 'toggle_on' },
        ];

        const herramientasSubTabs = [
            { id: 'repitentes', label: 'Repitentes', icon: 'history_edu' },
            { id: 'penalizaciones', label: 'Penalizaciones', icon: 'gavel' },
            { id: 'acreditar_jornada', label: 'Acreditar Jornada', icon: 'military_tech' },
            { id: 'search', label: 'Buscar Alumno', icon: 'person_search' },
            { id: 'insurance', label: 'Seguros', icon: 'shield' },
            { id: 'convenios', label: 'Convenios Nuevos', icon: 'handshake' },
            { id: 'executive-report', label: 'Reporte Ejecutivo', icon: 'summarize' },
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
                            {activeMetricsTabId === 'dashboard' && <MetricsDashboard onStudentSelect={(s) => openStudentPanel({ id: '', createdTime: '', fields: { Legajo: s.legajo, Nombre: s.nombre } })} />}
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
                ),
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
                            {activeHerramientasTabId === 'penalizaciones' && <PenalizationManager />}
                            {activeHerramientasTabId === 'acreditar_jornada' && <AcreditacionJornada />}
                            {activeHerramientasTabId === 'search' && <div className="p-4"><AdminSearch onStudentSelect={openStudentPanel} /></div>}
                            {activeHerramientasTabId === 'insurance' && <SeguroGenerator showModal={showModal} />}
                            {activeHerramientasTabId === 'convenios' && <NuevosConvenios />}
                            {activeHerramientasTabId === 'executive-report' && <ExecutiveReportGenerator />}
                        </div>
                    </>
                ),
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

    }, [
        studentTabs, 
        openStudentPanel, 
        activeMetricsTabId, 
        activeGestionTabId, 
        activeHerramientasTabId,
        showModal
    ]);

    return (
        <div className="bg-white dark:bg-slate-900/70 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/80 animate-fade-in-up">
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