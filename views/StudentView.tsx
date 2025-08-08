import React, { useEffect, useState } from 'react';
import CriteriosPanel from '../components/CriteriosPanel';
import ConvocatoriasList from '../components/ConvocatoriasList';
import SolicitudesList from '../components/SolicitudesList';
import PracticasTable from '../components/PracticasTable';
import EmptyState from '../components/EmptyState';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import { CriteriosPanelSkeleton, TableSkeleton } from '../components/Skeletons.tsx';
import { useData } from '../contexts/DataContext';
import EnrollmentForm from '../components/EnrollmentForm';
import Modal from '../components/Modal';

const StudentView: React.FC = () => {
    const { 
        fetchStudentData, 
        isEnrollmentFormOpen, 
        closeEnrollmentForm, 
        handleEnrollmentSubmit, 
        selectedLanzamientoForEnrollment, 
        isSubmitting,
        modalInfo,
        closeModal,
        isLoading,
        initialLoadCompleted,
        error,
        practicas,
        solicitudes,
        lanzamientos,
        myEnrollments,
        studentAirtableId,
        enrollingId,
        handleInscribir
    } = useData();

    const [activeTab, setActiveTab] = useState('convocatorias');

    useEffect(() => {
        fetchStudentData();
    }, [fetchStudentData]);

    const horariosStr = selectedLanzamientoForEnrollment?.['Horario Seleccionado'] || '';
    const horariosArray = horariosStr ? horariosStr.split(/[,;]/).map(h => h.trim()).filter(Boolean) : [];
    
    const tabs = [
        {
            id: 'convocatorias',
            label: 'Convocatorias Abiertas',
            icon: 'event_available',
            content: (
                <ConvocatoriasList 
                    lanzamientos={lanzamientos} 
                    myEnrollments={myEnrollments}
                    studentAirtableId={studentAirtableId}
                    onInscribir={handleInscribir}
                    enrollingId={enrollingId}
                />
            )
        },
        {
            id: 'solicitudes',
            label: 'Mis Solicitudes',
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

    const renderContent = () => {
        if (isLoading && !initialLoadCompleted) {
            return (
                 <div className="space-y-8">
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
        
        if (initialLoadCompleted && practicas.length === 0 && solicitudes.length === 0 && lanzamientos.length === 0) {
            return (
                 <div className="space-y-8 animate-fade-in-up">
                    <CriteriosPanel />
                    <div className="mt-8">
                         <EmptyState 
                            icon="search_off" 
                            title="Sin Actividad Registrada" 
                            message="No se encontró información de prácticas, solicitudes o convocatorias. Cuando haya novedades, aparecerán aquí." 
                        />
                    </div>
                 </div>
            );
        }
    
        return (
            <div className="space-y-8 animate-fade-in-up">
                <CriteriosPanel />
                <Card>
                    <Tabs
                        tabs={tabs}
                        activeTabId={activeTab}
                        onTabChange={setActiveTab}
                    />
                </Card>
            </div>
        );
    }


    return (
        <>
            <Modal
                isOpen={!!modalInfo}
                title={modalInfo?.title || ''}
                message={modalInfo?.message || ''}
                onClose={closeModal}
            />
            {renderContent()}
            <EnrollmentForm
              isOpen={isEnrollmentFormOpen}
              onClose={closeEnrollmentForm}
              onSubmit={handleEnrollmentSubmit}
              convocatoriaName={selectedLanzamientoForEnrollment?.['Nombre PPS'] || ''}
              horariosDisponibles={horariosArray}
              isSubmitting={isSubmitting}
            />
        </>
    );
};

export default StudentView;