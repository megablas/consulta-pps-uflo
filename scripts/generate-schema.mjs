import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
// FIX: Import `cwd` and `exit` from `node:process` to resolve TypeScript errors.
import { cwd, exit } from 'node:process';

// Cargar variables de entorno desde .env
dotenv.config();

const { VITE_AIRTABLE_PAT, VITE_AIRTABLE_BASE_ID } = process.env;
const OUTPUT_FILE = path.resolve(cwd(), 'src', 'airtable.schema.json');

async function fetchAirtableSchema() {
  if (!VITE_AIRTABLE_PAT || !VITE_AIRTABLE_BASE_ID) {
    throw new Error('Asegúrate de que VITE_AIRTABLE_PAT y VITE_AIRTABLE_BASE_ID están definidos en tu archivo .env');
  }

  try {
    console.log(`Fetching schema for base ID: ${VITE_AIRTABLE_BASE_ID}...`);
    const response = await fetch(`https://api.airtable.com/v0/meta/bases/${VITE_AIRTABLE_BASE_ID}/tables`, {
      headers: {
        Authorization: `Bearer ${VITE_AIRTABLE_PAT}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al obtener el schema de Airtable: ${response.status} ${errorText}`);
    }

    const schema = await response.json();
    await fs.writeFile(OUTPUT_FILE, JSON.stringify(schema, null, 2));
    console.log(`✅ Schema de Airtable guardado en ${OUTPUT_FILE}`);
  } catch (error) {
    console.error('❌ Falló la obtención del schema:', error);
    exit(1);
  }
}

fetchAirtableSchema();
