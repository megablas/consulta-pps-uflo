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
import { LanzamientoPPS, ConvocatoriaFields, EstudianteFields } from '../types';
import { fetchAirtableData } from '../services/airtableService';
import { AIRTABLE_TABLE_NAME_CONVOCATORIAS, FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS, FIELD_ESTADO_INSCRIPCION_CONVOCATORIAS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS, AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, FIELD_FECHA_INICIO_CONVOCATORIAS, FIELD_NOMBRE_PPS_CONVOCATORIAS, FIELD_LEGAJO_ESTUDIANTES, FIELD_HORARIO_FORMULA_CONVOCATORIAS } from '../constants';
import { normalizeStringForComparison } from '../utils/formatters';

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
        handleInscribir
    } = useData();

    const [activeTab, setActiveTab] = useState('convocatorias');
    const [isFetchingSeleccionados, setIsFetchingSeleccionados] = useState(false);

    useEffect(() => {
        fetchStudentData();
    }, [fetchStudentData]);

    const handleVerSeleccionados = async (lanzamiento: LanzamientoPPS) => {
        setIsFetchingSeleccionados(true);
        try {
            const ppsName = lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]?.replace(/'/g, "\\'");
            const ppsStartDate = lanzamiento[FIELD_FECHA_INICIO_LANZAMIENTOS];

            if (!ppsName || !ppsStartDate) {
                showModal('Error', 'La convocatoria seleccionada no tiene un nombre o fecha de inicio válidos.');
                setIsFetchingSeleccionados(false);
                return;
            }

            // Step 1: Fetch convocatoria records to get student IDs and their assigned schedules.
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
            
            // Step 2: Create a map of student record ID to their schedule and collect all IDs.
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
                 const message = 'Aún no se ha publicado la lista o no hay seleccionados para esta PPS.';
                 showModal(`Seleccionados para: ${lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]}`, message);
                 setIsFetchingSeleccionados(false);
                 return;
            }

            // Step 3: Fetch student names and legajos from 'Estudiantes' table using the collected IDs.
            const uniqueStudentIds = [...new Set(studentIds)];
            const formula = `OR(${uniqueStudentIds.map(id => `RECORD_ID()='${id}'`).join(',')})`;
            const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(
                AIRTABLE_TABLE_NAME_ESTUDIANTES,
                [FIELD_NOMBRE_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES],
                formula
            );

            if (studentError) throw new Error("No se pudo cargar la lista de estudiantes seleccionados.");
            
            // Step 4: Combine data and construct the message for the modal.
            const studentInfoList = studentRecords.map(student => ({
                nombre: student.fields[FIELD_NOMBRE_ESTUDIANTES] || 'Nombre no encontrado',
                legajo: student.fields[FIELD_LEGAJO_ESTUDIANTES] || 'N/A',
                horario: studentHorarioMap.get(student.id) || 'No especificado',
            })).sort((a, b) => a.nombre.localeCompare(b.nombre));

            const message = studentInfoList.length > 0
                ? `Los siguientes estudiantes fueron seleccionados:\n\n` + 
                  studentInfoList.map(s => `• ${s.nombre} (Legajo: ${s.legajo})\n  Horario: ${s.horario}`).join('\n\n')
                : 'Aún no se ha publicado la lista o no hay seleccionados para esta PPS.';
            
            showModal(`Seleccionados para: ${lanzamiento[FIELD_NOMBRE_PPS_LANZAMIENTOS]}`, message);

        } catch (e: any) {
            showModal('Error', e.message);
        } finally {
            setIsFetchingSeleccionados(false);
        }
    };


    const horariosStr = selectedLanzamientoForEnrollment?.['Horario Seleccionado'] || '';
    const horariosArray = horariosStr ? horariosStr.split(/[,;]/).map(h => h.trim()).filter(Boolean) : [];
    
    const today = new Date();
    const visibleLanzamientos = lanzamientos.filter(l => {
        const startDateString = l[FIELD_FECHA_INICIO_LANZAMIENTOS];
        if (!startDateString) return true; // Keep if no start date
        
        const startDate = new Date(startDateString);
        if (isNaN(startDate.getTime())) return true; // Keep if date is invalid

        const cutoffDate = new Date(startDate);
        cutoffDate.setDate(startDate.getDate() + 2); // 2 days after start

        return today < cutoffDate;
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
                    enrollingId={enrollingId || (isFetchingSeleccionados ? 'loading' : null)}
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