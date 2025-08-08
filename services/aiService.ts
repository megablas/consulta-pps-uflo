import { GoogleGenAI, Type } from "@google/genai";
import type { SolicitudPPS } from '../types';
import { 
    FIELD_EMPRESA_PPS_SOLICITUD, 
    FIELD_ESTADO_PPS, 
    FIELD_NOTAS_PPS, 
    FIELD_ULTIMA_ACTUALIZACION_PPS,
    FIELD_LEGAJO_PPS,
    FIELD_NOMBRE_ESTUDIANTE_LOOKUP_PPS
} from '../constants';

// This assumes process.env.API_KEY is available in the execution environment.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const nameSchema = {
    type: Type.OBJECT,
    properties: {
        nombre: {
            type: Type.STRING,
            description: 'The first name or names of the person.',
        },
        apellido: {
            type: Type.STRING,
            description: 'The last name or names (surnames) of the person.',
        },
    },
    required: ['nombre', 'apellido'],
};

const simpleNameSplit = (fullName: string): { nombre: string; apellido: string } => {
    let nombre = '';
    let apellido = '';
    if (fullName.includes(',')) {
        const parts = fullName.split(',').map(p => p.trim());
        apellido = parts[0] || '';
        nombre = parts[1] || '';
    } else {
        const nameParts = fullName.trim().split(' ').filter(Boolean);
        if (nameParts.length > 1) {
            apellido = nameParts.pop()!;
            nombre = nameParts.join(' ');
        } else {
            nombre = fullName;
        }
    }
    return { nombre, apellido };
};


/**
 * Splits a full name into first and last names using the Gemini API.
 * Falls back to a simple string split if the API call fails or returns an invalid structure.
 * @param fullName The full name to split.
 * @returns An object with `nombre` and `apellido` properties.
 */
export async function splitNameWithAI(fullName: string): Promise<{ nombre: string; apellido: string }> {
    if (!fullName || !fullName.trim()) {
        return { nombre: '', apellido: '' };
    }

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Accurately separate the following full name into first name(s) and last name(s). Full Name: "${fullName}"`,
            config: {
                responseMimeType: "application/json",
                responseSchema: nameSchema,
                temperature: 0, // Be deterministic for this task
            },
        });
        
        const jsonStr = response.text.trim();
        const parsed = JSON.parse(jsonStr);
        
        // Validate the parsed object has the required fields
        if (parsed && typeof parsed.nombre === 'string' && typeof parsed.apellido === 'string') {
            return {
                nombre: parsed.nombre,
                apellido: parsed.apellido,
            };
        }
        
        console.warn(`AI name split for "${fullName}" returned invalid JSON. Falling back.`, parsed);
        return simpleNameSplit(fullName);


    } catch (error) {
        console.error(`AI name split failed for "${fullName}". Falling back to simple logic. Error:`, error);
        return simpleNameSplit(fullName);
    }
}


export async function generateFollowUpReport(solicitudes: SolicitudPPS[]): Promise<string> {
    if (solicitudes.length === 0) {
        return "No hay solicitudes activas para analizar.";
    }

    const prompt = `
    Eres un asistente experto para un coordinador de pasantías universitarias. Tu tarea es analizar una lista de solicitudes de pasantías (PPS) activas y generar un informe de seguimiento claro y accionable.

    La fecha de hoy es ${new Date().toLocaleDateString('es-ES')}.

    Tu objetivo principal es identificar las solicitudes que están estancadas y necesitan atención. Una solicitud se considera estancada si ha pasado mucho tiempo (por ejemplo, más de 2-3 semanas) en un estado inicial como "Puesta en contacto" o "En conversaciones" sin ninguna actualización reciente en las notas.

    Analiza la siguiente lista de solicitudes. Para cada una, considera el estado actual, las notas y la fecha de la última actualización para determinar qué acción, si alguna, se necesita.

    Formato del informe:
    - Comienza con un resumen general.
    - Luego, crea una sección para cada solicitud que REQUIERE ACCIÓN. Usa Markdown para el formato (### para títulos, ** para negrita, - para listas).
    - Para cada solicitud que requiera acción, proporciona:
        - El nombre de la institución y el estudiante.
        - Un resumen del problema (ej: "Han pasado 4 semanas sin contacto.").
        - Una recomendación CLARA y DIRECTA (ej: "Acción recomendada: Enviar un correo de seguimiento para consultar el estado.").
    - Si ninguna solicitud requiere acción, simplemente indícalo.
    - Sé conciso y profesional.

    Aquí están las solicitudes para analizar:
    ${solicitudes.map(s => `
    ---
    Institución: ${s[FIELD_EMPRESA_PPS_SOLICITUD] || 'N/A'}
    Estudiante: ${s[FIELD_NOMBRE_ESTUDIANTE_LOOKUP_PPS]?.[0] || 'N/A'} (Legajo: ${s[FIELD_LEGAJO_PPS] || 'N/A'})
    Estado Actual: ${s[FIELD_ESTADO_PPS] || 'N/A'}
    Última Actualización: ${s[FIELD_ULTIMA_ACTUALIZACION_PPS] ? new Date(s[FIELD_ULTIMA_ACTUALIZACION_PPS]).toLocaleDateString('es-ES') : 'N/A'}
    Notas: ${s[FIELD_NOTAS_PPS] || 'Sin notas.'}
    ---
    `).join('')}

    Genera el informe de seguimiento.
    `;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: prompt,
        });
        
        return response.text;

    } catch (error) {
        console.error('Error generating follow-up report with AI:', error);
        throw new Error('La IA no pudo generar el informe. Por favor, inténtelo de nuevo más tarde.');
    }
}