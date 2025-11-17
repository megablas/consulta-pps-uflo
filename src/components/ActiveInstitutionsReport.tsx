import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { db } from '../lib/db';
import type { InstitucionFields, LanzamientoPPSFields, AirtableRecord } from '../types';
import {
  FIELD_NOMBRE_INSTITUCIONES,
  FIELD_CONVENIO_NUEVO_INSTITUCIONES,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
  FIELD_TUTOR_INSTITUCIONES,
} from '../constants';
import { normalizeStringForComparison, parseToUTCDate, formatDate } from '../utils/formatters';
import Loader from './Loader';
import EmptyState from './EmptyState';
import Toast from './Toast';
import ExcelJS from 'exceljs';


const getGroupName = (name: string | undefined): string => {
    if (!name) return 'Sin Nombre';
    // Splits by a hyphen, en-dash, or em-dash with optional surrounding spaces for robustness.
    return name.split(/\s*[-–—]\s*/)[0].trim();
};

interface ReportData {
    institucion: string;
    convenioNuevo: string;
    orientaciones: string;
    tutor: string;
    lanzamientosCount: number;
    cuposTotal: number;
}

const fetchReportData = async (isTestingMode: boolean) => {
    if (isTestingMode) {
        return { instituciones: [], lanzamientos: [] };
    }
    const [institucionesRes, lanzamientosRes] = await Promise.all([
        db.instituciones.getAll({ fields: [FIELD_NOMBRE_INSTITUCIONES, FIELD_CONVENIO_NUEVO_INSTITUCIONES, FIELD_TUTOR_INSTITUCIONES] }),
        db.lanzamientos.getAll({ fields: [FIELD_NOMBRE_PPS_LANZAMIENTOS, FIELD_FECHA_INICIO_LANZAMIENTOS, FIELD_ORIENTACION_LANZAMIENTOS, FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] })
    ]);
    return { instituciones: institucionesRes, lanzamientos: lanzamientosRes };
};

