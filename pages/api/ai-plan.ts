import { GoogleGenerativeAI } from "@google/generative-ai";
import type { NextApiRequest, NextApiResponse } from "next";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

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

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== "POST") {
        return res.status(405).json({ error: "Method not allowed" });
    }

    const { messages }: { messages: Message[] } = req.body;

    if (!messages || messages.length === 0) {
        return res.status(400).json({ error: "messages are required" });
    }

    try {
        const model = genAI.getGenerativeModel({
            model: "gemini-1.5-flash",
            systemInstruction: SYSTEM_PROMPT,
        });

        // Convert messages to Gemini history format (all except the last one)
        const history = messages.slice(0, -1).map((m) => ({
            role: m.role,
            parts: [{ text: m.content }],
        }));

        const chat = model.startChat({ history });

        const lastMessage = messages[messages.length - 1];
        const result = await chat.sendMessage(lastMessage.content);
        const text = result.response.text();

        return res.status(200).json({ reply: text });
    } catch (err: any) {
        console.error("AI plan error:", err);
        return res.status(500).json({ error: err.message || "AI request failed" });
    }
}
