import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  "5 o más finales",
];

const RadioButton: React.FC<{
  id: string; name: string; value: string; checked: boolean;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  label: string; disabled?: boolean; error?: boolean;
}> = ({ id, name, value, checked, onChange, label, disabled, error }) => (
  <label 
    htmlFor={id} 
    className={`flex items-center p-3.5 border rounded-lg cursor-pointer transition-all duration-200 group relative ${
      checked 
        ? 'bg-blue-50 border-blue-500 shadow-sm' 
        : 'bg-white border-slate-300/80 hover:border-blue-400'
    } ${
      disabled ? 'cursor-not-allowed opacity-60' : ''
    } ${
      error ? 'border-red-400 bg-red-50' : ''
    }`}
  >
    <div className="flex-shrink-0 h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all duration-200 "
      style={{ borderColor: checked ? 'var(--color-primary, #2563eb)' : '#94a3b8' }}
    >
        <div className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${checked ? 'scale-100' : 'scale-0'}`}
             style={{ backgroundColor: 'var(--color-primary, #2563eb)' }}
        />
    </div>
    <input
      type="radio"
      id={id}
      name={name}
      value={value}
      checked={checked}
      onChange={onChange}
      disabled={disabled}
      className="opacity-0 absolute"
    />
    <span className={`ml-3 text-sm font-medium transition-colors ${
      checked ? 'text-blue-900' : 'text-slate-700 group-hover:text-slate-900'
    } ${
      disabled ? 'text-slate-500' : ''
    }`}>
      {label}
    </span>
  </label>
);


const ProgressIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="mb-6 animate-fade-in-up">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="material-icons text-slate-600 !text-base">dynamic_form</span>
        <span className="text-sm font-medium text-slate-700">Progreso del formulario</span>
      </div>
      <span className="text-sm font-semibold text-slate-900 bg-slate-100 px-2 py-1 rounded-md">
        {currentStep}/{totalSteps}
      </span>
    </div>
    <div className="w-full bg-slate-200/70 rounded-full h-2.5 overflow-hidden">
      <div 
        className="bg-gradient-to-r from-sky-400 to-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
      ></div>
    </div>
  </div>
);

const ErrorMessage = ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => (
  <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg animate-fade-in-up">
    <div className="flex-shrink-0 mt-0.5">
      <span className="material-icons text-red-500 !text-base">error_outline</span>
    </div>
    <div className="flex-grow">
      <p className="text-sm font-medium">{message}</p>
    </div>
    {onDismiss && (
      <button
        onClick={onDismiss}
        className="flex-shrink-0 text-red-400 hover:text-red-600 transition-colors p-1 -m-1"
        aria-label="Cerrar mensaje de error"
      >
        <span className="material-icons !text-base">close</span>
      </button>
    )}
  </div>
);

const SuccessMessage = ({ message }: { message: string }) => (
  <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-lg animate-fade-in-up">
    <span className="material-icons text-emerald-600 !text-base">check_circle</span>
    <p className="text-sm font-medium">{message}</p>
  </div>
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
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  
  const formRef = useRef<HTMLFormElement>(null);

  const showHorarios = Array.isArray(horariosDisponibles) && horariosDisponibles.length > 1;

  // Simplified and more accurate progress calculation
  const getProgress = useCallback(() => {
    const total = (showHorarios ? 1 : 0) + 3; // Horarios + TerminoCursar + Conditional + OtraSituacion
    let completed = 0;

    if (showHorarios && selectedHorarios.length > 0) completed++;
    if (terminoDeCursar !== null) completed++;
    if ((terminoDeCursar === true && finalesAdeudados) || (terminoDeCursar === false && cursandoElectivas !== null)) completed++;
    if (otraSituacionAcademica.trim().length >= 10) completed++;

    return { current: completed, total };
  }, [terminoDeCursar, cursandoElectivas, finalesAdeudados, otraSituacionAcademica, selectedHorarios, showHorarios]);

  // Enhanced validation
  const validateField = useCallback((field: string): string => {
    switch (field) {
      case 'horarios':
        return showHorarios && selectedHorarios.length === 0 
          ? 'Por favor, selecciona al menos una opción de horario.' 
          : '';
      case 'terminoDeCursar':
        return terminoDeCursar === null 
          ? 'Por favor, indica si terminaste de cursar.' 
          : '';
      case 'finalesAdeudados':
        return terminoDeCursar === true && !finalesAdeudados 
          ? 'Por favor, indica cuántos finales adeudas.' 
          : '';
      case 'cursandoElectivas':
        return terminoDeCursar === false && cursandoElectivas === null 
          ? 'Por favor, indica si estás cursando materias electivas.' 
          : '';
      case 'otraSituacionAcademica':
        if (!otraSituacionAcademica.trim()) {
          return 'Por favor, completa el campo de aclaraciones adicionales.';
        }
        if (otraSituacionAcademica.trim().length < 10) {
          return 'Las aclaraciones deben tener al menos 10 caracteres.';
        }
        return '';
      default:
        return '';
    }
  }, [terminoDeCursar, cursandoElectivas, finalesAdeudados, otraSituacionAcademica, selectedHorarios.length, showHorarios]);

  // Real-time validation, fixed to only store actual errors
  useEffect(() => {
    const newErrors: Record<string, string> = {};
    const checkAndSetError = (field: string) => {
      if (touched[field]) {
        const error = validateField(field);
        if (error) { // Only add if there's an actual error message
          newErrors[field] = error;
        }
      }
    };
    
    ['horarios', 'terminoDeCursar', 'finalesAdeudados', 'cursandoElectivas', 'otraSituacionAcademica'].forEach(checkAndSetError);
    
    setErrors(newErrors);
  }, [terminoDeCursar, cursandoElectivas, finalesAdeudados, otraSituacionAcademica, selectedHorarios, touched, validateField]);

  // Reset form when opened
  useEffect(() => {
    if (isOpen) {
      setTerminoDeCursar(null);
      setCursandoElectivas(null);
      setFinalesAdeudados('');
      setOtraSituacionAcademica('');
      setSelectedHorarios([]);
      setErrors({});
      setTouched({});
    }
  }, [isOpen]);

  // Handle dependent field logic
  useEffect(() => {
    if (terminoDeCursar === true) {
      setCursandoElectivas(null);
      setTouched(prev => ({ ...prev, cursandoElectivas: false }));
    } else if (terminoDeCursar === false) {
      setFinalesAdeudados('');
      setTouched(prev => ({ ...prev, finalesAdeudados: false }));
    }
  }, [terminoDeCursar]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, isSubmitting, onClose]);

  const handleHorarioChange = (horario: string) => {
    setSelectedHorarios(prev =>
      prev.includes(horario)
        ? prev.filter(h => h !== horario)
        : [...prev, horario]
    );
    setTouched(prev => ({ ...prev, horarios: true }));
  };

  const handleFieldBlur = (field: string) => {
    setTouched(prev => ({ ...prev, [field]: true }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Mark all potentially required fields as touched to show errors
    const allFields = ['horarios', 'terminoDeCursar', 'finalesAdeudados', 'cursandoElectivas', 'otraSituacionAcademica'];
    setTouched(Object.fromEntries(allFields.map(field => [field, true])));

    // Validate all fields
    const newErrors: Record<string, string> = {};
    allFields.forEach(field => {
      const error = validateField(field);
      if (error) newErrors[field] = error;
    });
    
    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Focus first error
      setTimeout(() => {
        const firstErrorField = formRef.current?.querySelector('[aria-invalid="true"], .border-red-400') as HTMLElement;
        firstErrorField?.focus();
      }, 100);
      return;
    }
    
    try {
      await onSubmit({
        terminoDeCursar,
        cursandoElectivas,
        finalesAdeudados,
        otraSituacionAcademica,
        horarios: selectedHorarios,
      });
    } catch (error) {
      setErrors({ submit: 'Hubo un error al enviar el formulario. Por favor, intenta nuevamente.' });
    }
  };

  const progress = getProgress();
  const isFormValid = Object.keys(errors).length === 0 && progress.current === progress.total;

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in-up"
      aria-labelledby="enrollment-modal-title"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        noValidate
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-lg w-full max-w-2xl transform transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/70"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 flex-shrink-0 bg-white">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-100 text-blue-600">
              <span className="material-icons !text-xl">assignment</span>
            </div>
            <div className="flex-1">
              <h2 id="enrollment-modal-title" className="text-2xl font-bold text-slate-800 tracking-tight">
                Formulario de Inscripción
              </h2>
              <p className="text-slate-600 text-sm mt-1 leading-relaxed">
                Convocatoria: <span className="font-semibold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">{convocatoriaName}</span>
              </p>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting} 
              className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all duration-200 disabled:opacity-50"
              aria-label="Cerrar formulario"
            >
              <span className="material-icons !text-xl">close</span>
            </button>
          </div>
          <ProgressIndicator currentStep={progress.current} totalSteps={progress.total} />
        </div>

        {/* Content */}
        <div className="px-6 sm:px-8 py-6 overflow-y-auto flex-grow min-h-0 bg-slate-50/30">
          <div className="space-y-8">
            {/* Success Message */}
            {isFormValid && (
              <SuccessMessage message="Formulario completado correctamente. Puedes proceder con la inscripción." />
            )}

            {/* Submit Error */}
            {errors.submit && (
              <ErrorMessage 
                message={errors.submit} 
                onDismiss={() => setErrors(prev => ({ ...prev, submit: '' }))} 
              />
            )}

            {/* Horarios Selection */}
            {showHorarios && (
              <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300/80">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-icons text-blue-500 !text-xl">schedule</span>
                  <h3 className="text-slate-800 font-semibold text-base leading-tight">
                    Disponibilidad Horaria
                  </h3>
                </div>
                <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                  Selecciona los horarios en los que puedes participar. Puedes elegir múltiples opciones.
                </p>
                <div className="space-y-3" role="group" aria-labelledby="horarios-group">
                  {horariosDisponibles.map((horario) => (
                    <Checkbox
                      key={horario}
                      id={`horario-${horario.replace(/\s+/g, '-')}`}
                      name="horario"
                      checked={selectedHorarios.includes(horario)}
                      onChange={(e) => handleHorarioChange(horario)}
                      onBlur={(e) => handleFieldBlur('horarios')}
                      label={horario}
                      disabled={isSubmitting}
                      error={touched.horarios && !!errors.horarios}
                    />
                  ))}
                </div>
                {touched.horarios && errors.horarios && (
                  <p className="mt-3 text-sm text-red-600 font-medium" role="alert">
                    {errors.horarios}
                  </p>
                )}
              </div>
            )}

            {/* Academic Status */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300/80">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-icons text-blue-500 !text-xl">school</span>
                <h3 className="text-slate-800 font-semibold text-base leading-tight">
                  Situación Académica
                </h3>
              </div>
              <p className="text-sm text-slate-600 mb-6 leading-relaxed">
                Información sobre tu estado actual en la carrera.
              </p>
              
              <div className="space-y-6">
                {/* Question 1 */}
                <div>
                  <h4 className="text-sm font-medium text-slate-800 mb-4">
                    ¿Terminaste de cursar todas las materias de la carrera?
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
                    <RadioButton 
                      id="cursar-si" 
                      name="terminoCursar" 
                      value="si" 
                      checked={terminoDeCursar === true} 
                      onChange={() => {
                        setTerminoDeCursar(true);
                        handleFieldBlur('terminoDeCursar');
                      }}
                      label="Sí, terminé de cursar" 
                      disabled={isSubmitting}
                      error={touched.terminoDeCursar && !!errors.terminoDeCursar}
                    />
                    <RadioButton 
                      id="cursar-no" 
                      name="terminoCursar" 
                      value="no" 
                      checked={terminoDeCursar === false} 
                      onChange={() => {
                        setTerminoDeCursar(false);
                        handleFieldBlur('terminoDeCursar');
                      }}
                      label="No, aún estoy cursando" 
                      disabled={isSubmitting}
                      error={touched.terminoDeCursar && !!errors.terminoDeCursar}
                    />
                  </div>
                  {touched.terminoDeCursar && errors.terminoDeCursar && (
                    <p className="mt-3 text-sm text-red-600 font-medium" role="alert">
                      {errors.terminoDeCursar}
                    </p>
                  )}
                </div>

                {/* Conditional Questions */}
                {terminoDeCursar !== null && (
                  <div className="space-y-6 pl-4 border-l-2 border-slate-200/70 animate-fade-in-up">
                    {terminoDeCursar === false && (
                      <div>
                        <h4 className="text-sm font-medium text-slate-800 mb-4">
                          ¿Estás cursando materias electivas?
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" role="radiogroup">
                          <RadioButton 
                            id="electivas-si" 
                            name="cursandoElectivas" 
                            value="si" 
                            checked={cursandoElectivas === true} 
                            onChange={() => {
                              setCursandoElectivas(true);
                              handleFieldBlur('cursandoElectivas');
                            }}
                            label="Sí" 
                            disabled={isSubmitting}
                            error={touched.cursandoElectivas && !!errors.cursandoElectivas}
                          />
                          <RadioButton 
                            id="electivas-no" 
                            name="cursandoElectivas" 
                            value="no" 
                            checked={cursandoElectivas === false} 
                            onChange={() => {
                              setCursandoElectivas(false);
                              handleFieldBlur('cursandoElectivas');
                            }}
                            label="No" 
                            disabled={isSubmitting}
                            error={touched.cursandoElectivas && !!errors.cursandoElectivas}
                          />
                        </div>
                        {touched.cursandoElectivas && errors.cursandoElectivas && (
                          <p className="mt-3 text-sm text-red-600 font-medium" role="alert">
                            {errors.cursandoElectivas}
                          </p>
                        )}
                      </div>
                    )}

                    {terminoDeCursar === true && (
                      <div className="relative">
                        <label htmlFor="finalesAdeudados" className="block text-sm font-medium text-slate-800 mb-4">
                          ¿Cuántos finales adeudas?
                        </label>
                        <select
                          id="finalesAdeudados"
                          value={finalesAdeudados}
                          onChange={(e) => setFinalesAdeudados(e.target.value)}
                          onBlur={() => handleFieldBlur('finalesAdeudados')}
                          disabled={isSubmitting}
                          className={`appearance-none w-full rounded-lg border bg-white p-3 pr-10 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 ${
                            touched.finalesAdeudados && errors.finalesAdeudados
                              ? 'border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/20'
                              : 'border-slate-300/80 hover:border-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20'
                          }`}
                          aria-invalid={touched.finalesAdeudados && !!errors.finalesAdeudados}
                          required
                        >
                          <option value="" disabled>Seleccione una opción...</option>
                          {finalesOptions.map(option => (
                            <option key={option} value={option}>{option}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 top-8">
                          <span className="material-icons !text-base text-slate-400">expand_more</span>
                        </div>
                        {touched.finalesAdeudados && errors.finalesAdeudados && (
                          <p className="mt-3 text-sm text-red-600 font-medium" role="alert">
                            {errors.finalesAdeudados}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Additional Information */}
            <div className="bg-white p-6 rounded-2xl border border-slate-200/70 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300/80">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-icons text-blue-500 !text-xl">note_add</span>
                <h3 className="text-slate-800 font-semibold text-base leading-tight">
                  Aclaraciones Adicionales
                </h3>
              </div>
              <p className="text-sm text-slate-600 mb-4 leading-relaxed">
                Proporciona información adicional relevante para tu inscripción (mínimo 10 caracteres).
              </p>
              <div className="relative">
                <textarea
                  id="otraSituacionAcademica"
                  value={otraSituacionAcademica}
                  onChange={(e) => setOtraSituacionAcademica(e.target.value)}
                  onBlur={() => handleFieldBlur('otraSituacionAcademica')}
                  rows={4}
                  disabled={isSubmitting}
                  maxLength={500}
                  className={`w-full rounded-lg border bg-white p-4 text-sm text-slate-800 shadow-sm transition-all focus:ring-2 focus:ring-offset-1 resize-none outline-none ${
                    touched.otraSituacionAcademica && errors.otraSituacionAcademica
                      ? 'border-red-400 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-300/80 hover:border-slate-400 focus:border-blue-500 focus:ring-blue-500/20'
                  }`}
                  placeholder="Ej: Nombres de los finales adeudados, situación de regularidad, materias que estás cursando actualmente, etc."
                  aria-invalid={touched.otraSituacionAcademica && !!errors.otraSituacionAcademica}
                  required
                ></textarea>
                <div className="absolute bottom-3 right-3 text-xs text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {otraSituacionAcademica.length}/500
                </div>
              </div>
              {touched.otraSituacionAcademica && errors.otraSituacionAcademica && (
                <p className="mt-3 text-sm text-red-600 font-medium" role="alert">
                  {errors.otraSituacionAcademica}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-white px-6 py-4 flex justify-end items-center gap-3 border-t border-slate-200/70 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="bg-white hover:bg-slate-50 text-slate-700 font-medium py-2.5 px-5 rounded-lg text-sm border border-slate-300/80 hover:border-slate-400 transition-all duration-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !isFormValid}
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-6 rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md disabled:bg-slate-400 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center min-w-[180px] gap-2"
          >
            {isSubmitting && (
              <div className="border-2 border-white/30 border-t-white rounded-full w-4 h-4 animate-spin"></div>
            )}
            <span>{isSubmitting ? 'Enviando...' : 'Confirmar Inscripción'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default EnrollmentForm;