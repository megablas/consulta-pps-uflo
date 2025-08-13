import React, { useEffect, useState } from 'react';
import CriteriosPanel from '../components/CriteriosPanel';
import ConvocatoriasList from '../components/ConvocatoriasList';
import SolicitudesList from '../components/SolicitudesList';
import PracticasTable from '../components/PracticasTable';
import EmptyState from '../components/EmptyState';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import { CriteriosPanelSkeleton, TableSkeleton } from '../components/Skeletons';
import { useData } from '../contexts/DataContext';
import EnrollmentForm from '../components/EnrollmentForm';
import Modal from '../components/Modal';
import SeleccionadosModal, { GroupedSeleccionados } from '../components/SeleccionadosModal';
import { LanzamientoPPS, ConvocatoriaFields, EstudianteFields } from '../types';
import { fetchAirtableData } from '../services/airtableService';
import { AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_LEGAJO_ESTUDIANTES, FIELD_HORARIO_FORMULA_CONVOCATORIAS, FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS } from '../constants';
import { normalizeStringForComparison } from '../utils/formatters';
import Footer from '../components/Footer';

const WelcomeHeader: React.FC<{ studentName: string }> = ({ studentName }) => (
    <div className="text-center mb-12 animate-fade-in-up">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-800 tracking-tight">
            ¡Hola, <span className="text-blue-600">{studentName.split(' ')[0]}</span>!
        </h1>
        <p className="mt-4 text-lg text-slate-600 max-w-2xl mx-auto">
            Este es tu centro de mando para las Prácticas Profesionales. Sigue tu progreso y encuentra nuevas oportunidades.
        </p>
    </div>
);

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
        showModal,
        isLoading,
        initialLoadCompleted,
        error,
        practicas,
        solicitudes,
        lanzamientos,
        myEnrollments,
        studentAirtableId,
        enrollingId,
        studentNameForPanel,
        handleInscribir
    } = useData();

    const [activeTab, setActiveTab] = useState('convocatorias');
    const [loadingSeleccionadosId, setLoadingSeleccionadosId] = useState<string | null>(null);
    const [isSeleccionadosModalOpen, setIsSeleccionadosModalOpen] = useState(false);
    const [seleccionadosData, setSeleccionadosData] = useState<GroupedSeleccionados | null>(null);
    const [convocatoriaForModal, setConvocatoriaForModal] = useState('');

    useEffect(() => {
        fetchStudentData();
    }, [fetchStudentData]);

    const handleVerSeleccionados = async (lanzamiento: LanzamientoPPS) => {
        setLoadingSeleccionadosId(lanzamiento.id);
        setConvocatoriaForModal(lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS] || 'Convocatoria');

        try {
            const ppsName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]?.replace(/'/g, "\\'");
            const ppsStartDate = lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS];

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
                    {${FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS}} = 'Seleccionado'
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
    };


    const horariosStr = selectedLanzamientoForEnrollment?.['Horario Seleccionado'] || '';
    const horariosArray = horariosStr ? horariosStr.split('\n').map(h => h.trim()).filter(Boolean) : [];
    
    const today = new Date();
    const visibleLanzamientos = lanzamientos.filter(l => {
        const startDateString = l[FIELD_FECHA_INICIO_LANZAMIENTOS];
        if (!startDateString) return false; 
        
        const startDate = new Date(startDateString);
        if (isNaN(startDate.getTime())) return false;

        const cutoffDate = new Date(startDate);
        cutoffDate.setDate(startDate.getDate() + 1);

        const status = normalizeStringForComparison(l[FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]);
        const isVisibleStatus = status === 'abierta' || status === 'abierto' || status === 'cerrado';
        
        return isVisibleStatus && today < cutoffDate;
    });

    const tabs = [
        {
            id: 'convocatorias',
            label: 'Convocatorias',
            icon: 'event_available',
            content: (
                <ConvocatoriasList 
                    lanzamientos={visibleLanzamientos} 
                    myEnrollments={myEnrollments}
                    studentAirtableId={studentAirtableId}
                    onInscribir={handleInscribir}
                    onVerSeleccionados={handleVerSeleccionados}
                    enrollingId={enrollingId}
                    loadingSeleccionadosId={loadingSeleccionadosId}
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
                    <WelcomeHeader studentName={studentNameForPanel} />
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
            <div className="space-y-12 animate-fade-in-up">
                <WelcomeHeader studentName={studentNameForPanel} />
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

    const shouldShowFooter = activeTab === 'practicas';

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
            <SeleccionadosModal
                isOpen={isSeleccionadosModalOpen}
                onClose={() => setIsSeleccionadosModalOpen(false)}
                seleccionados={seleccionadosData}
                convocatoriaName={convocatoriaForModal}
            />
            {shouldShowFooter && <Footer />}
        </>
    );
};

export default StudentView;