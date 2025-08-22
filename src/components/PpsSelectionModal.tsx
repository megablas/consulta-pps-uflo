import React from 'react';
import type { LanzamientoPPS } from '../types';
import { FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS } from '../constants';
import { formatDate } from '../utils/formatters';
import Loader from './Loader';

interface PpsSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  ppsList: LanzamientoPPS[];
  onSelect: (pps: LanzamientoPPS) => void;
  isLoading?: boolean;
}

const PpsSelectionModal: React.FC<PpsSelectionModalProps> = ({ isOpen, onClose, ppsList, onSelect, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-lg w-full max-w-lg transform transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/60"
      >
        <div className="p-6 flex-shrink-0 border-b border-slate-200">
          <h2 className="text-xl font-bold text-slate-800">Seleccionar PPS para Inscripción</h2>
          <p className="text-sm text-slate-500 mt-1">Elige una de las convocatorias abiertas.</p>
        </div>
        <div className="p-2 overflow-y-auto flex-grow">
          {isLoading ? (
            <div className="flex justify-center items-center h-48"><Loader /></div>
          ) : ppsList.length > 0 ? (
            <ul className="space-y-1">
              {ppsList.map(pps => (
                <li key={pps.id}>
                  <button
                    onClick={() => onSelect(pps)}
                    className="w-full text-left p-4 rounded-lg hover:bg-blue-50 transition-colors flex justify-between items-center group"
                  >
                    <div>
                      <p className="font-semibold text-slate-800 group-hover:text-blue-700">{pps[FIELD_NOMBRE_PPS_LANZAMIENTOS]}</p>
                      <p className="text-xs text-slate-500">Inicia: {formatDate(pps[FIELD_FECHA_INICIO_LANZAMIENTOS])}</p>
                    </div>
                    <span className="material-icons text-slate-400 group-hover:text-blue-600 transition-colors">chevron_right</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center p-8 text-slate-500">
              <p>No hay convocatorias abiertas en este momento.</p>
            </div>
          )}
        </div>
        <div className="p-4 flex-shrink-0 bg-slate-50 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-100 transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};

export default PpsSelectionModal;
