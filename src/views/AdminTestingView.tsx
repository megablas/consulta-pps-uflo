import React, { useState } from 'react';
import AdminView from './AdminView';
import StudentDashboard from './StudentDashboard';
import Card from '../components/Card';
import AppModals from '../components/AppModals';
import Tabs from '../components/Tabs';
import { AuthUser } from '../contexts/AuthContext';
import { StudentPanelProvider } from '../contexts/StudentPanelContext';

const AdminTestingView: React.FC = () => {
    const [activeTabId, setActiveTabId] = useState('admin');
    
    const testingUser: AuthUser = { legajo: '99999', nombre: 'Usuario de Prueba', role: 'AdminTester' };

    const tabs = [
        {
            id: 'student',
            label: 'Vista Estudiante',
            icon: 'school',
            content: (
                <StudentPanelProvider legajo={testingUser.legajo}>
                    <StudentDashboard user={testingUser} />
                </StudentPanelProvider>
            )
        },
        {
            id: 'admin',
            label: 'Vista Administrador',
            icon: 'shield_person',
            content: <AdminView isTestingMode={true} />
        }
    ];

    return (
        <>
            <div className="animate-fade-in-up">
                <Card
                    icon="science"
                    title="Panel de Testing"
                    description="Este es un entorno de prueba que contiene una vista de estudiante y una de administrador. Todos los datos son simulados y no afectan la producción."
                    className="bg-amber-50/70 dark:bg-amber-900/20 border-amber-200 dark:border-amber-700/50"
                >
                    <div className="mt-4 border-t border-amber-200 dark:border-amber-700/50 pt-4">
                        <Tabs
                            tabs={tabs}
                            activeTabId={activeTabId}
                            onTabChange={setActiveTabId}
                        />
                    </div>
                </Card>
            </div>
            <AppModals />
        </>
    );
};

export default AdminTestingView;
