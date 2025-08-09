import { GoogleGenAI, Type } from "@google/genai";

let ai: GoogleGenAI | null = null;

// Lazily initialize the AI client to prevent app crash on load
// if the environment variable is not set.
const getAiClient = (): GoogleGenAI => {
    if (!ai) {
        // This assumes process.env.API_KEY is available in the execution environment.
        ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    }
    return ai;
};


const nameSchema = {
    type: Type.OBJECT,
    properties: {
        nombre: {
            type: Type.STRING,
            description: 'El primer nombre o nombres de pila de la persona.',
        },
        apellido: {
            type: Type.STRING,
            description: 'El apellido o apellidos de la persona.',
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
        const client = getAiClient();
        const response = await client.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Separa el siguiente nombre completo en nombre de pila y apellido: "${fullName}"`,
            config: {
                systemInstruction: `Eres un experto asistente de base de datos para normalizar nombres de Argentina. Tu tarea es separar un nombre completo en 'nombre' (pila) y 'apellido'.
- Si hay una coma, el texto antes es el apellido (ej: "García, Juan" -> apellido: "García", nombre: "Juan").
- Si no hay coma, la última o las dos últimas palabras suelen ser el apellido (ej: "Juan Pérez García" -> apellido: "Pérez García", nombre: "Juan").
- Presta atención a conectores como "de", "de la", "del" que forman parte de los apellidos.
- Tu respuesta debe ser solo un objeto JSON, sin texto adicional ni markdown.`,
                responseMimeType: "application/json",
                responseSchema: nameSchema,
                temperature: 0,
            },
        });
        
        const jsonStr = response.text.trim();
        // It's possible the model still wraps the JSON in markdown backticks, though the prompt now forbids it.
        const cleanJsonStr = jsonStr.replace(/^```json\s*/, '').replace(/```$/, '');
        const parsed = JSON.parse(cleanJsonStr);
        
        // Validate the parsed object has the required fields
        if (parsed && typeof parsed.nombre === 'string' && typeof parsed.apellido === 'string') {
            return {
                nombre: parsed.nombre.trim(),
                apellido: parsed.apellido.trim(),
            };
        }
        
        console.warn(`AI name split for "${fullName}" returned invalid JSON. Falling back.`, parsed);
        return simpleNameSplit(fullName);


    } catch (error) {
        console.error(`AI name split failed for "${fullName}". Falling back to simple logic. Error:`, error);
        return simpleNameSplit(fullName);
    }
}