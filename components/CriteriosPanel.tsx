import React from 'react';
import { Orientacion, ALL_ORIENTACIONES } from '../types';
import { HORAS_OBJETIVO_TOTAL, HORAS_OBJETIVO_ORIENTACION, ROTACION_OBJETIVO_ORIENTACIONES } from '../constants';
import ProgressBar from './ProgressBar';
import RotationTracker from './RotationTracker';
import CriterionCard from './CriterionCard';
import Card from './Card';
import { useData } from '../contexts/DataContext';
import { useAuth } from '../contexts/AuthContext';


const CriteriosPanel: React.FC = () => {
  const { 
    criterios, 
    selectedOrientacion, 
    handleOrientacionChange, 
    showSaveConfirmation,
    studentNameForPanel
  } = useData();
  const { isSuperUserMode } = useAuth();


  const todosLosCriteriosCumplidos = criterios.cumpleHorasTotales && criterios.cumpleRotacion && criterios.cumpleHorasOrientacion;

  const orientacionControls = (
    <>
      <div className={`transition-opacity duration-300 h-4 text-center ${showSaveConfirmation ? 'opacity-100' : 'opacity-0'}`}>
        <span className="text-xs font-semibold text-blue-500">Guardado ✓</span>
      </div>
      <div className="relative mt-1">
        <select 
          id="orientacion-elegida-select" 
          value={selectedOrientacion}
          onChange={(e) => handleOrientacionChange(e.target.value as Orientacion | "")}
          className="appearance-none w-full rounded-md border border-slate-300/80 p-2.5 pr-10 text-sm text-slate-800 bg-white shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-colors"
          aria-label="Seleccionar orientación principal"
        >
          <option value="">Seleccione orientación...</option>
          {ALL_ORIENTACIONES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-500">
            <span className="material-icons !text-base">unfold_more</span>
        </div>
      </div>
    </>
  );

  const title = isSuperUserMode ? `Panel de: ${studentNameForPanel}` : `¡Bienvenido/a, ${studentNameForPanel}!`;
  const description = isSuperUserMode 
    ? 'Este es el checklist del estudiante para finalizar el recorrido de prácticas.'
    : 'Este es tu checklist para finalizar el recorrido de prácticas.';

  return (
    <Card 
      title={title} 
      titleClassName="text-blue-700"
      icon="dashboard"
      description={description}
      titleAs="h1"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <CriterionCard isComplete={criterios.cumpleHorasTotales}>
          <ProgressBar 
            label={`Horas Totales`}
            value={criterios.horasTotales}
            max={HORAS_OBJETIVO_TOTAL}
            unit="hs"
          />
        </CriterionCard>

        <CriterionCard isComplete={criterios.cumpleRotacion}>
           <RotationTracker
            label={`Rotación de Orientaciones`}
            count={criterios.orientacionesCursadasCount}
            total={ROTACION_OBJETIVO_ORIENTACIONES}
            orientacionesUnicas={criterios.orientacionesUnicas}
          />
        </CriterionCard>
        
        <CriterionCard 
            isComplete={criterios.cumpleHorasOrientacion} 
            controls={!selectedOrientacion ? orientacionControls : undefined}
        >
          {selectedOrientacion ? (
            <ProgressBar
              label={`Horas en ${selectedOrientacion}`}
              value={criterios.horasOrientacionElegida}
              max={HORAS_OBJETIVO_ORIENTACION}
              unit="hs"
            />
          ) : (
            <div className="flex flex-col gap-3 w-full">
                <div className="flex justify-between items-baseline">
                    <p className="text-slate-800 font-semibold text-sm leading-tight">
                    Completa {HORAS_OBJETIVO_ORIENTACION} hs en tu orientación
                    </p>
                </div>
                <div className="rounded-full h-3.5 bg-slate-200/70" />
                <div className="text-center mt-1">
                    <p className="text-slate-500 text-xs font-medium">
                    Selecciona una orientación para ver tu progreso.
                    </p>
                </div>
            </div>
          )}
        </CriterionCard>
      </div>


      {todosLosCriteriosCumplidos && (
        <div className="mt-8 border-t border-slate-200/80 pt-6 animate-fade-in-up">
          <div className="p-5 bg-blue-50/50 border border-blue-500/20 text-blue-900 rounded-xl shadow-sm flex items-start gap-4">
            <div className="flex-shrink-0 pt-1">
              <span className="material-icons text-blue-500 !text-3xl animate-pulse">celebration</span>
            </div>
            <div>
              <h3 className="font-bold text-lg">¡Felicitaciones! Has cumplido todos los criterios.</h3>
              <p className="mt-1 text-sm">
                Si aún no lo has hecho, puedes solicitar la acreditación de tus horas.
              </p>
              <a
                href="https://airtable.com/appBY8PYhPZ1X2ka1/paglLBxubDedzl1qz/form"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block bg-blue-500 text-white font-bold text-sm py-2.5 px-5 rounded-lg transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 focus:ring-offset-blue-50"
              >
                Solicitar Acreditación
              </a>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

export default CriteriosPanel;