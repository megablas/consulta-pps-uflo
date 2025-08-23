import React, { useState, useMemo } from 'react';
import type { InformeTask } from '../types';
import { formatDate } from '../utils/formatters';

interface InformeCardProps {
  task: InformeTask;
  onConfirmar: (convocatoriaId: string) => void;
}

const InformeCard: React.FC<InformeCardProps> = ({ task, onConfirmar }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const { nota, informeSubido } = task;

  const statusInfo = useMemo(() => {
    if (nota && nota !== 'Sin calificar') {
      return {
        key: 'calificado',
        icon: 'grading',
        iconContainerClass: 'bg-blue-50 text-blue-700',
      };
    }
    if (informeSubido) {
      return {
        key: 'en_correccion',
        icon: 'hourglass_top',
        iconContainerClass: 'bg-emerald-50 text-emerald-700',
      };
    }
    return {
      key: 'pendiente',
      icon: 'assignment_late',
      iconContainerClass: 'bg-amber-50 text-amber-700',
    };
  }, [nota, informeSubido]);

  const { deadline, daysRemaining, isOverdue } = useMemo(() => {
    const finalizacionDate = new Date(task.fechaFinalizacion);
    const deadlineDate = new Date(finalizacionDate);
    deadlineDate.setDate(deadlineDate.getDate() + 30);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const timeDiff = deadlineDate.getTime() - today.getTime();
    const days = Math.floor(timeDiff / (1000 * 3600 * 24));

    return {
      deadline: deadlineDate,
      daysRemaining: days,
      isOverdue: days < 0,
    };
  }, [task.fechaFinalizacion]);

  const handleConfirmClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); // Evita que el enlace padre se active
    e.stopPropagation(); // Detiene la propagación del evento
    setIsConfirming(true);
    try {
      await onConfirmar(task.convocatoriaId);
    } finally {
      setIsConfirming(false);
    }
  };

  const DeadlineInfo: React.FC = () => {
    let textColor = 'text-slate-600';
    let text = `Vence en ${daysRemaining + 1} día${daysRemaining + 1 !== 1 ? 's' : ''}`;

    if (isOverdue) {
      textColor = 'text-red-600';
      text = `Venció hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) !== 1 ? 's' : ''}`;
    } else if (daysRemaining <= 0) {
      textColor = 'text-amber-600 font-semibold';
      text = `Vence hoy`;
    } else if (daysRemaining < 7) {
      textColor = 'text-amber-600';
    }

    return (
      <p className={`text-sm font-medium mt-1.5 ${textColor} tracking-tight`}>
        Límite: {formatDate(deadline.toISOString())}
        <span className="hidden sm:inline"> ({text})</span>
      </p>
    );
  };

  const ActionComponent = () => {
    const baseButtonClass =
      'inline-flex items-center justify-center gap-2 font-semibold text-sm py-2.5 px-5 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-opacity-50 transform hover:-translate-y-0.5';
    const baseLabelClass =
      'inline-flex items-center justify-center gap-2 font-semibold text-sm py-2.5 px-5 rounded-full border';

    switch (statusInfo.key) {
      case 'calificado':
        return (
          <div
            className={`${baseLabelClass} bg-blue-50 text-blue-800 border-blue-200`}
            aria-label={`Nota final ${nota}`}
          >
            <span className="material-icons !text-base">grading</span>
            <span>Nota: {nota}</span>
          </div>
        );
      case 'en_correccion':
        return (
          <div
            className={`${baseLabelClass} bg-emerald-50 text-emerald-800 border-emerald-200`}
            aria-label="Informe entregado, en corrección"
          >
            <span className="material-icons !text-base">schedule</span>
            <span>Entregado</span>
          </div>
        );
      case 'pendiente':
        return (
            <button
              onClick={handleConfirmClick}
              disabled={isConfirming}
              className={`${baseButtonClass} bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-label="Confirmar entrega del informe"
            >
              {isConfirming ? (
                <div className="border-2 border-slate-400/50 border-t-slate-500 rounded-full w-4 h-4 animate-spin"></div>
              ) : (
                <span className="material-icons !text-base">task_alt</span>
              )}
              <span>Confirmar Entrega</span>
            </button>
        );
      default:
        return null;
    }
  };

  return (
    <a
      href={task.informeLink}
      target="_blank"
      rel="noopener noreferrer"
      className="group block bg-white p-5 rounded-2xl shadow-xl border border-slate-100/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:bg-gradient-to-br from-white to-slate-50/50 animate-fade-in"
      aria-labelledby={`task-${task.convocatoriaId}`}
    >
        <article className="flex items-center gap-5">
            <div
                className={`flex-shrink-0 size-12 rounded-xl flex items-center justify-center ${statusInfo.iconContainerClass} transition-transform duration-300 group-hover:scale-110`}
            >
                <span className="material-icons !text-2xl">{statusInfo.icon}</span>
            </div>

            <div className="flex-grow flex flex-col sm:flex-row justify-between sm:items-center min-w-0 gap-4">
                <div className="flex-grow min-w-0">
                <h3
                    id={`task-${task.convocatoriaId}`}
                    className="text-slate-900 font-semibold text-lg leading-tight tracking-tight flex items-center"
                >
                    {task.ppsName}
                    <span className="material-icons !text-base text-slate-400 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">launch</span>
                </h3>
                <DeadlineInfo />
                </div>

                <div className="flex-shrink-0 self-start sm:self-center">
                <ActionComponent />
                </div>
            </div>
        </article>
    </a>
  );
};

export default InformeCard;