import React, { useState } from 'react';
import Footer from '../components/Footer';
import type { TabId } from '../types';
import { useAuth } from '../contexts/AuthContext';
import StudentDashboard from './StudentDashboard'; // Import the new reusable component
import AppModals from '../components/AppModals';
import MobileBottomNav from '../components/MobileBottomNav'; // Import the new nav

const StudentView: React.FC = () => {
    const { authenticatedUser } = useAuth();
    // The active tab state is lifted to this parent component
    // so it can be shared between Dashboard (which sets it) and the mobile nav.
    const [activeTab, setActiveTab] = useState<TabId>('convocatorias');

    if (!authenticatedUser) {
        return null; // Or a loading/error state if the user somehow gets here without being authenticated
    }

    // Define tabs here to pass to the mobile nav
    const mobileNavTabs = [
      { id: 'convocatorias' as TabId, label: 'Convocatorias', icon: 'campaign' },
      { id: 'calendario' as TabId, label: 'Calendario', icon: 'calendar_month' },
      { id: 'informes' as TabId, label: 'Informes', icon: 'assignment_turned_in' },
      { id: 'solicitudes' as TabId, label: 'Solicitudes', icon: 'list_alt' },
      { id: 'practicas' as TabId, label: 'Prácticas', icon: 'work_history' },
    ];

    return (
        <>
            <StudentDashboard 
                user={authenticatedUser}
                activeTab={activeTab} 
                onTabChange={setActiveTab} 
            />
            <Footer activeTab={activeTab} />
            <AppModals />
            <MobileBottomNav 
                tabs={mobileNavTabs}
                activeTabId={activeTab}
                onTabChange={setActiveTab}
            />
        </>
    );
};

export default StudentView;