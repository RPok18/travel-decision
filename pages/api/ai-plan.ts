import type { NextApiRequest, NextApiResponse } from "next";
import { GoogleGenerativeAI } from "@google/generative-ai";

const SYSTEM_PROMPT = `You are TravelAI, an expert travel planning assistant for TravelThreads — a community platform for travel Q&A.

Your role is to help families, couples, solo travelers, and groups plan their trips. You provide:
- Personalized day-by-day itineraries
- Budget breakdowns (accommodation, food, transport, activities)
- Family-friendly activity recommendations when relevant
- Local tips, best seasons to visit, safety advice
- Neighborhood recommendations and transport options

Keep your responses friendly, practical, and well-structured using markdown. Use bullet points, headers, and emojis to make itineraries easy to read. Always ask clarifying questions if the user hasn't specified key details like group size, budget range, or trip duration.`;

interface Message {
    role: "user" | "model";
    content: string;
}

// In-line CORS implementation for Next.js API routes
const initCors = (req: NextApiRequest, res: NextApiResponse) => {
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    // Run CORS
    initCors(req, res);

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { messages }: { messages: Message[] } = req.body;

    if (!messages || messages.length === 0) {
        return res.status(400).json({ error: "messages are required" });
    }

    try {
        const provider = process.env.AI_PROVIDER || (process.env.OPENROUTER_API_KEY ? "openrouter" : "gemini");
        const modelName = process.env.AI_MODEL || (provider === "openrouter" ? "google/gemma-3-12b-it:free" : "gemini-1.5-flash");

        if (provider === "ollama") {
            // Ollama logic (for local development ONLY)
            const response = await fetch("http://localhost:11434/api/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: process.env.OLLAMA_MODEL || "llama3",
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        ...messages.map(m => ({
                            role: m.role === "model" ? "assistant" : "user",
                            content: m.content
                        }))
                    ],
                    stream: false,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Ollama request failed");
            }

            const data = await response.json();
            return res.status(200).json({ reply: data.message.content });

        } else if (provider === "openrouter") {
            // OpenRouter logic (Works on Vercel and in restricted regions)
            if (!process.env.OPENROUTER_API_KEY) {
                console.error("[OpenRouter] OPENROUTER_API_KEY environment variable is missing.");
                throw new Error("API Key configuration error on server");
            }

            console.log(`[OpenRouter] Sending request to OpenRouter using model: ${modelName}`);

            const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "HTTP-Referer": "https://travelthreads.vercel.app", // Needed for OpenRouter free tier
                    "X-Title": "TravelThreads AI Planner",
                },
                body: JSON.stringify({
                    model: modelName,
                    messages: [
                        { role: "system", content: SYSTEM_PROMPT },
                        ...messages.filter(m => m.content && typeof m.content === 'string') // Cleanup malformed messages
                            .map(m => ({
                                role: m.role === "model" ? "assistant" : "user",
                                content: m.content
                            }))
                    ],
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[OpenRouter] Request failed with status ${response.status}. Model: ${modelName}`);
                console.error(`[OpenRouter] Error details:`, errorText);
                try {
                    const errorData = JSON.parse(errorText);
                    const errorMessage = errorData.error?.message || errorData.error?.metadata?.message || `OpenRouter returned status ${response.status}`;
                    throw new Error(errorMessage);
                } catch (e: any) {
                    if (e.message && !e.message.includes("JSON")) throw e;
                    throw new Error(`External AI service returned an error (${response.status}): ${errorText.slice(0, 100)}`);
                }
            }

            const data = await response.json();

            if (!data || !data.choices || data.choices.length === 0) {
                console.error("[OpenRouter] Invalid response format received:", data);
                throw new Error("Invalid response from AI service");
            }

            return res.status(200).json({ reply: data.choices[0].message.content });

        } else {
            // Direct Gemini logic
            if (!process.env.GEMINI_API_KEY) {
                throw new Error("GEMINI_API_KEY is missing. Please set it or use OpenRouter.");
            }

            const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
            const model = genAI.getGenerativeModel({
                model: modelName,
                systemInstruction: SYSTEM_PROMPT,
            });

            const history = messages.slice(0, -1).map((m) => ({
                role: m.role,
                parts: [{ text: m.content }],
            }));

            const chat = model.startChat({ history });
            const lastMessage = messages[messages.length - 1];
            const result = await chat.sendMessage(lastMessage.content);

            return res.status(200).json({ reply: result.response.text() });
        }
    } catch (err: any) {
        console.error("[AI Plan API Error] Detailed traceback:", err);
        return res.status(500).json({ error: err.message || "An unexpected error occurred processing your request." });
    }
}
