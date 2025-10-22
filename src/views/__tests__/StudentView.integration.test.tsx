import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../App';
import * as airtableService from '../../services/airtableService';
import {
    AIRTABLE_TABLE_NAME_AUTH_USERS,
    AIRTABLE_TABLE_NAME_ESTUDIANTES,
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    FIELD_LEGAJO_AUTH,
    FIELD_SALT_AUTH,
    FIELD_PASSWORD_HASH_AUTH,
    FIELD_NOMBRE_AUTH,
    FIELD_LEGAJO_ESTUDIANTES,
    FIELD_NOMBRE_ESTUDIANTES,
    FIELD_NOMBRE_PPS_LANZAMIENTOS,
    FIELD_ORIENTACION_LANZAMIENTOS,
    FIELD_ESTADO_CONVOCATORIA_LANZAMIENTOS,
    FIELD_HORARIO_SELECCIONADO_LANZAMIENTOS,
    FIELD_FECHA_INICIO_LANZAMIENTOS,
    FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS,
    FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_CONVOCATORIAS,
} from '../../constants';

// Mock the entire airtableService module
jest.mock('../../services/airtableService');
const mockedAirtable = airtableService as jest.Mocked<typeof airtableService>;

// --- Mock Data ---
const mockStudentUserAuth = {
    [FIELD_LEGAJO_AUTH]: '99999',
    [FIELD_NOMBRE_AUTH]: 'Estudiante de Prueba',
    [FIELD_SALT_AUTH]: 'mock_salt',
    [FIELD_PASSWORD_HASH_AUTH]: 'mock_hash_of_password123',
};

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

// Mock the hash verification to always return true for the test password
// FIX: Cast the result of jest.requireActual to 'object' to satisfy TypeScript's spread operator constraint.
jest.mock('../../utils/auth', () => ({
    ...(jest.requireActual('../../utils/auth') as object),
    verifyPassword: jest.fn(async (password: string) => password === 'password123'),
}));


describe('Flujo de Inscripción de Estudiante (Integration Test)', () => {

    beforeEach(() => {
        jest.clearAllMocks();
        
        // Start as logged out
        Storage.prototype.getItem = jest.fn((key) => null);

        mockedAirtable.fetchAllAirtableData.mockImplementation(async (tableName: string): Promise<any> => {
            if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES) {
                 return { records: [mockStudentDetails], error: null };
            }
            if (tableName === AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS) {
                return { records: [mockLanzamiento], error: null };
            }
            // Return empty for other dashboard calls
            return { records: [], error: null };
        });
        
        mockedAirtable.fetchAirtableData.mockImplementation(async (tableName: any, fields: any, filterByFormula: any): Promise<any> => {
            if (tableName === AIRTABLE_TABLE_NAME_AUTH_USERS && filterByFormula?.includes("'99999'")) {
                return { records: [{ id: 'recAuthUserTest', fields: mockStudentUserAuth }], error: null };
            }
            if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES && filterByFormula?.includes("'99999'")) {
                 return { records: [mockStudentDetails], error: null };
            }
            return { records: [], error: null };
        });
    });

    it('permite a un estudiante iniciar sesión, ver convocatorias e inscribirse', async () => {
        const user = userEvent.setup();

        const createRecordMock = jest.fn(
            (tableName: string, fields: any) => Promise.resolve({ record: { id: 'new_conv_id', fields, createdTime: '' }, error: null })
        );
        (mockedAirtable.createAirtableRecord as jest.Mock).mockImplementation(createRecordMock);

        render(<App />);

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

        const [tableName, fields] = createRecordMock.mock.calls[0];
        
        expect(tableName).toBe(AIRTABLE_TABLE_NAME_CONVOCATORIAS);
        expect(fields).toEqual(expect.objectContaining({
            [FIELD_LANZAMIENTO_VINCULADO_CONVOCATORIAS]: [mockLanzamiento.id],
            [FIELD_ESTUDIANTE_INSCRIPTO_CONVOCATORIAS]: [mockStudentDetails.id],
            // Zod schema transforms horario to string
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