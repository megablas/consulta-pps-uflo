import React, { useState } from 'react';
import Footer from '../components/Footer';
import type { TabId } from '../types';
import { useAuth } from '../contexts/AuthContext';
import StudentDashboard from './StudentDashboard'; // Import the new reusable component
import AppModals from '../components/AppModals';
import MobileBottomNav from '../components/MobileBottomNav'; // Import the new nav
import { StudentPanelProvider } from '../contexts/StudentPanelContext';

const StudentView: React.FC = () => {
    const { authenticatedUser } = useAuth();
    // The active tab state is lifted to this parent component
    // so it can be shared between Dashboard (which sets it) and the mobile nav.
    const [activeTab, setActiveTab] = useState<TabId>('inicio');

    if (!authenticatedUser) {
        return null; // Or a loading/error state if the user somehow gets here without being authenticated
    }

    // Define tabs here to pass to the mobile nav
    const mobileNavTabs = [
      { id: 'inicio' as TabId, label: 'Inicio', icon: 'home' },
      { id: 'practicas' as TabId, label: 'Prácticas', icon: 'work_history' },
      { id: 'profile' as TabId, label: 'Perfil', icon: 'person' },
    ];

    return (
        <StudentPanelProvider legajo={authenticatedUser.legajo}>
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
        </StudentPanelProvider>
    );
};

export default StudentView;