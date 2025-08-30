import React, { useState, useCallback, useEffect } from 'react';
import AdminSearch from '../components/AdminSearch';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import ConvocatoriaManager from '../components/ConvocatoriaManager';
import CorreccionPanel from '../components/CorreccionPanel';
import { useAuth, type AuthUser } from '../contexts/AuthContext';
import StudentDashboard from './StudentDashboard';


interface StudentTab {
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
    <div className="mb-8 p-6 sm:p-8 rounded-2xl border border-slate-200/80 shadow-lg bg-gradient-to-br from-blue-50/80 via-white to-slate-50/80">
      <h1 className="text-4xl font-black text-slate-800 tracking-tight">
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
    const [studentTabs, setStudentTabs] = useState<StudentTab[]>([]);
    
    const jefeOrientations = authenticatedUser?.orientaciones || [];
    const initialTabId = jefeOrientations.length > 0 ? 'manager-jefe' : 'correccion';
    const [activeTabId, setActiveTabId] = useState(initialTabId);

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
        // If the closed tab was active, switch to a sensible default
        if (activeTabId === tabId) {
            setActiveTabId(initialTabId);
        }
    }, [activeTabId, initialTabId]);
    
    const managerTabs = jefeOrientations.length > 0
      ? [{
          id: 'manager-jefe',
          label: 'Gestionar PPS',
          icon: 'dashboard',
          isClosable: false,
          content: <ConvocatoriaManager forcedOrientations={jefeOrientations} />
        }]
      : [];

    const allTabs = [
        {
            id: 'correccion',
            label: 'Corrección de Informes',
            icon: 'rule',
            isClosable: false,
            content: <CorreccionPanel />
        },
        ...managerTabs,
        {
            id: 'search',
            label: 'Buscar Estudiante',
            icon: 'person_search',
            isClosable: false,
            content: <div className="p-4"><AdminSearch onStudentSelect={handleStudentSelect} /></div>
        },
        ...studentTabs.map(student => ({
            id: student.id,
            label: student.nombre,
            icon: 'school',
            isClosable: true,
            content: (
                // FIX: Removed DataProvider and used the imported StudentDashboard component directly.
                <StudentDashboard 
                    key={student.legajo} 
                    user={student as AuthUser} 
                    showExportButton 
                />
            )
        }))
    ];

    return (
        <>
            <JefeWelcomeBanner name={authenticatedUser?.nombre || 'Jefe de Cátedra'} />
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

export default JefeView;