import React, { useState } from 'react';
import Footer from '../components/Footer';
import type { TabId } from '../types';
import { useAuth } from '../contexts/AuthContext';
import StudentDashboard from './StudentDashboard'; // Import the new reusable component
import AppModals from '../components/AppModals';

const StudentView: React.FC = () => {
    const { authenticatedUser } = useAuth();
    // The active tab state is lifted to this parent component
    // so it can be shared between Dashboard (which sets it) and Footer (which reads it).
    const [activeTab, setActiveTab] = useState<TabId>('convocatorias');

    if (!authenticatedUser) {
        return null; // Or a loading/error state if the user somehow gets here without being authenticated
    }

    return (
        <>
            <StudentDashboard 
                user={authenticatedUser}
                activeTab={activeTab} 
                onTabChange={setActiveTab} 
            />
            <Footer activeTab={activeTab} />
            <AppModals />
        </>
    );
};

export default StudentView;
