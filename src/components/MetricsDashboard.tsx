import React, { useState, useCallback } from 'react';
import { useMetricsData } from '../hooks/useMetricsData';
import type { StudentInfo } from '../types';
import EmptyState from './EmptyState';
import StudentListModal from './StudentListModal';
import Card from './Card';
import Loader from './Loader';
import BarChart from './BarChart';
import Histogram from './Histogram';
import MetricCard from './MetricCard';

type ModalData = {
  title: string;
  students: StudentInfo[];
  headers?: { key: string; label: string }[];
  description?: React.ReactNode;
};

// UI helpers
const HeroMetric: React.FC<{
  title: string;
  value: string | number;
  icon: string;
  description: string;
  onClick: () => void;
  color: 'blue' | 'indigo' | 'emerald';
}> = ({ title, value, icon, description, onClick, color }) => {
  const colorClasses = {
    blue: 'from-blue-50 to-sky-100/50 border-blue-200/60 text-blue-700 hover:border-blue-300 hover:shadow-blue-500/10 dark:from-blue-900/20 dark:to-sky-900/20 dark:border-blue-800/60 dark:text-blue-300 dark:hover:border-blue-700 dark:hover:shadow-blue-500/10',
    indigo:
      'from-indigo-50 to-purple-100/50 border-indigo-200/60 text-indigo-700 hover:border-indigo-300 hover:shadow-indigo-500/10 dark:from-indigo-900/20 dark:to-purple-900/20 dark:border-indigo-800/60 dark:text-indigo-300 dark:hover:border-indigo-700 dark:hover:shadow-indigo-500/10',
    emerald:
      'from-emerald-50 to-teal-100/50 border-emerald-200/60 text-emerald-700 hover:border-emerald-300 hover:shadow-emerald-500/10 dark:from-emerald-900/20 dark:to-teal-900/20 dark:border-emerald-800/60 dark:text-emerald-300 dark:hover:border-emerald-700 dark:hover:shadow-emerald-500/10',
  };
  return (
    <button
      onClick={onClick}
      className={`group relative text-left w-full p-6 rounded-2xl border bg-gradient-to-br transition-all duration-300 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 dark:focus-visible:ring-offset-slate-900 ${colorClasses[color]}`}
      aria-label={title}
    >
      <div className="flex justify-between items-start">
        <div className="flex flex-col">
          <p className="text-sm font-bold opacity-80">{title}</p>
          <p className="text-5xl md:text-6xl font-black text-slate-900 dark:text-slate-50 tracking-tighter mt-2">{value}</p>
        </div>
        <div
          className={`p-3 rounded-xl bg-white/50 dark:bg-slate-900/30 shadow-sm border border-black/5 dark:border-white/5 ${
            color === 'blue' ? 'text-blue-600 dark:text-blue-400' : color === 'indigo' ? 'text-indigo-600 dark:text-indigo-400' : 'text-emerald-600 dark:text-emerald-400'
          }`}
        >
          <span className="material-icons !text-3xl" aria-hidden="true">
            {icon}
          </span>
        </div>
      </div>
      <p className="text-xs opacity-70 mt-4 dark:text-current dark:opacity-60">{description}</p>
    </button>
  );
};

