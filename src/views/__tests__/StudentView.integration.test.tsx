import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '../../contexts/AuthContext';
import App from '../../App';
import { db } from '../../lib/db';
import {
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
    FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
} from '../../constants';
import type { LanzamientoPPS } from '../../types';

// Mock the db module, which is the direct dependency for our data hooks
jest.mock('../../lib/db');
const mockedDb = db as jest.Mocked<typeof db>;

// --- Mock Data ---
const mockStudentDetails = {
    id: 'recStudentTest',
    createdTime: '',
    fields: {
        [FIELD_LEGAJO_ESTUDIANTES]: '99999',
        [FIELD_NOMBRE_ESTUDIANTES]: 'Estudiante de Prueba',
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

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Start as logged out
        Storage.prototype.getItem = jest.fn((key) => null);

        // Mock fetch for the login API call
        (window.fetch as jest.Mock) = jest.fn((url: string | Request, options?: RequestInit): Promise<Response> => {
            if (url.toString().includes('/consulta-pps-uflo/api/login')) {
                const body = options?.body ? JSON.parse(options.body as string) : {};
                if (body.legajo === '99999' && body.password === 'password123') {
                    return Promise.resolve({
                        ok: true,
                        status: 200,
                        json: () => Promise.resolve({
                            message: 'Login exitoso',
                            user: {
                                legajo: '99999',
                                nombre: 'Estudiante de Prueba',
                            },
                        }),
                    } as Response);
                }
            }
            // Fallback for any other unmocked fetch calls
            return Promise.resolve({
                ok: false, status: 404, json: () => Promise.resolve({ message: 'Not Found' }),
            } as Response);
        });

        // Mock db methods for data fetching hooks
        mockedDb.estudiantes.get.mockResolvedValue([mockStudentDetails] as any);
        mockedDb.lanzamientos.getAll.mockResolvedValue([mockLanzamiento] as any);
        mockedDb.practicas.getAll.mockResolvedValue([]);
        mockedDb.solicitudes.getAll.mockResolvedValue([]);
        mockedDb.convocatorias.getAll.mockResolvedValue([]);
        mockedDb.instituciones.getAll.mockResolvedValue([]);
    });

    it('permite a un estudiante iniciar sesión, ver convocatorias e inscribirse', async () => {
        const user = userEvent.setup();

        const createRecordMock = jest.fn(
            (fields: any) => Promise.resolve({ id: 'new_conv_id', fields, createdTime: '' })
        );
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

        await user.type(legajoInput, '99999');
        await user.type(passwordInput, 'password123');
        await user.click(loginButton);
        
        // --- 2. Dashboard View ---
        await screen.findByText(/Buenos (días|tardes|noches), Estudiante./i);
        const ppsCard = await screen.findByText(/PPS de Integración/i);
        expect(ppsCard).toBeInTheDocument();
        
        // --- 3. Enrollment Flow ---
        const inscribirButton = await screen.findByRole('button', { name: /Postularme/i });
        await user.click(inscribirButton);

        const modal = await screen.findByRole('dialog', { name: /Formulario de Inscripción/i });
        const withinModal = within(modal);

        const horarioCheckbox = withinModal.getByLabelText('Lunes 9 a 13hs');
        await user.click(horarioCheckbox);

        const terminoCursarRadio = withinModal.getByLabelText('Sí');
        await user.click(terminoCursarRadio);

        const finalesAdeudadosRadio = await withinModal.findByLabelText('1 Final'); // findBy because it appears conditionally
        await user.click(finalesAdeudadosRadio);
        
        const otraSituacionTextarea = withinModal.getByLabelText(/Aclaraciones Adicionales/i);
        await user.type(otraSituacionTextarea, 'Prueba de integración E2E.');

        const submitButton = withinModal.getByRole('button', { name: /Inscribirme/i });
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