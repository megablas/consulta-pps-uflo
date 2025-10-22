import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { airtablePath } = req.query;

    if (!airtablePath || typeof airtablePath !== 'string') {
        return res.status(400).json({ error: { type: 'BAD_REQUEST', message: 'airtablePath query parameter is required.' }});
    }

    // The received path is already decoded by Vercel (e.g., "Table Name" from "Table%20Name").
    // We need to re-encode each segment of the path to ensure it's a valid URL component.
    const path = airtablePath.split('/').map(segment => encodeURIComponent(segment)).join('/');

    // Rebuild the client's query string, removing our internal parameter.
    const clientParams = new URLSearchParams(req.url?.split('?')[1] || '');
    clientParams.delete('airtablePath');
    const finalQuery = clientParams.toString() ? `?${clientParams.toString()}` : '';

    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    
    if (!AIRTABLE_PAT) {
        return res.status(500).json({ error: { type: 'SERVER_CONFIG_ERROR', message: 'Airtable API token is not configured on the server.' }});
    }

    const airtableApiUrl = `https://api.airtable.com/v0/${path}${finalQuery}`;

    try {
        const airtableResponse = await fetch(airtableApiUrl, {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                // Only forward Content-Type for methods that have a body.
                ...(req.method !== 'GET' && req.headers['content-type'] && { 'Content-Type': req.headers['content-type'] }),
            },
            // Only forward body for relevant methods.
            body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
        });

        // Get the response body as text to handle all cases (JSON, errors, empty).
        const responseBodyText = await airtableResponse.text();
        
        // Try to parse as JSON, but fall back to null if it's not valid JSON (e.g., empty string).
        let responseData = null;
        try {
            if (responseBodyText) {
                responseData = JSON.parse(responseBodyText);
            }
        } catch (e) {
            // If JSON parsing fails, it might be a non-JSON error from Airtable or an intermittent issue.
            // We'll log it and send the raw text if possible.
            console.error(`Airtable response was not valid JSON for URL: ${airtableApiUrl}. Body:`, responseBodyText);
            return res.status(502).json({ error: { type: 'BAD_GATEWAY', message: 'Invalid response from Airtable API.', body: responseBodyText } });
        }
        
        // Forward the status code and JSON data from Airtable.
        res.status(airtableResponse.status).json(responseData);

    } catch (error) {
        console.error('Error proxying to Airtable:', error);
        res.status(500).json({ error: { type: 'PROXY_ERROR', message: 'An internal error occurred while contacting the Airtable API.' }});
    }
}