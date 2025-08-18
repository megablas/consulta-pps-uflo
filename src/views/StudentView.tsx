import React, { useState } from 'react';
import Dashboard from '../components/Dashboard';
import Footer from '../components/Footer';
import type { TabId } from '../types';

const StudentView: React.FC = () => {
    // The active tab state is lifted to this parent component
    // so it can be shared between Dashboard (which sets it) and Footer (which reads it).
    const [activeTab, setActiveTab] = useState<TabId>('convocatorias');

    return (
        <>
            <Dashboard activeTab={activeTab} onTabChange={setActiveTab} />
            <Footer activeTab={activeTab} />
        </>
    );
};

export default StudentView;
