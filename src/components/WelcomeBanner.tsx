import React, { useState, useEffect } from 'react';
import { EstudianteFields } from '../types';
import {
  FIELD_LEGAJO_ESTUDIANTES,
  FIELD_DNI_ESTUDIANTES,
  FIELD_CORREO_ESTUDIANTES,
  FIELD_TELEFONO_ESTUDIANTES
} from '../constants';
import { SkeletonBox } from './Skeletons';

interface WelcomeBannerProps {
  studentName?: string;
  studentDetails: EstudianteFields | null;
  isLoading: boolean;
}

const InfoItem: React.FC<{
  icon: string;
  label: string;
  value?: string | number | null;
}> = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-3 bg-white/60 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-700/80 shadow-sm hover:shadow-lg hover:bg-white dark:hover:bg-slate-700/80 hover:border-blue-300/70 dark:hover:border-blue-500/70 transition-all duration-300 transform hover:-translate-y-0.5">
      <span className="material-icons text-blue-500 dark:text-blue-400 !text-2xl">{icon}</span>
      <div className="min-w-0">
        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{label}</p>
        <p
          className="text-sm text-slate-900 dark:text-slate-100 font-semibold truncate"
          title={String(value)}
        >
          {value}
        </p>
      </div>
    </div>
  );
};

const WelcomeBannerSkeleton: React.FC = () => (
  <div className="p-6 sm:p-8 rounded-2xl bg-slate-100 dark:bg-slate-800/50 animate-pulse">
    <SkeletonBox className="h-9 w-3/4 mb-4" />
    <SkeletonBox className="h-5 w-1/2 mb-8" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <SkeletonBox className="h-16 w-full" />
      <SkeletonBox className="h-16 w-full" />
      <SkeletonBox className="h-16 w-full" />
      <SkeletonBox className="h-16 w-full" />
    </div>
  </div>
);

const WelcomeBanner: React.FC<WelcomeBannerProps> = ({
  studentName,
  studentDetails,
  isLoading,
}) => {
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

  if (isLoading) {
    return <WelcomeBannerSkeleton />;
  }

  const info = studentDetails || {};

  const infoItems = [
    {
      key: 'legajo',
      icon: 'badge',
      label: 'Legajo',
      value: info[FIELD_LEGAJO_ESTUDIANTES]
    },
    {
      key: 'dni',
      icon: 'fingerprint',
      label: 'DNI',
      value: info[FIELD_DNI_ESTUDIANTES]
    },
    {
      key: 'correo',
      icon: 'email',
      label: 'Correo',
      value: info[FIELD_CORREO_ESTUDIANTES]
    },
    {
      key: 'telefono',
      icon: 'phone',
      label: 'Teléfono',
      value: info[FIELD_TELEFONO_ESTUDIANTES]
    }
  ];

  const hasAnyInfo = infoItems.some((item) => !!item.value);

  return (
    <div className="relative p-6 sm:p-8 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 shadow-lg overflow-hidden bg-gradient-to-br from-blue-50/80 via-white/70 to-slate-50/80 dark:from-blue-900/30 dark:via-slate-900/20 dark:to-black/30 backdrop-blur-lg">
      {/* Fondo decorativo */}
      <div className="absolute -top-20 -right-20 w-64 h-64 bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 -left-20 w-72 h-72 bg-indigo-400/10 dark:bg-indigo-600/10 rounded-full blur-3xl"></div>

      {/* Contenido */}
      <div className="relative z-10">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div className="flex-grow">
                <h1 className="text-4xl md:text-5xl font-black text-slate-800 dark:text-slate-50 tracking-tight">
                  {greeting},{' '}
                  <span className="text-blue-600 dark:text-blue-400">
                      {studentName?.split(' ')[0] || 'Estudiante'}
                  </span>
                  .
                </h1>
                <p className="mt-2 text-md text-slate-600 dark:text-slate-300 max-w-2xl">
                  Bienvenido a tu panel de mando. Aquí seguimos tu progreso y te acercamos nuevas
                  oportunidades.
                </p>
            </div>
        </div>
        {hasAnyInfo && (
          <div className="mt-6 pt-6 border-t border-slate-200/80 dark:border-slate-700/60">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {infoItems.map(({ key, ...itemProps }) => (
                <InfoItem key={key} {...itemProps} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(WelcomeBanner);
