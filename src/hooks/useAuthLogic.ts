import { useState, useCallback, useEffect, ChangeEvent, FormEvent } from 'react';
import { db } from '../lib/db';
import { 
    FIELD_LEGAJO_AUTH, FIELD_PASSWORD_HASH_AUTH, FIELD_SALT_AUTH, FIELD_NOMBRE_AUTH,
    FIELD_LEGAJO_ESTUDIANTES, FIELD_NOMBRE_ESTUDIANTES, 
    FIELD_DNI_ESTUDIANTES, FIELD_FECHA_NACIMIENTO_ESTUDIANTES, FIELD_CORREO_ESTUDIANTES, FIELD_TELEFONO_ESTUDIANTES,
    FIELD_ROLE_AUTH, FIELD_ORIENTACIONES_AUTH
} from '../constants';
import type { AuthUserFields, EstudianteFields, AirtableRecord } from '../types';
import type { AuthUser } from '../contexts/AuthContext';
import { IS_PREVIEW_MODE } from '../constants';

interface UseAuthLogicProps {
    login: (user: AuthUser, rememberMe?: boolean) => void;
}

export const useAuthLogic = ({ login }: UseAuthLogicProps) => {
    const [mode, setMode] = useState<'login' | 'register' | 'forgot' | 'reset'>('login');
    const [legajo, setLegajo] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [rememberMe, setRememberMe] = useState(true);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [legajoCheckState, setLegajoCheckState] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
    const [legajoMessage, setLegajoMessage] = useState<string | null>(null);
    
    // These states are no longer populated on the client-side for security.
    const [foundStudent, setFoundStudent] = useState<AirtableRecord<EstudianteFields> | null>(null);
    const [foundAuthUser, setFoundAuthUser] = useState<AirtableRecord<AuthUserFields> | null>(null);
    const [missingFields, setMissingFields] = useState<string[]>([]);
    const [newData, setNewData] = useState<Partial<EstudianteFields>>({});
    const [verificationData, setVerificationData] = useState({ dni: '', correo: '', telefono: '' });
    
    const resetFormState = () => {
        setError(null);
        setPassword('');
        setConfirmPassword('');
    };

    const handleModeChange = (newMode: 'login' | 'register' | 'forgot' | 'reset') => {
        setMode(newMode);
        resetFormState();
    };

    const handleFormSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const legajoTrimmed = legajo.trim().toLowerCase();
        const passwordTrimmed = password.trim();

        setIsLoading(true);
        setError(null);

        const specialUsers: { [key: string]: { pass: string, payload: AuthUser } } = {
            'testing': { pass: 'testing', payload: { legajo: '99999', nombre: 'Admin de Prueba', role: 'AdminTester' } },
            '12345': { pass: '12345', payload: { legajo: '99999', nombre: 'Estudiante de Prueba' } },
            'reportero': { pass: 'reportero', payload: { legajo: 'reportero', nombre: 'Usuario Reportero', role: 'Reportero' } },
            'admin': { pass: 'superadmin', payload: { legajo: 'admin', nombre: 'Super Usuario', role: 'SuperUser' } },
        };

        if (mode === 'login') {
            if (IS_PREVIEW_MODE) {
                // PREVIEW MODE: Client-side check only
                if (specialUsers[legajoTrimmed] && specialUsers[legajoTrimmed].pass === passwordTrimmed) {
                    login(specialUsers[legajoTrimmed].payload, rememberMe);
                } else {
                    setError('Credenciales inválidas para el modo de vista previa. Usa "admin"/"superadmin", "12345"/"12345", etc.');
                }
                setIsLoading(false);
            } else {
                // PRODUCTION/VERCEL MODE: API call only
                try {
                    const res = await fetch('/api/login', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ legajo: legajoTrimmed, password: passwordTrimmed }),
                    });

                    const data = await res.json();

                    if (!res.ok) {
                        throw new Error(data.message || 'Error en la autenticación.');
                    }
                    
                    login(data, rememberMe);
                } catch (err: any) {
                    setError(err.message || 'Credenciales inválidas o error de conexión.');
                } finally {
                    setIsLoading(false);
                }
            }
        } else {
            setError('El registro y reseteo de contraseña no están disponibles en este momento. Contacta a un administrador.');
            setIsLoading(false);
        }
    };

    const handleForgotLegajoSubmit = (e: FormEvent) => {
        e.preventDefault();
        setError('La recuperación de contraseña debe hacerse a través de un administrador.');
    };
    
    useEffect(() => {
        if (mode !== 'register') {
            setLegajoCheckState('idle');
            setLegajoMessage(null);
        } else {
            setLegajoMessage('El registro está deshabilitado. Contacta a un administrador para crear una cuenta.');
            setLegajoCheckState('error');
        }
    }, [legajo, mode]);

    const handleNewDataChange = (e: ChangeEvent<HTMLInputElement>) => {};
    const handleVerificationDataChange = (e: ChangeEvent<HTMLInputElement>) => {};

    return {
        mode, setMode: handleModeChange,
        legajo, setLegajo,
        password, setPassword,
        confirmPassword, setConfirmPassword,
        rememberMe, setRememberMe,
        isLoading, error, setError,
        legajoCheckState, legajoMessage,
        foundStudent: null, missingFields: [],
        newData, handleNewDataChange,
        verificationData, handleVerificationDataChange,
        handleFormSubmit, handleForgotLegajoSubmit
    };
};
