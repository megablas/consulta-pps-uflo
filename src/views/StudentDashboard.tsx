import React, { useState, useMemo, useEffect, useCallback } from 'react';
import CriteriosPanel from '../components/CriteriosPanel';
import PracticasTable from '../components/PracticasTable';
import SolicitudesList from '../components/SolicitudesList';
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
import PrintableReport from '../components/PrintableReport';
import MobileBottomNav from '../components/MobileBottomNav';

interface StudentDashboardProps {
  user: AuthUser;
  activeTab?: TabId;
  onTabChange?: (tabId: TabId) => void;
  showExportButton?: boolean;
}

const CondensedWelcomeCard: React.FC<{
  criterios: ReturnType<typeof calculateCriterios>;
  greeting: string;
  studentName: string;
  selectedOrientacion: Orientacion | "";
}> = ({ criterios, greeting, studentName, selectedOrientacion }) => {
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    
    return (
        <Card titleAs="h1" title={
            <div className="flex items-center gap-2 text-2xl">
                <span>{greeting},</span>
                <span className="text-blue-600 dark:text-blue-400">{studentName?.split(' ')[0] || 'Estudiante'}.</span>
            </div>
        }>
            <div className="flex flex-col sm:flex-row items-center text-center sm:text-left sm:justify-between gap-4">
                <div>
                    <h2 className="text-6xl font-black text-slate-800 dark:text-slate-100 tracking-tighter">
                        {Math.round(criterios.horasTotales)}
                    </h2>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 -mt-1">Horas Totales Realizadas</p>
                </div>
                <div className="flex-shrink-0">
                    <button 
                        onClick={() => setIsDetailsOpen(!isDetailsOpen)}
                        className="mt-2 sm:mt-0 inline-flex items-center gap-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-500"
                        aria-expanded={isDetailsOpen}
                    >
                        <span>{isDetailsOpen ? 'Ocultar detalles' : 'Ver detalles'}</span>
                        <span className={`material-icons !text-base transition-transform duration-300 ${isDetailsOpen ? 'rotate-180' : ''}`}>expand_more</span>
                    </button>
                </div>
            </div>
            <div className={`transition-all duration-500 ease-in-out grid ${isDetailsOpen ? 'grid-rows-[1fr] opacity-100 pt-6 mt-6 border-t border-slate-200/80 dark:border-slate-700/80' : 'grid-rows-[0fr] opacity-0'}`}>
                <div className="overflow-hidden">
                    <div className="grid grid-cols-2 gap-4">
                        {/* Rotations */}
                        <div className="flex items-center gap-3 p-3 bg-slate-50/70 dark:bg-slate-800/60 rounded-xl">
                            <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg h-10 w-10 flex items-center justify-center">
                                <span className="material-icons !text-xl">360</span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rotaciones</p>
                                <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                   {criterios.orientacionesCursadasCount}
                                </p>
                            </div>
                        </div>
                        {/* Specialization */}
                        <div className="flex items-center gap-3 p-3 bg-slate-50/70 dark:bg-slate-800/60 rounded-xl">
                             <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg h-10 w-10 flex items-center justify-center">
                                <span className="material-icons !text-xl">school</span>
                            </div>
                            <div>
                                <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                                  {selectedOrientacion ? `Hs. ${selectedOrientacion}` : 'Hs. Orientación'}
                                </p>
                                {selectedOrientacion ? (
                                  <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
                                     {Math.round(criterios.horasOrientacionElegida)}
                                  </p>
                                ) : (
                                  <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Define tu esp.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Card>
    );
};


const StudentDashboard: React.FC<StudentDashboardProps> = ({ user, activeTab, onTabChange, showExportButton = false }) => {
  const { isSuperUserMode } = useAuth();
  const [showSaveConfirmation, setShowSaveConfirmation] = useState(false);
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 12 && hour >= 5) {
      setGreeting('Buenos días');
    } else if (hour < 20 && hour >= 12) {
      setGreeting('Buenas tardes');
    } else {
      setGreeting('Buenas noches');
    }
  }, []);

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
          
          {/* Mobile Condensed Welcome Card */}
          <div className="md:hidden">
             <CondensedWelcomeCard
                criterios={criterios} 
                greeting={greeting}
                studentName={studentNameForPanel}
                selectedOrientacion={selectedOrientacion}
             />
          </div>
          
            
          {/* Desktop View with Tabs inside a Card */}
          <div className="hidden md:block">
              <Tabs
                  tabs={studentDataTabs}
                  activeTabId={currentActiveTab}
                  onTabChange={(id) => setCurrentActiveTab(id as TabId)}
              />
          </div>
    
          {/* Mobile View - Content wrapped in a Card for better design */}
          <div className="md:hidden">
              {activeTabObject && (
                   <Card
                      icon={activeTabObject.icon}
                      title={activeTabObject.title}
                      description={activeTabObject.description}
                      titleAs="h2"
                  >
                      {activeTabObject.content}
                  </Card>
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