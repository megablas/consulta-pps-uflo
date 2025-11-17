import React from 'react';
import type { GroupedSeleccionados, SelectedStudent } from '../types';
import EmptyState from './EmptyState';

interface SeleccionadosModalProps {
  isOpen: boolean;
  onClose: () => void;
  seleccionados: GroupedSeleccionados | null;
  convocatoriaName: string;
}

// Reusable component for the student list
const StudentList: React.FC<{ students: SelectedStudent[] }> = ({ students }) => (
  <ul className="divide-y divide-slate-200/70 dark:divide-slate-700/70">
    {students.map((student) => (
      <li key={student.legajo} className="flex items-center justify-between py-2.5">
        <span className="font-medium text-slate-700 dark:text-slate-200">{student.nombre}</span>
        <span className="text-sm text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-full font-mono">
          {student.legajo}
        </span>
      </li>
    ))}
  </ul>
);

const SeleccionadosModal: React.FC<SeleccionadosModalProps> = ({
  isOpen,
  onClose,
  seleccionados,
  convocatoriaName,
}) => {
  if (!isOpen) return null;

  const hasSeleccionados = seleccionados && Object.keys(seleccionados).length > 0;
  
  const isSingleUnspecifiedGroup = hasSeleccionados &&
    Object.keys(seleccionados).length === 1 &&
    Object.keys(seleccionados)[0] === 'No especificado';

  const renderContent = () => {
    if (!hasSeleccionados) {
      return (
        <EmptyState
          icon="person_off"
          title="Lista no disponible"
          message="Aún no se ha publicado la lista de alumnos seleccionados para esta convocatoria."
        />
      );
    }
    
    if (isSingleUnspecifiedGroup) {
      const students = seleccionados['No especificado'];
      return (
        <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
          <StudentList students={students} />
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        {Object.entries(seleccionados).map(([horario, students]) => (
          <div key={horario} className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200/80 dark:border-slate-700">
            <h3 className="font-semibold text-blue-800 dark:text-blue-200 bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-md mb-3">
              Horario: {horario}
            </h3>
            <StudentList students={students as SelectedStudent[]} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up"
      aria-labelledby="seleccionados-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full max-w-2xl transform transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/70 dark:border-slate-700/80"
      >
        {/* Header */}
        <div className="p-6 flex-shrink-0 border-b border-slate-200 dark:border-slate-700">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300">
                    <span className="material-icons !text-xl">groups</span>
                </div>
                <div>
                    <h2 id="seleccionados-modal-title" className="text-xl font-bold text-slate-800 dark:text-slate-50">
                        Alumnos Seleccionados
                    </h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{convocatoriaName}</p>
                </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              aria-label="Cerrar modal"
            >
              <span className="material-icons !text-xl">close</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-grow bg-slate-50/50 dark:bg-slate-900/40">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};

export default SeleccionadosModal;