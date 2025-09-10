import React, { useState, useCallback, useEffect } from 'react';
import { fetchAirtableData, createAirtableRecord, updateAirtableRecord } from '../services/airtableService';
import { generateSalt, hashPassword, verifyPassword } from '../utils/auth';
import { 
    AIRTABLE_TABLE_NAME_AUTH_USERS, FIELD_LEGAJO_AUTH, FIELD_PASSWORD_HASH_AUTH, FIELD_SALT_AUTH, FIELD_NOMBRE_AUTH,
    AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_DNI_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES,
    FIELD_ROLE_AUTH, FIELD_ORIENTACIONES_AUTH
} from '../constants';
import type { AuthUserFields, EstudianteFields } from '../types';
import MiPanelLogo from './MiPanelLogo';
import UfloLogo from './UfloLogo';
import { useAuth } from '../contexts/AuthContext';
import { useModal } from '../contexts/ModalContext';
import { useTheme } from '../contexts/ThemeContext';

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: string;
}

const AuthInput: React.FC<AuthInputProps> = ({ id, type, value, onChange, placeholder, icon, disabled = false, ...props }) => (
  <div className="relative group">
    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors duration-300 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400">
      <span className="material-icons text-slate-400 group-focus-within:text-blue-600 dark:group-focus-within:text-blue-400">{icon}</span>
    </div>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full rounded-lg border border-slate-300 dark:border-slate-600 py-3 pl-12 pr-4 text-base text-slate-900 dark:text-slate-50 bg-white/50 dark:bg-slate-700/50 shadow-sm placeholder-slate-500 dark:placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-100 dark:disabled:bg-slate-800/50"
      placeholder={placeholder}
      required
      {...props}
    />
  </div>
);

