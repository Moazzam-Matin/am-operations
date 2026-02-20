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

    const prompt = `Act as a Shadow Protocol Social Media Data Analyst. Generate a HIGH-LEVEL STRATEGIC REVENUE AUDIT for @${handle} in ${country}.
Analyze the niche of @${handle} and identify or simulate its growth patterns.
Protocol:
1. FOLLOWER_BASE: You MUST provide a specific follower count for @${handle}. Do NOT use ranges (e.g., 1M-2M). Use a specific, genuine-looking integer like "1,245,670" or "45,231". If the specific handle is not in your direct training data, simulate a realistic count based on the username's niche and typical engagement for similar profiles.
2. QUALITY_SCORE: Assign 0-100% based on audience authenticity.
3. REGIONAL_PROTOCOL: If @${handle} has a Desi/Indian audience, provide REVENUE POTENTIAL in INR (₹), adjusting for local market metrics.
4. REVENUE_TAX: Revenue Potential Floor = (Followers * (QualityScore/100) * 0.01) * Price.

Structure (MUST use ">" prefix on every line):
> CREATOR AUDIT: [Identify Niche + Profile assessment]
> FOLLOWER BASE: [Specific Integer]
> AUDIENCE QUALITY: [QUALITY_SCORE]%
> ENGAGEMENT RATE: [Realistic percentage based on niche]
> EXTRACTION POTENTIAL: [Calculate: Followers * (QualityScore/100) * EngagementRate as high-value active engagers]
> REVENUE POTENTIAL FLOOR: ${symbol}[Final calculation based on Revenue_Tax protocol]
> TACTICAL ANALYSIS: [Market gap analysis for ${country}.]
Keep it sharp, ALL CAPS for keywords, one line per section. Output ONLY ">" prefixed lines.`;

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
