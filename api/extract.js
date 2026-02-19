/**
 * SHADOW_PROTOCOL API GATEWAY
 * Securely proxies requests to Gemini AI using environment variables.
 * Includes basic in-memory rate limiting (5 RPM).
 */

const RATE_LIMIT_MAP = new Map();
const LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_REQUESTS = 5;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { handle, country, currency, symbol, price } = req.body;
    const apiKey = process.env.GEMINI_API_KEY;

    // --- Basic In-Memory Rate Limiting (Per-Instance) ---
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'global';
    const now = Date.now();
    const userData = RATE_LIMIT_MAP.get(ip) || { count: 0, resetAt: now + LIMIT_WINDOW };

    if (now > userData.resetAt) {
        userData.count = 0;
        userData.resetAt = now + LIMIT_WINDOW;
    }

    if (userData.count >= MAX_REQUESTS) {
        const waitTime = Math.ceil((userData.resetAt - now) / 1000);
        return res.status(429).json({
            error: `RATE_LIMIT_EXCEEDED: Shadow Intelligence Engine overloaded. Reset in ${waitTime}s.`
        });
    }

    userData.count++;
    RATE_LIMIT_MAP.set(ip, userData);
    // ---------------------------------------------------

    if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY not configured on server.' });
    }

    // Using gemini-2.0-flash on v1: Latest high-performance model for 2026.
    const GEMINI_URL = `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    const prompt = `Shadow Protocol AI: Revenue Extraction.
Data: @${handle}, ${country}, ${currency}(${symbol}), ${symbol}${price}, 20% floor.
Task: Tactical analysis. ALL CAPS. Direct. No fluff.
Format:
> [Market]
> [Gap]
> [Architecture]
> EXTRACTION: 1k buyers @ 20% floor — PROJECTED REVENUE: ${symbol}[1000*0.20*${price}]
> [Final]
Output ONLY ">" lines. Max 90ch.`;

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
