import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CriteriosPanel from './CriteriosPanel';
import PracticasTable from './PracticasTable';
import SolicitudesList from './SolicitudesList';
import EmptyState from './EmptyState';
import Tabs from './Tabs';
import Card from './Card';
import { CriteriosPanelSkeleton, TableSkeleton } from './Skeletons';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import WelcomeBanner from './WelcomeBanner';
import ConvocatoriasList from './ConvocatoriasList';
import InformesList from './InformesList';
import type { TabId } from '../types';

// Tipos para mejor tipado
type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';

interface DashboardProps {
  activeTab: TabId;
  onTabChange: (tabId: TabId) => void;
}


// --- Componente de Loading Mejorado ---
const DashboardLoadingSkeleton: React.FC = () => (
  <div className="space-y-8 animate-fade-in">
    <WelcomeBanner isLoading={true} studentDetails={null} />
    <CriteriosPanelSkeleton />
    <Card>
      <div className="border-b border-slate-200">
        <div className="-mb-px flex space-x-6">
          <div className="flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm border-blue-500 text-blue-600">
            <div className="animate-spin w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full"></div>
            <span>Cargando...</span>
          </div>
        </div>
      </div>
      <div className="pt-6">
        <TableSkeleton />
      </div>
    </Card>
  </div>
);

// --- Componente de Error Mejorado ---
const ErrorState: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="mt-8 animate-fade-in-up">
    <Card className="border-red-200 bg-red-50/50">
      <EmptyState 
        icon="error" 
        title="Error al Cargar Datos" 
        message={error}
        action={onRetry ? (
          <button
            onClick={onRetry}
            className="mt-4 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors duration-200 focus:outline-none focus:ring-4 focus:ring-red-300"
          >
            Reintentar
          </button>
        ) : undefined}
      />
    </Card>
  </div>
);

// --- Componente Principal Dashboard ---
const Dashboard: React.FC<DashboardProps> = ({ activeTab, onTabChange }) => {
  const { 
    practicas, 
    solicitudes, 
    lanzamientos,
    myEnrollments,
    informeTasks,
    handleConfirmarInforme,
    isLoading,
    error,
    initialLoadCompleted,
    fetchStudentData,
    studentDetails,
    studentNameForPanel
  } = useData();
  const { isSuperUserMode } = useAuth();
  
  const [initialTabSet, setInitialTabSet] = useState(false);

  // Memoización del estado de carga
  const loadingState = useMemo((): LoadingState => {
    if (error) return 'error';
    if (isLoading && !initialLoadCompleted) return 'initial';
    if (isLoading) return 'loading';
    return 'loaded';
  }, [isLoading, initialLoadCompleted, error]);

  
  // Tabs con contadores
  const studentDataTabs = useMemo(() => [
    {
      id: 'convocatorias' as TabId,
      label: `Convocatorias`,
      icon: 'campaign',
      content: <ConvocatoriasList 
                  lanzamientos={lanzamientos}
                  myEnrollments={myEnrollments}
                />,
      badge: lanzamientos.length > 0 ? lanzamientos.length : undefined
    },
     {
      id: 'informes' as TabId,
      label: `Informes`,
      icon: 'assignment_turned_in',
      content: <InformesList tasks={informeTasks} onConfirmar={handleConfirmarInforme} />,
      badge: informeTasks.length > 0 ? informeTasks.length : undefined
    },
    {
      id: 'solicitudes' as TabId,
      label: `Mis Solicitudes`,
      icon: 'list_alt',
      content: <SolicitudesList />,
      badge: solicitudes.length > 0 ? solicitudes.length : undefined
    },
    {
      id: 'practicas' as TabId,
      label: `Mis Prácticas`,
      icon: 'work_history',
      content: <PracticasTable />,
      badge: practicas.length > 0 ? practicas.length : undefined
    }
  ], [solicitudes, practicas, lanzamientos, myEnrollments, informeTasks, handleConfirmarInforme]);
  
    // Datos memoizados
  const hasData = useMemo(() => 
    practicas.length > 0 || solicitudes.length > 0 || lanzamientos.length > 0 || informeTasks.length > 0, 
    [practicas.length, solicitudes.length, lanzamientos.length, informeTasks.length]
  );

  const showEmptyState = useMemo(() => 
    initialLoadCompleted && !hasData && isSuperUserMode,
    [initialLoadCompleted, hasData, isSuperUserMode]
  );

  // Callback para reintentar la carga
  const handleRetry = useCallback(() => {
    fetchStudentData();
  }, [fetchStudentData]);


  // Efectos
  useEffect(() => {
    if (!initialLoadCompleted) {
      fetchStudentData();
    }
  }, [fetchStudentData, initialLoadCompleted]);

  // Set initial tab once after load
  useEffect(() => {
    if (initialLoadCompleted && !initialTabSet) {
      const tabsWithContent = studentDataTabs.filter(tab => (tab.badge ?? 0) > 0);
      const firstTabWithContent = tabsWithContent.length > 0 ? tabsWithContent[0].id : null;

      if (firstTabWithContent) {
        onTabChange(firstTabWithContent as TabId);
      }
      setInitialTabSet(true);
    }
  }, [initialLoadCompleted, initialTabSet, studentDataTabs, onTabChange]);


  // Renderizado condicional basado en el estado
  switch (loadingState) {
    case 'initial':
      return <DashboardLoadingSkeleton />;
    
    case 'error':
      return <ErrorState error={error!} onRetry={handleRetry} />;
    
    case 'loading':
    case 'loaded':
      if (showEmptyState) {
        return (
          <div className="space-y-8 animate-fade-in-up">
             <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={false} />
            <CriteriosPanel />
            <Card className="border-slate-300/50 bg-slate-50/30">
              <EmptyState 
                icon="search_off" 
                title="Sin Resultados" 
                message="No se encontró información de prácticas o solicitudes para este estudiante."
                action={
                  <button
                    onClick={handleRetry}
                    className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-4 focus:ring-blue-300 hover:scale-105"
                  >
                    Actualizar Datos
                  </button>
                }
              />
            </Card>
          </div>
        );
      }
      
      return (
        <div className="space-y-8 animate-fade-in-up">
           <WelcomeBanner studentName={studentNameForPanel} studentDetails={studentDetails} isLoading={loadingState === 'loading'} />
          <CriteriosPanel />
          
          {hasData && (
            <Card className="relative">
              {loadingState === 'loading' && (
                <div className="absolute top-4 right-4 z-10">
                   <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                     <div className="animate-spin w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full"></div>
                     <span>Actualizando...</span>
                   </div>
                </div>
              )}
              <Tabs
                tabs={studentDataTabs}
                activeTabId={activeTab}
                onTabChange={(id) => onTabChange(id as TabId)}
              />
            </Card>
          )}
        </div>
      );
    
    default:
      return <DashboardLoadingSkeleton />;
  }
};

export default Dashboard;