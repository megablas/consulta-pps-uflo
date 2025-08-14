import React, { useState, useEffect } from 'react';

import CriteriosPanel from './CriteriosPanel';
import PracticasTable from './PracticasTable';
import SolicitudesList from './SolicitudesList';
import EmptyState from './EmptyState';
import Tabs from './Tabs';
import Card from './Card';
import { CriteriosPanelSkeleton, TableSkeleton, SkeletonBox } from './Skeletons';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { FIELD_LEGAJO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES } from '../constants';


// --- INLINED StudentInfoHeader ---
// Componente integrado para resolver un error de compilación persistente de resolución de módulos.

const InfoItem: React.FC<{ icon: string; label: string; value?: string | number | null; }> = ({ icon, label, value }) => {
    if (!value) return null;
    return (
        <div className="flex items-center gap-3">
            <span className="material-icons text-slate-400 !text-xl">{icon}</span>
            <div>
                <p className="text-xs text-slate-500 font-medium">{label}</p>
                <p className="text-sm text-slate-800 font-semibold">{value}</p>
            </div>
        </div>
    );
};

const StudentInfoHeader: React.FC = () => {
    const { studentDetails, isLoading, initialLoadCompleted } = useData();
    const { 
        [FIELD_LEGAJO_ESTUDIANTES]: legajo,
        [FIELD_DNI_ESTUDIANTES]: dni,
        [FIELD_CORREO_ESTUDIANTES]: correo,
        [FIELD_TELEFONO_ESTUDIANTES]: telefono,
    } = studentDetails || {};

    // Don't render anything if there are no details and it's not the initial load phase.
    if (!studentDetails && !isLoading && initialLoadCompleted) {
        return null;
    }

    if (isLoading && !initialLoadCompleted) {
        return (
            <div className="bg-white rounded-2xl p-5 mb-8 border border-slate-200/60 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                    <SkeletonBox className="h-10 w-full" />
                    <SkeletonBox className="h-10 w-full" />
                    <SkeletonBox className="h-10 w-full" />
                    <SkeletonBox className="h-10 w-full" />
                </div>
            </div>
        );
    }
    
    return (
        <div className="bg-white rounded-2xl p-5 mb-8 border border-slate-200/60 shadow-sm animate-fade-in-up">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                <InfoItem icon="badge" label="Legajo" value={legajo} />
                <InfoItem icon="fingerprint" label="DNI" value={dni} />
                <InfoItem icon="email" label="Correo" value={correo} />
                <InfoItem icon="phone" label="Teléfono" value={telefono} />
            </div>
        </div>
    );
};
// --- END INLINED StudentInfoHeader ---


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