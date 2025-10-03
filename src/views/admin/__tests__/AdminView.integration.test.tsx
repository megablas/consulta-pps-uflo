// FIX: Imported '@testing-library/jest-dom' to provide custom matchers like 'toBeInTheDocument' and resolve TypeScript errors.
import '@testing-library/jest-dom';
import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import React from 'react';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../../../App'; // Renderizar App es más fácil para obtener todos los contextos
import * as airtableService from '../../../services/airtableService';
import {
    AIRTABLE_TABLE_NAME_ESTUDIANTES,
    AIRTABLE_TABLE_NAME_PRACTICAS,
    AIRTABLE_TABLE_NAME_PPS,
    AIRTABLE_TABLE_NAME_CONVOCATORIAS,
    AIRTABLE_TABLE_NAME_LANZAMIENTOS_PPS,
    AIRTABLE_TABLE_NAME_INSTITUCIONES,
    AIRTABLE_TABLE_NAME_FINALIZACION,
} from '../../../constants';

// Simular todo el módulo de airtableService
jest.mock('../../../services/airtableService');
const mockedAirtable = airtableService as jest.Mocked<typeof airtableService>;

// --- Datos Simulados ---
const mockAdminUser = { legajo: 'admin', nombre: 'Super Usuario', role: 'SuperUser' };

const mockStudentForSearch = {
    id: 'recStudent123',
    createdTime: '2023-01-01T00:00:00.000Z',
    fields: {
        'Legajo': '12345',
        'Nombre': 'Juana Molina',
    }
};

const mockStudentDetails = {
    id: 'recStudent123',
    createdTime: '2023-01-01T00:00:00.000Z',
    fields: {
        'Legajo': '12345',
        'Nombre': 'Juana Molina',
        'Orientación Elegida': 'Clinica',
        'DNI': 12345678,
        'Correo': 'juana.m@test.com'
    }
};

const mockPracticas = [
    {
        id: 'recPracticaABC',
        createdTime: '2023-01-01T00:00:00.000Z',
        fields: {
            'Nombre (de Institución)': ['Hospital Central'],
            'Especialidad': 'Clinica',
            'Horas Realizadas': 100,
            'Fecha de Inicio': '2023-01-01',
            'Fecha de Finalización': '2023-03-01',
            'Estado': 'Finalizada',
            'Nota': 'Sin calificar',
            'Legajo Busqueda': ['12345'],
            'Estudiante Inscripto': ['recStudent123'],
        }
    }
];

describe('Flujo de Integración del Administrador', () => {

    beforeEach(() => {
        // Limpiar mocks antes de cada prueba
        jest.clearAllMocks();
        
        // Simular sessionStorage para AuthContext para que el usuario admin esté logueado
        Storage.prototype.getItem = jest.fn((key) => {
            if (key === 'authenticatedUser') {
                return JSON.stringify(mockAdminUser);
            }
            return null;
        });

        // Configurar la simulación de la API para todas las llamadas esperadas
        mockedAirtable.fetchAllAirtableData.mockImplementation(async (tableName: string, fields?: string[], filterByFormula?: string): Promise<any> => {
            // Búsqueda de AdminSearch
            if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES && filterByFormula?.includes('juana molina')) {
                return { records: [mockStudentForSearch], error: null };
            }
            // useStudentData para el dashboard del alumno
            if (tableName === AIRTABLE_TABLE_NAME_ESTUDIANTES && filterByFormula?.includes("'12345'")) {
                return { records: [mockStudentDetails], error: null };
            }
            // useStudentPracticas
            if (tableName === AIRTABLE_TABLE_NAME_PRACTICAS && filterByFormula?.includes('12345')) {
                