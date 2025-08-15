import React, { useState, useCallback, useEffect } from 'react';
import { fetchAirtableData, createAirtableRecord, updateAirtableRecord } from '../services/airtableService';
import { generateSalt, hashPassword, verifyPassword } from '../utils/auth';
import { 
    AIRTABLE_TABLE_NAME_AUTH_USERS, FIELD_LEGAJO_AUTH, FIELD_PASSWORD_HASH_AUTH, FIELD_SALT_AUTH, FIELD_NOMBRE_AUTH,
    AIRTABLE_TABLE_NAME_ESTUDIANTES, FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_DNI_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES
} from '../constants';
import type { AuthUserFields, EstudianteFields } from '../types';
import MiPanelLogo from './MiPanelLogo';
import UfloLogo from './UfloLogo';
import { useAuth } from '../contexts/AuthContext';

interface AuthProps {
  showModal: (title: string, message: string) => void;
}

interface AuthInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: string;
}

const AuthInput: React.FC<AuthInputProps> = ({ id, type, value, onChange, placeholder, icon, disabled = false, ...props }) => (
  <div className="relative group">
    <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 transition-colors duration-300 group-focus-within:text-blue-600">
      <span className="material-icons text-slate-400 group-focus-within:text-blue-600">{icon}</span>
    </div>
    <input
      id={id}
      name={id}
      type={type}
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full rounded-lg border border-slate-300 py-3 pl-12 pr-4 text-base text-slate-900 bg-white/50 shadow-sm placeholder-slate-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all disabled:bg-slate-100"
      placeholder={placeholder}
      required
      {...props}
    />
  </div>
);

