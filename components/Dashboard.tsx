import React, { useState, useEffect } from 'react';

import CriteriosPanel from './CriteriosPanel';
import PracticasTable from './PracticasTable';
import SolicitudesList from './SolicitudesList';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Tabs from './Tabs';
import Card from './Card';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';

const Dashboard: React.FC = () => {
    const { 
        practicas, 
        solicitudes, 
        isLoading,
        error,
        initialLoadCompleted,
        fetchStudentData
    } = useData();
    const { isSuperUserMode } = useAuth();
    const [activeTab, setActiveTab] = useState('solicitudes');
    
    // This useEffect will run when the Dashboard component is mounted for a student in the admin view.
    // The DataProvider is keyed, so a new Dashboard mounts for each student tab, triggering this fetch.
    useEffect(() => {
        fetchStudentData();
    }, [fetchStudentData]);

    if (isLoading && !initialLoadCompleted) {
        return <Loader />;
    }

    if (error) {
        return (
            <div className="mt-8">
                <EmptyState icon="error" title="Error al Cargar Datos" message={error} />
            </div>
        );
    }
    
    if (initialLoadCompleted && practicas.length === 0 && solicitudes.length === 0 && isSuperUserMode) {
        return (
             <div className="space-y-8 animate-fade-in-up">
                <CriteriosPanel />
                <div className="mt-8">
                    <EmptyState 
                        icon="search_off" 
                        title="Sin Resultados" 
                        message="No se encontró información de prácticas o solicitudes para este estudiante." 
                    />
                </div>
            </div>
        );
    }
    
    const studentDataTabs = [
        {
            id: 'solicitudes',
            label: 'Solicitudes de PPS',
            icon: 'list_alt',
            content: <SolicitudesList />
        },
        {
            id: 'practicas',
            label: 'Detalle de Prácticas',
            icon: 'work_history',
            content: <PracticasTable />
        }
    ];

    return (
        <div className="space-y-8 animate-fade-in-up">
            <CriteriosPanel />
            <Card>
                 <Tabs
                    tabs={studentDataTabs}
                    activeTabId={activeTab}
                    onTabChange={setActiveTab}
                />
            </Card>
        </div>
    );
};

export default Dashboard;