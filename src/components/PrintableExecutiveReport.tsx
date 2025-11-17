import React from 'react';
import type { AnyReportData, ExecutiveReportData, ComparativeExecutiveReportData, TimelineMonthData } from '../types';

const PrintableTimeline: React.FC<{ launchesByMonth: TimelineMonthData[]; year: number }> = ({ launchesByMonth, year }) => {
    if (launchesByMonth.length === 0) {
        return <p className="text-sm text-slate-500 italic dark:text-slate-400">No hay lanzamientos registrados para este período.</p>;
    }
    return (
        <div className="space-y-4">
            {launchesByMonth.map(month => (
                <div key={month.monthName} className="printable-section">
                    <h4 className="font-bold text-base bg-slate-100 dark:bg-slate-800 dark:text-slate-200 p-3 border border-slate-300 dark:border-slate-700 rounded-t-lg">
                        {month.monthName} ({month.ppsCount} Inst. - {month.cuposTotal} Cupos)
                    </h4>
                    {year === 2024 && month.monthName === 'Agosto' && (
                        <div className="p-2 border-x border-slate-200 dark:border-slate-700 bg-yellow-50 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300 text-xs font-semibold text-center">
                            -- Ingreso del nuevo coordinador --
                        </div>
                    )}
                    <div className="border border-t-0 border-slate-300 dark:border-slate-700 p-3 rounded-b-md">
                        <ul className="space-y-1 text-xs">
                            {month.institutions.map(inst => (
                                <li key={inst.name} className="flex justify-between items-start">
                                    <span className="flex-1 pr-2 text-slate-700 dark:text-slate-300">{inst.name}</span>
                                    <span className="font-semibold text-slate-800 dark:text-slate-100">{inst.cupos}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            ))}
        </div>
    );
};


const SingleYearReport: React.FC<{ data: ExecutiveReportData }> = ({ data }) => {
    const kpiRows = [
        { label: 'Estudiantes Activos', key: 'activeStudents' },
        { label: 'Estudiantes sin Ninguna PPS (Total)', key: 'studentsWithoutAnyPps' },
        { label: 'Estudiantes Nuevos (Ingresos)', key: 'newStudents' },
        { label: 'Estudiantes Finalizados (Ciclo)', key: 'finishedStudents' },
        { label: 'PPS Nuevas Lanzadas', key: 'newPpsLaunches' },
        { label: 'Cupos Totales Ofrecidos', key: 'totalOfferedSpots' },
        { label: 'Convenios Nuevos Firmados', key: 'newAgreements' },
    ];

    return (
        <>
            <header className="mb-10 printable-section text-center">
                <h1 className="text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Balance de Prácticas Profesionales</h1>
                <p className="text-xl font-semibold text-slate-700 dark:text-slate-300 mt-2">
                    Resumen Anual del Ciclo {data.year}
                </p>
            </header>

            <section className="mb-8 printable-section p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200/60 dark:border-blue-800/60 rounded-lg text-blue-800 dark:text-blue-200">
                <div className="flex items-start gap-4">
                    <span className="material-icons mt-1 text-blue-600 dark:text-blue-400">info</span>
                    <div>
                        <h3 className="font-bold mb-1 text-base">Cómo funciona este reporte</h3>
                        <p className="text-xs leading-relaxed">
                            Este panel compara dos momentos para mostrar la evolución durante el ciclo {data.year}.
                            <ul className="list-disc pl-5 mt-2 space-y-1">
                                <li><strong>Total Acumulado ({data.year}):</strong> Muestra el estado actual al <strong>{data.period.current.end}</strong>.</li>
                                <li><strong>Cierre Ciclo Anterior:</strong> Muestra el estado al finalizar el ciclo anterior (<strong>{data.period.previous.end}</strong>).</li>
                                <li><strong>Evolución ({data.year}):</strong> Es la diferencia neta, reflejando la actividad ocurrida exclusivamente durante el ciclo {data.year}.</li>
                            </ul>
                        </p>
                    </div>
                </div>
            </section>

            <section className="mb-10 printable-section">
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 border-b-2 border-slate-300 dark:border-slate-700 pb-3 mb-5 tracking-tight">Resumen Ejecutivo</h2>
                <div className="prose" dangerouslySetInnerHTML={{ __html: data.summary }} />
            </section>

            <section className="mb-10 printable-section">
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 border-b-2 border-slate-300 dark:border-slate-700 pb-3 mb-5 tracking-tight">Panel de Indicadores Clave (KPIs)</h2>
                <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                            <th className="p-3 text-left font-bold text-slate-600 dark:text-slate-300">Indicador</th>
                            <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">Total Acumulado ({data.year})</th>
                            <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">Cierre Ciclo Anterior</th>
                            <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">Evolución ({data.year})</th>
                        </tr>
                    </thead>
                    <tbody>
                        {kpiRows.map(row => {
                            const kpiData = data.kpis[row.key as keyof typeof data.kpis];
                            const evolution = kpiData.current - kpiData.previous;
                            const percentageChange = kpiData.previous > 0 ? (evolution / kpiData.previous) * 100 : (evolution > 0 ? 100 : 0);
                            
                            const isPositive = evolution > 0;
                            const isNegative = evolution < 0;
                            const evolutionColor = isPositive ? 'text-emerald-700 dark:text-emerald-400' : isNegative ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400';
                            const evolutionIcon = isPositive ? 'arrow_upward' : isNegative ? 'arrow_downward' : 'remove';
                            
                            return (
                                <tr key={row.key} className="border-b border-slate-200 dark:border-slate-700">
                                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{row.label}</td>
                                    <td className="p-3 text-center font-bold text-2xl text-slate-900 dark:text-slate-50">{kpiData.current}</td>
                                    <td className="p-3 text-center text-slate-600 dark:text-slate-400">{kpiData.previous}</td>
                                    <td className={`p-3 text-center font-semibold ${evolutionColor}`}>
                                        {evolution !== 0 ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="material-icons !text-base">{evolutionIcon}</span>
                                                <span>{evolution > 0 ? '+' : ''}{evolution} ({percentageChange.toFixed(0)}%)</span>
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
        </>
    );
};

const ComparativeReport: React.FC<{ data: ComparativeExecutiveReportData }> = ({ data }) => {
     const kpiRows = [
        { label: 'Estudiantes Activos', key: 'activeStudents' },
        { label: 'Estudiantes Finalizados (Ciclo)', key: 'finishedStudents' },
        { label: 'PPS Nuevas Lanzadas', key: 'newPpsLaunches' },
        { label: 'Cupos Totales Ofrecidos', key: 'totalOfferedSpots' },
        { label: 'Convenios Nuevos Firmados', key: 'newAgreements' },
    ];
    return (
         <>
            <header className="mb-10 printable-section">
                <h1 className="text-4xl font-black text-slate-900 dark:text-slate-50 tracking-tight">Reporte Comparativo de Prácticas Profesionales</h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 mt-2 tracking-wide">
                    Análisis Comparativo Anual: 2024 vs. 2025
                </p>
            </header>
             <section className="mb-10 printable-section">
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 border-b-2 border-slate-300 dark:border-slate-700 pb-3 mb-5 tracking-tight">Resumen Ejecutivo</h2>
                <div className="prose" dangerouslySetInnerHTML={{ __html: data.summary }} />
            </section>
            <section className="mb-10 printable-section">
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 border-b-2 border-slate-300 dark:border-slate-700 pb-3 mb-5 tracking-tight">Panel Comparativo de KPIs</h2>
                 <table className="w-full text-sm">
                    <thead className="bg-slate-100 dark:bg-slate-800">
                        <tr>
                            <th className="p-3 text-left font-bold text-slate-600 dark:text-slate-300">Indicador</th>
                            <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">Balance 2024</th>
                            <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">Balance 2025</th>
                            <th className="p-3 text-center font-bold text-slate-600 dark:text-slate-300">Evolución</th>
                        </tr>
                    </thead>
                    <tbody>
                         {kpiRows.map(row => {
                            const kpiData = data.kpis[row.key as keyof typeof data.kpis];
                            const evolution = kpiData.year2025 - kpiData.year2024;
                            const percentageChange = kpiData.year2024 > 0 ? (evolution / kpiData.year2024) * 100 : (evolution > 0 ? 100 : 0);
                            
                            const isPositive = evolution > 0;
                            const isNegative = evolution < 0;
                            const evolutionColor = isPositive ? 'text-emerald-700 dark:text-emerald-400' : isNegative ? 'text-rose-700 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400';
                            const evolutionIcon = isPositive ? 'arrow_upward' : isNegative ? 'arrow_downward' : 'remove';
                            
                            return (
                                <tr key={row.key} className="border-b border-slate-200 dark:border-slate-700">
                                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">{row.label}</td>
                                    <td className="p-3 text-center font-bold text-2xl text-slate-700 dark:text-slate-300">{kpiData.year2024}</td>
                                    <td className="p-3 text-center font-bold text-2xl text-slate-900 dark:text-slate-50">{kpiData.year2025}</td>
                                    <td className={`p-3 text-center font-semibold ${evolutionColor}`}>
                                        {evolution !== 0 ? (
                                            <div className="flex items-center justify-center gap-1">
                                                <span className="material-icons !text-base">{evolutionIcon}</span>
                                                <span>{evolution > 0 ? '+' : ''}{evolution} ({percentageChange.toFixed(0)}%)</span>
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
         </>
    );
}

interface PrintableExecutiveReportProps {
    data: AnyReportData;
}

const PrintableExecutiveReport: React.FC<PrintableExecutiveReportProps> = ({ data }) => {
    
    return (
        <div className="printable-executive-report bg-white dark:bg-slate-900 p-8 font-sans">
            <style>{`
                @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  .printable-section { break-inside: avoid; }
                }
            `}</style>
            
            {data.reportType === 'comparative' ? (
                <ComparativeReport data={data} />
            ) : (
                <SingleYearReport data={data} />
            )}

            {/* Shared Sections for both report types */}
            <section className="mb-10 printable-section">
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 border-b-2 border-slate-300 dark:border-slate-700 pb-3 mb-5 tracking-tight">Nuevos Convenios</h2>
                <div className="grid grid-cols-2 gap-x-8">
                    <div>
                        <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-3 tracking-tight">2024 ({data.reportType === 'comparative' ? data.newAgreements.year2024.length : data.newAgreementsList.length})</h3>
                         {(data.reportType === 'comparative' && data.newAgreements.year2024.length > 0) ? (
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
                                {data.newAgreements.year2024.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        ) : data.reportType !== 'comparative' && data.newAgreementsList.length > 0 ? (
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
                                {data.newAgreementsList.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        ) : <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay datos.</p>}
                    </div>
                     <div>
                        <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-3 tracking-tight">2025 ({data.reportType === 'comparative' ? data.newAgreements.year2025.length : 'N/A'})</h3>
                        {(data.reportType === 'comparative' && data.newAgreements.year2025.length > 0) ? (
                            <ul className="list-disc pl-5 text-sm text-slate-600 dark:text-slate-300">
                                {data.newAgreements.year2025.map((c, i) => <li key={i}>{c}</li>)}
                            </ul>
                        ) : <p className="text-sm text-slate-500 dark:text-slate-400 italic">No hay datos.</p>}
                    </div>
                </div>
            </section>

            <section className="mb-10 printable-section">
                <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 border-b-2 border-slate-300 dark:border-slate-700 pb-3 mb-5 tracking-tight">Línea de Tiempo de PPS Lanzadas</h2>
                <div className="grid grid-cols-2 gap-x-8">
                    {/* 2024 */}
                    <div>
                        <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-3 tracking-tight">2024</h3>
                        <PrintableTimeline year={2024} launchesByMonth={data.reportType === 'comparative' ? data.launchesByMonth.year2024 : data.launchesByMonth} />
                    </div>
                    {/* 2025 */}
                     <div>
                        <h3 className="font-extrabold text-lg text-slate-800 dark:text-slate-100 mb-3 tracking-tight">2025</h3>
                        <PrintableTimeline year={2025} launchesByMonth={data.reportType === 'comparative' ? data.launchesByMonth.year2025 : []} />
                    </div>
                </div>
            </section>


            <footer className="mt-12 text-center text-xs text-gray-500 dark:text-slate-400">
                <p>Reporte generado desde Mi Panel Académico el {new Date().toLocaleDateString('es-ES')}.</p>
            </footer>
        </div>
    );
};

export default PrintableExecutiveReport;