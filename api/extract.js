/**
 * SHADOW_PROTOCOL API GATEWAY
 * Securely proxies requests to Gemini AI using environment variables.
 */
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { handle, country, currency, symbol, price } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server.' });
    }

    // Using gemini-1.5-flash (Stable) on v1 API for broadest compatibility
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const prompt = `You are the Shadow Protocol AI for A&M Operations — a ruthless, high-precision revenue extraction system.

A creator has submitted their data for analysis:
- Instagram Handle: @${handle}
- Target Market: ${country}
- Currency: ${currency} (${symbol})
- Target Product Price: ${symbol}${price}
- Extraction Model: 20% conversion floor on engaged audience

Your task: Generate a sharp, cold, tactical shadow monetization analysis in terminal style. Use ALL CAPS for key terms. Be brutally direct. No fluff.

Structure your response EXACTLY like this (each point on its own line, prefixed with ">"):
> [1-2 line market intelligence assessment for ${country}]
> [1 line on the creator's monetization gap]
> [1 line on the recommended offer architecture]
> EXTRACTION CALCULATION: Assuming 1,000 hyper-engaged buyers at 20% floor — PROJECTED MONTHLY REVENUE: ${symbol}[calculate: 1000 * 0.20 * ${price} formatted with commas]
> [1 closing line — cold, confident, final]

Keep each line under 90 characters. Output ONLY the ">" prefixed lines. No headers, no markdown, no explanation.`;

    try {
        const response = await fetch(GEMINI_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.8,
                    maxOutputTokens: 512,
                }
            })
        });

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err?.error?.message || 'Gemini API Error' });
        }

        const data = await response.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';

        return res.status(200).json({ text: text.trim() });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
