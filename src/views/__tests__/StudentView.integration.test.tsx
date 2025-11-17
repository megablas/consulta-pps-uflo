import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import App from '@/App';
import { db } from '@/lib/db';
import * as authUtils from '@/utils/auth';
import {
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
    FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
} from '@/constants';

// Mock the entire db module
jest.mock('@/lib/db');
const mockedDb = db as jest.Mocked<typeof db>;

// Mock the auth utils module
jest.mock('@/utils/auth');
const mockedAuthUtils = authUtils as jest.Mocked<typeof authUtils>;

// --- Mock Data ---
const mockStudentDetails = {
    id: 'recStudentTest',
    createdTime: '',
    fields: {
        'Legajo': '12345',
        'Nombre': 'Estudiante de Prueba',
    }
};

const mockLanzamiento = {
    id: 'lanz_test_enroll',
    createdTime: '',
    fields: {
        [FIELD_NOMBRE_PPS_LANZAMIENTOS]: 'PPS de Integración',
        [FIELD_ORIENTACION_LANZAMIENTOS]: 'Clinica',
        [FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS]: 'Abierta',
        [FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS]: 'Lunes 9 a 13hs; Martes 14 a 18hs',
        [FIELD_FECHA_INICIO_LANZAMIENTOS]: '2024-09-01'
    }
};

describe('Flujo de Inscripción de Estudiante (Integration Test)', () => {
    
    jest.setTimeout(30000); // Increase timeout for this long-running test

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Start as logged out
        Storage.prototype.getItem = jest.fn(() => null);

        // Mock the db methods used during login and dashboard loading
        mockedDb.authUsers.get.mockResolvedValue([
            {
                id: 'recAuthUser123',
                createdTime: '',
                fields: {
                    Legajo: '12345',
                    Nombre: 'Estudiante de Prueba',
                    Salt: 'test-salt',
                    PasswordHash: 'test-hash'
                }
            }
        ] as any);

        // Mock password verification to always succeed for the test password
        mockedAuthUtils.verifyPassword.mockResolvedValue(true);

        mockedDb.estudiantes.get.mockResolvedValue([mockStudentDetails] as any);
        mockedDb.lanzamientos.getAll.mockResolvedValue([mockLanzamiento] as any);
        mockedDb.practicas.getAll.mockResolvedValue([]);
        mockedDb.solicitudes.getAll.mockResolvedValue([]);
        mockedDb.convocatorias.getAll.mockResolvedValue([]);
        mockedDb.instituciones.getAll.mockResolvedValue([]);
    });

    it('permite a un estudiante iniciar sesión, ver convocatorias e inscribirse', async () => {
        const user = userEvent.setup();
        const createRecordMock = jest.fn().mockResolvedValue({ id: 'new_conv_id', fields: {}, createdTime: '' });
        (mockedDb.convocatorias.create as jest.Mock).mockImplementation(createRecordMock);

        const queryClient = new QueryClient();
        render(
            <QueryClientProvider client={queryClient}>
                <AuthProvider>
                    <App />
                </AuthProvider>
            </QueryClientProvider>
        );

        // --- 1. Login ---
        const legajoInput = await screen.findByPlaceholderText(/Número de Legajo/i);
        const passwordInput = await screen.findByPlaceholderText(/Contraseña/i);
        const loginButton = screen.getByRole('button', { name: /Ingresar/i });

        await user.type(legajoInput, '12345');
        await user.type(passwordInput, 'password123');
        await user.click(loginButton);
        
        // --- 2. Dashboard View ---
        await screen.findByRole('heading', { name: /Buenos (días|tardes|noches), Estudiante/i, level: 1 });
        const ppsCard = await screen.findByText(/PPS de Integración/i);
        expect(ppsCard).toBeInTheDocument();
        
        // --- 3. Enrollment Flow ---
        const inscribirButton = await screen.findByRole('button', { name: /Postularme/i });
        await user.click(inscribirButton);

        const modal = await screen.findByRole('dialog', { name: /Formulario de Inscripción/i });
        const { getByLabelText, getByRole } = screen.getByRole('dialog');

        const horarioCheckbox = getByLabelText('Lunes 9 a 13hs');
        await user.click(horarioCheckbox);

        const terminoCursarRadio = getByLabelText('Sí');
        await user.click(terminoCursarRadio);

        const finalesAdeudadosRadio = await screen.findByLabelText('1 Final');
        await user.click(finalesAdeudadosRadio);
        
        const otraSituacionTextarea = getByLabelText(/Aclaraciones Adicionales/i);
        await user.type(otraSituacionTextarea, 'Prueba de integración E2E.');

        const submitButton = getByRole('button', { name: /Inscribirme/i });
        await user.click(submitButton);

        // --- 4. Assertions ---
        await waitFor(() => {
            expect(createRecordMock).toHaveBeenCalledTimes(1);
        });

        const [fields] = createRecordMock.mock.calls[0];
        
        expect(fields).toEqual(expect.objectContaining({
            lanzamientoVinculado: [mockLanzamiento.id],
            estudianteInscripto: [mockStudentDetails.id],
            horario: 'Lunes 9 a 13hs',
            terminoCursar: 'Sí',
            finalesAdeuda: '1 Final',
            otraSituacion: 'Prueba de integración E2E.',
        }));

        expect(screen.queryByRole('dialog', { name: /Formulario de Inscripción/i })).not.toBeInTheDocument();
        
        const successModal = await screen.findByRole('dialog', { name: /¡Inscripción Exitosa!/i });
        expect(successModal).toBeInTheDocument();
    });
});