import React from 'react';
import { GroupedSeleccionados } from '../types';

interface SeleccionadosModalProps {
  isOpen: boolean;
  onClose: () => void;
  seleccionados: GroupedSeleccionados | null;
  convocatoriaName: string;
}

const SeleccionadosModal: React.FC<SeleccionadosModalProps> = ({ isOpen, onClose, seleccionados, convocatoriaName }) => {
  if (!isOpen) return null;

  const hasSeleccionados = seleccionados && Object.keys(seleccionados).length > 0;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in-up"
      aria-labelledby="seleccionados-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh] animate-scale-in"
      >
        <div className="p-6 sm:p-8 flex-shrink-0 bg-white rounded-t-xl border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 id="seleccionados-modal-title" className="text-xl sm:text-2xl font-bold text-blue-800">
                Alumnos Seleccionados
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Convocatoria: <span className="font-semibold">{convocatoriaName}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 overflow-y-auto flex-grow min-h-0">
          {hasSeleccionados ? (
            <div className="space-y-6">
              {Object.entries(seleccionados).map(([horario, students]) => (
                <div key={horario} className="bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
                  <h3 className="font-bold text-slate-800 border-b border-slate-200 pb-2 mb-4">
                    Horario: <span className="text-blue-600">{horario}</span>
                  </h3>
                  <ul className="space-y-3">
                    {students.sort((a,b) => a.nombre.localeCompare(b.nombre)).map((student) => (
                      <li key={student.legajo} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-slate-700">{student.nombre}</span>
                        <span className="text-slate-500">Legajo: {student.legajo}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
                <div className="mx-auto bg-blue-100 text-blue-500 rounded-full h-16 w-16 flex items-center justify-center">
                    <span className="material-icons !text-4xl">info_outline</span>
                </div>
                <h3 className="mt-6 font-bold text-slate-800 text-lg">Sin Lista de Seleccionados</h3>
                <p className="text-slate-500 text-sm mt-2 max-w-md mx-auto">
                    Aún no se ha publicado la lista o no hay estudiantes seleccionados para esta PPS.
                </p>
            </div>
          )}
        </div>

        <div className="bg-white/70 px-6 py-4 flex justify-end items-center gap-4 rounded-b-xl border-t border-slate-200 flex-shrink-0 backdrop-blur-sm">
           <button
            type="button"
            onClick={onClose}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default SeleccionadosModal;