import React, { useState, useCallback, useMemo } from 'react';
import AdminSearch from '../components/AdminSearch';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import StudentDashboard from './StudentDashboard';
import Tabs from '../components/Tabs';
import MetricsDashboard from '../components/MetricsDashboard';
import TimelineView from '../components/TimelineView';
import SubTabs from '../components/SubTabs';
import InstitutionMetrics from '../components/InstitutionMetrics';

interface StudentTabInfo {
    id: string; // legajo
    legajo: string;
    nombre: string;
}

const DirectivoWelcomeBanner: React.FC<{ name: string }> = ({ name }) => {
  const [greeting, setGreeting] = useState('');

  React.useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting('Buenos días');
    } else if (hour >= 12 && hour < 20) {
      setGreeting('Buenas tardes');
    } else {
      setGreeting('Buenas noches');
    }
  }, []);

  return (
    <div className="mb-8">
      <h1 className="text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tighter">
        {greeting}, <span className="text-blue-600 dark:text-blue-400">{name.split(' ')[0]}</span>.
      </h1>
      <p className="mt-2 text-md text-slate-600 dark:text-slate-400">
        Bienvenido al panel directivo. Aquí encontrarás las métricas clave y herramientas de consulta.
      </p>
    </div>
  );
};

const DirectivoView: React.FC = () => {
    const { authenticatedUser } = useAuth();
    const [studentTabs, setStudentTabs] = useState<StudentTabInfo[]>([]);
    
    const initialTabId = 'metrics';
    const [activeTabId, setActiveTabId] = useState(initialTabId);
    const [activeMetricsTabId, setActiveMetricsTabId] = useState('resumen');

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
            setActiveTabId(initialTabId);
        }
    }, [activeTabId, initialTabId]);

    const allTabs = useMemo(() => {
        const metricsSubTabs = [
            { id: 'resumen', label: 'Resumen', icon: 'bar_chart' },
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
                            {activeMetricsTabId === 'resumen' && <MetricsDashboard onStudentSelect={openStudentPanel} />}
                            {activeMetricsTabId === 'timeline' && <TimelineView />}
                        </div>
                    </>
                ),
            },
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
            content: <StudentDashboard key={student.legajo} user={student as AuthUser} showExportButton />,
            isClosable: true,
        }));

        return [...mainTabs, ...dynamicStudentTabs];

    }, [studentTabs, openStudentPanel, activeMetricsTabId]);

    return (
        <div className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/60 dark:border-slate-700/80 animate-fade-in-up">
            <DirectivoWelcomeBanner name={authenticatedUser?.nombre || 'Directivo'} />
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