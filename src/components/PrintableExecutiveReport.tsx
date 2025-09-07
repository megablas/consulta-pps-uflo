import React from 'react';
import type { ExecutiveReportData } from '../types';
import { getEspecialidadClasses } from '../utils/formatters';

interface PrintableExecutiveReportProps {
  data: ExecutiveReportData;
}

const PrintableExecutiveReport: React.FC<PrintableExecutiveReportProps> = ({ data }) => {
    const kpiRows = [
        { label: 'Estudiantes Activos', key: 'activeStudents' },
        { label: 'Estudiantes sin PPS (excl. Relevamiento)', key: 'studentsWithoutPpsExcludingRelevamiento' },
        { label: 'Estudiantes sin Ninguna PPS (Total)', key: 'studentsWithoutAnyPps' },
        { label: 'Estudiantes Nuevos (Ingresos)', key: 'newStudents' },
        { label: 'Estudiantes Finalizados (Ciclo)', key: 'finishedStudents' },
        { label: 'PPS Nuevas Lanzadas', key: 'newPpsLaunches' },
        { label: 'Cupos Totales Ofrecidos', key: 'totalOfferedSpots' },
        { label: 'Convenios Nuevos Firmados', key: 'newAgreements' },
    ];

    return (
        <div className="printable-executive-report bg-white p-8 font-sans">
            <header className="mb-8 printable-section">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Reporte de Prácticas Profesionales Supervisadas</h1>
                <p className="font-semibold text-slate-700 mt-1">
                    Período: Del {data.period.current.start} al {data.period.current.end}
                </p>
            </header>

            <section className="mb-10 printable-section">
                <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-2 mb-4">Resumen Ejecutivo</h2>
                <div className="prose" dangerouslySetInnerHTML={{ __html: data.summary }} />
            </section>

            <section className="mb-10 printable-section">
                <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-2 mb-4">Panel de Indicadores Clave (KPIs)</h2>
                <table className="w-full text-sm">
                    <thead className="bg-slate-100">
                        <tr>
                            <th className="p-3 text-left font-bold text-slate-600">Indicador</th>
                            <th className="p-3 text-center font-bold text-slate-600">Período Actual</th>
                            <th className="p-3 text-center font-bold text-slate-600">Período Anterior</th>
                            <th className="p-3 text-center font-bold text-slate-600">Evolución</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kpiRows.map(row => {
                            const kpiData = data.kpis[row.key as keyof typeof data.kpis];
                            const evolution = kpiData.current - kpiData.previous;
                            const percentageChange = kpiData.previous > 0 ? (evolution / kpiData.previous) * 100 : (evolution > 0 ? 100 : 0);
                            
                            const isPositive = evolution > 0;
                            const isNegative = evolution < 0;
                            const evolutionColor = isPositive ? 'text-emerald-700' : isNegative ? 'text-rose-700' : 'text-slate-600';
                            const evolutionIcon = isPositive ? 'arrow_upward' : isNegative ? 'arrow_downward' : 'remove';
                            
                            return (
                                <tr key={row.key} className="border-b border-slate-200">
                                    <td className="p-3 font-semibold text-slate-800">{row.label}</td>
                                    <td className="p-3 text-center font-bold text-2xl text-slate-900">{kpiData.current}</td>
                                    <td className="p-3 text-center text-slate-600">{kpiData.previous}</td>
                                    <td className={`p-3 text-center font-semibold ${evolutionColor}`}>
                                        {evolution !== 0 ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="material-icons !text-base">{evolutionIcon}</span>
                                                <span>{evolution} ({percentageChange.toFixed(0)}%)</span>
                                            </div>
                                        ) : (
                                            <span>-</span>
                                        )}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </section>
            
            <section className="mb-10 printable-section">
                <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-2 mb-4">Nuevos Convenios en el Período</h2>
                {data.newAgreementsList.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {data.newAgreementsList.map((convenio, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-slate-50/50 rounded-lg border border-slate-200">
                                <span className="material-icons text-emerald-500">verified</span>
                                <span className="text-slate-700 font-medium">{convenio}</span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-slate-500">No se firmaron nuevos convenios en el período seleccionado.</p>
                )}
            </section>
            
            <section className="mb-10 printable-section">
                <h2 className="text-2xl font-bold text-slate-800 border-b-2 border-slate-200 pb-2 mb-4">PPS Lanzadas en el Período</h2>
                {data.ppsLaunchedInPeriod.length > 0 ? (
                    <table className="w-full text-sm">
                        <thead className="bg-slate-100">
                            <tr>
                                <th className="p-3 text-left font-bold text-slate-600">Fecha</th>
                                <th className="p-3 text-left font-bold text-slate-600">Institución / PPS</th>
                                <th className="p-3 text-left font-bold text-slate-600">Orientación</th>
                                <th className="p-3 text-center font-bold text-slate-600">Cupos</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.ppsLaunchedInPeriod.map((pps, index) => {
                                const especialidadVisuals = getEspecialidadClasses(pps.orientation);
                                return (
                                    <tr key={index} className="border-b border-slate-200">
                                        <td className="p-3 text-slate-700 whitespace-nowrap">{pps.date}</td>
                                        <td className="p-3 font-semibold text-slate-800">{pps.name}</td>
                                        <td className="p-3">
                                            <span className={`${especialidadVisuals.tag} shadow-sm`}>{pps.orientation}</span>
                                        </td>
                                        <td className="p-3 text-center font-bold text-slate-900">{pps.spots}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                ) : (
                    <p className="text-slate-500">No se lanzaron nuevas PPS en el período seleccionado.</p>
                )}
            </section>

            <footer className="mt-12 text-center text-xs text-gray-500">
                <p>Reporte generado desde Mi Panel Académico el {new Date().toLocaleDateString('es-ES')}.</p>
            </footer>
        </div>
    );
};

export default PrintableExecutiveReport;
