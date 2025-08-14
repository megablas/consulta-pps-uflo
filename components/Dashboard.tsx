import React, { useState, useEffect, useMemo, useCallback } from 'react';
import CriteriosPanel from './CriteriosPanel';
import PracticasTable from './PracticasTable';
import SolicitudesList from './SolicitudesList';
import EmptyState from './EmptyState';
import Tabs from './Tabs';
import Card from './Card';
import { CriteriosPanelSkeleton, TableSkeleton, SkeletonBox } from './Skeletons';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';
import { FIELD_LEGAJO_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES } from '../constants';

// Tipos para mejor tipado
type TabId = 'solicitudes' | 'practicas';
type LoadingState = 'initial' | 'loading' | 'loaded' | 'error';

interface InfoItemProps {
  icon: string;
  label: string;
  value?: string | number | null;
  variant?: 'default' | 'primary' | 'secondary';
}

interface StudentInfo {
  legajo?: string | number;
  dni?: string | number;
  correo?: string;
  telefono?: string | number;
}

// --- Componente InfoItem Mejorado ---
const InfoItem: React.FC<InfoItemProps> = ({ 
  icon, 
  label, 
  value, 
  variant = 'default' 
}) => {
  if (!value) return null;

  const variantStyles = {
    default: 'text-slate-400',
    primary: 'text-blue-500',
    secondary: 'text-emerald-500'
  };

  return (
    <div className="flex items-center gap-3 group transition-all duration-200 hover:scale-105">
      <div className={`p-2 rounded-lg bg-slate-50 group-hover:bg-slate-100 transition-colors duration-200`}>
        <span className={`material-icons ${variantStyles[variant]} !text-xl transition-transform duration-200 group-hover:scale-110`}>
          {icon}
        </span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-slate-800 font-semibold truncate" title={String(value)}>
          {value}
        </p>
      </div>
    </div>
  );
};

