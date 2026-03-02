import type { NextApiRequest, NextApiResponse } from "next";
import { API_URL } from "../../lib/api-client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { question_id, answer_text, reply_to_id, media_url } = req.body;
    const authHeader = req.headers.authorization;

    if (!question_id || !answer_text) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const postRes = await fetch(`${API_URL}/answers`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                ...(authHeader ? { Authorization: authHeader } : {}),
            },
            body: JSON.stringify({
                question_id: Number(question_id),
                answer_text,
                media_url,
                ...(reply_to_id != null ? { reply_to_id: Number(reply_to_id) } : {}),
            }),
        });

        if (!postRes.ok) {
            const txt = await postRes.text();
            return res.status(500).send(txt);
        }

        const data = await postRes.json();
        return res.status(200).json(data);
    } catch (e: any) {
        return res.status(500).json({ error: e?.message || "fetch failed" });
    }
}
