import React, { useState, useEffect } from 'react';
import Checkbox from './Checkbox';

interface EnrollmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: {
    terminoDeCursar: boolean | null;
    cursandoElectivas: boolean | null;
    finalesAdeudados: string;
    otraSituacionAcademica: string;
    horarios: string[];
  }) => void;
  convocatoriaName: string;
  isSubmitting: boolean;
  horariosDisponibles?: string[];
}

const finalesOptions = [
  "Solo me queda las PPS para finalizar la carrera.",
  "1 Final",
  "2 Finales",
  "3 Finales",
  "4 Finales",
  "5 o mas finales",
];

const RadioButton = ({ id, name, value, checked, onChange, label, disabled }: any) => (
  <label htmlFor={id} className={`flex items-center p-3 border-2 rounded-lg cursor-pointer transition-all duration-200 ${checked ? 'bg-blue-50 border-blue-500 shadow-sm' : 'bg-white border-slate-300 hover:border-blue-400'} ${disabled ? 'cursor-not-allowed bg-slate-100 border-slate-200' : ''}`}>
    <input
      type="radio"
      id={id}
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="h-4 w-4 text-blue-600 border-slate-400 focus:ring-2 focus:ring-blue-500/50"
    />
    <span className={`ml-3 text-sm font-medium ${checked ? 'text-blue-900' : 'text-slate-700'} ${disabled ? 'text-slate-500' : ''}`}>{label}</span>
  </label>
);

