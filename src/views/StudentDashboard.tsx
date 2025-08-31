import React, { useState, useMemo, useEffect } from 'react';
import CriteriosPanel from '../components/CriteriosPanel';
import PracticasTable from '../components/PracticasTable';
import SolicitudesList from '../components/SolicitudesList';
import EmptyState from '../components/EmptyState';
import Tabs from '../components/Tabs';
import Card from '../components/Card';
import WelcomeBanner from '../components/WelcomeBanner';
import ConvocatoriasList from '../components/ConvocatoriasList';
import InformesList from '../components/InformesList';
import WhatsAppExportButton from '../components/WhatsAppExportButton';
import { useAuth } from '../contexts/AuthContext';
import type { AuthUser } from '../contexts/AuthContext';
import type { TabId, Orientacion } from '../types';
import { calculateCriterios } from '../utils/criteriaCalculations';
import DashboardLoadingSkeleton from '../components/DashboardLoadingSkeleton';
import ErrorState from '../components/ErrorState';
import { useStudentData } from '../hooks/useStudentData';
import { useStudentPracticas } from '../hooks/useStudentPracticas';
import { useStudentSolicitudes } from '../hooks/useStudentSolicitudes';
import { useConvocatorias } from '../hooks/useConvocatorias';
import { processInformeTasks } from '../services/dataService';
import ProfileView from '../components/ProfileView';

