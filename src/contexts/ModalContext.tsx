import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LanzamientoPPS, GroupedSeleccionados } from '../types';

type OnSubmitEnrollment = (formData: any) => Promise<void>;

interface ModalContextType {
  // Generic Modal
  modalInfo: { title: string; message: string } | null;
  showModal: (title: string, message: string) => void;
  closeModal: () => void;
  
  // Enrollment Form Modal
  isEnrollmentFormOpen: boolean;
  selectedLanzamientoForEnrollment: LanzamientoPPS | null;
  openEnrollmentForm: (lanzamiento: LanzamientoPPS, onSubmit: OnSubmitEnrollment) => void;
  closeEnrollmentForm: () => void;
  onSubmitEnrollment: OnSubmitEnrollment | null;
  isSubmittingEnrollment: boolean;
  setIsSubmittingEnrollment: (isSubmitting: boolean) => void;
  
  // Seleccionados Modal
  isSeleccionadosModalOpen: boolean;
  seleccionadosData: GroupedSeleccionados | null;
  convocatoriaForModal: string;
  openSeleccionadosModal: (data: GroupedSeleccionados | null, title: string) => void;
  closeSeleccionadosModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalInfo, setModalInfo] = useState<{ title: string; message: string } | null>(null);
  const [isEnrollmentFormOpen, setIsEnrollmentFormOpen] = useState(false);
  const [selectedLanzamientoForEnrollment, setSelectedLanzamientoForEnrollment] = useState<LanzamientoPPS | null>(null);
  const [onSubmitEnrollment, setOnSubmitEnrollment] = useState<OnSubmitEnrollment | null>(null);
  const [isSubmittingEnrollment, setIsSubmittingEnrollment] = useState(false);
  
  const [isSeleccionadosModalOpen, setIsSeleccionadosModalOpen] = useState(false);
  const [seleccionadosData, setSeleccionadosData] = useState<GroupedSeleccionados | null>(null);
  const [convocatoriaForModal, setConvocatoriaForModal] = useState('');

  const showModal = useCallback((title: string, message: string) => {
    setModalInfo({ title, message });
  }, []);

  const closeModal = useCallback(() => {
    setModalInfo(null);
  }, []);

  const openEnrollmentForm = useCallback((lanzamiento: LanzamientoPPS, onSubmit: OnSubmitEnrollment) => {
    setSelectedLanzamientoForEnrollment(lanzamiento);
    setOnSubmitEnrollment(() => onSubmit);
    setIsEnrollmentFormOpen(true);
  }, []);

  const closeEnrollmentForm = useCallback(() => {
    setIsEnrollmentFormOpen(false);
    setSelectedLanzamientoForEnrollment(null);
    setOnSubmitEnrollment(null);
  }, []);
  
  const openSeleccionadosModal = useCallback((data: GroupedSeleccionados | null, title: string) => {
      setSeleccionadosData(data);
      setConvocatoriaForModal(title);
      setIsSeleccionadosModalOpen(true);
  }, []);

  const closeSeleccionadosModal = useCallback(() => {
    setIsSeleccionadosModalOpen(false);
    setSeleccionadosData(null);
    setConvocatoriaForModal('');
  }, []);
  
  const value: ModalContextType = {
    modalInfo,
    showModal,
    closeModal,
    isEnrollmentFormOpen,
    selectedLanzamientoForEnrollment,
    openEnrollmentForm,
    closeEnrollmentForm,
    onSubmitEnrollment,
    isSubmittingEnrollment,
    setIsSubmittingEnrollment,
    isSeleccionadosModalOpen,
    seleccionadosData,
    convocatoriaForModal,
    openSeleccionadosModal,
    closeSeleccionadosModal,
  };

  return (
    <ModalContext.Provider value={value}>
      {children}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextType => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
