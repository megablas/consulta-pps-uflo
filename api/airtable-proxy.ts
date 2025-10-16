import type { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const { airtablePath } = req.query;

    if (!airtablePath || typeof airtablePath !== 'string') {
        return res.status(400).json({ error: { message: 'Airtable path is missing in query parameters.' }});
    }

    // The received path is already decoded. e.g., "baseId/Table Name/recordId"
    // We need to re-encode the parts that might contain special characters,
    // which are the table name and record ID, but not the slashes.
    const path = airtablePath.split('/').map(segment => encodeURIComponent(segment)).join('/');

    // Rebuild the query string without our custom parameter
    const clientParams = new URLSearchParams(req.url?.split('?')[1] || '');
    clientParams.delete('airtablePath');
    const finalQuery = clientParams.toString() ? `?${clientParams.toString()}` : '';

    const AIRTABLE_PAT = process.env.AIRTABLE_PAT;
    
    if (!AIRTABLE_PAT) {
        return res.status(500).json({ error: { message: 'Airtable API token is not configured.' }});
    }

    const airtableApiUrl = `https://api.airtable.com/v0/${path}${finalQuery}`;

    try {
        const airtableResponse = await fetch(airtableApiUrl, {
            method: req.method,
            headers: {
                'Authorization': `Bearer ${AIRTABLE_PAT}`,
                'Content-Type': req.headers['content-type'] || 'application/json',
            },
            body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : null,
        });

        res.status(airtableResponse.status);
        
        airtableResponse.headers.forEach((value, name) => {
            if (name.toLowerCase() !== 'content-encoding' && name.toLowerCase() !== 'transfer-encoding') {
                 res.setHeader(name, value);
            }
        });

        if (airtableResponse.body) {
            const reader = airtableResponse.body.getReader();
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
            res.end();
        } else {
             res.end();
        }

    } catch (error) {
        console.error('Error proxying to Airtable:', error);
        res.status(500).json({ error: { message: 'An error occurred while contacting the Airtable API.' }});
    }
}