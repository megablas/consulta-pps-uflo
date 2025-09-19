import React, { useState, useMemo, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
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
import { processInformeTasks } from '../services/dataService';
import ProfileView from '../components/ProfileView';
import PrintableReport from '../components/PrintableReport';
import MobileBottomNav from '../components/MobileBottomNav';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION, ROTACION_OBJETIVO_ORIENTACIONES } from '../constants';
import CalendarView from '../components/CalendarView';
import { StudentPanelProvider, useStudentPanel } from '../contexts/StudentPanelContext';

interface StudentDashboardProps {
  user: AuthUser;
  activeTab?: TabId;
  onTabChange?: (tabId: TabId) => void;
  showExportButton?: boolean;
}

// Mobile-specific welcome card with corrected visual hierarchy
const CondensedWelcomeCard: React.FC<{
  criterios: ReturnType<typeof calculateCriterios>;
  greeting: string;
  studentName: string;
  selectedOrientacion: Orientacion | "";
}> = ({ criterios, greeting, studentName, selectedOrientacion }) => {
    return (
        <Card>
            {/* The greeting is now larger and more prominent, with the student's name highlighted in color. */}
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-4 text-center sm:text-left">
                {greeting}, <span className="text-blue-600 dark:text-blue-400">{studentName?.split(' ')[0] || 'Estudiante'}.</span>
            </p>

            <div className="flex items-baseline justify-center sm:justify-start gap-2">
                <span className="text-6xl font-black text-blue-600 dark:text-blue-400 tracking-tighter">
                    {Math.round(criterios.horasTotales)}
                </span>
                <span className="text-2xl font-bold text-slate-500 dark:text-slate-400">
                    / {HORAS_OBJETIVO_TOTAL} hs
                </span>
            </div>
            
            <div className="pt-5 mt-5 border-t border-slate-200/80 dark:border-slate-700/80">
                <div className="grid grid-cols-2 gap-4 text-center sm:text-left">
                    {/* Rotations */}
                    <div className="flex flex-col items-center sm:items-start">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Rotaciones</p>
                        <p className="text-2xl font-black">
                           <span className="text-blue-600 dark:text-blue-400">{criterios.orientacionesCursadasCount}</span>
                            <span className="text-lg font-bold text-slate-500 dark:text-slate-400"> / {ROTACION_OBJETIVO_ORIENTACIONES}</span>
                        </p>
                    </div>
                    {/* Specialization Hours */}
                    <div className="flex flex-col items-center sm:items-start">
                        <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {selectedOrientacion ? `Hs. ${selectedOrientacion}` : 'Hs. Orientación'}
                        </p>
                        <p className="text-2xl font-black">
                           <span className="text-blue-600 dark:text-blue-400">{Math.round(criterios.horasOrientacionElegida)}</span>
                            <span className="text-lg font-bold text-slate-500 dark:text-slate-400"> / {HORAS_OBJETIVO_ORIENTACION}</span>
                        </p>
                    </div>
                </div>
            </div>
        </Card>
    );
};

const TotalHoursSummaryCard: React.FC<{ totalHours: number, goalHours: number }> = ({ totalHours, goalHours }) => {
    const percentage = goalHours > 0 ? Math.min((totalHours / goalHours) * 100, 100) : 0;

    return (
        <Card>
            <div className="flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
                <div className="flex-shrink-0">
                    <p className="text-sm font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Horas Totales</p>
                    <p className="text-7xl font-black text-blue-600 dark:text-blue-400 tracking-tighter -my-1">{Math.round(totalHours)}</p>
                    <p className="text-lg font-semibold text-slate-600 dark:text-slate-300">de {goalHours} completadas</p>
                </div>
                <div className="w-full flex-grow">
                     <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-3.5 shadow-inner">
                        <div
                        className="bg-gradient-to-r from-sky-400 to-blue-500 h-3.5 rounded-full transition-all duration-1000 ease-out"
                        style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
                        {totalHours >= goalHours ? "¡Felicitaciones! Has cumplido el requisito de horas." : `Te faltan ${Math.round(goalHours - totalHours)} horas para alcanzar el objetivo.`}
                    </p>
                </div>
            </div>
        </Card>
    );
};

