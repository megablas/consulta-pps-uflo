import React, { useState, useMemo, useEffect, useCallback } from 'react';
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
import PrintableReport from '../components/PrintableReport';
import MobileBottomNav from '../components/MobileBottomNav';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION, ROTACION_OBJETIVO_ORIENTACIONES } from '../constants';
import CalendarView from '../components/CalendarView';

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
  const isCalendarActive = currentActiveTab === 'calendario';
  
  const isLoading = isStudentLoading || isPracticasLoading || isSolicitudesLoading || isConvocatoriasLoading;
  const error = studentError || practicasError || solicitudesError || convocatoriasError;

  const refetchAll = useCallback(() => {
    refetchStudent();
    refetchPracticas();
    refetchSolicitudes();
    refetchConvocatorias();
  }, [refetchStudent, refetchPracticas, refetchSolicitudes, refetchConvocatorias]);

  useEffect(() => {
    // When the user navigates to the "Informes" tab, refetch the data
    // to ensure any newly added report links are displayed.
    if (currentActiveTab === 'informes') {
      refetchConvocatorias();
    }
  }, [currentActiveTab, refetchConvocatorias]);
  
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
  // Memoize tab content to prevent re-renders on tab change
  const convocatoriasContent = useMemo(() => <ConvocatoriasList lanzamientos={lanzamientos} myEnrollments={myEnrollments} practicas={practicas} student={studentDetails} onInscribir={enrollStudent.mutate} />, [lanzamientos, myEnrollments, practicas, studentDetails, enrollStudent.mutate]);
  const informesContent = useMemo(() => <InformesList tasks={informeTasks} onConfirmar={confirmInforme.mutate} />, [informeTasks, confirmInforme.mutate]);
  const solicitudesContent = useMemo(() => <SolicitudesList solicitudes={solicitudes} />, [solicitudes]);
  const practicasContent = useMemo(() => (
    <div className="space-y-6">
      <div className="md:hidden">
        <TotalHoursSummaryCard totalHours={criterios.horasTotales} goalHours={HORAS_OBJETIVO_TOTAL} />
      </div>
      <PracticasTable practicas={practicas} handleNotaChange={handleNotaChange} />
    </div>
  ), [practicas, handleNotaChange, criterios.horasTotales]);
  const profileContent = useMemo(() => <ProfileView studentDetails={studentDetails} isLoading={isStudentLoading} />, [studentDetails, isStudentLoading]);
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
      return tabs.filter(tab => tab.id === 'informes' || tab.id === 'solicitudes' || tab.id === 'practicas');
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
                  onTabChange={(id) => setCurrentActiveTab(id as TabId)}
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
