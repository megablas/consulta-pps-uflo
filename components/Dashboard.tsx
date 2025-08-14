import React, { useState, useEffect } from 'react';

import CriteriosPanel from './CriteriosPanel';
import PracticasTable from './PracticasTable';
import SolicitudesList from './SolicitudesList';
import EmptyState from './EmptyState';
import Tabs from './Tabs';
import Card from './Card';
import { CriteriosPanelSkeleton, TableSkeleton } from './Skeletons';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import StudentInfoHeader from './StudentInfoHeader.tsx';

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
    
    useEffect(() => {
        fetchStudentData();
    }, [fetchStudentData]);

    if (isLoading && !initialLoadCompleted) {
        return (
            <div className="space-y-8">
                <StudentInfoHeader />
                <CriteriosPanelSkeleton />
                <Card>
                    <div className="border-b border-slate-200">
                         <div className="-mb-px flex space-x-6">
                            <div className="whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm border-blue-500 text-blue-600">
                                Cargando...
                            </div>
                         </div>
                    </div>
                    <div className="pt-6">
                        <TableSkeleton />
                    </div>
                </Card>
            </div>
        );
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
                <StudentInfoHeader />
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
            <StudentInfoHeader />
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