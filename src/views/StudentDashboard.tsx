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
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION, ROTACION_OBJETIVO_ORIENTACIONES } from '../constants';

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
    const totalHoursPercentage = HORAS_OBJETIVO_TOTAL > 0 ? Math.min((criterios.horasTotales / HORAS_OBJETIVO_TOTAL) * 100, 100) : 0;
    
    return (
        <div className="bg-white dark:bg-slate-800/70 backdrop-blur-md p-5 rounded-2xl border border-slate-200/60 dark:border-slate-700/60 shadow-lg space-y-5">
            {/* Greeting */}
            <div>
                 <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">
                  {greeting}, <span className="text-blue-600 dark:text-blue-400">{studentName?.split(' ')[0] || 'Estudiante'}</span>.
                </h1>
            </div>

            {/* Main Progress Bar */}
            <div className="w-full">
              <div className="flex justify-between items-baseline mb-1">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">Horas Totales</span>
                <div className="text-sm font-semibold">
                  <span className={criterios.cumpleHorasTotales ? 'text-blue-600 dark:text-blue-400' : 'text-slate-800 dark:text-slate-100'}>{Math.round(criterios.horasTotales)}</span>
                  <span className="text-slate-500 dark:text-slate-400"> / {HORAS_OBJETIVO_TOTAL} hs</span>
                </div>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 shadow-inner">
                <div
                  className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${totalHoursPercentage}%` }}
                ></div>
              </div>
            </div>

            {/* Secondary Criteria */}
            <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
                {/* Rotations */}
                <div className="flex items-center gap-3">
                    <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg h-10 w-10 flex items-center justify-center">
                        <span className="material-icons !text-xl">360</span>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">Rotaciones</p>
                        <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                           {criterios.orientacionesCursadasCount} <span className="font-medium text-slate-600 dark:text-slate-300">/ {ROTACION_OBJETIVO_ORIENTACIONES}</span>
                        </p>
                    </div>
                </div>
                {/* Specialization */}
                <div className="flex items-center gap-3">
                     <div className="flex-shrink-0 bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 rounded-lg h-10 w-10 flex items-center justify-center">
                        <span className="material-icons !text-xl">school</span>
                    </div>
                    <div>
                        <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 truncate">
                          {selectedOrientacion ? `Hs. ${selectedOrientacion}` : 'Hs. Orientación'}
                        </p>
                        {selectedOrientacion ? (
                          <p className="text-base font-bold text-slate-800 dark:text-slate-100">
                             {Math.round(criterios.horasOrientacionElegida)} <span className="font-medium text-slate-600 dark:text-slate-300">/ {HORAS_OBJETIVO_ORIENTACION}</span>
                          </p>
                        ) : (
                          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">Define tu esp.</p>
                        )}
                    </div>
                </div>
            </div>
        </div>
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