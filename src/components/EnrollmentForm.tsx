import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import Checkbox from './Checkbox';
import { z } from 'zod';
import Input from './Input';

interface EnrollmentFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (formData: any) => void;
  convocatoriaName: string;
  isSubmitting: boolean;
  horariosDisponibles?: string[];
  permiteCertificado?: boolean;
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
  label: string; disabled?: boolean; error?: boolean; 'aria-describedby'?: string;
}> = ({ id, name, value, checked, onChange, label, disabled, error, 'aria-describedby': ariaDescribedby }) => (
  <label 
    htmlFor={id} 
    className={`flex items-center p-3.5 border rounded-lg cursor-pointer transition-all duration-200 group relative ${
      checked 
        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500 dark:border-blue-600 shadow-sm' 
        : 'bg-white dark:bg-slate-700 border-slate-300/80 dark:border-slate-600 hover:border-blue-400 dark:hover:border-blue-500'
    } ${
      disabled ? 'cursor-not-allowed opacity-60' : ''
    } ${
      error ? 'border-red-400 bg-red-50 dark:bg-red-900/20' : ''
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
      aria-invalid={error}
      aria-describedby={ariaDescribedby}
      className="opacity-0 absolute"
    />
    <span className={`ml-3 text-sm font-medium transition-colors ${
      checked ? 'text-blue-900 dark:text-blue-100' : 'text-slate-700 dark:text-slate-200 group-hover:text-slate-900 dark:group-hover:text-white'
    } ${
      disabled ? 'text-slate-500 dark:text-slate-400' : ''
    }`}>
      {label}
    </span>
  </label>
);


const ProgressIndicator = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => (
  <div className="mb-6 animate-fade-in-up">
    <div className="flex items-center justify-between mb-2">
      <div className="flex items-center gap-2">
        <span className="material-icons text-slate-600 dark:text-slate-400 !text-base">dynamic_form</span>
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Progreso del formulario</span>
      </div>
      <span className="text-sm font-semibold text-slate-900 dark:text-slate-50 bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded-md">
        {currentStep}/{totalSteps}
      </span>
    </div>
    <div className="w-full bg-slate-200/70 dark:bg-slate-700 rounded-full h-2.5 overflow-hidden">
      <div 
        className="bg-gradient-to-r from-sky-400 to-blue-500 h-2.5 rounded-full transition-all duration-500 ease-out"
        style={{ width: `${(currentStep / totalSteps) * 100}%` }}
      ></div>
    </div>
  </div>
);

const ErrorMessage = ({ message, onDismiss }: { message: string; onDismiss?: () => void }) => (
  <div className="flex items-start gap-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-500/30 text-red-800 dark:text-red-200 p-4 rounded-lg animate-fade-in-up">
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

type FormData = {
    terminoDeCursar: boolean | null;
    cursandoElectivas: boolean | null;
    finalesAdeudados: string;
    otraSituacionAcademica: string;
    horarios: string[];
    certificadoLink?: string;
};


const initialFormData: FormData = {
    terminoDeCursar: null,
    cursandoElectivas: null,
    finalesAdeudados: '',
    otraSituacionAcademica: '',
    horarios: [],
    certificadoLink: '',
};

export const EnrollmentForm: React.FC<EnrollmentFormProps> = ({
  isOpen,
  onClose,
  onSubmit,
  convocatoriaName,
  isSubmitting,
  horariosDisponibles = [],
  permiteCertificado = false,
}) => {
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData | 'submit', string>>>({});
  
  const formRef = useRef<HTMLFormElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  const showHorariosSection = Array.isArray(horariosDisponibles) && horariosDisponibles.length > 0;
  const hasMultipleHorarios = Array.isArray(horariosDisponibles) && horariosDisponibles.length > 1;
  
  const finalSchema = useMemo(() => {
    return z.object({
        terminoDeCursar: z.boolean().nullable(),
        cursandoElectivas: z.boolean().nullable(),
        finalesAdeudados: z.string(),
        otraSituacionAcademica: z.string(),
        horarios: z.array(z.string()),
        certificadoLink: z.string().url({ message: "Por favor, ingresa una URL válida." }).optional().or(z.literal('')),
    }).superRefine((data, ctx) => {
        // Validation for terminoDeCursar
        if (data.terminoDeCursar === null) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['terminoDeCursar'], message: 'Por favor, indica si terminaste de cursar.' });
        } else if (data.terminoDeCursar === true) {
            if (data.finalesAdeudados === '') {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['finalesAdeudados'], message: 'Por favor, indica cuántos finales adeudas.' });
            }
        } else if (data.terminoDeCursar === false) {
            if (data.cursandoElectivas === null) {
                ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['cursandoElectivas'], message: 'Por favor, indica si estás cursando materias electivas.' });
            }
        }

        // Validation for otraSituacionAcademica
        if (data.otraSituacionAcademica.trim().length < 10) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['otraSituacionAcademica'], message: 'Las aclaraciones deben tener al menos 10 caracteres.' });
        }

        // Conditional validation for horarios
        if (showHorariosSection && hasMultipleHorarios && data.horarios.length === 0) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['horarios'], message: 'Por favor, selecciona al menos una opción de horario.' });
        }
    });
  }, [showHorariosSection, hasMultipleHorarios]);

  const getProgress = useCallback(() => {
    let completed = 0;
    let total = 2; // terminoDeCursar, otraSituacionAcademica

    if (showHorariosSection && hasMultipleHorarios) total++;
    if (formData.terminoDeCursar !== null) total++;

    if (showHorariosSection && hasMultipleHorarios && formData.horarios.length > 0) completed++;
    if (formData.terminoDeCursar !== null) completed++;
    if (formData.otraSituacionAcademica.trim().length >= 10) completed++;
    if (formData.terminoDeCursar === true && formData.finalesAdeudados) completed++;
    if (formData.terminoDeCursar === false && formData.cursandoElectivas !== null) completed++;

    // Ensure completed does not exceed total
    return { current: Math.min(completed, total), total };
  }, [formData, showHorariosSection, hasMultipleHorarios]);
  
  useEffect(() => {
    if (isOpen) {
      const initialHorarios = (horariosDisponibles && horariosDisponibles.length === 1) ? [horariosDisponibles[0]] : [];
      setFormData({ ...initialFormData, horarios: initialHorarios });
      setErrors({});
    }
  }, [isOpen, horariosDisponibles]);

  useEffect(() => {
    if (!isOpen || !modalRef.current) return;
    const modalNode = modalRef.current;
    const focusableElements = modalNode.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    firstElement?.focus();
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) onClose();
      if (e.key === 'Tab') {
        if (e.shiftKey) { 
          if (document.activeElement === firstElement) { lastElement.focus(); e.preventDefault(); }
        } else { 
          if (document.activeElement === lastElement) { firstElement.focus(); e.preventDefault(); }
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  const handleHorarioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { value, checked } = e.target;
    setFormData(prev => ({
        ...prev,
        horarios: checked ? [...prev.horarios, value] : prev.horarios.filter(h => h !== value)
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const { name, value } = e.target;
      setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    
    const result = finalSchema.safeParse(formData);

    if (!result.success) {
      const fieldErrors = result.error.flatten().fieldErrors;
      const newErrors: Partial<Record<keyof FormData, string>> = {};
      for (const key in fieldErrors) {
        newErrors[key as keyof FormData] = (fieldErrors as any)[key]?.[0];
      }
      setErrors(newErrors);
      
      setTimeout(() => {
        const firstErrorField = formRef.current?.querySelector('[aria-invalid="true"], .border-red-400') as HTMLElement;
        firstErrorField?.focus();
      }, 100);
      return;
    }
    
    try {
      await onSubmit(result.data as any);
    } catch (error) {
      setErrors({ submit: 'Hubo un error al enviar el formulario. Por favor, intenta nuevamente.' });
    }
  };

  const progress = getProgress();

  if (!isOpen) return null;

  return (
    <div
      ref={modalRef}
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
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg w-full max-w-2xl transform transition-all duration-300 flex flex-col max-h-[90vh] overflow-hidden border border-slate-200/70 dark:border-slate-700/80"
      >
        {/* Header */}
        <div className="p-6 sm:p-8 flex-shrink-0 bg-white dark:bg-slate-800">
          <div className="flex items-start gap-3 mb-6">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-300">
              <span className="material-icons !text-xl">assignment</span>
            </div>
            <div className="flex-1">
              <h2 id="enrollment-modal-title" className="text-2xl font-bold text-slate-800 dark:text-slate-50 tracking-tight">
                Formulario de Inscripción
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mt-1 leading-relaxed">
                Convocatoria: <span className="font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{convocatoriaName}</span>
              </p>
            </div>
            <button 
              type="button" 
              onClick={onClose} 
              disabled={isSubmitting} 
              className="p-2 rounded-lg text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-700 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200 disabled:opacity-50"
              aria-label="Cerrar formulario"
            >
              <span className="material-icons !text-xl">close</span>
            </button>
          </div>
          <ProgressIndicator currentStep={progress.current} totalSteps={progress.total} />
        </div>

        {/* Content */}
        <div className="px-6 sm:px-8 py-6 overflow-y-auto flex-grow min-h-0 bg-slate-50/30 dark:bg-slate-900/40">
          <div className="space-y-8">
             {errors.submit && (
              <ErrorMessage 
                message={errors.submit} 
                onDismiss={() => setErrors(prev => ({ ...prev, submit: undefined }))} 
              />
            )}

            <div className="flex items-start gap-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-500/30 text-yellow-800 dark:text-yellow-200 p-4 rounded-lg">
                <div className="flex-shrink-0 mt-0.5">
                    <span className="material-icons text-yellow-600 dark:text-yellow-400 !text-xl">warning_amber</span>
                </div>
                <div className="flex-grow">
                    <h4 className="font-bold text-sm">Compromiso y Responsabilidad</h4>
                    <p className="text-xs mt-1 leading-relaxed">
                        Al inscribirte, asumes un compromiso con la institución y la facultad. Darse de baja sobre la fecha, ausentarse sin aviso o cualquier otra decisión que demuestre falta de responsabilidad, será tenido en cuenta en futuras convocatorias.
                    </p>
                </div>
            </div>

            {showHorariosSection && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300/80 dark:hover:border-slate-600">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-icons text-blue-500 !text-xl">schedule</span>
                  <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-base leading-tight">
                    Disponibilidad Horaria
                  </h3>
                </div>
                
                {hasMultipleHorarios ? (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                      Selecciona los horarios en los que puedes participar. Puedes elegir múltiples opciones.
                    </p>
                    <div role="group" aria-labelledby="horarios-group" aria-describedby={errors.horarios ? "horarios-error" : undefined}>
                      <div className="space-y-3">
                        {horariosDisponibles.map((horario) => (
                          <Checkbox
                            key={horario}
                            id={`horario-${horario.replace(/\s+/g, '-')}`}
                            name="horario"
                            value={horario}
                            checked={formData.horarios.includes(horario)}
                            onChange={handleHorarioChange}
                            label={horario}
                            disabled={isSubmitting}
                            error={!!errors.horarios}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                      El horario para esta convocatoria es el siguiente:
                    </p>
                    <div className="p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-sm text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-600/50">
                      <p className="font-bold">{horariosDisponibles[0]}</p>
                    </div>
                  </>
                )}
                {errors.horarios && (
                  <p id="horarios-error" className="mt-3 text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
                    {errors.horarios}
                  </p>
                )}
              </div>
            )}
            
            {permiteCertificado && (
              <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-sm">
                <div className="flex items-center gap-2 mb-3">
                  <span className="material-icons text-blue-500 !text-xl">work</span>
                  <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-base leading-tight">
                    Certificado de Trabajo (Opcional)
                  </h3>
                </div>
                 <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                    Si trabajas en un horario que podría superponerse, pega aquí un enlace a tu certificado de trabajo (ej. desde Google Drive, Dropbox). Asegúrate de que el enlace sea público.
                </p>
                <Input
                  id="certificadoLink"
                  name="certificadoLink"
                  type="url"
                  placeholder="https://..."
                  icon="link"
                  value={formData.certificadoLink || ''}
                  onChange={handleChange}
                  disabled={isSubmitting}
                  aria-invalid={!!errors.certificadoLink}
                  aria-describedby={errors.certificadoLink ? "certificado-error" : undefined}
                />
                {errors.certificadoLink && (
                  <p id="certificado-error" className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
                    {errors.certificadoLink}
                  </p>
                )}
              </div>
            )}

            {/* Academic Status */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300/80 dark:hover:border-slate-600">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-icons text-blue-500 !text-xl">school</span>
                <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-base leading-tight">
                  Situación Académica
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
                Información sobre tu estado actual en la carrera.
              </p>
              
              <div className="space-y-6">
                {/* Question 1 */}
                <div>
                  <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4">
                    ¿Terminaste de cursar todas las materias de la carrera?
                  </h4>
                  <div role="radiogroup" aria-describedby={errors.terminoDeCursar ? "termino-cursar-error" : undefined} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <RadioButton 
                      id="cursar-si" name="terminoDeCursar" value="true" checked={formData.terminoDeCursar === true}
                      onChange={() => setFormData(prev => ({ ...prev, terminoDeCursar: true, cursandoElectivas: null }))}
                      label="Sí" disabled={isSubmitting} error={!!errors.terminoDeCursar}
                    />
                    <RadioButton 
                      id="cursar-no" name="terminoDeCursar" value="false" checked={formData.terminoDeCursar === false}
                      onChange={() => setFormData(prev => ({ ...prev, terminoDeCursar: false, finalesAdeudados: '' }))}
                      label="No, todavía tengo materias pendientes" disabled={isSubmitting} error={!!errors.terminoDeCursar}
                    />
                  </div>
                  {errors.terminoDeCursar && (
                    <p id="termino-cursar-error" className="mt-3 text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
                      {errors.terminoDeCursar}
                    </p>
                  )}
                </div>

                {/* Question 2 (Conditional) */}
                {formData.terminoDeCursar === true && (
                  <div className="animate-fade-in-up">
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4">
                      ¿Cuántos finales adeudas?
                    </h4>
                    <div role="radiogroup" aria-describedby={errors.finalesAdeudados ? "finales-error" : undefined} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {finalesOptions.map(option => (
                        <RadioButton
                          key={option} id={`finales-${option.replace(/\s+/g, '-')}`} name="finalesAdeudados"
                          value={option} checked={formData.finalesAdeudados === option}
                          onChange={(e) => setFormData(prev => ({ ...prev, finalesAdeudados: e.target.value }))}
                          label={option} disabled={isSubmitting} error={!!errors.finalesAdeudados}
                        />
                      ))}
                    </div>
                    {errors.finalesAdeudados && (
                      <p id="finales-error" className="mt-3 text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
                        {errors.finalesAdeudados}
                      </p>
                    )}
                  </div>
                )}
                
                {formData.terminoDeCursar === false && (
                  <div className="animate-fade-in-up">
                    <h4 className="text-sm font-medium text-slate-800 dark:text-slate-200 mb-4">
                      ¿Estás cursando actualmente materias electivas?
                    </h4>
                    <div role="radiogroup" aria-describedby={errors.cursandoElectivas ? "electivas-error" : undefined} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <RadioButton 
                        id="electivas-si" name="cursandoElectivas" value="true" checked={formData.cursandoElectivas === true}
                        onChange={() => setFormData(prev => ({ ...prev, cursandoElectivas: true }))}
                        label="Sí" disabled={isSubmitting} error={!!errors.cursandoElectivas}
                      />
                      <RadioButton 
                        id="electivas-no" name="cursandoElectivas" value="false" checked={formData.cursandoElectivas === false}
                        onChange={() => setFormData(prev => ({ ...prev, cursandoElectivas: false }))}
                        label="No" disabled={isSubmitting} error={!!errors.cursandoElectivas}
                      />
                    </div>
                    {errors.cursandoElectivas && (
                      <p id="electivas-error" className="mt-3 text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
                        {errors.cursandoElectivas}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Other Academic Situation */}
            <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/70 dark:border-slate-700 shadow-sm transition-all duration-300 hover:shadow-lg hover:border-slate-300/80 dark:hover:border-slate-600">
              <div className="flex items-center gap-2 mb-3">
                <span className="material-icons text-blue-500 !text-xl">edit_note</span>
                <h3 className="text-slate-800 dark:text-slate-100 font-semibold text-base leading-tight">
                  Aclaraciones Adicionales
                </h3>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 leading-relaxed">
                Utiliza este espacio para cualquier otra aclaración sobre tu situación académica (ej: "Cursando el TIF", "Realizando la Práctica Clínica de Adultos", etc.). Mínimo 10 caracteres.
              </p>
              <textarea
                id="otraSituacionAcademica"
                name="otraSituacionAcademica"
                rows={3}
                value={formData.otraSituacionAcademica}
                onChange={handleChange}
                disabled={isSubmitting}
                className={`w-full text-sm rounded-lg border p-3 bg-white/50 dark:bg-slate-700/50 shadow-sm outline-none transition-all duration-200 ${
                  errors.otraSituacionAcademica 
                    ? 'border-red-400 dark:border-red-500/80 focus:border-red-500 focus:ring-red-500/20' 
                    : 'border-slate-300/80 dark:border-slate-600 focus:border-blue-500 focus:ring-blue-500/20 dark:focus:border-blue-500 dark:focus:ring-blue-500/30 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
                aria-invalid={!!errors.otraSituacionAcademica}
                aria-describedby={errors.otraSituacionAcademica ? "otra-situacion-error" : undefined}
              />
              {errors.otraSituacionAcademica && (
                <p id="otra-situacion-error" className="mt-2 text-sm text-red-600 dark:text-red-400 font-medium" role="alert">
                  {errors.otraSituacionAcademica}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 flex-shrink-0 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm border-t border-slate-200/60 dark:border-slate-700/60">
          <div className="flex flex-col sm:flex-row justify-end items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 border border-slate-300 dark:border-slate-600 rounded-lg shadow-sm hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full sm:w-auto px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 focus:ring-blue-500 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="border-2 border-white/50 border-t-white rounded-full w-4 h-4 animate-spin"></div>
                  <span>Enviando...</span>
                </>
              ) : (
                <>
                  <span className="material-icons !text-base">send</span>
                  <span>Inscribirme</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};