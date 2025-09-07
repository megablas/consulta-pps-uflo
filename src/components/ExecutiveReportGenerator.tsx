import React, { useState } from 'react';
import { useExecutiveReportData } from '../hooks/useExecutiveReportData';
import PrintableExecutiveReport from './PrintableExecutiveReport';
import Loader from './Loader';
import EmptyState from './EmptyState';

const ExecutiveReportGenerator: React.FC = () => {
    const today = new Date().toISOString().split('T')[0];
    const [startDate, setStartDate] = useState(today);
    const [endDate, setEndDate] = useState(today);
    const [shouldFetch, setShouldFetch] = useState(false);

    const { data: reportData, isLoading, error } = useExecutiveReportData(startDate, endDate, shouldFetch);

    const handleGenerateReport = () => {
        if (!startDate || !endDate) {
            alert('Por favor, selecciona un rango de fechas válido.');
            return;
        }
        if (new Date(startDate) > new Date(endDate)) {
            alert('La fecha de inicio no puede ser posterior a la fecha de fin.');
            return;
        }
        setShouldFetch(true);
    };
    
    return (
        <div className="space-y-6">
            <div className="no-print p-6 bg-slate-50/70 rounded-xl border border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex-grow flex flex-col sm:flex-row items-center gap-4">
                    <div>
                        <label htmlFor="startDate" className="text-sm font-semibold text-slate-700">Fecha de Inicio</label>
                        <input
                            type="date"
                            id="startDate"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 bg-white text-slate-900 force-light-scheme"
                        />
                    </div>
                    <div>
                        <label htmlFor="endDate" className="text-sm font-semibold text-slate-700">Fecha de Fin</label>
                        <input
                            type="date"
                            id="endDate"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                             className="mt-1 block w-full rounded-md border-slate-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm p-2 bg-white text-slate-900 force-light-scheme"
                        />
                    </div>
                </div>
                <button
                    onClick={handleGenerateReport}
                    disabled={isLoading}
                    className="w-full sm:w-auto bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:bg-blue-700"
                >
                    {isLoading ? (
                        <>
                            <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>
                            <span>Generando...</span>
                        </>
                    ) : (
                        <>
                            <span className="material-icons !text-base">query_stats</span>
                            <span>Generar Reporte</span>
                        </>
                    )}
                </button>
            </div>

            {error && <EmptyState icon="error" title="Error al Generar Reporte" message={error.message} />}

            {reportData && (
                <>
                    <div className="no-print flex justify-end">
                        <button
                            onClick={() => window.print()}
                            className="inline-flex items-center gap-2 bg-slate-700 text-white font-bold text-sm py-2 px-4 rounded-lg hover:bg-slate-800 transition-colors"
                        >
                            <span className="material-icons !text-base">print</span>
                            Imprimir / Guardar PDF
                        </button>
                    </div>
                    <div className="print-only">
                        <PrintableExecutiveReport data={reportData} />
                    </div>
                    <div className="no-print mt-4 border border-slate-200/60 rounded-xl shadow-lg p-1">
                         <div className="h-[800px] overflow-auto">
                            <PrintableExecutiveReport data={reportData} />
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ExecutiveReportGenerator;