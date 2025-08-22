import React, { useState, useCallback } from 'react';
import AdminSearch from '../components/AdminSearch';
import SeguroGenerator from '../components/SeguroGenerator';
import Dashboard from '../components/Dashboard';
import { DataProvider } from '../contexts/DataContext';
import { useModal } from '../contexts/ModalContext';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import ConvocatoriaManager from '../components/ConvocatoriaManager';
import CorreccionPanel from '../components/CorreccionPanel';
import type { TabId, AirtableRecord, EstudianteFields, LanzamientoPPS, LanzamientoPPSFields, ConvocatoriaFields } from '../types';
import ConvocatoriaStatusManager from '../components/ConvocatoriaStatusManager';
import PpsSelectionModal from '../components/PpsSelectionModal';
import { EnrollmentForm } from '../components/EnrollmentForm';
import { createAirtableRecord, fetchAllAirtableData } from '../services/airtableService';
import { parseToUTCDate, normalizeStringForComparison } from '../utils/formatters';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS, FIELD_FECHA_FIN_LANZAMIENTOS,
  AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
  FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_FECHA_FIN_CONVOCATORIAS, FIELD_DIRECCION_CONVOCATORIAS,
  FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_ORIENTACION_CONVOCATORIAS, FIELD_HORAS_ACREDITADAS_CONVOCATORIAS,
  FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_LEGAJO_CONVOCATORIAS,
  FIELD_DNI_CONVOCATORIAS, FIELD_CORREO_CONVOCATORIAS, FIELD_FECHA_NACIMIENTO_CONVOCATORIAS, FIELD_TELEFONO_CONVOCATORIAS,
  FIELD_TERMINO_CURSAR_CONVOCATORIAS, FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS, FIELD_FINALES_ADEUDA_CONVOCATORIAS,
  FIELD_OTRA_SITUACION_CONVOCATORIAS, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
  FIELD_DIRECCION_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS, FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS, FIELD_LEGAJO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES,
  FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES
} from '../constants';


interface StudentTab {
    id: string; // legajo
    legajo: string;
    nombre: string;
}

const StudentDashboard: React.FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('convocatorias');
    // The Dashboard for a student in the admin view is self-contained.
    // Its tab state doesn't need to be shared with other components like the footer.
    return <Dashboard activeTab={activeTab} onTabChange={setActiveTab} />;
};

