import React from 'react';
import { useModal } from '../contexts/ModalContext';
import { useData } from '../contexts/DataContext';
import Modal from './Modal';
import { EnrollmentForm } from './EnrollmentForm';
import SeleccionadosModal from './SeleccionadosModal';
import { FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS } from '../constants';

const AppModals: React.FC = () => {
    const { 
        modalInfo,
        closeModal,
        isEnrollmentFormOpen,
        closeEnrollmentForm,
        selectedLanzamientoForEnrollment,
        isSeleccionadosModalOpen,
        closeSeleccionadosModal,
        seleccionadosData,
        convocatoriaForModal
    } = useModal();
    
    // Data-related functions are still sourced from DataContext
    const { isSubmitting, handleEnrollmentSubmit } = useData();

    // The form needs a callback that knows about the selected lanzamiento
    const onEnrollmentSubmit = (formData: any) => {
        if (selectedLanzamientoForEnrollment) {
            handleEnrollmentSubmit(formData, selectedLanzamientoForEnrollment);
        }
    };

    const horariosStr = selectedLanzamientoForEnrollment?.[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS] || '';
    const horariosArray = horariosStr ? horariosStr.split(';').map(h => h.trim()).filter(Boolean) : [];

    return (
        <>
            <Modal
                isOpen={!!modalInfo}
                title={modalInfo?.title || ''}
                message={modalInfo?.message || ''}
                onClose={closeModal}
            />
            
            <EnrollmentForm
              isOpen={isEnrollmentFormOpen}
              onClose={closeEnrollmentForm}
              onSubmit={onEnrollmentSubmit}
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
        </>
    );
};

export default AppModals;