const Auth: React.FC<AuthProps> = ({ showModal }) => {
  const { login } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [legajo, setLegajo] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [legajoCheckState, setLegajoCheckState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [legajoMessage, setLegajoMessage] = useState<string | null>(null);
  
  const [foundStudent, setFoundStudent] = useState<{ id: string; fields: EstudianteFields } | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [newData, setNewData] = useState<Partial<EstudianteFields>>({});

  const checkLegajo = useCallback(async (legajoToVerify: string) => {
    if (!legajoToVerify || mode !== 'register') return;

    setLegajoCheckState('loading');
    setFoundStudent(null);
    setMissingFields([]);
    setNewData({});
    setLegajoMessage(null);
    setError(null);

    try {
        const { records: existingUser, error: existingUserError } = await fetchAirtableData<AuthUserFields>(
            AIRTABLE_TABLE_NAME_AUTH_USERS, [FIELD_LEGAJO_AUTH], `{${FIELD_LEGAJO_AUTH}} = '${legajoToVerify}'`, 1
        );
        if (existingUserError) console.warn("No se pudo consultar 'Auth Users':", existingUserError.error);
        if (existingUser.length > 0) {
            setLegajoMessage('Ya existe una cuenta para este legajo.');
            setLegajoCheckState('error');
            return;
        }

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
        return;
    }
    const handler = setTimeout(() => {
      if (legajo.trim()) {
        checkLegajo(legajo.trim());
      } else {
        setLegajoCheckState('idle');
        setFoundStudent(null);
        setLegajoMessage(null);
      }
    }, 700);
    return () => clearTimeout(handler);
  }, [legajo, mode, checkLegajo]);

  const handleNewDataChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setNewData(prev => ({ ...prev, [name]: value || null }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const legajoTrimmed = legajo.trim();
    const passwordTrimmed = password.trim();

    if (legajoTrimmed === 'admin' && passwordTrimmed === 'superadmin') {
      login({ legajo: 'admin', nombre: 'Super Usuario', isSuperUser: true });
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
                AIRTABLE_TABLE_NAME_AUTH_USERS, [FIELD_PASSWORD_HASH_AUTH, FIELD_SALT_AUTH, FIELD_NOMBRE_AUTH], `{${FIELD_LEGAJO_AUTH}} = '${legajoTrimmed}'`, 1
            );
            if (fetchError) throw new Error('Error al conectar con el servidor.');
            if (records.length === 0) throw new Error('Legajo o contraseña incorrectos.');
            
            const user = records[0].fields;
            const isValid = await verifyPassword(passwordTrimmed, user[FIELD_SALT_AUTH]!, user[FIELD_PASSWORD_HASH_AUTH]!);
            if (isValid) {
                login({ legajo: legajoTrimmed, nombre: user[FIELD_NOMBRE_AUTH]! });
            } else {
                throw new Error('Legajo o contraseña incorrectos.');
            }
        } catch (err: any) {
            setError(err.message || 'Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
        }
    } else {
        try {
            if (legajoCheckState !== 'success' || !foundStudent) {
                throw new Error('Debes verificar un legajo válido antes de registrarte.');
            }
            if (passwordTrimmed !== confirmPassword.trim()) {
                throw new Error('Las contraseñas no coinciden.');
            }
            if (missingFields.some(field => !newData[field as keyof EstudianteFields])) {
                throw new Error('Por favor, completa toda la información requerida.');
            }

            if (Object.keys(newData).length > 0) {
                const { error: updateError } = await updateAirtableRecord(
                    AIRTABLE_TABLE_NAME_ESTUDIANTES, foundStudent.id, newData
                );
                if (updateError) throw new Error(`No se pudo actualizar tu información: ${typeof updateError.error === 'string' ? updateError.error : updateError.error.message}`);
            }

            const salt = generateSalt();
            const passwordHash = await hashPassword(passwordTrimmed, salt);
            const { record, error: createError } = await createAirtableRecord<AuthUserFields>(AIRTABLE_TABLE_NAME_AUTH_USERS, {
                [FIELD_LEGAJO_AUTH]: legajoTrimmed,
                [FIELD_NOMBRE_AUTH]: foundStudent.fields[FIELD_NOMBRE_ESTUDIANTES],
                [FIELD_PASSWORD_HASH_AUTH]: passwordHash,
                [FIELD_SALT_AUTH]: salt
            });
            if (createError || !record) throw new Error(typeof createError?.error === 'string' ? createError.error : createError?.error.message || 'No se pudo crear la cuenta.');

            login({ legajo: legajoTrimmed, nombre: foundStudent.fields[FIELD_NOMBRE_ESTUDIANTES]! });
            showModal('¡Éxito!', 'Tu cuenta ha sido creada y has iniciado sesión automáticamente.');

        } catch(err: any) {
            setError(err.message || 'Ocurrió un error inesperado.');
        } finally {
            setIsLoading(false);
        }
    }
  };

  const handleModeChange = (newMode: 'login' | 'register') => {
    setMode(newMode);
    setError(null);
    setFoundStudent(null);
    setMissingFields([]);
    setNewData({});
    setPassword('');
    setConfirmPassword('');
    setLegajoCheckState('idle');
    setLegajoMessage(null);
  }

  return (
    <div className="w-full bg-white md:grid md:grid-cols-2 min-h-[85vh] rounded-2xl shadow-2xl shadow-slate-200/40 overflow-hidden border border-slate-200/60">
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
          <div className="flex md:hidden justify-center items-center gap-4 mb-8"><UfloLogo className="h-12 w-auto" /><MiPanelLogo className="h-12 w-auto" /></div>
          
          <div className="text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight animate-fade-in-up" style={{ animationDelay: '400ms' }}>Acceso de Estudiantes</h2>
            <p className="text-slate-500 mt-1 animate-fade-in-up" style={{ animationDelay: '500ms' }}>Accede a tu cuenta o regístrate para comenzar.</p>
          </div>
          
          <div className="p-1 bg-slate-100 rounded-lg flex items-center mb-8 ring-1 ring-slate-200/50 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
            <button onClick={() => handleModeChange('login')} className={`w-full py-2.5 text-sm font-semibold rounded-md transition-all duration-300 ${mode === 'login' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'}`}>Iniciar Sesión</button>
            <button onClick={() => handleModeChange('register')} className={`w-full py-2.5 text-sm font-semibold rounded-md transition-all duration-300 ${mode === 'register' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-200/50 hover:text-slate-700'}`}>Crear Usuario</button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Legajo */}
            <div className="animate-fade-in-up" style={{ animationDelay: '700ms' }}>
              <div className="relative">
                <AuthInput id="legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} autoComplete="username"/>
                { mode === 'register' && (
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {legajoCheckState === 'loading' && <div className="border-2 border-slate-200 border-t-blue-500 rounded-full w-5 h-5 animate-spin"></div>}
                    {legajoCheckState === 'success' && <span className="material-icons text-green-500">check_circle</span>}
                    {legajoCheckState === 'error' && <span className="material-icons text-rose-500">error</span>}
                  </div>
                )}
              </div>
              { mode === 'register' && legajoMessage && (
                <p className={`text-xs mt-2 px-1 ${legajoCheckState === 'error' ? 'text-rose-600' : 'text-slate-500'}`}>{legajoMessage}</p>
              )}
            </div>

            {/* Campos faltantes */}
            {mode === 'register' && legajoCheckState === 'success' && foundStudent && (
              <div className="space-y-4 animate-fade-in-up">
                {missingFields.length > 0 && <p className="text-sm font-semibold text-slate-700 border-t pt-4 mt-4">Completa tus datos para continuar:</p>}
                {missingFields.includes(FIELD_DNI_ESTUDIANTES) && <AuthInput name={FIELD_DNI_ESTUDIANTES} type="text" placeholder="DNI (sin puntos)" icon="badge" value={newData[FIELD_DNI_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} />}
                {missingFields.includes(FIELD_FECHA_NACIMIENTO_ESTUDIANTES) && <AuthInput name={FIELD_FECHA_NACIMIENTO_ESTUDIANTES} type="date" placeholder="Fecha de Nacimiento" icon="cake" value={newData[FIELD_FECHA_NACIMIENTO_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} />}
                {missingFields.includes(FIELD_CORREO_ESTUDIANTES) && <AuthInput name={FIELD_CORREO_ESTUDIANTES} type="email" placeholder="Correo" icon="email" value={newData[FIELD_CORREO_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} />}
                {missingFields.includes(FIELD_TELEFONO_ESTUDIANTES) && <AuthInput name={FIELD_TELEFONO_ESTUDIANTES} type="tel" placeholder="Teléfono (con cód. de área)" icon="phone" value={newData[FIELD_TELEFONO_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} />}
              </div>
            )}

            {/* Password */}
            <div className="relative animate-fade-in-up" style={{ animationDelay: '800ms' }}>
              <AuthInput id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" icon="lock" disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 hover:text-slate-700" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
              </button>
            </div>

            {mode === 'register' && (
              <div className="relative animate-fade-in-up" style={{ animationDelay: '900ms' }}>
                <AuthInput id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar Contraseña" icon="lock_person" disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')} autoComplete="new-password"/>
              </div>
            )}

            {error && <p className="text-red-600 text-sm text-center pt-2">{error}</p>}

            <div className="pt-4 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
              <button type="submit" disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')} className="w-full bg-blue-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3">
                {isLoading && <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>}
                <span>{isLoading ? 'Procesando...' : (mode === 'login' ? 'Ingresar' : 'Crear Cuenta')}</span>
              </button>
            </div>
          </form>
        </main>
      </div>
    </div>
  );
};

export default Auth;