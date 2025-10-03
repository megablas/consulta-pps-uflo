import React from 'react';
import type { LanzamientoPPS } from '../types';
import type { JornadaBlockCounts } from '../contexts/ModalContext';

interface JornadaCardProps {
    lanzamiento: LanzamientoPPS;
    onInscribir: (lanzamiento: LanzamientoPPS, blockCounts: JornadaBlockCounts) => void;
    isEnrolled: boolean;
    isEnrolling: boolean;
    blockCounts: JornadaBlockCounts;
}

const JornadaCard: React.FC<JornadaCardProps> = ({ lanzamiento, onInscribir, isEnrolled, isEnrolling, blockCounts }) => {
    return (
        <article className="group bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-purple-900/20 dark:via-slate-900 dark:to-blue-900/20 rounded-2xl shadow-lg shadow-slate-200/40 dark:shadow-black/20 border-2 border-purple-200/50 dark:border-purple-800/50 transition-all duration-300 hover:shadow-xl hover:shadow-purple-500/10 dark:hover:shadow-purple-400/10 hover:-translate-y-1 p-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-6">
                <div className="flex-grow min-w-0">
                    <div className="flex items-center gap-3 mb-3">
                        <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-300">
                            <span className="material-icons">celebration</span>
                        </div>
                        <span className="text-xs font-bold text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/50 px-3 py-1 rounded-full">EVENTO ESPECIAL</span>
                    </div>
                    <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 leading-tight group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">
                        {lanzamiento['Nombre PPS']}
                    </h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                        7, 8 y 9 de Octubre de 2025. Una oportunidad única para acreditar horas y formarte con profesionales destacados.
                    </p>
                </div>
                <div className="flex-shrink-0 w-full sm:w-auto">
                    {isEnrolled ? (
                        <div className="w-full sm:w-56 font-bold text-sm py-2.5 px-5 rounded-lg shadow-inner flex items-center justify-center gap-2.5 whitespace-nowrap bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700/50">
                             <span className="material-icons !text-lg">check_circle</span>
                             <span>Inscripto</span>
                        </div>
                    ) : (
                        <button
                            onClick={() => onInscribir(lanzamiento, blockCounts)}
                            disabled={isEnrolling}
                            className="w-full sm:w-56 font-bold text-sm py-2.5 px-5 rounded-lg transition-all duration-300 ease-in-out shadow-md flex items-center justify-center gap-2.5 group whitespace-nowrap text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:shadow-lg hover:shadow-purple-500/30 dark:hover:shadow-purple-400/20 hover:-translate-y-0.5 focus:outline-none focus:ring-4 focus:ring-purple-300 dark:focus:ring-purple-800 active:transform active:scale-95 disabled:bg-slate-400"
                        >
                            {isEnrolling ? (
                                <>
                                    <div className="border-2 rounded-full w-5 h-5 animate-spin border-white/50 border-t-white" />
                                    <span>Procesando...</span>
                                </>
                            ) : (
                                <>
                                    <span className="material-icons !text-lg">how_to_reg</span>
                                    <span>Inscribirme</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </article>
    );
};

export default JornadaCard;
