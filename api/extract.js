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
    const apiKey = process.env.GROQ_API_KEY;

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
            error: `RATE_LIMIT_EXCEEDED: Groq Intelligence Engine overloaded. Reset in ${waitTime}s.`
        });
    }

    userData.count++;
    RATE_LIMIT_MAP.set(ip, userData);
    // ---------------------------------------------------

    if (!apiKey) {
        return res.status(500).json({ error: 'GROQ_API_KEY not configured on server.' });
    }

    // Using Llama-3.3-70b-versatile on Groq: High-performance OpenAI-compatible endpoint.
    const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

    const prompt = `Act as Shadow Protocol AI. Generate a STRATEGIC REVENUE AUDIT for @${handle} in ${country}.
Data: ${currency}(${symbol}), target price ${symbol}${price}, 20% extraction floor.
Structure (MUST use ">" prefix on every output line):
> CREATOR OVERVIEW: [Direct, tactical profile assessment]
> THE NUMBERS: Assuming 1,000 core buyers at 20% floor — PROJECTED REVENUE: ${symbol}[calculate: 1000 * 0.20 * ${price}]
> DEMAND ANALYSIS: [High-intensity market gap analysis for ${country}]
Keep it sharp, ALL CAPS for keywords, and strictly one line per section. No markdown. Output ONLY ">" prefixed lines.`;

    try {
        const response = await fetch(GROQ_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.7,
                max_tokens: 512
            })
        });

        if (!response.ok) {
            const err = await response.json();
            return res.status(response.status).json({ error: err?.error?.message || 'Groq API Error' });
        }

        const data = await response.json();
        const text = data?.choices?.[0]?.message?.content || '';

        return res.status(200).json({ text: text.trim() });
    } catch (error) {
        console.error('API Error:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
