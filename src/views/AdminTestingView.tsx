import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import Tabs from '../components/Tabs';
import StudentDashboard from './StudentDashboard';
import AdminView from './AdminView';
import Card from '../components/Card';
import AppModals from '../components/AppModals';

const AdminTestingView: React.FC = () => {
    const { authenticatedUser } = useAuth();
    const [activeTabId, setActiveTabId] = useState('student');

    if (!authenticatedUser) {
        // This should not happen if the routing in App.tsx is correct, but it's good practice.
        return null; 
    }

    const tabs = [
        {
            id: 'student',
            label: 'Vista Estudiante',
            icon: 'school',
            // Pass the authenticated user to the StudentDashboard
            content: <StudentDashboard user={authenticatedUser} />
        },
        {
            id: 'admin',
            label: 'Vista Administrador',
            icon: 'admin_panel_settings',
            content: <AdminView />
        }
    ];

    return (
        <>
            <div className="animate-fade-in-up">
                <Card 
                    icon="science"
                    title="Panel de Testing"
                    description="Este es un entorno de prueba. Puedes alternar entre la vista de estudiante (con datos de ejemplo) y la vista de administrador."
                >
                    <Tabs
                        tabs={tabs}
                        activeTabId={activeTabId}
                        onTabChange={setActiveTabId}
                        className="mt-4"
                    />
                </Card>
            </div>
            <AppModals />
        </>
    );
};

export default AdminTestingView;