import React, { useRef, useEffect, useState, useMemo } from 'react';
import { CONFERENCE_SHIFTS_BY_DAY, JORNADA_CAPACITIES } from '../constants';
import type { ConferenceActivity } from '../types';
import type { JornadaBlockCounts } from '../contexts/ModalContext';

interface JornadaRegistrationFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (selectedShiftIds: string[]) => void;
  convocatoriaName: string;
  isSubmitting: boolean;
  blockCounts: JornadaBlockCounts | null;
}

const ShiftCard: React.FC<{
  shift: typeof CONFERENCE_SHIFTS_BY_DAY[0]['shifts'][0];
  day: string;
  capacity: number;
  enrolled: number;
  isSelected: boolean;
  onToggle: (shiftId: string) => void;
  disabled: boolean;
}> = ({ shift, day, capacity, enrolled, isSelected, onToggle, disabled }) => {
  const availableSpots = capacity - enrolled;
  const isFull = availableSpots <= 0;
  const isDisabled = disabled || isFull;

  return (
    <div
      onClick={() => !isDisabled && onToggle(shift.shift_id)}
      className={`relative p-5 border-2 rounded-xl transition-all duration-200 ${
        isDisabled
          ? 'bg-slate-100 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 opacity-70 cursor-not-allowed'
          : isSelected
          ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 dark:border-blue-600 shadow-md cursor-pointer'
          : 'bg-white dark:bg-slate-800/60 border-slate-300 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500 cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-grow">
          <p className="font-bold text-lg text-slate-900 dark:text-slate-50">{shift.name}</p>
          <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">{shift.timeRange}</p>
        </div>
        <div className="flex-shrink-0 text-right">
          <p className={`text-xl font-black ${isFull ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
            {isFull ? 0 : availableSpots}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400 -mt-1">{isFull ? 'Cupos agotados' : 'Cupos disponibles'}</p>
        </div>
      </div>
      <div className="mt-4 pt-3 border-t border-slate-200/80 dark:border-slate-700/80">
        <ul className="space-y-2">
          {shift.activities.map(activity => (
            <li key={activity.id} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
              <span className="material-icons !text-base text-slate-400 dark:text-slate-500 mt-0.5">chevron_right</span>
              <span>{activity.name}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className={`absolute top-3 right-3 flex items-center justify-center h-6 w-6 rounded-full border-2 transition-all duration-200 ${isSelected ? 'bg-blue-600 border-blue-600' : 'bg-white dark:bg-slate-700 border-slate-300 dark:border-slate-500'}`}>
          <span className={`material-icons !text-sm text-white transition-transform duration-200 ${isSelected ? 'scale-100' : 'scale-0'}`}>check</span>
      </div>
    </div>
  );
};

const JornadaRegistrationForm: React.FC<JornadaRegistrationFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  convocatoriaName,
  isSubmitting,
  blockCounts,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [selectedShiftIds, setSelectedShiftIds] = useState<Set<string>>(new Set());

  const handleShiftToggle = (shiftId: string) => {
    setSelectedShiftIds(prev => {
        const newSet = new Set(prev);
        if (newSet.has(shiftId)) {
            newSet.delete(shiftId);
        } else {
            newSet.add(shiftId);
        }
        return newSet;
    });
  };

  useEffect(() => {
    if (isOpen) {
        setSelectedShiftIds(new Set());
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);
  
  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(Array.from(selectedShiftIds));
  };

  return (
    <div
      ref={modalRef}
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up"
      aria-labelledby="jornada-modal-title" role="dialog" aria-modal="true" onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        noValidate
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full max-w-3xl transform transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/70 dark:border-slate-700/80"
      >
        <div className="p-6 sm:p-8 flex-shrink-0 bg-white dark:bg-slate-800">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300">
              <span className="material-icons !text-xl">event</span>
            </div>
            <div className="flex-1">
              <h2 id="jornada-modal-title" className="text-2xl font-bold text-slate-800 dark:text-slate-50 tracking-tight">
                Inscripción a Jornada
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                {convocatoriaName}
              </p>
            </div>
            <button type="button" onClick={onClose} disabled={isSubmitting} className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200 disabled:opacity-50" aria-label="Cerrar formulario">
              <span className="material-icons !text-xl">close</span>
            </button>
          </div>
        </div>
        
        <div className="px-6 sm:px-8 py-6 overflow-y-auto flex-grow min-h-0 bg-slate-50/30 dark:bg-slate-900/40">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4">Selecciona los turnos a los que asistirás</h3>
            <div className="space-y-6">
              {CONFERENCE_SHIFTS_BY_DAY.map(dayGroup => (
                <div key={dayGroup.day}>
                  <h4 className="font-bold text-slate-700 dark:text-slate-200">{dayGroup.day}</h4>
                  <div className="mt-3 space-y-4">
                    {dayGroup.shifts.map(shift => {
                        const enrolledCount = blockCounts?.get(shift.shift_id) || 0;
                        const capacity = JORNADA_CAPACITIES[shift.shift_id];
                        return (
                            <ShiftCard
                                key={shift.shift_id}
                                shift={shift}
                                day={dayGroup.day}
                                capacity={capacity}
                                enrolled={enrolledCount}
                                isSelected={selectedShiftIds.has(shift.shift_id)}
                                onToggle={handleShiftToggle}
                                disabled={isSubmitting}
                            />
                        )
                    })}
                  </div>
                </div>
              ))}
            </div>
        </div>

        <div className="p-6 flex-shrink-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-t border-slate-200/60 dark:border-slate-700/60">
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting || selectedShiftIds.size === 0}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="border-2 border-white/50 border-t-white rounded-full w-4 h-4 animate-spin"></div>
                  <span>Confirmando...</span>
                </>
              ) : (
                <>
                  <span className="material-icons !text-base">how_to_reg</span>
                  <span>Confirmar Inscripción ({selectedShiftIds.size})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default JornadaRegistrationForm;