const StudentDashboardContent: React.FC<StudentDashboardProps> = ({ user, activeTab, onTabChange, showExportButton = false }) => {
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
  
  // --- CONSUME CENTRALIZED CONTEXT ---
  const {
      studentDetails,
      practicas,
      solicitudes,
      lanzamientos,
      myEnrollments,
      allLanzamientos,
      institutionAddressMap,
      isLoading,
      error,
      updateOrientation,
      // FIX: Destructure `updateInternalNotes` to pass it as a prop to ProfileView.
      updateInternalNotes,
      updateNota,
      enrollStudent,
      confirmInforme,
      refetchAll,
  } = useStudentPanel();


  // --- DERIVED STATE & MEMOIZATION ---
  const [internalActiveTab, setInternalActiveTab] = useState<TabId>('convocatorias');
  const currentActiveTab = activeTab ?? internalActiveTab;
  const setCurrentActiveTab = onTabChange ?? setInternalActiveTab;
  const isCalendarActive = currentActiveTab === 'calendario';
  
  // --- START: Scroll restoration logic ---
  const scrollPositionRef = useRef(0);
  const previousTabRef = useRef<TabId>();

  useEffect(() => {
    previousTabRef.current = currentActiveTab;
  }, [currentActiveTab]);

  const handleTabChange = useCallback((tabId: TabId) => {
    // If we are about to navigate TO the calendar, save the current scroll position.
    if (tabId === 'calendario' && currentActiveTab !== 'calendario') {
      scrollPositionRef.current = window.scrollY;
    }
    setCurrentActiveTab(tabId);
  }, [currentActiveTab, setCurrentActiveTab]);

  useLayoutEffect(() => {
    // If the previous tab was 'calendario' and the new one isn't, restore scroll.
    if (previousTabRef.current === 'calendario' && currentActiveTab !== 'calendario') {
      // Use 'instant' to avoid a jarring scroll animation.
      window.scrollTo({ top: scrollPositionRef.current, behavior: 'instant' });
    }
  }, [currentActiveTab]);
  // --- END: Scroll restoration logic ---
  
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

  // --- TAB DEFINITIONS ---
  const convocatoriasContent = useMemo(() => <ConvocatoriasList lanzamientos={lanzamientos} myEnrollments={myEnrollments} practicas={practicas} student={studentDetails} onInscribir={enrollStudent.mutate} institutionAddressMap={institutionAddressMap} />, [lanzamientos, myEnrollments, practicas, studentDetails, enrollStudent, institutionAddressMap]);
  const informesContent = useMemo(() => <InformesList tasks={informeTasks} onConfirmar={confirmInforme.mutate} />, [informeTasks, confirmInforme]);
  const solicitudesContent = useMemo(() => <SolicitudesList solicitudes={solicitudes} />, [solicitudes]);
  const practicasContent = useMemo(() => (
    <div className="space-y-6">
      <div className="md:hidden">
        <TotalHoursSummaryCard totalHours={criterios.horasTotales} goalHours={HORAS_OBJETIVO_TOTAL} />
      </div>
      <PracticasTable practicas={practicas} handleNotaChange={handleNotaChange} />
    </div>
  ), [practicas, handleNotaChange, criterios.horasTotales]);
  // FIX: Pass required props to ProfileView.
  const profileContent = useMemo(() => <ProfileView studentDetails={studentDetails} isLoading={isLoading} updateInternalNotes={updateInternalNotes} />, [studentDetails, isLoading, updateInternalNotes]);
  const calendarioContent = useMemo(() => <CalendarView myEnrollments={myEnrollments} allLanzamientos={allLanzamientos} />, [myEnrollments, allLanzamientos]);


  const studentDataTabs = useMemo(() => {
    let tabs = [
      { id: 'convocatorias' as TabId, label: 'Convocatorias', icon: 'campaign', title: 'Convocatorias Abiertas', content: convocatoriasContent },
      { id: 'calendario' as TabId, label: 'Calendario', icon: 'calendar_month', title: 'Mi Calendario de PPS', content: calendarioContent },
      { id: 'informes' as TabId, label: 'Informes', icon: 'assignment_turned_in', title: 'Entrega de Informes', content: informesContent },
      { id: 'solicitudes' as TabId, label: 'Solicitudes', icon: 'list_alt', title: 'Seguimiento de Solicitudes', content: solicitudesContent },
      { id: 'practicas' as TabId, label: 'Prácticas', icon: 'work_history', title: 'Historial de Prácticas', content: practicasContent }
    ];

    if (showExportButton) {
      return tabs.filter(tab => tab.id === 'convocatorias' || tab.id === 'informes' || tab.id === 'solicitudes' || tab.id === 'practicas');
    }
    
    tabs.push({
        id: 'profile' as TabId,
        label: 'Mi Perfil',
        icon: 'person',
        title: 'Mis Datos Personales',
        content: profileContent,
    });
    return tabs;

  }, [showExportButton, convocatoriasContent, calendarioContent, informesContent, solicitudesContent, practicasContent, profileContent]);
  
  const mobileNavTabs = useMemo(() => studentDataTabs.filter(tab => tab.id !== 'profile'), [studentDataTabs]);
  const activeTabObject = useMemo(() => studentDataTabs.find(tab => tab.id === currentActiveTab), [studentDataTabs, currentActiveTab]);
  
  useEffect(() => {
    const isCurrentTabValid = studentDataTabs.some(tab => tab.id === currentActiveTab);
    if (!isCurrentTabValid && studentDataTabs.length > 0) {
      setCurrentActiveTab(studentDataTabs[0].id);
    }
  }, [studentDataTabs, currentActiveTab, setCurrentActiveTab]);

  if (isLoading) return <DashboardLoadingSkeleton />;
  // The onRetry prop for ErrorState is called from an onClick handler, which passes a MouseEvent.
  // The refetchAll function does not expect any arguments, so it's wrapped in an arrow function to prevent passing the event.
  if (error) return <ErrorState error={error.message} onRetry={() => refetchAll()} />;
  
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
        <div className="space-y-6 animate-fade-in-up pb-24 md:pb-0">
          
          {/* --- DESKTOP VIEW --- */}
          <div className="hidden md:block space-y-6">
            {!isCalendarActive && (
                <>
                    <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={isLoading} />
                    <CriteriosPanel criterios={criterios} selectedOrientacion={selectedOrientacion} handleOrientacionChange={handleOrientacionChange} showSaveConfirmation={showSaveConfirmation} />
                </>
            )}
            <Card>
              <Tabs
                  tabs={studentDataTabs}
                  activeTabId={currentActiveTab}
                  onTabChange={(id) => handleTabChange(id as TabId)}
              />
            </Card>
          </div>
    
          {/* --- MOBILE VIEW --- */}
          <div className="md:hidden space-y-8">
             {currentActiveTab === 'convocatorias' && (
                <CondensedWelcomeCard
                    criterios={criterios} 
                    greeting={greeting}
                    studentName={studentNameForPanel}
                    selectedOrientacion={selectedOrientacion}
                />
             )}
             
            {activeTabObject && (
              <section aria-labelledby={`mobile-section-title-${activeTabObject.id}`}>
                {!isCalendarActive && currentActiveTab !== 'practicas' && (
                    <h2 id={`mobile-section-title-${activeTabObject.id}`} className="text-2xl font-bold text-slate-900 dark:text-slate-50 tracking-tight mb-4 flex items-center gap-3">
                        {activeTabObject.icon && <span className="material-icons !text-2xl text-slate-400 dark:text-slate-500">{activeTabObject.icon}</span>}
                        <span>{activeTabObject.title}</span>
                    </h2>
                )}
                <div>
                    {activeTabObject.content}
                </div>
              </section>
            )}
          </div>
        </div>
        
        {/* --- COMMON UI (NAV & ACTIONS) --- */}
        {!showExportButton && (
          <MobileBottomNav 
              tabs={mobileNavTabs}
              activeTabId={currentActiveTab}
              onTabChange={(id) => handleTabChange(id as TabId)}
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


/**
 * Main wrapper component for the StudentDashboard.
 * It instantiates the StudentPanelProvider to make the context available
 * to the StudentDashboardContent and all its children.
 */
const StudentDashboard: React.FC<StudentDashboardProps> = (props) => {
    return (
        <StudentPanelProvider legajo={props.user.legajo}>
            <StudentDashboardContent {...props} />
        </StudentPanelProvider>
    );
};

export default StudentDashboard;