// --- Componente StudentInfoHeader Mejorado ---
const StudentInfoHeader: React.FC = () => {
  const { studentDetails, isLoading, initialLoadCompleted } = useData();
  
  const studentInfo = useMemo((): StudentInfo => ({
    [FIELD_LEGAJO_ESTUDIANTES]: studentDetails?.[FIELD_LEGAJO_ESTUDIANTES],
    [FIELD_DNI_ESTUDIANTES]: studentDetails?.[FIELD_DNI_ESTUDIANTES],
    [FIELD_CORREO_ESTUDIANTES]: studentDetails?.[FIELD_CORREO_ESTUDIANTES],
    [FIELD_TELEFONO_ESTUDIANTES]: studentDetails?.[FIELD_TELEFONO_ESTUDIANTES],
  }), [studentDetails]);

  const hasAnyInfo = useMemo(() => 
    Object.values(studentInfo).some(value => value != null), 
    [studentInfo]
  );

  // No renderizar si no hay detalles y no es la carga inicial
  if (!hasAnyInfo && !isLoading && initialLoadCompleted) {
    return null;
  }

  if (isLoading && !initialLoadCompleted) {
    return (
      <Card className="mb-8 animate-pulse">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-3">
              <SkeletonBox className="h-10 w-10 rounded-lg" />
              <div className="flex-1">
                <SkeletonBox className="h-3 w-16 mb-1" />
                <SkeletonBox className="h-4 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    );
  }
  
  const infoItems = [
    { key: 'legajo', icon: 'badge', label: 'Legajo', value: studentInfo[FIELD_LEGAJO_ESTUDIANTES], variant: 'primary' as const },
    { key: 'dni', icon: 'fingerprint', label: 'DNI', value: studentInfo[FIELD_DNI_ESTUDIANTES], variant: 'default' as const },
    { key: 'correo', icon: 'email', label: 'Correo', value: studentInfo[FIELD_CORREO_ESTUDIANTES], variant: 'secondary' as const },
    { key: 'telefono', icon: 'phone', label: 'Teléfono', value: studentInfo[FIELD_TELEFONO_ESTUDIANTES], variant: 'default' as const }
  ];

  return (
    <Card className="mb-8 bg-gradient-to-r from-white to-slate-50/50 border-slate-200/60 animate-fade-in-up">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {infoItems.map((item) => (
          <InfoItem 
            key={item.key}
            icon={item.icon}
            label={item.label}
            value={item.value}
            variant={item.variant}
          />
        ))}
      </div>
    </Card>
  );
};

// --- Componente de Loading Mejorado ---
const DashboardLoadingSkeleton: React.FC = () => (
  <div className="space-y-8 animate-fade-in">
    <StudentInfoHeader />
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
const Dashboard: React.FC = () => {
  const { 
    practicas, 
    solicitudes, 
    isLoading,
    error,
    initialLoadCompleted,
    fetchStudentData
  } = useData();
  const { isSuperUserMode } = useAuth();
  
  const [activeTab, setActiveTab] = useState<TabId>('solicitudes');

  // Memoización del estado de carga
  const loadingState = useMemo((): LoadingState => {
    if (error) return 'error';
    if (isLoading && !initialLoadCompleted) return 'initial';
    if (isLoading) return 'loading';
    return 'loaded';
  }, [isLoading, initialLoadCompleted, error]);

  // Datos memoizados
  const hasData = useMemo(() => 
    practicas.length > 0 || solicitudes.length > 0, 
    [practicas.length, solicitudes.length]
  );

  const showEmptyState = useMemo(() => 
    initialLoadCompleted && !hasData && isSuperUserMode,
    [initialLoadCompleted, hasData, isSuperUserMode]
  );

  // Callback para reintentar la carga
  const handleRetry = useCallback(() => {
    fetchStudentData();
  }, [fetchStudentData]);

  // Tabs con contadores
  const studentDataTabs = useMemo(() => [
    {
      id: 'solicitudes' as TabId,
      label: `Solicitudes de PPS${solicitudes.length > 0 ? ` (${solicitudes.length})` : ''}`,
      icon: 'list_alt',
      content: <SolicitudesList />,
      badge: solicitudes.length > 0 ? solicitudes.length : undefined
    },
    {
      id: 'practicas' as TabId,
      label: `Detalle de Prácticas${practicas.length > 0 ? ` (${practicas.length})` : ''}`,
      icon: 'work_history',
      content: <PracticasTable />,
      badge: practicas.length > 0 ? practicas.length : undefined
    }
  ], [solicitudes.length, practicas.length]);

  // Efectos
  useEffect(() => {
    if (!initialLoadCompleted) {
      fetchStudentData();
    }
  }, [fetchStudentData, initialLoadCompleted]);

  // Cambio automático de tab si no hay datos en la tab activa
  useEffect(() => {
    if (activeTab === 'solicitudes' && solicitudes.length === 0 && practicas.length > 0) {
      setActiveTab('practicas');
    } else if (activeTab === 'practicas' && practicas.length === 0 && solicitudes.length > 0) {
      setActiveTab('solicitudes');
    }
  }, [activeTab, solicitudes.length, practicas.length]);

  // Renderizado condicional basado en el estado
  switch (loadingState) {
    case 'initial':
      return <DashboardLoadingSkeleton />;
    
    case 'error':
      return <ErrorState error={error!} onRetry={handleRetry} />;
    
    case 'loaded':
      if (showEmptyState) {
        return (
          <div className="space-y-8 animate-fade-in-up">
            <StudentInfoHeader />
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
          <StudentInfoHeader />
          <CriteriosPanel />
          
          {hasData && (
            <Card className="relative">
              {loadingState === 'loading' && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-blue-200 overflow-hidden">
                  <div className="h-full bg-blue-600 animate-pulse"></div>
                </div>
              )}
              <Tabs
                tabs={studentDataTabs}
                activeTabId={activeTab}
                onTabChange={setActiveTab}
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