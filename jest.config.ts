import type { Config } from 'jest';

const config: Config = {
  // Indica que el entorno de prueba es un entorno similar al de un navegador
  testEnvironment: 'jsdom',

  // Una lista de rutas a módulos que ejecutan código para configurar el framework de pruebas antes de cada prueba
  setupFilesAfterEnv: ['<rootDir>/jest-setup.ts'],

  // El preset es una configuración base que utiliza Jest
  preset: 'ts-jest',

  // Un mapa de expresiones regulares a nombres de módulos que permite simular recursos con un solo módulo
  moduleNameMapper: {
    // Manejar alias de módulos (esto se configurará automáticamente pronto)
    '^@/(.*)$': '<rootDir>/src/$1',
  },

  // Agregado para que Jest sepa cómo transformar archivos TypeScript
  transform: {
    '^.+\\.(ts|tsx)$': 'ts-jest',
  },
};

export default config;
