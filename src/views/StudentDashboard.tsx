import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CriteriosPanel from '../components/CriteriosPanel';
import PracticasTable from '../components/PracticasTable';
import SolicitudesList from '../components/SolicitudesList';
import Tabs from '../components/Tabs';
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
import PrintableReport from '../components/PrintableReport';
import MobileBottomNav from '../components/MobileBottomNav';
import { HORAS_OBJETIVO_TOTAL } from '../constants';

interface StudentDashboardProps {
  user: AuthUser;
  activeTab?: TabId;
  onTabChange?: (tabId: TabId) => void;
  showExportButton?: boolean;
}

const CollapsedCriteriosPanel: React.FC<{
  criterios: ReturnType<typeof calculateCriterios>;
  onToggle: () => void;
  isOpen: boolean;
}> = ({ criterios, onToggle, isOpen }) => {
    const percentage = HORAS_OBJETIVO_TOTAL > 0 ? Math.max(0, Math.min(Math.round((criterios.horasTotales / HORAS_OBJETIVO_TOTAL) * 100), 100)) : 0;
    
    return (
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-md p-4 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg">
            <div className="flex items-center justify-between gap-4">
                {/* Left & Middle Part */}
                <div className="flex items-center gap-4 min-w-0">
                    {/* Big Percentage & Hours */}
                    <div className="flex-shrink-0 text-center leading-none">
                        <div className="flex items-baseline">
                            <span className="text-5xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">{percentage}</span>
                            <span className="text-2xl font-bold text-blue-600/70 dark:text-blue-400/70">%</span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 mt-1 whitespace-nowrap">{Math.round(criterios.horasTotales)} / {HORAS_OBJETIVO_TOTAL} hs</div>
                    </div>
                    {/* Title */}
                    <div className="min-w-0">
                        <h3 className="font-bold text-slate-800 dark:text-slate-100 truncate">Tu Progreso</h3>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">Resumen de criterios PPS</p>
                    </div>
                </div>
                
                {/* Right Part (Button) */}
                <button 
                    onClick={onToggle} 
                    className="flex-shrink-0 flex items-center gap-1 text-sm font-semibold text-blue-600 dark:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/50 transition-colors whitespace-nowrap"
                    aria-expanded={isOpen}
                    aria-controls="criterios-panel-full"
                >
                    <span>Ver Detalles</span>
                    <span className={`material-icons !text-lg transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                </button>
            </div>
        </div>
    );
};


const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, activeTab, onTabChange, showExportButton = false }) => {
  const { isSuperUserMode } = useAuth();
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [isCriteriosPanelOpen, setIsCriteriosPanelOpen] = useState(false);

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

  const refetchAll = useCallback(() => {
    refetchStudent();
    refetchPracticas();
    refetchSolicitudes();
    refetchConvocatorias();
  }, [refetchStudent, refetchPracticas, refetchSolicitudes, refetchConvocatorias]);
  
  const selectedOrientacion = (studentDetails?.['Orientación Elegida'] || "") as Orientacion | "";
  const studentNameForPanel = studentDetails?.['Nombre'] || user.nombre;

  const criterios = useMemo(() => calculateCriterios(practicas, selectedOrientacion), [practicas, selectedOrientacion]);
  const informeTasks = useMemo(() => processInformeTasks(myEnrollments, allLanzamientos, practicas), [myEnrollments, allLanzamientos, practicas]);

  // --- MUTATION HANDLERS ---
  const handleOrientacionChange = useCallback((orientacion: Orientacion | "") => {
    updateOrientation.mutate(orientacion, {
      onSuccess: () => {
        setShowSaveConfirmation(true);
        setTimeout(() => setShowSaveConfirmation(false), 2000);
      }
    });
  }, [updateOrientation]);

  const handleNotaChange = useCallback((practicaId: string, nota: string, convocatoriaId?: string) => {
    updateNota.mutate({ practicaId, nota, convocatoriaId });
  }, [updateNota]);

  // FIX: Memoize tab content to prevent re-renders on tab change
  const convocatoriasContent = useMemo(() => <ConvocatoriasList lanzamientos={lanzamientos} myEnrollments={myEnrollments} practicas={practicas} student={studentDetails} onInscribir={enrollStudent.mutate} />, [lanzamientos, myEnrollments, practicas, studentDetails, enrollStudent.mutate]);
  const informesContent = useMemo(() => <InformesList tasks={informeTasks} onConfirmar={confirmInforme.mutate} />, [informeTasks, confirmInforme.mutate]);
  const solicitudesContent = useMemo(() => <SolicitudesList solicitudes={solicitudes} />, [solicitudes]);
  const practicasContent = useMemo(() => <PracticasTable practicas={practicas} handleNotaChange={handleNotaChange} />, [practicas, handleNotaChange]);
  const profileContent = useMemo(() => <ProfileView studentDetails={studentDetails} isLoading={isStudentLoading} />, [studentDetails, isStudentLoading]);

  const studentDataTabs = useMemo(() => {
    let tabs = [
      { id: 'convocatorias' as TabId, label: `Convocatorias`, icon: 'campaign', title: 'Convocatorias Abiertas', description: "Aquí encontrarás las oportunidades de Prácticas Profesionales Supervisadas (PPS) disponibles para postularte.", content: convocatoriasContent },
      { id: 'informes' as TabId, label: `Informes`, icon: 'assignment_turned_in', title: 'Entrega de Informes', description: "Gestiona la entrega de tus informes finales. Sube tu trabajo al campus y luego confirma la entrega aquí para que podamos registrarlo.", content: informesContent },
      { id: 'solicitudes' as TabId, label: `Mis Solicitudes`, icon: 'list_alt', title: 'Seguimiento de Solicitudes', description: "Revisa el estado de las solicitudes de PPS que has autogestionado. Te notificaremos por correo ante cualquier novedad.", content: solicitudesContent },
      { id: 'practicas' as TabId, label: `Mis Prácticas`, icon: 'work_history', title: 'Historial de Prácticas', description: "Aquí se detallan todas las prácticas que has realizado, junto con sus horas, fechas y estado.", content: practicasContent }
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
        title: 'Mis Datos Personales',
        description: 'Aquí puedes revisar la información de contacto que tenemos registrada. Si algo es incorrecto, por favor solicita una actualización.',
        content: profileContent,
    });
    return tabs;

  }, [showExportButton, convocatoriasContent, informesContent, solicitudesContent, practicasContent, profileContent]);
  
  const mobileNavTabs = useMemo(() => studentDataTabs.filter(tab => tab.id !== 'profile'), [studentDataTabs]);
  const activeTabObject = useMemo(() => studentDataTabs.find(tab => tab.id === currentActiveTab), [studentDataTabs, currentActiveTab]);
  
  useEffect(() => {
    const isCurrentTabValid = studentDataTabs.some(tab => tab.id === currentActiveTab);
    if (!isCurrentTabValid && studentDataTabs.length > 0) {
      setCurrentActiveTab(studentDataTabs[0].id);
    }
  }, [studentDataTabs, currentActiveTab, setCurrentActiveTab]);

  if (isLoading) return <DashboardLoadingSkeleton />;
  if (error) return <ErrorState error={error.message} onRetry={refetchAll} />;
  
  return (
    <>
      <div className="print-only">
          <PrintableReport 
              studentDetails={studentDetails} 
              criterios={criterios} 
              practicas={practicas} 
          />
      </div>
      <div className="no-print">
        <div className="space-y-8 animate-fade-in-up pb-24 md:pb-0">
          <div className="hidden md:block">
            <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
          </div>
          
          {/* Desktop Criterios Panel */}
          <div className="hidden md:block">
            <CriteriosPanel criterios={criterios} selectedOrientacion={selectedOrientacion} handleOrientacionChange={handleOrientacionChange} showSaveConfirmation={showSaveConfirmation} />
          </div>
          
          {/* Mobile Collapsible Criterios Panel */}
          <div className="md:hidden">
             <CollapsedCriteriosPanel criterios={criterios} onToggle={() => setIsCriteriosPanelOpen(!isCriteriosPanelOpen)} isOpen={isCriteriosPanelOpen} />
             {isCriteriosPanelOpen && (
                <div className="mt-4" id="criterios-panel-full">
                    <CriteriosPanel criterios={criterios} selectedOrientacion={selectedOrientacion} handleOrientacionChange={handleOrientacionChange} showSaveConfirmation={showSaveConfirmation} />
                </div>
             )}
          </div>
          
            
          {/* Desktop View with Tabs inside a Card */}
          <div className="hidden md:block">
              <Tabs
                  tabs={studentDataTabs}
                  activeTabId={currentActiveTab}
                  onTabChange={(id) => setCurrentActiveTab(id as TabId)}
              />
          </div>
    
          {/* Mobile View - Title header and then content */}
          <div className="md:hidden mt-8">
              {activeTabObject && (
                  <>
                      <div className="flex items-start gap-4 mb-6">
                          <div className="flex-shrink-0 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300 rounded-full h-12 w-12 flex items-center justify-center mt-1">
                              <span className="material-icons !text-3xl">{activeTabObject.icon}</span>
                          </div>
                          <div>
                              <h2 className="text-slate-900 dark:text-slate-50 text-2xl font-bold tracking-tight">{activeTabObject.title}</h2>
                              <p className="text-slate-600 dark:text-slate-400 mt-1 max-w-2xl">{activeTabObject.description}</p>
                          </div>
                      </div>
                      {activeTabObject.content}
                  </>
              )}
          </div>
        </div>
         {!showExportButton && (
            <MobileBottomNav 
                tabs={mobileNavTabs}
                activeTabId={currentActiveTab}
                onTabChange={(id) => setCurrentActiveTab(id as TabId)}
            />
         )}
        {showExportButton && (
          <>
            <WhatsAppExportButton practicas={practicas} criterios={criterios} selectedOrientacion={selectedOrientacion} studentNameForPanel={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
             <button
              onClick={() => window.print()}
              className="fixed bottom-6 right-24 z-50 w-14 h-14 bg-slate-700 text-white rounded-full shadow-lg flex items-center justify-center
                         transition-all duration-300 ease-in-out transform hover:scale-110 hover:shadow-xl focus:outline-none focus:ring-4 focus:ring-slate-400"
              aria-label="Imprimir reporte"
            >
              <span className="material-icons !text-2xl">print</span>
            </button>
          </>
        )}
      </div>
    </>
  );
};

export default StudentDashboard;