const EnrollmentForm: React.FC<EnrollmentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  convocatoriaName,
  isSubmitting,
  horariosDisponibles = [],
}) => {
  const [terminoDeCursar, setTerminoDeCursar] = useState<boolean | null>(null);
  const [cursandoElectivas, setCursandoElectivas] = useState<boolean | null>(null);
  const [finalesAdeudados, setFinalesAdeudados] = useState('');
  const [otraSituacionAcademica, setOtraSituacionAcademica] = useState('');
  const [selectedHorarios, setSelectedHorarios] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const showHorarios = Array.isArray(horariosDisponibles) && horariosDisponibles.length > 1;

  useEffect(() => {
    if (isOpen) {
      // Reset form on open
      setTerminoDeCursar(null);
      setCursandoElectivas(null);
      setFinalesAdeudados('');
      setOtraSituacionAcademica('');
      setSelectedHorarios([]);
      setError(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (terminoDeCursar === true) {
      // If user HAS finished coursework, the electives question is irrelevant.
      setCursandoElectivas(null);
    } else if (terminoDeCursar === false) {
      // If user has NOT finished coursework, the finals question is hidden and its value should be cleared.
      setFinalesAdeudados('');
    }
  }, [terminoDeCursar]);

  const handleHorarioChange = (horario: string) => {
    setSelectedHorarios(prev =>
      prev.includes(horario)
        ? prev.filter(h => h !== horario)
        : [...prev, horario]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (showHorarios && selectedHorarios.length === 0) {
      setError('Por favor, selecciona al menos una opción de horario.');
      return;
    }
    if (terminoDeCursar === null) {
      setError('Por favor, indica si terminaste de cursar.');
      return;
    }
    if (terminoDeCursar === true && !finalesAdeudados) {
      setError('Por favor, indica cuántos finales adeudas.');
      return;
    }
    if (terminoDeCursar === false && cursandoElectivas === null) {
      setError('Por favor, indica si estás cursando materias electivas.');
      return;
    }
    if (!otraSituacionAcademica.trim()) {
      setError('Por favor, completa el campo de aclaraciones adicionales.');
      return;
    }
    
    setError(null);
    onSubmit({
      terminoDeCursar,
      cursandoElectivas,
      finalesAdeudados,
      otraSituacionAcademica,
      horarios: selectedHorarios,
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in-up"
      aria-labelledby="enrollment-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="bg-slate-50 rounded-xl shadow-2xl w-full max-w-2xl transform transition-all duration-300 scale-100 flex flex-col max-h-[90vh] animate-scale-in"
      >
        <div className="p-6 sm:p-8 flex-shrink-0 bg-white rounded-t-xl border-b border-slate-200">
          <div className="flex justify-between items-start">
            <div>
              <h2 id="enrollment-modal-title" className="text-xl sm:text-2xl font-bold text-blue-800">
                Formulario de Inscripción
              </h2>
              <p className="text-slate-600 text-sm mt-1">
                Estás postulándote a: <span className="font-semibold">{convocatoriaName}</span>
              </p>
            </div>
            <button type="button" onClick={onClose} disabled={isSubmitting} className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
              <span className="material-icons">close</span>
            </button>
          </div>
        </div>

        <div className="px-6 sm:px-8 py-6 overflow-y-auto flex-grow min-h-0">
          <div className="space-y-8">
            {/* Horarios Selection */}
            {showHorarios && (
              <fieldset>
                 <legend className="text-base font-semibold text-slate-900 leading-6 mb-4">Disponibilidad Horaria</legend>
                 <p className="text-sm text-slate-600 mb-4 -mt-3">La institución requiere que selecciones los horarios de tu preferencia.</p>
                 <div className="space-y-3">
                  {horariosDisponibles.map((horario) => (
                    <Checkbox
                      key={horario}
                      id={`horario-${horario.replace(/\s+/g, '-')}`}
                      name="horario"
                      checked={selectedHorarios.includes(horario)}
                      onChange={() => handleHorarioChange(horario)}
                      label={horario}
                      disabled={isSubmitting}
                    />
                  ))}
                </div>
              </fieldset>
            )}

            {/* Academic Status Question */}
            <fieldset>
              <legend className="text-base font-semibold text-slate-900 leading-6 mb-4">Situación Académica</legend>
              <div className="space-y-5">
                <div>
                  <h3 className="text-sm font-medium text-slate-800 mb-2">1. ¿Terminaste de cursar todas las materias de la carrera?</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RadioButton id="cursar-si" name="terminoCursar" value="si" checked={terminoDeCursar === true} onChange={() => setTerminoDeCursar(true)} label="Sí" disabled={isSubmitting} />
                    <RadioButton id="cursar-no" name="terminoCursar" value="no" checked={terminoDeCursar === false} onChange={() => setTerminoDeCursar(false)} label="No" disabled={isSubmitting} />
                  </div>
                </div>

                {terminoDeCursar !== null && (
                  <div className="animate-fade-in-up space-y-5 border-l-4 border-blue-200 pl-4 ml-1 pt-1">
                    {terminoDeCursar === false && (
                      <div>
                        <h3 className="text-sm font-medium text-slate-800 mb-2">2. ¿Estás cursando materias electivas?</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <RadioButton id="electivas-si" name="cursandoElectivas" value="si" checked={cursandoElectivas === true} onChange={() => setCursandoElectivas(true)} label="Sí" disabled={isSubmitting} />
                          <RadioButton id="electivas-no" name="cursandoElectivas" value="no" checked={cursandoElectivas === false} onChange={() => setCursandoElectivas(false)} label="No" disabled={isSubmitting} />
                        </div>
                      </div>
                    )}

                    {terminoDeCursar === true && (
                      <div>
                        <label htmlFor="finalesAdeudados" className="block text-sm font-medium text-slate-800 mb-2">2. ¿Cuántos finales adeudas?</label>
                        <select
                          id="finalesAdeudados"
                          value={finalesAdeudados}
                          onChange={(e) => setFinalesAdeudados(e.target.value)}
                          disabled={isSubmitting}
                          className="w-full rounded-lg border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                          required
                        >
                          <option value="" disabled>Seleccione una opción...</option>
                          {finalesOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </fieldset>

            <fieldset>
              <label htmlFor="otraSituacionAcademica" className="block text-base font-semibold text-slate-900 leading-6 mb-2">Aclaraciones Adicionales (Obligatorio)</label>
              <textarea
                id="otraSituacionAcademica"
                value={otraSituacionAcademica}
                onChange={(e) => setOtraSituacionAcademica(e.target.value)}
                rows={3}
                disabled={isSubmitting}
                className="w-full rounded-lg border border-slate-300 bg-white p-3 text-sm text-slate-800 shadow-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
                placeholder="Ej: Nombre de los finales adeudados, situación de regularidad, etc. Este campo es obligatorio."
                required
              ></textarea>
            </fieldset>
            
            {error && (
              <div className="flex items-start gap-3 bg-rose-50 border-l-4 border-rose-500 text-rose-800 p-4 rounded-md shadow-sm">
                  <span className="material-icons !text-xl flex-shrink-0 mt-0.5">error_outline</span>
                  <p className="text-sm font-semibold">{error}</p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/70 px-6 py-4 flex justify-end items-center gap-4 rounded-b-xl border-t border-slate-200 flex-shrink-0 backdrop-blur-sm">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-white hover:bg-slate-100 text-slate-700 font-bold py-2.5 px-6 rounded-lg text-sm border border-slate-300 transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-6 rounded-lg text-sm transition-colors shadow-md disabled:bg-slate-400 disabled:cursor-wait flex items-center justify-center min-w-[200px]"
          >
            {isSubmitting && <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>}
            <span>{isSubmitting ? 'Enviando...' : 'Confirmar Inscripción'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnrollmentForm;