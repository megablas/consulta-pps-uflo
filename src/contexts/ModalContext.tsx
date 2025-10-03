import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LanzamientoPPS, GroupedSeleccionados, JornadaBlockCounts } from '../types';

type OnSubmitEnrollment = (formData: any) => Promise<void>;
type OnSubmitJornada = (selectedShiftIds: string[]) => Promise<void>;

// Type for mapping block IDs to their registration counts
export type { JornadaBlockCounts };

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

  // Jornada Registration Modal
  isJornadaModalOpen: boolean;
  lanzamientoForJornada: LanzamientoPPS | null;
  openJornadaModal: (lanzamiento: LanzamientoPPS, onSubmit: OnSubmitJornada, blockCounts: JornadaBlockCounts) => void;
  closeJornadaModal: () => void;
  onSubmitJornada: OnSubmitJornada | null;
  isSubmittingJornada: boolean;
  setIsSubmittingJornada: (isSubmitting: boolean) => void;
  jornadaBlockCounts: JornadaBlockCounts | null; // ADD: State for block counts
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
  
  const [isJornadaModalOpen, setIsJornadaModalOpen] = useState(false);
  const [lanzamientoForJornada, setLanzamientoForJornada] = useState<LanzamientoPPS | null>(null);
  const [onSubmitJornada, setOnSubmitJornada] = useState<OnSubmitJornada | null>(null);
  const [isSubmittingJornada, setIsSubmittingJornada] = useState(false);
  const [jornadaBlockCounts, setJornadaBlockCounts] = useState<JornadaBlockCounts | null>(null);


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

  const openJornadaModal = useCallback((lanzamiento: LanzamientoPPS, onSubmit: OnSubmitJornada, blockCounts: JornadaBlockCounts) => {
      setLanzamientoForJornada(lanzamiento);
      setOnSubmitJornada(() => onSubmit);
      setJornadaBlockCounts(blockCounts); // Store the counts
      setIsJornadaModalOpen(true);
  }, []);

  const closeJornadaModal = useCallback(() => {
      setIsJornadaModalOpen(false);
      setLanzamientoForJornada(null);
      setOnSubmitJornada(null);
      setJornadaBlockCounts(null); // Clear the counts
  }, []);
  
  const value = {
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
    isJornadaModalOpen,
    lanzamientoForJornada,
    openJornadaModal,
    closeJornadaModal,
    onSubmitJornada,
    isSubmittingJornada,
    setIsSubmittingJornada,
    jornadaBlockCounts, // Provide counts through context
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
