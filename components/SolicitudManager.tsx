import React, { useState, useCallback } from 'react';
import type { SolicitudPPS, SolicitudPPSFields } from '../types';
import { fetchAirtableData } from '../services/airtableService';
import { generateFollowUpReport } from '../services/aiService';
import { AIRTABLE_TABLE_NAME_PPS } from '../constants';
import Card from './Card';

interface SolicitudManagerProps {
    showModal: (title: string, message: string) => void;
}

const ReportSkeleton: React.FC = () => (
    <Card className="mt-8" title="Reporte de la IA" icon="summarize">
        <div className="space-y-4">
            <div className="h-5 bg-slate-200 rounded w-3/4 animate-background-shine"></div>
            <div className="h-5 bg-slate-200 rounded w-1/2 animate-background-shine"></div>
            <hr className="my-6 border-slate-200/60" />
            <div className="h-6 bg-slate-300 rounded w-1/3 mb-4 animate-background-shine"></div>
            <div className="h-4 bg-slate-200 rounded w-full animate-background-shine"></div>
            <div className="h-4 bg-slate-200 rounded w-5/6 animate-background-shine"></div>
            <div className="h-4 bg-slate-200 rounded w-full animate-background-shine"></div>
        </div>
    </Card>
);


const SolicitudManager: React.FC<SolicitudManagerProps> = ({ showModal }) => {
    const [isLoading, setIsLoading] = useState(false);
    const [report, setReport] = useState<string | null>(null);

    const handleGenerateReport = useCallback(async () => {
        setIsLoading(true);
        setReport(null);

        try {
            const { records, error } = await fetchAirtableData<SolicitudPPSFields>(
                AIRTABLE_TABLE_NAME_PPS,
                [], // Fetch all fields for context
                `AND({Estado de seguimiento} != 'Convenio realizado', {Estado de seguimiento} != 'No se pudo concretar')`,
                200, 
                [{ field: 'Actualización', direction: 'asc' }]
            );

            if (error) {
                throw new Error(`No se pudieron cargar las solicitudes: ${typeof error.error === 'string' ? error.error : error.error.message}`);
            }
            
            if (records.length === 0) {
                 setReport("### ¡Todo en orden!\n\nNo se encontraron solicitudes activas que requieran seguimiento en este momento.");
                 setIsLoading(false);
                 return;
            }

            const solicitudesData = records.map(r => ({ ...r.fields, id: r.id }));
            const generatedReport = await generateFollowUpReport(solicitudesData);
            setReport(generatedReport);

        } catch (e: any) {
            showModal('Error al Generar Reporte', e.message || 'Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
        }
    }, [showModal]);
    
    const renderMarkdown = (text: string) => {
        const blocks = text.split(/\n\s*\n/); // Split into blocks by one or more empty lines
        
        const html = blocks.map(block => {
            if (!block.trim()) return '';

            // Handle Headings
            if (block.startsWith('### ')) return `<h3>${block.substring(4).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</h3>`;
            if (block.startsWith('## ')) return `<h2>${block.substring(3).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</h2>`;
            if (block.startsWith('# ')) return `<h1>${block.substring(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</h1>`;
            
            // Handle HR
            if (block.startsWith('---')) return '<hr />';

            // Handle Lists
            if (block.startsWith('- ')) {
                const listItems = block.split('\n')
                    .map(item => item.trim().substring(2))
                    .filter(item => item)
                    .map(item => `<li>${item.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</li>`)
                    .join('');
                return `<ul>${listItems}</ul>`;
            }

            // Handle Paragraphs
            return `<p>${block.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')}</p>`;
        }).join('');

        return { __html: html };
    };

    return (
        <div className="animate-fade-in-up">
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mb-6 gap-4">
                <div>
                    <h3 className="text-xl font-bold text-slate-800">Asistente de Seguimiento de PPS</h3>
                    <p className="text-slate-600 max-w-2xl mt-1">
                        Presiona el botón para que la IA analice todas las solicitudes de PPS activas y genere un reporte indicando cuáles necesitan tu atención y cómo proceder.
                    </p>
                </div>
                <button 
                    onClick={handleGenerateReport} 
                    disabled={isLoading} 
                    className="bg-blue-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-wait flex items-center justify-center gap-3 w-full sm:w-auto flex-shrink-0"
                >
                    {isLoading ? (
                        <>
                            <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>
                            <span>Analizando...</span>
                        </>
                    ) : (
                        <>
                            <span className="material-icons">auto_awesome</span>
                            <span>Generar Reporte de Seguimiento</span>
                        </>
                    )}
                </button>
            </div>

            {isLoading && <ReportSkeleton />}
            
            {!isLoading && report && (
                 <Card className="mt-8 animate-fade-in-up" title="Reporte de la IA" icon="summarize">
                    <div 
                        className="prose"
                        dangerouslySetInnerHTML={renderMarkdown(report)} 
                    />
                </Card>
            )}
        </div>
    );
};

export default SolicitudManager;