import React, { useState, useEffect } from 'react';
import { createAirtableRecord, fetchAllAirtableData } from '../services/airtableService';
import type { LanzamientoPPSFields } from '../types';
import {
  AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
  FIELD_NOMBRE_PPS_LANZAMIENTOS,
  FIELD_FECHA_INICIO_LANZAMIENTOS,
  FIELD_FECHA_FIN_LANZAMIENTOS,
  FIELD_DIRECCION_LANZAMIENTOS,
  FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
  FIELD_ORIENTACION_LANZAMIENTOS,
  FIELD_HORAS_ACREDITADAS_LANZAMIENTOS,
  FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS,
  FIELD_DESCRIPCION_LANZAMIENTOS,
  FIELD_ENCUENTRO_INICIAL_LANZAMIENTOS,
  FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
  FIELD_DURACION_INSCRIPCION_DIAS_LANZAMIENTOS,
  AIRTABLE_TABLE_NAME_INSTITUCIONES,
  FIELD_NOMBRE_INSTITUCIONES
} from '../constants';
import Toast from './Toast';

interface AiConvocatoriaCreatorProps {
  showModal: (title: string, message: string) => void;
}

const FormInput = ({ label, name, value, onChange, type = 'text', required = false, rows = 1, disabled = false, placeholder = '' }: any) => {
  const InputComponent = rows > 1 ? 'textarea' : 'input';
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      <InputComponent
        id={name}
        name={name}
        type={type}
        value={value || ''}
        onChange={onChange}
        required={required}
        disabled={disabled}
        rows={rows}
        placeholder={placeholder}
        className="w-full text-sm rounded-lg border-slate-300 p-2.5 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
      />
    </div>
  );
};