interface StudentDashboardProps {
  user: AuthUser;
  activeTab?: TabId;
  onTabChange?: (tabId: TabId) => void;
  showExportButton?: boolean;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, activeTab, onTabChange, showExportButton = false }) => {
  const { isSuperUserMode } = useAuth();
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);

  // --- CUSTOM HOOKS FOR DATA FETCHING AND MUTATIONS ---
  const { studentDetails, studentAirtableId, isStudentLoading, studentError, updateOrientation, refetchStudent } = useStudentData(user.legajo);
  const { practicas, isPracticasLoading, practicasError, updateNota, refetchPracticas } = useStudentPracticas(user.legajo);
  const { solicitudes, isSolicitudesLoading, solicitudesError, refetchSolicitudes } = useStudentSolicitudes(user.legajo, studentAirtableId);
  const { 
    lanzamientos, myEnrollments, allLanzamientos, isConvocatoriasLoading, convocatoriasError,
    enrollStudent, confirmInforme, refetchConvocatorias 
  } = useConvocatorias(user.legajo, studentAirtableId, isSuperUserMode);

  // --- DERIVED STATE & MEMOIZATION ---
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>(showExportButton ? 'practicas' : 'convocatorias');
  const currentActiveTab = activeTab ?? internalActiveTab;
  const setCurrentActiveTab = onTabChange ?? setInternalActiveTab;
  
  const isLoading = isStudentLoading || isPracticasLoading || isSolicitudesLoading || isConvocatoriasLoading;
  const error = studentError || practicasError || solicitudesError || convocatoriasError;

  const refetchAll = () => {
    refetchStudent();
    refetchPracticas();
    refetchSolicitudes();
    refetchConvocatorias();
  };
  
  const selectedOrientacion = (studentDetails?.['Orientación Elegida'] || "") as Orientacion | "";
  const studentNameForPanel = studentDetails?.['Nombre'] || user.nombre;

  const criterios = useMemo(() => calculateCriterios(practicas, selectedOrientacion), [practicas, selectedOrientacion]);
  const informeTasks = useMemo(() => processInformeTasks(myEnrollments, allLanzamientos, practicas), [myEnrollments, allLanzamientos, practicas]);

  // --- MUTATION HANDLERS ---
  const handleOrientacionChange = (orientacion: Orientacion | "") => {
    updateOrientation.mutate(orientacion, {
      onSuccess: () => {
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 2000);
      }
    });
  };

  const handleNotaChange = (practicaId: string, nota: string, convocatoriaId?: string) => {
    updateNota.mutate({ practicaId, nota, convocatoriaId });
  };
  
  const studentDataTabs = useMemo(() => {
    let tabs = [
      { id: 'convocatorias' as TabId, label: `Convocatorias`, icon: 'campaign', content: <ConvocatoriasList lanzamientos={lanzamientos} myEnrollments={myEnrollments} practicas={practicas} student={studentDetails} onInscribir={enrollStudent.mutate} />, badge: lanzamientos.length > 0 ? lanzamientos.length : undefined },
      { id: 'informes' as TabId, label: `Informes`, icon: 'assignment_turned_in', content: <InformesList tasks={informeTasks} onConfirmar={confirmInforme.mutate} />, badge: informeTasks.length > 0 ? informeTasks.length : undefined },
      { id: 'solicitudes' as TabId, label: `Mis Solicitudes`, icon: 'list_alt', content: <SolicitudesList solicitudes={solicitudes} />, badge: solicitudes.length > 0 ? solicitudes.length : undefined },
      { id: 'practicas' as TabId, label: `Mis Prácticas`, icon: 'work_history', content: <PracticasTable practicas={practicas} handleNotaChange={handleNotaChange} />, badge: practicas.length > 0 ? practicas.length : undefined }
    ];

    if (showExportButton) {
      // Admin/Jefe view of a student. User wants 'Informes', 'Solicitudes', 'Prácticas'.
      return tabs.filter(tab => tab.id === 'informes' || tab.id === 'solicitudes' || tab.id === 'practicas');
    }
    
    // Student's own view, add profile tab.
    tabs.push({
        id: 'profile' as TabId,
        label: 'Mi Perfil',
        icon: 'person',
        content: <ProfileView studentDetails={studentDetails} isLoading={isStudentLoading} />,
        badge: undefined
    });
    return tabs;

  }, [solicitudes, practicas, lanzamientos, myEnrollments, informeTasks, studentDetails, confirmInforme.mutate, handleNotaChange, enrollStudent.mutate, showExportButton, isStudentLoading]);
  
  // Effect to reset active tab if it's no longer in the list of available tabs (e.g., after filtering for admin view).
  useEffect(() => {
    const isCurrentTabValid = studentDataTabs.some(tab => tab.id === currentActiveTab);
    if (!isCurrentTabValid && studentDataTabs.length > 0) {
      setCurrentActiveTab(studentDataTabs[0].id);
    }
  }, [studentDataTabs, currentActiveTab, setCurrentActiveTab]);

  const hasData = useMemo(() => practicas.length > 0 || solicitudes.length > 0 || lanzamientos.length > 0 || informeTasks.length > 0, [practicas, solicitudes, lanzamientos, informeTasks]);
  const showEmptyState = useMemo(() => !isLoading && !hasData && isSuperUserMode, [isLoading, hasData, isSuperUserMode]);

  // --- RENDER LOGIC ---
  if (isLoading) return <DashboardLoadingSkeleton />;
  if (error) return <ErrorState error={error.message} onRetry={refetchAll} />;

  if (showEmptyState) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={false} />
        <CriteriosPanel criterios={criterios} selectedOrientacion={selectedOrientacion} handleOrientacionChange={handleOrientacionChange} showSaveConfirmation={showSaveConfirmation} />
        <Card className="border-slate-300/50 bg-slate-50/30">
          <EmptyState icon="search_off" title="Sin Resultados" message="No se encontró información de prácticas o solicitudes para este estudiante." action={<button onClick={refetchAll} className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 hover:scale-105">Actualizar Datos</button>} />
        </Card>
        {showExportButton && <WhatsAppExportButton practicas={practicas} criterios={criterios} selectedOrientacion={selectedOrientacion} studentNameForPanel={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />}
      </div>
    );
  }
  
  return (
    <div className="space-y-8 animate-fade-in-up">
      <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
      <CriteriosPanel criterios={criterios} selectedOrientacion={selectedOrientacion} handleOrientacionChange={handleOrientacionChange} showSaveConfirmation={showSaveConfirmation} />
      {hasData && (
        <Card>
          <Tabs
            tabs={studentDataTabs}
            activeTabId={currentActiveTab}
            onTabChange={(id) => setCurrentActiveTab(id as TabId)}
          />
        </Card>
      )}
      {showExportButton && <WhatsAppExportButton practicas={practicas} criterios={criterios} selectedOrientacion={selectedOrientacion} studentNameForPanel={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />}
    </div>
  );
};

export default StudentDashboard;