import { describe, it, expect } from '@jest/globals';
import {
  formatDate,
  normalizeStringForComparison,
  getEspecialidadClasses,
  getStatusVisuals,
  parseToUTCDate,
} from '../formatters';

describe('formatters', () => {
  describe('formatDate', () => {
    it('should format an ISO date string correctly', () => {
      expect(formatDate('2023-10-27T10:00:00.000Z')).toBe('27/10/2023');
    });

    it('should format a DD/MM/YYYY date string correctly', () => {
      expect(formatDate('27/10/2023')).toBe('27/10/2023');
    });

    it('should handle undefined or null input gracefully', () => {
      expect(formatDate(undefined)).toBe('N/A');
    });

    it('should return "Fecha inválida" for invalid date strings', () => {
      expect(formatDate('not a date')).toBe('Fecha inválida');
      expect(formatDate('2023-20-20')).toBe('Fecha inválida'); // invalid month
    });
  });

  describe('normalizeStringForComparison', () => {
    it('should convert to lowercase, trim, and remove accents', () => {
      expect(normalizeStringForComparison('  Educación  ')).toBe('educacion');
      expect(normalizeStringForComparison('Clínica')).toBe('clinica');
      expect(normalizeStringForComparison('COMUNITARIA')).toBe('comunitaria');
    });
    
    it('should handle empty or undefined strings', () => {
        expect(normalizeStringForComparison('')).toBe('');
        expect(normalizeStringForComparison(undefined)).toBe('');
    });
  });
  
  describe('getEspecialidadClasses', () => {
    it('should return correct classes for a known especialidad', () => {
      const result = getEspecialidadClasses('Clinica');
      expect(result.tag).toContain('bg-green-100');
    });

    it('should return default classes for an unknown especialidad', () => {
      const result = getEspecialidadClasses('Psicoanalisis');
      expect(result.tag).toContain('bg-slate-100');
    });
  });

  describe('getStatusVisuals', () => {
    it('should return correct visuals for "En curso"', () => {
        const result = getStatusVisuals('En curso');
        expect(result.icon).toBe('sync');
        expect(result.labelClass).toContain('bg-yellow-100');
    });
    
    it('should return correct visuals for "Convenio Realizado"', () => {
        const result = getStatusVisuals('Convenio Realizado');
        expect(result.icon).toBe('fact_check');
        expect(result.labelClass).toContain('bg-blue-100');
    });

    it('should return default visuals for an unknown status', () => {
        const result = getStatusVisuals('Estado Raro');
        expect(result.icon).toBe('help_outline');
        expect(result.labelClass).toContain('bg-slate-100');
    });
  });

  describe('parseToUTCDate', () => {
    it('should parse YYYY-MM-DD format correctly', () => {
      const date = parseToUTCDate('2023-04-15');
      expect(date).not.toBeNull();
      expect(date?.getUTCFullYear()).toBe(2023);
      expect(date?.getUTCMonth()).toBe(3); // 0-indexed
      expect(date?.getUTCDate()).toBe(15);
    });

    it('should parse DD/MM/YYYY format correctly', () => {
      const date = parseToUTCDate('15/04/2023');
      expect(date).not.toBeNull();
      expect(date?.getUTCFullYear()).toBe(2023);
      expect(date?.getUTCMonth()).toBe(3);
      expect(date?.getUTCDate()).toBe(15);
    });

    it('should ignore time part and parse only the date', () => {
      const date = parseToUTCDate('2023-04-15T10:20:30Z');
      expect(date).not.toBeNull();
      expect(date?.getUTCDate()).toBe(15);
      expect(date?.getUTCHours()).toBe(0);
    });

    it('should return null for invalid date strings', () => {
      expect(parseToUTCDate('invalid-date')).toBeNull();
      expect(parseToUTCDate('2023-13-40')).toBeNull();
      expect(parseToUTCDate('32/01/2023')).toBeNull();
    });

    it('should return null for null or undefined input', () => {
      expect(parseToUTCDate(null as any)).toBeNull();
      expect(parseToUTCDate(undefined)).toBeNull();
    });
  });
});
