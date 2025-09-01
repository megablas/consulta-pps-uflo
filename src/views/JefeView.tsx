import React, { useState, useCallback, useEffect, useMemo } from 'react';
import AdminSearch from '../components/AdminSearch';
import ConvocatoriaManager from '../components/ConvocatoriaManager';
import CorreccionPanel from '../components/CorreccionPanel';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import StudentDashboard from './StudentDashboard';
import Tabs from '../components/Tabs';

interface StudentTabInfo {
    id: string; // legajo
    legajo: string;
    nombre: string;
}

const JefeWelcomeBanner: React.FC<{ name: string }> = ({ name }) => {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
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
      <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
        {greeting}, <span className="text-blue-600">{name.split(' ')[0]}</span>.
      </h1>
      <p className="mt-2 text-md text-slate-600">
        Bienvenido a tu panel de gestión de Prácticas Profesionales Supervisadas.
      </p>
    </div>
  );
};

const JefeView: React.FC = () => {
    const { authenticatedUser } = useAuth();
    const [studentTabs, setStudentTabs] = useState<StudentTabInfo[]>([]);
    
    const jefeOrientations = authenticatedUser?.orientaciones || [];
    const initialTabId = jefeOrientations.length > 0 ? 'manager-jefe' : 'correccion';
    const [activeTabId, setActiveTabId] = useState(initialTabId);

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
        const mainTabs = [
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
            content: <StudentDashboard key={student.legajo} user={student as AuthUser} showExportButton />,
            isClosable: true,
        }));

        return [...mainTabs, ...dynamicStudentTabs];

    }, [studentTabs, jefeOrientations, openStudentPanel]);

    return (
        <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200/60 animate-fade-in-up">
            <JefeWelcomeBanner name={authenticatedUser?.nombre || 'Jefe de Cátedra'} />
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

export default JefeView;
