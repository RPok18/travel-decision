import type { NextApiRequest, NextApiResponse } from "next";
import { API_URL } from "../../lib/api-client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "DELETE") return res.status(405).json({ error: "Method not allowed" });

    const { question_id } = req.body;
    const authHeader = req.headers.authorization;

    if (!question_id) {
        return res.status(400).json({ error: "question_id is required" });
    }

    try {
        const backendRes = await fetch(`${API_URL}/questions/${question_id}`, {
            method: "DELETE",
            headers: {
                "Authorization": authHeader || ""
            }
        });

        if (!backendRes.ok) {
            const txt = await backendRes.text();
            return res.status(500).send(txt);
        }

        return res.status(200).json({ status: "ok" });
    } catch (e: any) {
        return res.status(500).json({ error: e?.message || "fetch failed" });
    }
}