const FunnelRow: React.FC<{
  label: string;
  value: number;
  total: number;
  color: string;
  onClick: () => void;
  description: string;
}> = ({ label, value, total, color, onClick, description }) => {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  return (
    <button
      onClick={onClick}
      className="w-full text-left p-4 rounded-xl transition-all duration-200 hover:bg-slate-100/70 dark:hover:bg-slate-800/50 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300 dark:focus-visible:ring-slate-600"
      aria-label={`${label}: ${value} (${total > 0 ? Math.round(percentage) : 'N/A'}%)`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex-1">
          <p className="font-semibold text-slate-800 dark:text-slate-100">{label}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{description}</p>
        </div>
        <div className="flex-shrink-0 w-full sm:w-64 flex items-center gap-4">
          <div className="w-full bg-slate-200/70 dark:bg-slate-700 rounded-full h-2.5 shadow-inner" aria-hidden="true">
            <div className={`h-2.5 rounded-full transition-all duration-700 ease-out ${color}`} style={{ width: `${percentage}%` }} />
          </div>
          <div className="text-right">
            <p className="font-black text-lg text-slate-900 dark:text-slate-50 leading-none">{value}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-none">{total > 0 ? `${Math.round(percentage)}%` : 'N/A'}</p>
          </div>
        </div>
      </div>
    </button>
  );
};

// Skeletons
const SkeletonBlock = ({ className = '' }: { className?: string }) => (
  <div className={`animate-pulse bg-slate-200 dark:bg-slate-800 rounded-lg ${className}`} />
);

const Tabs: React.FC<{ active: string; onChange: (t: string) => void }> = ({ active, onChange }) => {
  const tabs = [
    { key: 'overview', label: 'Resumen', icon: 'dashboard' },
    { key: 'students', label: 'Estudiantes', icon: 'groups' },
    { key: 'institutions', label: 'Instituciones', icon: 'apartment' },
  ];
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const activeTabInfo = tabs.find(t => t.key === active) || tabs[0];

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (key: string) => {
    onChange(key);
    setIsDropdownOpen(false);
  };
  
  return (
    <div className="mt-4">
       {/* Mobile Dropdown */}
      <div ref={dropdownRef} className="relative lg:hidden">
        <button
          type="button"
          onClick={() => setIsDropdownOpen(!isDropdownOpen)}
          className="w-full flex items-center justify-between p-3 rounded-xl border bg-white dark:bg-slate-800/50 dark:border-slate-700 shadow-sm"
          aria-haspopup="true"
          aria-expanded={isDropdownOpen}
        >
          <div className="flex items-center gap-3">
            <span className="material-icons !text-xl text-blue-600 dark:text-blue-400">{activeTabInfo.icon}</span>
            <span className="font-semibold text-slate-800 dark:text-slate-100">{activeTabInfo.label}</span>
          </div>
          <span className={`material-icons text-slate-500 dark:text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}>expand_more</span>
        </button>
        {isDropdownOpen && (
          <div className="absolute top-full mt-2 w-full bg-white dark:bg-slate-800 rounded-xl shadow-lg border dark:border-slate-700 z-10 animate-fade-in-up" style={{ animationDuration: '200ms' }}>
            {tabs.map(t => (
              <button
                key={t.key}
                onClick={() => handleSelect(t.key)}
                className="w-full text-left flex items-center gap-3 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/50 first:rounded-t-xl last:rounded-b-xl"
                role="menuitem"
              >
                <span className="material-icons !text-xl text-slate-500 dark:text-slate-400">{t.icon}</span>
                <span className="font-medium text-slate-700 dark:text-slate-200">{t.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Tabs */}
      <div className="hidden lg:inline-flex p-1 rounded-xl border bg-white dark:bg-slate-800/50 dark:border-slate-700">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-300 dark:focus-visible:ring-offset-slate-800 ${
              active === t.key ? 'bg-slate-900 dark:bg-slate-200 text-white dark:text-slate-900 shadow-sm' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
            }`}
            aria-pressed={active === t.key}
          >
            <span className="material-icons !text-base">{t.icon}</span>
            <span className="whitespace-nowrap">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

interface MetricsDashboardProps {
  onStudentSelect?: (student: { legajo: string; nombre: string }) => void;
  isTestingMode?: boolean;
}

export const MetricsDashboard: React.FC<MetricsDashboardProps> = ({ onStudentSelect, isTestingMode = false }) => {
  const [modalData, setModalData] = useState<ModalData | null>(null);
  const [proximosModalOpen, setProximosModalOpen] = useState(false);
  const [targetYear] = useState<number>(new Date().getFullYear());
  const [activeTab, setActiveTab] = useState<'overview' | 'students' | 'institutions'>('overview');

  const openModal = useCallback((payload: ModalData) => setModalData(payload), []);
  const closeModal = useCallback(() => setModalData(null), []);

  const { data: metrics, isLoading, error, refetch, isFetching } = useMetricsData({ targetYear, isTestingMode });

  // FIX: Added explicit type annotation `: number` for the accumulator to resolve type inference issue.
  const totalCuposMesActual = metrics ? metrics.lanzamientosMesActual.reduce((acc: number, group) => acc + group.totalCupos, 0) : 0;
  const MONTH_NAMES = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];


  if (error) {
    return (
      <div className="max-w-3xl mx-auto mt-10">
        <EmptyState
          icon="error"
          title="Error al cargar métricas"
          message={(error as any).message}
          action={
            <button
              onClick={() => refetch()}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg border bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700"
            >
              <span className="material-icons">refresh</span>
              Reintentar
            </button>
          }
        />
      </div>
    );
  }

  return (
    <>
      <StudentListModal
        isOpen={!!modalData}
        onClose={closeModal}
        title={modalData?.title || ''}
        students={modalData?.students || []}
        headers={modalData?.headers}
        description={modalData?.description}
      />
      
      {metrics && (
        <StudentListModal
          isOpen={proximosModalOpen}
          onClose={() => setProximosModalOpen(false)}
          title="Alumnos Próximos a Finalizar"
          students={metrics.alumnosProximosAFinalizar.list}
          headers={[
              { key: 'nombre', label: 'Nombre' },
              { key: 'legajo', label: 'Legajo' },
              { key: 'totalHoras', label: 'Horas Totales' },
          ]}
          onStudentClick={(student) => {
              if (onStudentSelect) {
                  onStudentSelect({ legajo: student.legajo, nombre: student.nombre });
                  setProximosModalOpen(false);
              }
          }}
        />
      )}

      <div className="flex items-center justify-between gap-3">
          <h2 className="text-2xl md:text-3xl font-black text-slate-900 dark:text-slate-50 tracking-tight">
            Dashboard de Resumen
          </h2>
          {isFetching && (
            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300">
              <span className="material-icons !text-base animate-spin-slow">autorenew</span>
              Actualizando
            </span>
          )}
      </div>

      <Tabs active={activeTab} onChange={(t) => setActiveTab(t as any)} />

      {/* HERO METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
        {isLoading || !metrics ? (
          <>
            <SkeletonBlock className="h-44" />
            <SkeletonBlock className="h-44" />
            <SkeletonBlock className="h-44" />
          </>
        ) : (
          <>
            <HeroMetric
              title={`Cupos Ofrecidos (${targetYear})`}
              value={metrics.cuposOfrecidos.value}
              icon="supervisor_account"
              description={`El número con relevamiento profesional es: ${metrics.cuposTotalesConRelevamiento.value}`}
              onClick={() =>
                openModal({
                  title: `PPS Lanzadas (${targetYear})`,
                  students: metrics.ppsLanzadas.list,
                  headers: [
                    { key: 'nombre', label: 'Institución' },
                    { key: 'legajo', label: 'Info' },
                    { key: 'cupos', label: 'Cupos' },
                  ],
                })
              }
              color="indigo"
            />
            <HeroMetric
              title="Estudiantes Activos"
              value={metrics.alumnosActivos.value}
              icon="school"
              description="Total de estudiantes que aún no finalizan."
              onClick={() => openModal({ title: 'Estudiantes Activos', students: metrics.alumnosActivos.list })}
              color="blue"
            />
            <HeroMetric
              title="Alumnos Finalizados"
              value={metrics.alumnosFinalizados.value}
              icon="military_tech"
              description="Solicitaron acreditación final de PPS."
              onClick={() => openModal({ title: `Alumnos Finalizados (${targetYear})`, students: metrics.alumnosFinalizados.list })}
              color="emerald"
            />
          </>
        )}
      </div>

      {/* CONTENT TABS */}
      {isLoading || !metrics ? (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonBlock className="h-80" />
          <SkeletonBlock className="h-80" />
        </div>
      ) : (
        <>
          {activeTab === 'overview' && (
            <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card icon="filter_alt" title="Embudo de Estudiantes" description="Desglose de los estudiantes activos.">
                <div className="mt-4 space-y-2 divide-y divide-slate-200/60 dark:divide-slate-700/60">
                  <FunnelRow
                    label="Con PPS Activa"
                    value={metrics.alumnosEnPPS.value}
                    total={metrics.alumnosActivos.value}
                    color="bg-emerald-500"
                    description="Estudiantes con una práctica activa durante el ciclo."
                    onClick={() =>
                      openModal({
                        title: 'Alumnos con PPS Activa',
                        students: metrics.alumnosEnPPS.list,
                        headers: [
                          { key: 'nombre', label: 'Nombre' },
                          { key: 'legajo', label: 'Legajo' },
                          { key: 'institucion', label: 'Institución' },
                          { key: 'fechaFin', label: 'Finaliza' },
                        ],
                      })
                    }
                  />
                  <FunnelRow
                    label="Próximos a Finalizar"
                    value={metrics.alumnosProximosAFinalizar.value}
                    total={metrics.alumnosActivos.value}
                    color="bg-sky-500"
                    description="Con 230+ horas o con 250+ y práctica en curso."
                    onClick={() => setProximosModalOpen(true)}
                  />
                  <FunnelRow
                    label="Activos sin NINGUNA PPS (Total)"
                    value={metrics.alumnosSinNingunaPPS.value}
                    total={metrics.alumnosActivos.value}
                    color="bg-rose-500"
                    description="No tienen ninguna práctica registrada (incl. Relevamiento)."
                    onClick={() =>
                      openModal({
                        title: 'Alumnos sin NINGUNA PPS (Total)',
                        students: metrics.alumnosSinNingunaPPS.list,
                      })
                    }
                  />
                </div>
              </Card>

              <Card icon="calendar_month" title={`Lanzamientos de ${MONTH_NAMES[new Date().getMonth()]}`} description={`Total de ${totalCuposMesActual} cupos ofrecidos este mes.`}>
                <div className="mt-4">
                  <BarChart 
                      data={metrics.lanzamientosMesActual.map(group => ({ label: group.groupName, value: group.totalCupos }))}
                      title=""
                      onBarClick={(label) => {
                          const group = metrics.lanzamientosMesActual.find(g => g.groupName === label);
                          if(group) {
                              openModal({
                                  title: `Variantes para ${label}`,
                                  students: group.variants.map(v => ({ legajo: '', nombre: v.name, cupos: v.cupos })),
                                  headers: [{ key: 'nombre', label: 'Nombre Variante' }]
                              })
                          }
                      }}
                  />
                </div>
              </Card>
            </div>
          )}
        </>
      )}
    </>
  );
};