const ActiveInstitutionsReport: React.FC<{ isTestingMode?: boolean }> = ({ isTestingMode = false }) => {
    const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const { data, isLoading, error } = useQuery({
        queryKey: ['activeInstitutionsReportData', isTestingMode],
        queryFn: () => fetchReportData(isTestingMode),
    });

    const reportData = useMemo((): ReportData[] => {
        if (!data) return [];

        const currentYear = new Date().getFullYear();
        const aost2024Cutoff = new Date('2024-08-01T00:00:00.000Z');
        
        const launchesThisYearRaw = data.lanzamientos.filter(l => {
            const date = parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]);
            return date && date.getUTCFullYear() === currentYear;
        });

        const excludedInstitutions = ['relevamiento profesional', 'jornada universitaria en salud mental'];
        const launchesThisYear = launchesThisYearRaw.filter(launch => {
            const ppsName = launch.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            if (!ppsName) return true; // Keep launches without a name for now
            const normalizedPpsName = normalizeStringForComparison(ppsName);
            return !excludedInstitutions.some(excluded => normalizedPpsName.includes(excluded));
        });

        const reportMap = new Map<string, ReportData>();

        launchesThisYear.forEach(launch => {
            const ppsName = launch.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS];
            if (!ppsName) return;

            const groupName = getGroupName(ppsName);
            
            if (!reportMap.has(groupName)) {
                reportMap.set(groupName, {
                    institucion: groupName,
                    convenioNuevo: 'No',
                    orientaciones: '',
                    tutor: 'No disponible',
                    lanzamientosCount: 0,
                    cuposTotal: 0,
                });
            }

            const entry = reportMap.get(groupName)!;
            entry.lanzamientosCount++;
            entry.cuposTotal += launch.fields[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS] || 0;
            
            const orientacion = launch.fields[FIELD_ORIENTACION_LANZAMIENTOS];
            if (orientacion && !entry.orientaciones.includes(orientacion)) {
                entry.orientaciones = entry.orientaciones ? `${entry.orientaciones}, ${orientacion}` : orientacion;
            }
        });

        reportMap.forEach(entry => {
            const normalizedBaseName = normalizeStringForComparison(entry.institucion);
            let foundTutor: string | undefined;
            let isMarkedAsNew = false;

            // Search through all institution records to find any variation that matches the base name.
            // Aggregate tutor and 'new agreement' status.
            for (const inst of data.instituciones) {
                const instName = inst.fields[FIELD_NOMBRE_INSTITUCIONES];
                if (instName && normalizeStringForComparison(instName).startsWith(normalizedBaseName)) {
                    // Grab the first tutor found.
                    if (!foundTutor && inst.fields[FIELD_TUTOR_INSTITUCIONES]) {
                        foundTutor = inst.fields[FIELD_TUTOR_INSTITUCIONES];
                    }
                    // If any variation is marked as new, the whole group is considered.
                    if (inst.fields[FIELD_CONVENIO_NUEVO_INSTITUCIONES]) {
                        isMarkedAsNew = true;
                    }
                }
            }
            
            entry.tutor = foundTutor || 'No disponible';

            // Check if it's a new agreement based on the aggregated flag.
            if (isMarkedAsNew) {
                const firstLaunchThisYear = launchesThisYear
                    .filter(l => normalizeStringForComparison(getGroupName(l.fields[FIELD_NOMBRE_PPS_LANZAMIENTOS])) === normalizedBaseName)
                    .map(l => parseToUTCDate(l.fields[FIELD_FECHA_INICIO_LANZAMIENTOS]))
                    .filter((d): d is Date => d !== null)
                    .sort((a,b) => a.getTime() - b.getTime())[0];
                
                if (firstLaunchThisYear && firstLaunchThisYear >= aost2024Cutoff) {
                    entry.convenioNuevo = 'Sí';
                }
            }
        });

        return Array.from(reportMap.values()).sort((a, b) => a.institucion.localeCompare(b.institucion));
    }, [data]);
    
    const handleDownload = async () => {
        if (reportData.length === 0) {
            setToastInfo({ message: 'No hay datos para exportar.', type: 'error' });
            return;
        }
        
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('Instituciones Activas');
    
            // Main Title
            const titleRow = worksheet.addRow([`Reporte de Instituciones Activas ${new Date().getFullYear()}`]);
            worksheet.mergeCells('A1:F1'); // Merged to F1 since there are 6 columns
            titleRow.font = { name: 'Calibri', size: 24, bold: true, color: { argb: 'FF1E40AF' } };
            titleRow.alignment = { vertical: 'middle', horizontal: 'center' };
            worksheet.getRow(1).height = 50;
    
            // Spacer
            worksheet.addRow([]);
    
            // Descriptions Block
            const descStartRow = 3;
            worksheet.addRow(['Nota: Todas las instituciones listadas cuentan con Convenio Marco y Específico vigente.']);
            worksheet.mergeCells(`A${descStartRow}:F${descStartRow}`);
            worksheet.getRow(descStartRow).font = { name: 'Calibri', italic: true, size: 13, color: { argb: 'FF475569' } };
            worksheet.getRow(descStartRow).alignment = { vertical: 'middle', horizontal: 'left' };
            worksheet.getRow(descStartRow).getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
            
            worksheet.addRow([]);
    
            // Header Row
            const header = [
                'Institución',
                'Convenio Nuevo (desde Ago 2024)',
                'Orientación(es)',
                'Tutor Institucional',
                'Nº de Lanzamientos (año)',
                'Cupos Totales (año)',
            ];
            const headerRow = worksheet.addRow(header);
            headerRow.height = 45;
            headerRow.eachCell((cell) => {
                cell.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 14 };
                cell.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FF2563EB' } 
                };
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFBFDBFE' } },
                    left: { style: 'thin', color: { argb: 'FFBFDBFE' } },
                    bottom: { style: 'thin', color: { argb: 'FFBFDBFE' } },
                    right: { style: 'thin', color: { argb: 'FFBFDBFE' } }
                };
                cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
            });
    
            // Data Rows
            reportData.forEach((row, index) => {
                const dataRow = worksheet.addRow([
                    row.institucion,
                    row.convenioNuevo,
                    row.orientaciones,
                    row.tutor,
                    row.lanzamientosCount,
                    row.cuposTotal,
                ]);
                
                dataRow.height = 35;
    
                dataRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    cell.font = { name: 'Calibri', size: 13 };
                    cell.border = { top: { style: 'thin', color: { argb: 'FFCBD5E1' } }, left: { style: 'thin', color: { argb: 'FFCBD5E1' } }, bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } }, right: { style: 'thin', color: { argb: 'FFCBD5E1' } }};
                    cell.alignment = { vertical: 'middle', wrapText: true, indent: 1 };
                    
                    // Zebra striping for rows
                    if (index % 2 !== 0) {
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
                    }
                    
                    // Highlight "Convenio Nuevo" rows
                    if (row.convenioNuevo === 'Sí') {
                       cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFDCFCE7' } }; // Light green
                       if (colNumber === 2) {
                          cell.font = { name: 'Calibri', size: 13, bold: true, color: { argb: 'FF15803D' } }; // Darker green text
                       }
                    }

                    // Specific column alignments
                    if ([2, 5, 6].includes(colNumber)) {
                        cell.alignment.horizontal = 'center';
                    }
                });
            });
    
            worksheet.columns = [
                { key: 'institucion', width: 60 },
                { key: 'convenioNuevo', width: 25 },
                { key: 'orientaciones', width: 40 },
                { key: 'tutor', width: 35 },
                { key: 'lanzamientos', width: 22 },
                { key: 'cupos', width: 22 },
            ];
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `Reporte Instituciones Activas ${new Date().getFullYear()}.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setToastInfo({ message: 'Reporte descargado exitosamente.', type: 'success' });
        } catch (e: any) {
            console.error('Failed to generate Excel file:', e);
            setToastInfo({ message: 'Ocurrió un error al generar el archivo Excel.', type: 'error' });
        }
    };
    
    if (isLoading) return <div className="flex justify-center p-8"><Loader /></div>;
    if (error) return <EmptyState icon="error" title="Error" message={error.message} />;

    return (
        <div className="space-y-6">
            {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
                <div>
                     <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Reporte de Instituciones Activas ({new Date().getFullYear()})</h2>
                     <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                        <p><span className="font-semibold text-slate-600 dark:text-slate-300">Nota:</span> Todas las instituciones listadas cuentan con Convenio Marco y Específico vigente.</p>
                     </div>
                </div>
                 <button
                    onClick={handleDownload}
                    className="w-full sm:w-auto bg-emerald-600 text-white font-bold py-2 px-4 rounded-lg text-sm transition-colors shadow-md hover:bg-emerald-700 disabled:bg-slate-400 flex items-center justify-center gap-2"
                >
                    <span className="material-icons !text-base">download</span>
                    <span>Descargar Reporte (.xlsx)</span>
                </button>
            </div>
            
             {reportData.length > 0 ? (
                <div className="overflow-x-auto border border-slate-200/80 dark:border-slate-700 rounded-lg">
                    <table className="w-full text-sm">
                        <thead className="bg-slate-50/70 dark:bg-slate-900/50">
                            <tr>
                                <th className="p-3 text-left font-semibold text-slate-500 dark:text-slate-400">Institución</th>
                                <th className="p-3 text-center font-semibold text-slate-500 dark:text-slate-400">Convenio Nuevo (desde Ago 2024)</th>
                                <th className="p-3 text-left font-semibold text-slate-500 dark:text-slate-400">Orientación(es)</th>
                                <th className="p-3 text-left font-semibold text-slate-500 dark:text-slate-400">Tutor Institucional</th>
                                <th className="p-3 text-center font-semibold text-slate-500 dark:text-slate-400">Lanzamientos</th>
                                <th className="p-3 text-center font-semibold text-slate-500 dark:text-slate-400">Cupos Totales</th>
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700">
                             {reportData.map(row => (
                                <tr key={row.institucion} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors">
                                    <td className="p-3 font-semibold text-slate-800 dark:text-slate-100">
                                        {row.institucion}
                                    </td>
                                    <td className="p-3 text-center font-bold">
                                        {row.convenioNuevo === 'Sí' ? (
                                            <span className="text-emerald-700 dark:text-emerald-300">Sí</span>
                                        ) : (
                                            <span className="text-slate-400 dark:text-slate-500">No</span>
                                        )}
                                    </td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300">{row.orientaciones}</td>
                                    <td className="p-3 text-slate-600 dark:text-slate-300">{row.tutor}</td>
                                    <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-100">{row.lanzamientosCount}</td>
                                    <td className="p-3 text-center font-bold text-slate-800 dark:text-slate-100">{row.cuposTotal}</td>
                                </tr>
                             ))}
                         </tbody>
                    </table>
                </div>
            ) : (
                <EmptyState icon="apartment" title="Sin Datos" message="No se encontraron instituciones activas para el año actual." />
            )}
        </div>
    );
};

export default ActiveInstitutionsReport;