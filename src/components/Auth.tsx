import React, { useState } from 'react';
import MiPanelLogo from './MiPanelLogo';
import UfloLogo from './UfloLogo';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import Input from './Input';
import { useAuthLogic } from '../hooks/useAuthLogic';
import Modal from './Modal';
import { 
    FIELD_DNI_ESTUDIANTES, 
    FIELD_FECHA_NACIMIENTO_ESTUDIANTES, 
    FIELD_CORREO_ESTUDIANTES, 
    FIELD_TELEFONO_ESTUDIANTES
} from '../constants';


const Auth: React.FC = () => {
  const { login } = useAuth();
  const { resolvedTheme } = useTheme();

  const {
      mode, setMode,
      legajo, setLegajo,
      password, setPassword,
      confirmPassword, setConfirmPassword,
      rememberMe, setRememberMe,
      isLoading, error, setError,
      legajoCheckState, legajoMessage,
      foundStudent, missingFields,
      newData, handleNewDataChange,
      verificationData, handleVerificationDataChange,
      handleFormSubmit, handleForgotLegajoSubmit,
  } = useAuthLogic({ login });
  
  const [showPassword, setShowPassword] = useState(false);

  const handleModeChange = (newMode: 'login' | 'register' | 'forgot' | 'reset') => {
    setMode(newMode);
    if (newMode !== 'reset') {
        // Clear sensitive data when switching modes
        setLegajo('');
        setPassword('');
        setConfirmPassword('');
    }
  };

  const renderLoginRegister = () => (
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

      <form onSubmit={handleFormSubmit} className="space-y-5">
        <div className="animate-fade-in-up" style={{ animationDelay: '700ms' }}>
          <label htmlFor="legajo" className="sr-only">Número de Legajo</label>
          <div className="relative">
            <Input id="legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} autoComplete="username"/>
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

        {mode === 'register' && legajoCheckState === 'success' && foundStudent && (
          <div className="space-y-4 animate-fade-in-up">
            {missingFields.length > 0 && <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 border-t border-slate-200 dark:border-slate-700 pt-4 mt-4">Completa tus datos para continuar:</p>}
            {missingFields.includes(FIELD_DNI_ESTUDIANTES) && <Input name={FIELD_DNI_ESTUDIANTES} type="text" placeholder="DNI (sin puntos)" icon="badge" value={newData[FIELD_DNI_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} inputMode="numeric" pattern="[0-9]*" />}
            {missingFields.includes(FIELD_FECHA_NACIMIENTO_ESTUDIANTES) && <Input name={FIELD_FECHA_NACIMIENTO_ESTUDIANTES} type="date" placeholder="Fecha de Nacimiento" icon="cake" value={newData[FIELD_FECHA_NACIMIENTO_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} />}
            {missingFields.includes(FIELD_CORREO_ESTUDIANTES) && <Input name={FIELD_CORREO_ESTUDIANTES} type="email" placeholder="Correo" icon="email" value={newData[FIELD_CORREO_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} />}
            {missingFields.includes(FIELD_TELEFONO_ESTUDIANTES) && <Input name={FIELD_TELEFONO_ESTUDIANTES} type="tel" placeholder="Teléfono (con cód. de área)" icon="phone" value={newData[FIELD_TELEFONO_ESTUDIANTES] || ''} onChange={handleNewDataChange} disabled={isLoading} />}
          </div>
        )}

        <div className="space-y-1 animate-fade-in-up" style={{ animationDelay: '800ms' }}>
          <div className="relative">
            <label htmlFor="password" className="sr-only">Contraseña</label>
            <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña" icon="lock" disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')} autoComplete={mode === 'login' ? 'current-password' : 'new-password'}/>
            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
              <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
            </button>
          </div>
        </div>

        {mode === 'register' && (
          <div className="relative animate-fade-in-up" style={{ animationDelay: '900ms' }}>
            <label htmlFor="confirmPassword" className="sr-only">Confirmar Contraseña</label>
            <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar Contraseña" icon="lock_person" disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')} autoComplete="new-password"/>
          </div>
        )}

        <div className="flex items-center justify-between animate-fade-in-up" style={{ animationDelay: '950ms' }}>
            <label htmlFor="remember-me" className="flex items-center gap-2 cursor-pointer select-none group">
                <input id="remember-me" name="remember-me" type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')} className="sr-only"/>
                <div className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md border-2 transition-all duration-200 ease-in-out ${rememberMe ? 'border-blue-600 bg-blue-600 dark:border-blue-500 dark:bg-blue-500' : 'border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-700'} group-hover:border-blue-500`}>
                    <span className={`material-icons !text-sm text-white transition-transform duration-200 ease-in-out ${rememberMe ? 'scale-100' : 'scale-0'}`}>check</span>
                </div>
                <span className="text-sm font-medium text-slate-800 dark:text-slate-200">Recordarme</span>
            </label>
            {mode === 'login' && (
                <div className="text-sm">
                    <button type="button" onClick={() => handleModeChange('forgot')} className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 focus:outline-none focus:underline">¿Olvidaste tu contraseña?</button>
                </div>
            )}
        </div>
        <div className="pt-4 animate-fade-in-up" style={{ animationDelay: '1000ms' }}>
          <button type="submit" disabled={isLoading || (mode === 'register' && legajoCheckState !== 'success')} className="w-full bg-blue-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3">
            {isLoading && <div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div>}
            <span>{isLoading ? 'Procesando...' : (mode === 'login' ? 'Ingresar' : 'Crear Cuenta')}</span>
          </button>
        </div>
      </form>
    </>
  );

  const renderForgot = () => (
    <form onSubmit={handleForgotLegajoSubmit} className="space-y-5 animate-fade-in-up">
        <div className="text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Restablecer Contraseña</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Ingresa tu legajo para comenzar el proceso de restablecimiento.</p>
        </div>
        <div>
          <label htmlFor="legajo" className="sr-only">Número de Legajo</label>
          <Input id="legajo" type="text" value={legajo} onChange={(e) => setLegajo(e.target.value)} placeholder="Número de Legajo" icon="badge" disabled={isLoading} autoComplete="username"/>
        </div>
        <div className="pt-4 space-y-4">
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3">
            {isLoading ? <><div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div><span>Verificando...</span></> : <span>Continuar</span>}
          </button>
          <button type="button" onClick={() => handleModeChange('login')} className="w-full text-center text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">Volver a Iniciar Sesión</button>
        </div>
    </form>
  );
  
  const renderReset = () => (
    <form onSubmit={handleFormSubmit} className="space-y-5 animate-fade-in-up">
        <div className="text-left mb-8">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Verificación de Identidad</h2>
            <p className="text-slate-500 dark:text-slate-400 mt-1">Para proteger tu cuenta, por favor, confirma tus datos. Deben coincidir con los que tenemos registrados.</p>
        </div>
        <Input name="dni" type="text" placeholder="DNI (sin puntos)" icon="badge" value={verificationData.dni} onChange={handleVerificationDataChange} disabled={isLoading} inputMode="numeric" pattern="[0-9]*" />
        <Input name="correo" type="email" placeholder="Correo" icon="email" value={verificationData.correo} onChange={handleVerificationDataChange} disabled={isLoading} />
        <Input name="telefono" type="tel" placeholder="Teléfono (con cód. de área)" icon="phone" value={verificationData.telefono} onChange={handleVerificationDataChange} disabled={isLoading} />
        
        <div className="pt-4 border-t border-slate-200 dark:border-slate-700 space-y-5">
            <h3 className="text-xl font-bold text-slate-900 dark:text-slate-50 tracking-tight">Nueva Contraseña</h3>
            <div className="relative">
                <label htmlFor="password" className="sr-only">Nueva Contraseña</label>
                <Input id="password" type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Nueva Contraseña" icon="lock" disabled={isLoading} autoComplete="new-password"/>
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-4 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                  <span className="material-icons !text-xl">{showPassword ? 'visibility_off' : 'visibility'}</span>
                </button>
            </div>
             <div className="relative">
                <label htmlFor="confirmPassword" className="sr-only">Confirmar Nueva Contraseña</label>
                <Input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="Confirmar Nueva Contraseña" icon="lock_person" disabled={isLoading} autoComplete="new-password"/>
             </div>
        </div>
        <div className="pt-4 space-y-4">
          <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white font-bold text-base py-3 px-6 rounded-lg transition-all duration-200 ease-in-out shadow-md hover:bg-blue-700 hover:-translate-y-0.5 active:scale-95 active:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:focus:ring-offset-slate-800 disabled:bg-slate-400 dark:disabled:bg-slate-600 disabled:cursor-not-allowed disabled:shadow-none disabled:translate-y-0 flex items-center justify-center gap-3">
            {isLoading ? <><div className="border-2 border-white/50 border-t-white rounded-full w-5 h-5 animate-spin"></div><span>Restableciendo...</span></> : <span>Restablecer y Entrar</span>}
          </button>
          <button type="button" onClick={() => handleModeChange('login')} className="w-full text-center text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-800 dark:hover:text-slate-100 transition-colors">Cancelar</button>
        </div>
    </form>
  );

  return (
    <>
    <Modal
        isOpen={!!error}
        title="Error de Acceso"
        message={error || ''}
        onClose={() => setError(null)}
      />
    <div className="w-full bg-white dark:bg-slate-800 md:grid md:grid-cols-2 min-h-[85vh] rounded-2xl shadow-2xl shadow-slate-200/40 dark:shadow-black/20 overflow-hidden border border-slate-200/60 dark:border-slate-700/80">
      <div className="hidden md:flex flex-col justify-between p-8 lg:p-12 bg-gradient-to-br from-slate-50 to-slate-200 dark:bg-gradient-to-br dark:from-slate-900 dark:to-slate-800 text-slate-800 dark:text-white relative overflow-hidden">
        <div className="absolute -top-1/4 -right-1/4 w-3/4 h-3/4 bg-blue-600/30 dark:bg-blue-500/40 rounded-full filter blur-3xl animate-pulse" style={{animationDuration: '8s'}} />
        <div className="absolute -bottom-1/4 -left-1/4 w-3/4 h-3/4 bg-indigo-600/30 dark:bg-indigo-500/40 rounded-full filter blur-3xl animate-pulse" style={{animationDuration: '10s', animationDelay: '2s'}} />
        <div className="relative z-10">
          <div className="flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '0ms' }}><MiPanelLogo className="h-16 w-auto" variant={resolvedTheme} /></div>
          <div className="flex-grow flex flex-col justify-center mt-20">
            <h1 className="text-5xl lg:text-6xl font-black tracking-tighter leading-tight animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              Tu Panel<br/>Académico.
            </h1>
            <p className="mt-4 text-slate-600 dark:text-slate-300 text-lg lg:text-xl max-w-sm animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              El portal centralizado para el seguimiento de tus Prácticas Profesionales Supervisadas.
            </p>
          </div>
        </div>
        <div className="relative z-10 flex-shrink-0 animate-fade-in-up" style={{ animationDelay: '300ms' }}><UfloLogo className="h-16 w-auto" variant={resolvedTheme} /></div>
      </div>

      <div className="flex flex-col items-center justify-center p-6 sm:p-10 min-h-full">
        <main className="w-full max-w-md">
            {mode === 'login' || mode === 'register' ? renderLoginRegister() :
             mode === 'forgot' ? renderForgot() :
             renderReset()
            }
        </main>
      </div>
    </div>
    </>
  );
};

export default Auth;