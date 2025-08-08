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
        const client = getAiClient();
        const response = await client.models.generateContent({
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