const AdminView: React.FC = () => {
    const [studentTabs, setStudentTabs] = useState<StudentTab[]>([]);
    const [activeTabId, setActiveTabId] = useState('correccion');
    const { showModal } = useModal();
    
    // State for admin-driven enrollment flow
    const [studentToEnroll, setStudentToEnroll] = useState<AirtableRecord<EstudianteFields> | null>(null);
    const [isPpsSelectionModalOpen, setIsPpsSelectionModalOpen] = useState(false);
    const [availablePps, setAvailablePps] = useState<LanzamientoPPS[]>([]);
    const [isLoadingPps, setIsLoadingPps] = useState(false);
    const [selectedPpsForEnrollment, setSelectedPpsForEnrollment] = useState<LanzamientoPPS | null>(null);
    const [isEnrollmentFormOpenForAdmin, setIsEnrollmentFormOpenForAdmin] = useState(false);
    const [isSubmittingAdminEnrollment, setIsSubmittingAdminEnrollment] = useState(false);

    const handleViewStudent = useCallback((student: { legajo: string, nombre: string }) => {
        if (studentTabs.some(s => s.legajo === student.legajo)) {
            setActiveTabId(student.legajo);
            return;
        }
        
        const newStudentTab: StudentTab = {
            id: student.legajo,
            legajo: student.legajo,
            nombre: student.nombre,
        };
        setStudentTabs(prev => [...prev, newStudentTab]);
        setActiveTabId(student.legajo);
    }, [studentTabs]);

    const handleEnrollStudent = useCallback(async (student: AirtableRecord<EstudianteFields>) => {
        setStudentToEnroll(student);
        setIsPpsSelectionModalOpen(true);
        setIsLoadingPps(true);
        try {
            const { records, error } = await fetchAllAirtableData<LanzamientoPPSFields>(
                AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS, [], undefined, [{field: FIELD_FECHA_INICIO_LANZAMIENTOS, direction: 'desc'}]
            );
            if (error) throw new Error('Error al cargar lanzamientos.');

            const openLanzamientos = records.map(r => ({ ...r.fields, id: r.id })).filter(l => {
                const status = normalizeStringForComparison(l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
                if (status === 'abierta' || status === 'abierto') return true;
                const endDateString = l[FIELD_FECHA_FIN_LANZAMIENTOS];
                if (!status && endDateString) {
                    const today = new Date(); today.setHours(0, 0, 0, 0);
                    const endDate = parseToUTCDate(endDateString);
                    if (endDate) return endDate.getTime() >= today.getTime();
                }
                return false;
            });
            setAvailablePps(openLanzamientos);
        } catch (e: any) {
            showModal('Error', e.message || 'No se pudieron cargar las convocatorias abiertas.');
            setIsPpsSelectionModalOpen(false);
            setStudentToEnroll(null);
        } finally {
            setIsLoadingPps(false);
        }
    }, [showModal]);

    const handlePpsSelected = (pps: LanzamientoPPS) => {
        setSelectedPpsForEnrollment(pps);
        setIsPpsSelectionModalOpen(false);
        setIsEnrollmentFormOpenForAdmin(true);
    };

    const handleCloseEnrollmentForm = () => {
        setIsEnrollmentFormOpenForAdmin(false);
        setStudentToEnroll(null);
        setSelectedPpsForEnrollment(null);
    };

    const handleAdminEnrollmentSubmit = async (formData: any) => {
        if (!studentToEnroll || !selectedPpsForEnrollment) {
            showModal('Error', 'Faltan datos del estudiante o de la PPS seleccionada.');
            return;
        }
        
        setIsSubmittingAdminEnrollment(true);
        
        const newRecord: Partial<ConvocatoriaFields> = {
            [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [selectedPpsForEnrollment.id],
            [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: [studentToEnroll.id],
            [FIELD_NOMBRE_PPS_CONVOCATORIAS]: selectedPpsForEnrollment[FIELD_NOMBRE_PPS_LANZAMIENTOS],
            [FIELD_FECHA_INICIO_CONVOCATORIAS]: selectedPpsForEnrollment[FIELD_FECHA_INICIO_LANZAMIENTOS],
            [FIELD_FECHA_FIN_CONVOCATORIAS]: selectedPpsForEnrollment[FIELD_FECHA_FIN_LANZAMIENTOS],
            [FIELD_DIRECCION_CONVOCATORIAS]: selectedPpsForEnrollment[FIELD_DIRECCION_LANZAMIENTOS],
            [FIELD_HORARIO_FORMULA_CONVOCATORIAS]: Array.isArray(formData.horarios) && formData.horarios.length > 0 ? formData.horarios.join(', ') : selectedPpsForEnrollment[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS] || 'No especificado',
            [FIELD_ORIENTACION_CONVOCATORIAS]: selectedPpsForEnrollment[FIELD_ORIENTACION_LANZAMIENTOS],
            [FIELD_HORAS_ACREDITADAS_CONVOCATORIAS]: selectedPpsForEnrollment[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS],
            [FIELD_CUPOS_DISPONIBLES_CONVOCATORIAS]: selectedPpsForEnrollment[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS],
            [FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS]: 'Inscripto',
            [FIELD_LEGAJO_CONVOCATORIAS]: studentToEnroll.fields[FIELD_LEGAJO_ESTUDIANTES] ? parseInt(studentToEnroll.fields[FIELD_LEGAJO_ESTUDIANTES], 10) : undefined,
            [FIELD_DNI_CONVOCATORIAS]: studentToEnroll.fields[FIELD_DNI_ESTUDIANTES] ? String(studentToEnroll.fields[FIELD_DNI_ESTUDIANTES]) : undefined,
            [FIELD_CORREO_CONVOCATORIAS]: studentToEnroll.fields[FIELD_CORREO_ESTUDIANTES],
            [FIELD_FECHA_NACIMIENTO_CONVOCATORIAS]: studentToEnroll.fields[FIELD_FECHA_NACIMIENTO_ESTUDIANTES],
            [FIELD_TELEFONO_CONVOCATORIAS]: studentToEnroll.fields[FIELD_TELEFONO_ESTUDIANTES],
            [FIELD_TERMINO_CURSAR_CONVOCATORIAS]: formData.terminoDeCursar ? 'Sí' : 'No',
            [FIELD_CURSANDO_ELECTIVAS_CONVOCATORIAS]: formData.cursandoElectivas ? 'Sí' : 'No',
            [FIELD_FINALES_ADEUDA_CONVOCATORIAS]: formData.finalesAdeudados || null,
            [FIELD_OTRA_SITUACION_CONVOCATORIAS]: formData.otraSituacionAcademica,
        };

        const { error } = await createAirtableRecord<ConvocatoriaFields>(AIRTABLE_TABLE_NAME_CONVOCATORIAS, newRecord);
        
        setIsSubmittingAdminEnrollment(false);
        
        if (error) {
            showModal('Error en Inscripción', `No se pudo inscribir al estudiante. Error: ${typeof error.error === 'string' ? error.error : error.error.message}`);
        } else {
            handleCloseEnrollmentForm();
            showModal('¡Inscripción Exitosa!', `Se ha inscripto a ${studentToEnroll.fields[FIELD_NOMBRE_ESTUDIANTES]} en ${selectedPpsForEnrollment[FIELD_NOMBRE_PPS_LANZAMIENTOS]}.`);
        }
    };

    const handleCloseTab = useCallback((tabId: string) => {
        setStudentTabs(prev => prev.filter(s => s.id !== tabId));
        if (activeTabId === tabId) {
            setActiveTabId('correccion');
        }
    }, [activeTabId]);

    const horariosStr = selectedPpsForEnrollment?.['Horario Seleccionado'] || '';
    const horariosArray = horariosStr ? horariosStr.split(',').map(h => h.trim()).filter(Boolean) : [];
    
    const allTabs = [
        {
            id: 'correccion',
            label: 'Corrección de Informes',
            icon: 'rule',
            isClosable: false,
            content: <CorreccionPanel />
        },
        {
            id: 'convocatorias-manager',
            label: 'Gestionar Convocatorias',
            icon: 'settings',
            isClosable: false,
            content: <ConvocatoriaStatusManager />
        },
        {
            id: 'gestion-pps',
            label: 'Gestión de PPS',
            icon: 'manage_history',
            isClosable: false,
            content: <ConvocatoriaManager />
        },
        {
            id: 'seguro',
            label: 'Generador de Seguros',
            icon: 'shield',
            isClosable: false,
            content: <SeguroGenerator showModal={showModal}/>
        },
        {
            id: 'search',
            label: 'Buscar Estudiante',
            icon: 'person_search',
            isClosable: false,
            content: <div className="p-4"><AdminSearch onViewStudent={handleViewStudent} onEnrollStudent={handleEnrollStudent} /></div>
        },
        ...studentTabs.map(student => ({
            id: student.id,
            label: student.nombre,
            icon: 'school',
            isClosable: true,
            content: (
                <DataProvider key={student.legajo} user={student}>
                    <StudentDashboard />
                </DataProvider>
            )
        }))
    ];

    return (
        <>
            <Card>
                <Tabs
                    tabs={allTabs}
                    activeTabId={activeTabId}
                    onTabChange={setActiveTabId}
                    onTabClose={handleCloseTab}
                />
            </Card>

            <PpsSelectionModal
                isOpen={isPpsSelectionModalOpen}
                onClose={() => setIsPpsSelectionModalOpen(false)}
                ppsList={availablePps}
                onSelect={handlePpsSelected}
                isLoading={isLoadingPps}
            />
            
            <EnrollmentForm
                isOpen={isEnrollmentFormOpenForAdmin}
                onClose={handleCloseEnrollmentForm}
                onSubmit={handleAdminEnrollmentSubmit}
                convocatoriaName={selectedPpsForEnrollment?.[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''}
                isSubmitting={isSubmittingAdminEnrollment}
                horariosDisponibles={horariosArray}
            />
        </>
    );
};

export default AdminView;