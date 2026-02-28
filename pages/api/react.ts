import type { NextApiRequest, NextApiResponse } from "next";
import { API_URL } from "../../lib/api-client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

    const { entity_type, entity_id, reaction_type } = req.body;
    if (!entity_type || entity_id == null || !reaction_type) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const postRes = await fetch(`${API_URL}/reactions/toggle`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: authHeader,
            },
            body: JSON.stringify({ entity_type, entity_id, reaction_type }),
        });

        if (!postRes.ok) {
            const txt = await postRes.text();
            return res.status(postRes.status).send(txt);
        }

        const data = await postRes.json();
        return res.status(200).json(data);
    } catch (e: any) {
        return res.status(500).json({ error: e?.message || "fetch failed" });
    }
}
