import type { NextApiRequest, NextApiResponse } from "next";
import { API_URL } from "../../../../lib/api-client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const { id } = req.query;
    const authHeader = req.headers.authorization;

    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    try {
        const backendRes = await fetch(`${API_URL}/questions/${id}/generate-summary`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
            },
        });

        if (!backendRes.ok) {
            const txt = await backendRes.text();
            return res.status(backendRes.status).send(txt);
        }

        const data = await backendRes.json();
        return res.status(200).json(data);
    } catch (e: any) {
        console.error("[generate-summary proxy] error:", e);
        return res.status(500).json({ error: e?.message || "Internal server error" });
    }
}
