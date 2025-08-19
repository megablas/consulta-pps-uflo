import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { LanzamientoPPS, GroupedSeleccionados, ConvocatoriaFields, EstudianteFields } from '../types';
import { fetchAirtableData } from '../services/airtableService';
import {
  AIRTABLE_TABLE_NAME_CONVOCATORIAS,
  FIELD_NOMBRE_PPS_CONVOCATORIAS,
  FIELD_FECHA_INICIO_CONVOCATORIAS,
  FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS as FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS,
  FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
  FIELD_HORARIO_FORMULA_CONVOCATORIAS,
  AIRTABLE_TABLE_NAME_ESTUDIANTES,
  FIELD_NOMBRE_ESTUDIANTES,
  FIELD_LEGAJO_ESTUDIANTES
} from '../constants';

interface ModalContextType {
  // Generic Modal
  modalInfo: { title: string; message: string } | null;
  showModal: (title: string, message: string) => void;
  closeModal: () => void;
  
  // Enrollment Form Modal
  isEnrollmentFormOpen: boolean;
  enrollingId: string | null;
  setEnrollingId: (id: string | null) => void;
  selectedLanzamientoForEnrollment: LanzamientoPPS | null;
  handleInscribir: (lanzamiento: LanzamientoPPS) => void;
  closeEnrollmentForm: () => void;
  
  // Seleccionados Modal
  isSeleccionadosModalOpen: boolean;
  seleccionadosData: GroupedSeleccionados | null;
  convocatoriaForModal: string;
  loadingSeleccionadosId: string | null;
  handleVerSeleccionados: (lanzamiento: LanzamientoPPS) => void;
  closeSeleccionadosModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const ModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [modalInfo, setModalInfo] = useState<{ title: string; message: string } | null>(null);
  const [isEnrollmentFormOpen, setIsEnrollmentFormOpen] = useState(false);
  const [enrollingId, setEnrollingId] = useState<string | null>(null);
  const [selectedLanzamientoForEnrollment, setSelectedLanzamientoForEnrollment] = useState<LanzamientoPPS | null>(null);
  const [isSeleccionadosModalOpen, setIsSeleccionadosModalOpen] = useState(false);
  const [seleccionadosData, setSeleccionadosData] = useState<GroupedSeleccionados | null>(null);
  const [convocatoriaForModal, setConvocatoriaForModal] = useState('');
  const [loadingSeleccionadosId, setLoadingSeleccionadosId] = useState<string | null>(null);

  const showModal = useCallback((title: string, message: string) => {
    setModalInfo({ title, message });
  }, []);

  const closeModal = useCallback(() => {
    setModalInfo(null);
  }, []);

  const handleInscribir = useCallback((lanzamiento: LanzamientoPPS) => {
    setSelectedLanzamientoForEnrollment(lanzamiento);
    setIsEnrollmentFormOpen(true);
  }, []);

  const closeEnrollmentForm = useCallback(() => {
    setIsEnrollmentFormOpen(false);
    setSelectedLanzamientoForEnrollment(null);
    setEnrollingId(null);
  }, []);

  const closeSeleccionadosModal = useCallback(() => {
    setIsSeleccionadosModalOpen(false);
  }, []);

  const handleVerSeleccionados = useCallback(async (lanzamiento: LanzamientoPPS) => {
    setLoadingSeleccionadosId(lanzamiento.id);
    setConvocatoriaForModal(lanzamiento['Nombre PPS'] || 'Convocatoria');

    try {
      const ppsName = lanzamiento['Nombre PPS']?.replace(/'/g, "\\'");
      const ppsStartDate = lanzamiento['Fecha de Inicio'];

      if (!ppsName || !ppsStartDate) {
        showModal('Error', 'La convocatoria seleccionada no tiene un nombre o fecha de inicio válidos.');
        setLoadingSeleccionadosId(null);
        return;
      }

      const { records: convocatoriaRecords, error: convocatoriaError } = await fetchAirtableData<ConvocatoriaFields>(
        AIRTABLE_TABLE_NAME_CONVOCATORIAS,
        [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, FIELD_HORARIO_FORMULA_CONVOCATORIAS],
        `AND(
          {${FIELD_NOMBRE_PPS_CONVOCATORIAS}} = '${ppsName}',
          IS_SAME({${FIELD_FECHA_INICIO_CONVOCATORIAS}}, '${ppsStartDate}', 'day'),
          {${FIELD_ESTADO_INSCRIPTO_CONVOCATORIAS}} = 'Seleccionado'
        )`
      );

      if (convocatoriaError) throw new Error("No se pudo obtener la información de la convocatoria.");

      const studentHorarioMap = new Map<string, string>();
      const studentIds: string[] = [];
      convocatoriaRecords.forEach(record => {
        const studentId = (record.fields[FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS] || [])[0];
        if (studentId) {
          studentIds.push(studentId);
          const horario = record.fields[FIELD_HORARIO_FORMULA_CONVOCATORIAS] || 'No especificado';
          studentHorarioMap.set(studentId, horario);
        }
      });

      if (studentIds.length === 0) {
        setSeleccionadosData(null);
        setIsSeleccionadosModalOpen(true);
        setLoadingSeleccionadosId(null);
        return;
      }

      const uniqueStudentIds = [...new Set(studentIds)];
      const formula = `OR(${uniqueStudentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
      const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(
        AIRTABLE_TABLE_NAME_ESTUDIANTES,
        [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES],
        formula
      );

      if (studentError) throw new Error("No se pudo cargar la lista de estudiantes seleccionados.");

      const studentInfoList = studentRecords.map(student => ({
        nombre: student.fields[FIELD_NOMBRE_ESTUDIANTES] || 'Nombre no encontrado',
        legajo: student.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
        horario: studentHorarioMap.get(student.id) || 'Horario no especificado',
      }));

      const grouped: GroupedSeleccionados = studentInfoList.reduce((acc, student) => {
        const { horario, ...rest } = student;
        if (!acc[horario]) {
          acc[horario] = [];
        }
        acc[horario].push(rest);
        return acc;
      }, {} as GroupedSeleccionados);

      setSeleccionadosData(grouped);
      setIsSeleccionadosModalOpen(true);

    } catch (e: any) {
      showModal('Error', e.message);
    } finally {
      setLoadingSeleccionadosId(null);
    }
  }, [showModal]);

  const value = {
    modalInfo,
    showModal,
    closeModal,
    isEnrollmentFormOpen,
    enrollingId,
    setEnrollingId,
    selectedLanzamientoForEnrollment,
    handleInscribir,
    closeEnrollmentForm,
    isSeleccionadosModalOpen,
    seleccionadosData,
    convocatoriaForModal,
    loadingSeleccionadosId,
    handleVerSeleccionados,
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