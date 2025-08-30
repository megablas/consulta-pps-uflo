import React, { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useModal } from '../contexts/ModalContext';
import Card from './Card';
import Loader from './Loader';
import { fetchStudentData, fetchPracticas } from '../services/dataService';
import { calculateCriterios } from '../utils/criteriaCalculations';
import { Orientacion } from '../types';
import { FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS, FIELD_ESPECIALIDAD_PRACTICAS, FIELD_HORAS_PRACTICAS } from '../constants';

interface StudentPreviewProps {
  student: { legajo: string; nombre: string };
  onClose: () => void;
  onOpenPanel: () => void;
}

const StudentPreview: React.FC<StudentPreviewProps> = ({ student, onClose, onOpenPanel }) => {
  const { showModal } = useModal();
  
  // FIX: Replaced useData() with useQuery hooks to fetch data independently.
  const { data: studentData, isLoading: isLoadingStudent, error: studentError, refetch: refetchStudentData } = useQuery({
    queryKey: ['studentPreview', student.legajo],
    queryFn: () => fetchStudentData(student.legajo),
  });

  const { data: practicas = [], isLoading: isLoadingPracticas, error: practicasError } = useQuery({
    queryKey: ['practicasPreview', student.legajo],
    queryFn: () => fetchPracticas(student.legajo),
  });
  
  const isLoading = isLoadingStudent || isLoadingPracticas;
  const error = studentError || practicasError;

  const selectedOrientacion = (studentData?.studentDetails?.['Orientación Elegida'] || "") as Orientacion | "";
  const criterios = useMemo(() => calculateCriterios(practicas, selectedOrientacion), [practicas, selectedOrientacion]);
  

  const handleExport = () => {
    if (isLoading || !criterios || !practicas) {
      showModal('Error', 'Los datos del estudiante aún se están cargando. Inténtalo de nuevo en un momento.');
      return;
    }

    const practicasText = practicas.length > 0
      ? practicas.map(p => {
          const institucionRaw = p[FIELD_NOMBRE_INSTITUCION_LOOKUP_PRACTICAS];
          const institucion = Array.isArray(institucionRaw) ? institucionRaw.join(', ') : institucionRaw;
          const orientacion = p[FIELD_ESPECIALIDAD_PRACTICAS] || 'N/A';
          const horas = p[FIELD_HORAS_PRACTICAS] || 0;
          return `- *${institucion}* (${orientacion}): ${horas} hs.`;
        }).join('\n')
      : 'No hay prácticas registradas.';
      
    const orientacionElegidaText = selectedOrientacion
      ? `*Horas en ${selectedOrientacion}:* ${Math.round(criterios.horasOrientacionElegida)} / 70 hs`
      : 'No se ha seleccionado una orientación principal.';

    const textoCopiado = `*Resumen Académico - ${student.nombre}*
*Legajo:* ${student.legajo}

*Avance de PPS:*
- *Horas Totales:* ${Math.round(criterios.horasTotales)} / 250 hs
- ${orientacionElegidaText}
- *Rotación de Orientaciones:* ${criterios.orientacionesCursadasCount} / 3 (${criterios.orientacionesUnicas.join(', ') || 'N/A'})

*Historial de Prácticas:*
${practicasText}
`;

    navigator.clipboard.writeText(textoCopiado).then(() => {
      showModal('Copiado', 'El resumen del alumno ha sido copiado al portapapeles.');
    }, (err) => {
      console.error('Error al copiar: ', err);
      showModal('Error', 'No se pudo copiar el texto. Revisa los permisos del navegador.');
    });
  };

  if (isLoading) {
    return (
      <Card className="mt-4 animate-fade-in-up">
        <div className="flex items-center gap-3 text-slate-600 p-4 justify-center">
          <Loader />
          <span>Cargando datos de {student.nombre}...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mt-4 animate-fade-in-up border-red-200 bg-red-50">
        <p className="text-red-700">Error al cargar datos: {error.message}</p>
      </Card>
    );
  }

  return (
    <Card
      className="mt-4 animate-fade-in-up"
      title={
        <div className="flex justify-between items-center w-full">
          <span>{student.nombre}</span>
          <button onClick={onClose} className="p-1 rounded-full text-slate-400 hover:bg-slate-100" aria-label="Cerrar vista previa">
            <span className="material-icons !text-xl">close</span>
          </button>
        </div>
      }
      description={`Legajo: ${student.legajo}`}
    >
      <div className="mt-4 pt-4 border-t border-slate-200 flex flex-col sm:flex-row gap-3">
        <button onClick={handleExport} className="flex-1 bg-green-600 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-all duration-200 shadow-md hover:bg-green-700 hover:-translate-y-px flex items-center gap-2 justify-center">
          <span className="material-icons !text-base">share</span>
          <span>Exportar para WhatsApp</span>
        </button>
        <button onClick={onOpenPanel} className="flex-1 bg-blue-600 text-white font-bold py-2.5 px-4 rounded-lg text-sm transition-all duration-200 shadow-md hover:bg-blue-700 hover:-translate-y-px flex items-center gap-2 justify-center">
          <span className="material-icons !text-base">open_in_new</span>
          <span>Ver Panel Completo</span>
        </button>
      </div>
    </Card>
  );
};

export default StudentPreview;