const AiConvocatoriaCreator: React.FC<AiConvocatoriaCreatorProps> = ({ showModal }) => {
  const [convocatoriaText, setConvocatoriaText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('');
  const [parsedData, setParsedData] = useState<Partial<LanzamientoPPSFields> | null>(null);
  const [toastInfo, setToastInfo] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  const [instituciones, setInstituciones] = useState<string[]>([]);
  const [isLoadingInstitutions, setIsLoadingInstitutions] = useState(true);

  useEffect(() => {
    const fetchInstitutions = async () => {
        setIsLoadingInstitutions(true);
        const { records, error } = await fetchAllAirtableData(AIRTABLE_TABLE_NAME_INSTITUCIONES, [FIELD_NOMBRE_INSTITUCIONES]);
        if (error) {
            console.error("Failed to fetch institutions", error);
            showModal('Error de Carga', 'No se pudo cargar la lista de instituciones. La búsqueda por similitud estará desactivada.');
        } else {
            const institutionNames = records.map(r => r.fields[FIELD_NOMBRE_INSTITUCIONES]).filter(Boolean) as string[];
            setInstituciones(institutionNames);
        }
        setIsLoadingInstitutions(false);
    };
    fetchInstitutions();
  }, [showModal]);

  const handleAnalyze = async () => {
    if (!convocatoriaText.trim()) {
      showModal('Entrada Vacía', 'Por favor, pegue el texto de la convocatoria en el área de texto.');
      return;
    }
    setIsLoading(true);
    setLoadingMessage('Analizando con IA...');
    setParsedData(null);

    try {
      const response = await fetch('/api/ai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          convocatoriaText,
          instituciones,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Error del servidor: ${response.status}`);
      }

      const extractedData = await response.json();
      setParsedData(extractedData);

    } catch (error: any) {
      console.error('Error al analizar con IA:', error);
      showModal('Error de Análisis', `Ocurrió un error al contactar con el servicio de IA. Detalles: ${error.message || 'Error desconocido'}`);
    } finally {
      setIsLoading(false);
      setLoadingMessage('');
    }
  };

  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (!parsedData) return;
    const { name, value, type } = e.target;
    // @ts-ignore
    const isNumber = type === 'number';
    setParsedData(prevData => ({
      ...prevData,
      [name]: isNumber ? (value === '' ? null : Number(value)) : value,
    }));
  };
  
  const formatDateToMDY = (isoDate: string | undefined): string | undefined => {
      if (!isoDate) return undefined;
      try {
        const date = new Date(`${isoDate}T00:00:00Z`); // Assume UTC to avoid timezone shifts
        if (isNaN(date.getTime())) return isoDate; // Return original if invalid
        const month = date.getUTCMonth() + 1;
        const day = date.getUTCDate();
        const year = date.getUTCFullYear();
        return `${month}/${day}/${year}`;
      } catch {
        return isoDate; // Return original on error
      }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parsedData) return;

    setIsLoading(true);
    setLoadingMessage('Guardando en Airtable...');

    try {
        const cleanedHorario = (parsedData[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS] || '')
            .replace(/^(se debe elegir una comisi(ó|o)n:|elegir una:|horarios disponibles:|opciones:|grupos y horarios:)\s*/gim, '')
            .trim();

        const dataToSave = {
            ...parsedData,
            [FIELD_FECHA_INICIO_LANZAMIENTOS]: formatDateToMDY(parsedData[FIELD_FECHA_INICIO_LANZAMIENTOS]),
            [FIELD_FECHA_FIN_LANZAMIENTOS]: formatDateToMDY(parsedData[FIELD_FECHA_FIN_LANZAMIENTOS]),
            [FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]: cleanedHorario,
            [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Abierto'
        };

        const { record, error } = await createAirtableRecord<LanzamientoPPSFields>(
            AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
            dataToSave
        );

        if (error || !record) {
            const errorMessage = typeof error?.error === 'string' ? error.error : error?.error.message || 'No se pudo crear el registro en Airtable.';
            throw new Error(`Error al guardar en Airtable: ${errorMessage}`);
        }

        setToastInfo({ message: 'Convocatoria guardada exitosamente.', type: 'success' });
        setParsedData(null);
        setConvocatoriaText('');

    } catch (error: any) {
        console.error('Error al guardar en Airtable:', error);
        showModal('Error al Guardar', `No se pudo guardar la convocatoria. Detalles: ${error.message}`);
    } finally {
        setIsLoading(false);
        setLoadingMessage('');
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center h-64 bg-slate-50 rounded-lg border-dashed border-2 border-slate-200">
          <div className="border-4 border-slate-200 border-t-blue-500 rounded-full w-10 h-10 animate-spin"></div>
          <p className="mt-4 font-semibold text-slate-600">{loadingMessage}</p>
        </div>
      );
    }

    if (parsedData) {
      return (
        <form onSubmit={handleSave} className="animate-fade-in-up space-y-8">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Paso 2: Revisar y Guardar</h3>
              <p className="text-slate-600 max-w-2xl mt-1">La IA ha extraído los siguientes datos. Revísalos, corrígelos si es necesario y guarda la convocatoria.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-t border-slate-200 pt-6">
                <div className="md:col-span-2">
                    <label htmlFor={FIELD_NOMBRE_PPS_LANZAMIENTOS} className="block text-sm font-medium text-slate-700 mb-1">Nombre de la PPS</label>
                    <select
                        id={FIELD_NOMBRE_PPS_LANZAMIENTOS}
                        name={FIELD_NOMBRE_PPS_LANZAMIENTOS}
                        value={parsedData[FIELD_NOMBRE_PPS_LANZAMIENTOS] || ''}
                        onChange={handleFormChange}
                        required
                        disabled={isLoading || isLoadingInstitutions}
                        className="w-full text-sm rounded-lg border-slate-300 p-2.5 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-100 disabled:text-slate-500"
                    >
                        {isLoadingInstitutions ? (
                          <option>Cargando instituciones...</option>
                        ) : (
                          <>
                            {parsedData[FIELD_NOMBRE_PPS_LANZAMIENTOS] && !instituciones.includes(parsedData[FIELD_NOMBRE_PPS_LANZAMIENTOS]) && (
                                <option value={parsedData[FIELD_NOMBRE_PPS_LANZAMIENTOS]}>
                                    {parsedData[FIELD_NOMBRE_PPS_LANZAMIENTOS]} (Sugerencia IA)
                                </option>
                            )}
                            {instituciones.map(inst => (
                              <option key={inst} value={inst}>{inst}</option>
                            ))}
                          </>
                        )}
                    </select>
                </div>
                
                <FormInput label="Fecha de Inicio" name={FIELD_FECHA_INICIO_LANZAMIENTOS} value={parsedData[FIELD_FECHA_INICIO_LANZAMIENTOS]} onChange={handleFormChange} type="date" />
                <FormInput label="Fecha de Finalización" name={FIELD_FECHA_FIN_LANZAMIENTOS} value={parsedData[FIELD_FECHA_FIN_LANZAMIENTOS]} onChange={handleFormChange} type="date" />
                
                <FormInput label="Horas Acreditadas" name={FIELD_HORAS_ACREDITADAS_LANZAMIENTOS} value={parsedData[FIELD_HORAS_ACREDITADAS_LANZAMIENTOS]} onChange={handleFormChange} type="number" />
                <FormInput label="Orientación" name={FIELD_ORIENTACION_LANZAMIENTOS} value={parsedData[FIELD_ORIENTACION_LANZAMIENTOS]} onChange={handleFormChange} />

                <FormInput label="Cupos Disponibles" name={FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS} value={parsedData[FIELD_CUPOS_DISPONIBLES_LANZAMIENTOS]} onChange={handleFormChange} type="number" />
                <FormInput label="Plazo Inscripción (días)" name={FIELD_DURACION_INSCRIPCION_DIAS_LANZAMIENTOS} value={parsedData[FIELD_DURACION_INSCRIPCION_DIAS_LANZAMIENTOS]} onChange={handleFormChange} type="number" placeholder="Ej: 15" />

                <div className="md:col-span-2">
                    <FormInput label="Dirección" name={FIELD_DIRECCION_LANZAMIENTOS} value={parsedData[FIELD_DIRECCION_LANZAMIENTOS]} onChange={handleFormChange} />
                </div>
                <div className="md:col-span-2">
                    <FormInput label="Encuentro Inicial" name={FIELD_ENCUENTRO_INICIAL_LANZAMIENTOS} value={parsedData[FIELD_ENCUENTRO_INICIAL_LANZAMIENTOS]} onChange={handleFormChange} placeholder="Ej: Lunes 15/08 a las 10hs"/>
                </div>
                
                <div className="md:col-span-2">
                    <FormInput label="Descripción Detallada" name={FIELD_DESCRIPCION_LANZAMIENTOS} value={parsedData[FIELD_DESCRIPCION_LANZAMIENTOS]} onChange={handleFormChange} rows={8} />
                </div>
                 <div className="md:col-span-2">
                    <FormInput label="Grupos y Horarios" name={FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS} value={parsedData[FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]} onChange={handleFormChange} rows={5} />
                </div>
            </div>
            <div className="flex justify-end items-center gap-4 pt-4">
              <button type="button" onClick={() => setParsedData(null)} className="bg-white hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-6 rounded-lg text-sm border border-slate-300 transition-colors">Cancelar</button>
              <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md flex items-center gap-2">
                <span className="material-icons">save</span>
                <span>Guardar Convocatoria</span>
              </button>
            </div>
        </form>
      );
    }

    return (
      <div className="animate-fade-in-up space-y-6">
        <div>
          <h3 className="text-xl font-bold text-slate-800">Paso 1: Pegar Texto</h3>
          <p className="text-slate-600 max-w-2xl mt-1">Pega el contenido completo de la convocatoria (proveniente de un Word, email, etc.) en el siguiente campo de texto.</p>
        </div>
        <textarea
          value={convocatoriaText}
          onChange={(e) => setConvocatoriaText(e.target.value)}
          rows={15}
          className="w-full text-sm rounded-lg border-slate-300 p-4 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
          placeholder="Pegue aquí el texto de la convocatoria..."
          aria-label="Texto de la convocatoria"
        />
        <div className="flex justify-end">
          <button
            onClick={handleAnalyze}
            disabled={!convocatoriaText.trim() || isLoadingInstitutions}
            className="bg-blue-600 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="material-icons">auto_awesome</span>
            <span>Analizar con IA</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="animate-fade-in-up">
      {toastInfo && <Toast message={toastInfo.message} type={toastInfo.type} onClose={() => setToastInfo(null)} />}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Crear Convocatoria con Asistente de IA</h2>
      </div>
      {renderContent()}
    </div>
  );
};

export default AiConvocatoriaCreator;