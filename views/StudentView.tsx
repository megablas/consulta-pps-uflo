import React from 'react';
import Dashboard from '../components/Dashboard';
import { useData } from '../contexts/DataContext';
import EnrollmentForm from '../components/EnrollmentForm';
import Modal from '../components/Modal';
import SeleccionadosModal from '../components/SeleccionadosModal';
import Footer from '../components/Footer';

const StudentView: React.FC = () => {
    const { 
        isEnrollmentFormOpen, 
        closeEnrollmentForm, 
        handleEnrollmentSubmit, 
        selectedLanzamientoForEnrollment, 
        isSubmitting,
        modalInfo,
        closeModal,
        isSeleccionadosModalOpen,
        closeSeleccionadosModal,
        seleccionadosData,
        convocatoriaForModal
    } = useData();

    const horariosStr = selectedLanzamientoForEnrollment?.['Horario Seleccionado'] || '';
    const horariosArray = horariosStr ? horariosStr.split('\n').map(h => h.trim()).filter(Boolean) : [];
    
    return (
        <>
            <Modal
                isOpen={!!modalInfo}
                title={modalInfo?.title || ''}
                message={modalInfo?.message || ''}
                onClose={closeModal}
            />
            
            <Dashboard />

            <EnrollmentForm
              isOpen={isEnrollmentFormOpen}
              onClose={closeEnrollmentForm}
              onSubmit={handleEnrollmentSubmit}
              convocatoriaName={selectedLanzamientoForEnrollment?.['Nombre PPS'] || ''}
              horariosDisponibles={horariosArray}
              isSubmitting={isSubmitting}
            />
            <SeleccionadosModal
                isOpen={isSeleccionadosModalOpen}
                onClose={closeSeleccionadosModal}
                seleccionados={seleccionadosData}
                convocatoriaName={convocatoriaForModal}
            />
            <Footer />
        </>
    );
};

export default StudentView;