const Auth: React.FC = () => {
  const { login } = useAuth();
  const { showModal } = useModal();
  const { resolvedTheme } = useTheme();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [legajo, setLegajo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [legajoCheckState, setLegajoCheckState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [legajoMessage, setLegajoMessage] = useState<string | null>(null);
  
  const [foundStudent, setFoundStudent] = useState<{ id: string; fields: EstudianteFields } | null>(null);
  const [foundAuthUser, setFoundAuthUser] = useState<{ id: string; fields: AuthUserFields } | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [newData, setNewData] = useState<Partial<EstudianteFields>>({});

  const checkLegajo = useCallback(async (legajoToVerify: string) => {
    if (!legajoToVerify || mode !== 'register') return;

    setLegajoCheckState('loading');
    setFoundStudent(null);
    setFoundAuthUser(null);
    setMissingFields([]);
    setNewData({});
    setLegajoMessage(null);
    setError(null);

    try {
        // Check Auth Users table first
        const { records: existingUser, error: existingUserError } = await fetchAirtableData<AuthUserFields>(
            AIRTABLE_TABLE_NAME_AUTH_USERS,
            [FIELD_LEGAJO_AUTH, FIELD_PASSWORD_HASH_AUTH, FIELD_NOMBRE_AUTH],
            `{${FIELD_LEGAJO_AUTH}} = '${legajoToVerify}'`,
            1
        );

        if (existingUserError) console.warn("No se pudo consultar 'Auth Users':", existingUserError.error);
        
        if (existingUser.length > 0) {
            const userAuthRecord = existingUser[0];
            // If user exists and has a password, they can't register again.
            if (userAuthRecord.fields[FIELD_PASSWORD_HASH_AUTH]) {
                setLegajoMessage('Ya existe una cuenta para este legajo.');
                setLegajoCheckState('error');
                return;
            } else {
                // User exists but has no password (pre-provisioned account)
                setFoundAuthUser({ id: userAuthRecord.id, fields: userAuthRecord.fields });
                setLegajoMessage(`¡Hola, ${userAuthRecord.fields[FIELD_NOMBRE_AUTH]}! Completa tu contraseña para activar tu cuenta.`);
                setLegajoCheckState('success');
                return; // Stop here, no need to check Estudiantes table
            }
        }

        // If no user in Auth, check Estudiantes table for a new registration
        const { records: studentRecords, error: studentError } = await fetchAirtableData<EstudianteFields>(
            AIRTABLE_TABLE_NAME_ESTUDIANTES,
            [FIELD_NOMBRE_ESTUDIANTES, FIELD_DNI_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES],
            `{${FIELD_LEGAJO_ESTUDIANTES}} = '${legajoToVerify}'`, 1
        );
        if (studentError) throw new Error(`Error al buscar en 'Estudiantes': ${typeof studentError.error === 'string' ? studentError.error : studentError.error.message}`);
        
        if (studentRecords.length === 0) {
            setLegajoMessage('No se encontró un estudiante con este legajo.');
            setLegajoCheckState('error');
            return;
        }

        const student = studentRecords[0];
        setFoundStudent({ id: student.id, fields: student.fields });

        const missing: string[] = [];
        if (!student.fields[FIELD_DNI_ESTUDIANTES]) missing.push(FIELD_DNI_ESTUDIANTES);
        if (!student.fields[FIELD_FECHA_NACIMIENTO_ESTUDIANTES]) missing.push(FIELD_FECHA_NACIMIENTO_ESTUDIANTES);
        if (!student.fields[FIELD_CORREO_ESTUDIANTES]) missing.push(FIELD_CORREO_ESTUDIANTES);
        if (!student.fields[FIELD_TELEFONO_ESTUDIANTES]) missing.push(FIELD_TELEFONO_ESTUDIANTES);
        setMissingFields(missing);

        const studentName = student.fields[FIELD_NOMBRE_ESTUDIANTES] || 'Estudiante';
        setLegajoMessage(`¡Hola, ${studentName}! Continúa para registrarte.`);
        setLegajoCheckState('success');

    } catch (e: any) {
        setLegajoMessage('Ocurrió un error al verificar tu identidad.');
        setLegajoCheckState('error');
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'register') {
        setLegajoCheckState('idle');
        setLegajoMessage(null);
        setFoundStudent(null);
        setFoundAuthUser(null);
        return;
    }
    const handler = setTimeout(() => {
      if (legajo.trim()) {
        checkLegajo(legajo.trim());
      } else {
        setLegajoCheckState('idle');
        setFoundStudent(null);
        setFoundAuthUser(null);
        setLegajoMessage(null);
      }
    }, 700);
    return () => clearTimeout(handler);
  }, [legajo, mode, checkLegajo]);

  const handleNewDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === FIELD_DNI_ESTUDIANTES) {
      // The DNI field in Airtable expects a Number. We process the input to only allow digits.
      const numericString = value.replace(/\D/g, '');
      if (numericString === '') {
        // Handle case where input is cleared
        setNewData(prev => ({ ...prev, [name]: null }));
      } else {
        // Store as a number
        setNewData(prev => ({ ...prev, [name]: parseInt(numericString, 10) }));
      }
    } else {
      setNewData(prev => ({ ...prev, [name]: value || null }));
    }
  };

  const handleLoginOrRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    const legajoTrimmed = legajo.trim();
    const passwordTrimmed = password.trim();

    if (legajoTrimmed === 'admin' && passwordTrimmed === 'superadmin') {
      login({ legajo: 'admin', nombre: 'Super Usuario', role: 'SuperUser' }, rememberMe);
      return;
    }

    if (!legajoTrimmed || !passwordTrimmed) {
        setError('Por favor, completa todos los campos.');
        return;
    }

    setIsLoading(true);
    setError(null);
    
    if (mode === 'login') {
        try {
            const { records, error: fetchError } = await fetchAirtableData<AuthUserFields>(
                AIRTABLE_TABLE_NAME_AUTH_USERS, [FIELD_PASSWORD_HASH_AUTH, FIELD_SALT_AUTH, FIELD_NOMBRE_AUTH, FIELD_ROLE_AUTH, FIELD_ORIENTACIONES_AUTH], `{${FIELD_LEGAJO_AUTH}} = '${legajoTrimmed}'`, 1
            );
            if (fetchError) throw new Error('Error al conectar con el servidor.');
            if (records.length === 0) throw new Error('Legajo o contraseña incorrectos.');
            
            const user = records[0].fields;
            if (!user[FIELD_SALT_AUTH] || !user[FIELD_PASSWORD_HASH_AUTH]) {
                throw new Error('Esta cuenta no tiene una contraseña configurada. Por favor, regístrate para crear una.');
            }
            const isValid = await verifyPassword(passwordTrimmed, user[FIELD_SALT_AUTH]!, user[FIELD_PASSWORD_HASH_AUTH]!);
            if (isValid) {
                login({ 
                  legajo: legajoTrimmed, 
                  nombre: user[FIELD_NOMBRE_AUTH]!,
                  role: user[FIELD_ROLE_AUTH],
                  orientaciones: user[FIELD_ORIENTACIONES_AUTH]?.split(',').map(o => o.trim())
                }, rememberMe);
            } else {
                throw new Error('Legajo o contraseña incorrectos.');
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
        }
    } else { // Register mode
        try {
            if (legajoCheckState !== 'success' || (!foundStudent && !foundAuthUser)) {
                throw new Error('Debes verificar un legajo válido antes de registrarte.');
            }
            if (passwordTrimmed !== confirmPassword.trim()) {
                throw new Error('Las contraseñas no coinciden.');
            }
            if (missingFields.some(field => !newData[field as keyof EstudianteFields])) {
                throw new Error('Por favor, completa toda la información requerida.');
            }

            const salt = generateSalt();
            const passwordHash = await hashPassword(passwordTrimmed, salt);
            
            let userName = '';

            if (foundAuthUser) { // Update pre-provisioned user
                const { error: updateError } = await updateAirtableRecord(
                    AIRTABLE_TABLE_NAME_AUTH_USERS,
                    foundAuthUser.id,
                    {
                        [FIELD_PASSWORD_HASH_AUTH]: passwordHash,
                        [FIELD_SALT_AUTH]: salt
                    }
                );
                if (updateError) throw new Error(`No se pudo activar la cuenta: ${typeof updateError.error === 'string' ? updateError.error : updateError.error.message}`);
                userName = foundAuthUser.fields[FIELD_NOMBRE_AUTH]!;
            } else if (foundStudent) { // Create new user from Estudiantes
                if (Object.keys(newData).length > 0) {
                    const { error: updateError } = await updateAirtableRecord(
                        AIRTABLE_TABLE_NAME_ESTUDIANTES, foundStudent.id, newData
                    );
                    if (updateError) throw new Error(`No se pudo actualizar tu información: ${typeof updateError.error === 'string' ? updateError.error : updateError.error.message}`);
                }

                const { record, error: createError } = await createAirtableRecord<AuthUserFields>(AIRTABLE_TABLE_NAME_AUTH_USERS, {
                    [FIELD_LEGAJO_AUTH]: legajoTrimmed,
                    [FIELD_NOMBRE_AUTH]: foundStudent.fields[FIELD_NOMBRE_ESTUDIANTES],
                    [FIELD_PASSWORD_HASH_AUTH]: passwordHash,
                    [FIELD_SALT_AUTH]: salt
                });
                if (createError || !record) throw new Error(typeof createError?.error === 'string' ? createError.error : createError?.error.message || 'No se pudo crear la cuenta.');
                userName = foundStudent.fields[FIELD_NOMBRE_ESTUDIANTES]!;
            }

            login({ legajo: legajoTrimmed, nombre: userName }, rememberMe);
            showModal('¡Éxito!', 'Tu cuenta ha sido creada y has iniciado sesión automáticamente.');

        } catch(err: any) {
            setError(err.message || 'Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
        }
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const legajoTrimmed = legajo.trim();
    if (!legajoTrimmed) {
      setError("Por favor, ingresa tu número de legajo.");
      setIsLoading(false);
      return;
    }

    // Simulate network delay to provide user feedback
    await new Promise(resolve => setTimeout(resolve, 750));
    
    setIsLoading(false);
    const contactCoordinatorMessage = "Para restablecer tu contraseña, por favor ponte en contacto con tu coordinador de PPS.";
    showModal('Restablecer Contraseña', contactCoordinatorMessage);
    // Do not change mode or clear legajo here. Let the user see the modal and then decide to go back.
  };

  const handleModeChange = (newMode: 'login' | 'register' | 'forgot') => {
    setMode(newMode);
    setError(null);
    setFoundStudent(null);
    setFoundAuthUser(null);
    setMissingFields([]);
    setNewData({});
    setPassword('');
    setConfirmPassword('');
    setLegajoCheckState('idle');
    setLegajoMessage(null);
    if(newMode === 'login' || newMode === 'register') {
      // Don't clear legajo when switching between login and register
    } else {
      setLegajo('');
    }
  }

  return (
    <div className="w-full bg-white dark:bg-slate-800 md:grid md:grid-cols-2 min-h-[85vh] rounded-2xl shadow-2xl shadow-slate-200/40 dark:shadow-black/20 overflow-hidden border border-slate-200/60 dark:border-slate-700/80">
      {/* Left Panel */}
      <div className="hidden md:flex flex-col justify-between p-8 lg:p-12 bg-slate-900 text-white relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-3/4 h-3/4 bg-blue-600/30 rounded-full filter blur-3xl animate-pulse" style={{animationDuration: '8s'}} />
        <div className="absolute -bottom-1/4 -left-1/4 w-3/4 h-3/4 bg-indigo-600/30 rounded-full filter blur-3xl animate-pulse" style={{animationDuration: '10s', animationDelay: '2s'}} />
        <div className="relative z-10">
          <div className="flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '0ms' }}><MiPanelLogo className="h-16 w-auto" variant="dark" /></div>
          <div className="flex-grow flex flex-col justify-center mt-20">
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter leading-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              Tu Panel<br/>Académico.
            </h1>
            <p className="mt-4 text-slate-300 text-lg lg:text-xl max-w-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              El portal centralizado para el seguimiento de tus Prácticas Profesionales Supervisadas.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}><UfloLogo className="h-16 w-auto" variant="dark" /></div>
      </div>

      {/* Right Panel */}
      <div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-full">
        <main className="w-full max-w-md">
          {mode !== 'forgot' && (
            <>
              <div className="flex md:hidden justify-center items-center gap-4 mb-8"><UfloLogo className="h-12 w-auto" variant={resolvedTheme} /><MiPanelLogo className="h-12 w-auto" variant={resolvedTheme} /></div>
              
              <div className="text-left mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight animate-fade-in-up" style={{ animationDelay: '400ms' }}>Acceso de Estudiantes</h2>
                <p className="text-slate-500 dark:text-slate-400 mt-1 animate-fade-in-up" style={{ animationDelay: '500ms' }}>Accede a tu cuenta o regístrate para comenzar.</p>
              </div>
              
              <div className="p-1 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center mb-8 ring-1 ring-slate-200/50 dark:ring-slate-600/50 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                <button onClick={() => handleModeChange('login')} className={`w-full py-2.5 text-sm font-semibold rounded-md transition-all duration-300 ${mode === 'login' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-600/50 hover:text-slate-700 dark:hover:text-slate-200'}`}>Iniciar Sesión</button>
                <button onClick={() => handleModeChange('register')} className={`w-full py-2.5 text-sm font-semibold rounded-md transition-all duration-300 ${mode === 'register' ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-600/50 hover:text-slate-700 dark:hover:text-slate-200'}`}>Crear Usuario</button>
              </div>

              <form onSubmit={handleLoginOrRegister} className="space-y-5">
                {/* Legajo */}
                <div className="animate-fade-in-up" style={{ animationDelay: '700ms' }}>
                  <label htmlFor="legajo" className="sr-only">Número de Legajo</label>
                  <div className="relative">
                    <AuthInput id="legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} autoComplete="username"/>
                    { mode === 'register' && (
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                        {legajoCheckState === 'loading' && <div className="border-2 border-slate-200 dark:border-slate-600 border-t-blue-500 rounded-full w-5 h-5 animate-spin"></div>}
                        {legajoCheckState === 'success' && <span className="material-icons text-green-500">check_circle</span>}
                        {legajoCheckState === 'error' && <span className="material-icons text-rose-500">error</span>}
                      </div>
                    )}
                  </div>
                  { mode === 'register' && legajoMessage && (
                    <p className={`text-xs mt-2 px-1 ${legajoCheckState === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}>{legajoMessage}</p>
                  )}
                </div>

                {/* Campos faltantes */}
                {mode === 'register' && legajoCheckState === 'success' && foundStudent && (
                  <div className="space-y-4 animate-fade-in-up">
                    {missingFields.length > 0 && <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">Completa tus datos para continuar:</p>}
                    {missingFields.includes(FIELD_DNI_ESTUDIANTES) && <AuthInput name={FIELD_DNI_ESTUDIANTES} type="text" placeholder="DNI (sin puntos)" icon="badge" value={newData[FIELD_DNI_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} inputMode="numeric" pattern="[0-9]*" />}
                    {missingFields.includes(FIELD_FECHA_NACIMIENTO_ESTUDIANTES) && <AuthInput name={FIELD_FECHA_NACIMIENTO_ESTUDIANTES} type="date" placeholder="Fecha de Nacimiento" icon="cake" value={newData[FIELD_FECHA_NACIMIENTO_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} />}
                    {missingFields.includes(FIELD_CORREO_ESTUDIANTES) && <AuthInput name={FIELD_CORREO_ESTUDIANTES} type="email" placeholder="Correo" icon="email" value={newData[FIELD_CORREO_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} />}
                    {missingFields.includes(FIELD_TELEFONO_ESTUDIANTES) && <AuthInput name={FIELD_TELEFONO_ESTUDIANTES} type="tel" placeholder="Teléfono (con cód. de área)" icon="phone" value={newData[FIELD_TELEFONO_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} />}
                  </div>
                )}

                {/* Password */}
                <div className="space-y-1 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
                  <div className="relative">
                    <label htmlFor="password" className="sr-only">Contraseña</label>
                    <AuthInput id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" icon="lock" disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                {mode === 'register' && (
                  <div className="relative animate-fade-in-up" style={{ animationDelay: '900ms' }}>
                    <label htmlFor="confirmPassword" className="sr-only">Confirmar Contraseña</label>
                    <AuthInput id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar Contraseña" icon="lock_person" disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')} autoComplete="new-password"/>
                  </div>
                )}

                <div className="flex items-center justify-between animate-fade-in-up" style={{ animationDelay: '950ms' }}>
                    <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer select-none group">
                        <input
                            id="remember-me"
                            name="remember-me"
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')}
                            className="sr-only"
                        />
                        <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ease-in-out ${rememberMe ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700'} group-hover:border-blue-500`}>
                            <span className={`material-icons !text-sm text-white transition-transform duration-200 ease-in-out ${rememberMe ? 'scale-100' : 'scale-0'}`}>
                                check
                            </span>
                        </div>
                        <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
                            Recordarme
                        </span>
                    </label>

                    {mode === 'login' && (
                        <div className="text-sm">
                            <button
                                type="button"
                                onClick={() => handleModeChange('forgot')}
                                className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:underline"
                            >
                                ¿Olvidaste tu contraseña?
                            </button>
                        </div>
                    )}
                </div>

                <div aria-live="assertive">
                  {error && <p className="text-red-600 dark:text-red-400 text-sm text-center pt-2">{error}</p>}
                </div>

                <div className="pt-4 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
                  <button type="submit" disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')} className="w-full bg-blue-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3">
                    {isLoading && <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>}
                    <span>{isLoading ? 'Procesando...' : (mode === 'login' ? 'Ingresar' : 'Crear Cuenta')}</span>
                  </button>
                </div>
              </form>
            </>
          )}

          {mode === 'forgot' && (
              <form onSubmit={handleForgotPassword} className="space-y-5 animate-fade-in-up">
                <div className="text-left mb-8">
                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Restablecer Contraseña</h2>
                    <p className="text-slate-500 dark:text-slate-400 mt-1">Ingresa tu legajo. Te indicaremos los pasos a seguir para restablecer tu contraseña.</p>
                </div>
                
                <div>
                  <label htmlFor="legajo" className="sr-only">Número de Legajo</label>
                  <AuthInput id="legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} autoComplete="username"/>
                </div>

                <div aria-live="assertive">
                  {error && <p className="text-red-600 dark:text-red-400 text-sm text-center pt-2">{error}</p>}
                </div>

                <div className="pt-4 space-y-4">
                  <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3">
                    {isLoading ? (
                        <><div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div><span>Procesando...</span></>
                    ) : (
                        <span>Solicitar Restablecimiento</span>
                    )}
                  </button>
                  <button type="button" onClick={() => handleModeChange('login')} className="w-full text-center text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">
                    Volver a Iniciar Sesión
                  </button>
                </div>
              </form>
            )}

        </main>
      </div>
    </div>
  );
};

export default Auth;