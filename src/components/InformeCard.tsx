import React, { useState, useMemo } from 'react';
import type { InformeTask } from '../types';
import { formatDate, parseToUTCDate } from '../utils/formatters';

interface InformeCardProps {
  task: InformeTask;
  onConfirmar: (task: InformeTask) => void;
}

const InformeCard: React.FC<InformeCardProps> = ({ task, onConfirmar }) => {
  const [isConfirming, setIsConfirming] = useState(false);
  const { nota, informeSubido } = task;

  const statusInfo = useMemo(() => {
    // If it has been graded with a final score, that's the terminal state.
    if (nota && nota !== 'Sin calificar' && nota !== 'Entregado (sin corregir)' && nota !== 'No Entregado') {
      return {
        key: 'calificado',
        icon: 'task_alt',
        iconContainerClass: 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300',
      };
    }
    // If the report has been submitted (either for real or optimistically), it's in correction.
    // This takes precedence over "Sin calificar" or "No Entregado" notes.
    if (informeSubido) {
      return {
        key: 'en_correccion',
        icon: 'hourglass_top',
        iconContainerClass: 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300',
      };
    }
    // If none of the above, it's pending submission.
    return {
      key: 'pendiente',
      icon: 'upload',
      iconContainerClass: 'bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 animate-[subtle-bob_1.5s_ease-in-out_infinite] group-hover:scale-110',
    };
  }, [nota, informeSubido]);


  const { deadlineLabel, deadline, daysRemaining, isOverdue } = useMemo(() => {
    const isSubmitted = statusInfo.key === 'en_correccion' && task.fechaEntregaInforme;
    const baseDateString = isSubmitted ? task.fechaEntregaInforme : task.fechaFinalizacion;
    const label = isSubmitted ? 'Límite de Corrección' : 'Límite de Entrega';

    const baseDate = parseToUTCDate(baseDateString);
    if (!baseDate) {
      return { deadlineLabel: label, deadline: null, daysRemaining: 0, isOverdue: false };
    }

    const deadlineDate = new Date(baseDate.getTime());
    deadlineDate.setUTCDate(deadlineDate.getUTCDate() + 30);

    const today = new Date();
    today.setUTCHours(0, 0, 0, 0);

    const timeDiff = deadlineDate.getTime() - today.getTime();
    const days = Math.floor(timeDiff / (1000 * 3600 * 24));

    return { deadlineLabel: label, deadline: deadlineDate, daysRemaining: days, isOverdue: days < 0 };
  }, [task.fechaFinalizacion, task.fechaEntregaInforme, statusInfo.key]);

  const handleConfirmClick = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault(); 
    e.stopPropagation(); 
    setIsConfirming(true);
    try {
      await onConfirmar(task);
    } finally {
      setIsConfirming(false);
    }
  };

  const DeadlineInfo: React.FC = () => {
    if (!deadline) {
        return (
            <p className="text-sm font-medium mt-1.5 text-slate-500 dark:text-slate-400 italic">
                Fecha límite no disponible
            </p>
        );
    }
    if (statusInfo.key === 'calificado') {
      return null;
    }
    
    let textColor = 'text-slate-600 dark:text-slate-300';
    let text = `Vence en ${daysRemaining + 1} día${daysRemaining + 1 !== 1 ? 's' : ''}`;

    if (isOverdue) {
      textColor = 'text-red-600 dark:text-red-400';
      text = `Venció hace ${Math.abs(daysRemaining)} día${Math.abs(daysRemaining) !== 1 ? 's' : ''}`;
    } else if (daysRemaining <= 0) {
      textColor = 'text-amber-600 dark:text-amber-400 font-semibold';
      text = `Vence hoy`;
    } else if (daysRemaining < 7) {
      textColor = 'text-amber-600 dark:text-amber-400';
    }

    return (
      <p className={`text-sm font-medium mt-1.5 ${textColor} tracking-tight`}>
        {deadlineLabel}: {formatDate(deadline.toISOString())}
        <span className="hidden sm:inline"> ({text})</span>
      </p>
    );
  };

  const ActionComponent = () => {
    const baseButtonClass =
      'w-full inline-flex items-center justify-center gap-2 font-semibold text-sm py-2.5 px-5 rounded-lg transition-all duration-300 shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-opacity-50 transform hover:-translate-y-0.5';
    const baseLabelClass =
      'w-full inline-flex items-center justify-center gap-2 font-semibold text-sm py-2.5 px-5 rounded-full border';

    switch (statusInfo.key) {
      case 'calificado':
        return (
          <div
            className={`${baseLabelClass} bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/50 dark:text-blue-200 dark:border-blue-700/50`}
            aria-label={`Nota final ${nota}`}
          >
            <span className="material-icons !text-base">grading</span>
            <span>Nota: {nota}</span>
          </div>
        );
      case 'en_correccion':
        return (
          <div
            className={`${baseLabelClass} bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-200 dark:border-emerald-700/50`}
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
              className={`${baseButtonClass} bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-600 focus:ring-blue-500 disabled:opacity-60 disabled:cursor-not-allowed`}
              aria-label="Confirmar entrega del informe"
            >
              {isConfirming ? (
                <div className="border-2 border-slate-400/50 dark:border-slate-500/50 border-t-slate-500 dark:border-t-slate-400 rounded-full w-4 h-4 animate-spin"></div>
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
      className="group block bg-white dark:bg-slate-800 p-5 rounded-2xl shadow-xl dark:shadow-black/20 border border-slate-100/50 dark:border-slate-700/50 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 hover:bg-gradient-to-br from-white to-slate-50/50 dark:hover:bg-gradient-to-br dark:from-slate-800 dark:to-slate-700/50 animate-fade-in"
      style={{ willChange: 'transform, box-shadow' }}
      aria-labelledby={`task-${task.convocatoriaId}`}
    >
        <article className="flex items-center gap-5">
            <div
                className={`flex-shrink-0 size-12 rounded-xl flex items-center justify-center ${statusInfo.iconContainerClass} transition-all duration-300`}
            >
                <span className="material-icons !text-2xl">{statusInfo.icon}</span>
            </div>

            <div className="flex-grow flex flex-col sm:flex-row justify-between sm:items-center min-w-0 gap-4">
                <div className="flex-grow min-w-0">
                <h3
                    id={`task-${task.convocatoriaId}`}
                    className="text-slate-900 dark:text-slate-50 font-semibold text-lg leading-tight tracking-tight flex items-center"
                >
                    {task.ppsName}
                    <span className="material-icons !text-base text-slate-400 dark:text-slate-500 ml-1.5 opacity-0 group-hover:opacity-100 transition-opacity">launch</span>
                </h3>
                <DeadlineInfo />
                </div>

                <div className="flex-shrink-0 self-start sm:self-center w-full sm:w-52">
                  <ActionComponent />
                </div>
            </div>
        </article>
    </a>
  );
};

export default InformeCard;