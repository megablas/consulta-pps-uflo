import fs from 'fs/promises';
import path from 'path';
import dotenv from 'dotenv';
// FIX: Importing 'process' to ensure correct types and access to Node.js APIs in an ESM context.
import process from 'node:process';

// Cargar variables de entorno desde .env
dotenv.config();

const { VITE_AIRTABLE_PAT, VITE_AIRTABLE_BASE_ID } = process.env;
const OUTPUT_FILE = path.resolve(process.cwd(), 'src', 'airtable.schema.json');

async function fetchAirtableSchema() {
  if (!VITE_AIRTABLE_PAT || !VITE_AIRTABLE_BASE_ID) {
    throw new Error('Asegúrate de que VITE_AIRTABLE_PAT y VITE_AIRTABLE_BASE_ID están definidos en tu archivo .env');
  }

  console.log('Obteniendo esquema de la base de Airtable...');
  const url = `https://api.airtable.com/v0/meta/bases/${VITE_AIRTABLE_BASE_ID}/tables`;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${VITE_AIRTABLE_PAT}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Error al obtener el esquema de Airtable: ${response.status} ${response.statusText}\n${errorText}`);
    }

    const { tables } = await response.json();
    console.log(`Se encontraron ${tables.length} tablas. Procesando...`);

    const schema = tables.map((table) => ({
      id: table.id,
      name: table.name,
      primaryField: table.primaryFieldId,
      fields: table.fields.map((field) => ({
        id: field.id,
        name: field.name,
        type: field.type,
        options: field.options,
      })),
    }));

    await fs.writeFile(OUTPUT_FILE, JSON.stringify(schema, null, 2));
    console.log(`\n✅ Esquema de Airtable guardado exitosamente en: ${OUTPUT_FILE}`);
    console.log('Por favor, incluye el contenido de este archivo en tus futuras solicitudes.');

  } catch (error) {
    console.error('\n❌ Error al generar el esquema de Airtable:', error);
    process.exit(1);
  }
}

fetchAirtableSchema();