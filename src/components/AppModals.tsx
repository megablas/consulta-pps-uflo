import React from 'react';
import { useModal } from '../contexts/ModalContext';
import Modal from './Modal';
import { EnrollmentForm } from './EnrollmentForm';
import SeleccionadosModal from './SeleccionadosModal';
import { FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS } from '../constants';
import JornadaRegistrationForm from './JornadaRegistrationForm';

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
        convocatoriaForModal,
        isSubmittingEnrollment,
        onSubmitEnrollment,
        // ADD: Jornada modal props from context
        isJornadaModalOpen,
        closeJornadaModal,
        lanzamientoForJornada,
        isSubmittingJornada,
        onSubmitJornada,
        jornadaBlockCounts,
    } = useModal();

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
              onSubmit={onSubmitEnrollment || (() => Promise.resolve())} // Proporciona una función vacía como fallback
              convocatoriaName={selectedLanzamientoForEnrollment?.['Nombre PPS'] || ''}
              horariosDisponibles={horariosArray}
              isSubmitting={isSubmittingEnrollment}
            />

            <SeleccionadosModal
                isOpen={isSeleccionadosModalOpen}
                onClose={closeSeleccionadosModal}
                seleccionados={seleccionadosData}
                convocatoriaName={convocatoriaForModal}
            />

            {/* ADD: Render the new Jornada Registration Modal */}
            <JornadaRegistrationForm
                isOpen={isJornadaModalOpen}
                onClose={closeJornadaModal}
                onSubmit={onSubmitJornada || (() => Promise.resolve())}
                convocatoriaName={lanzamientoForJornada?.['Nombre PPS'] || ''}
                isSubmitting={isSubmittingJornada}
                blockCounts={jornadaBlockCounts}
            />
        </>
    );
};

export default AppModals;
