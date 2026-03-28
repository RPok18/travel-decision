import type { NextApiRequest, NextApiResponse } from "next";
import { API_URL } from "../../../lib/api-client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { id } = req.query;
    const authHeader = req.headers.authorization;

    if (req.method === "GET") {
        try {
            const backendRes = await fetch(`${API_URL}/cards/${id}`, {
                headers: {
                    ...(authHeader ? { Authorization: authHeader } : {}),
                },
            });

            if (!backendRes.ok) {
                const txt = await backendRes.text();
                return res.status(backendRes.status).send(txt);
            }

            const data = await backendRes.json();
            return res.status(200).json(data);
        } catch (e: any) {
            return res.status(500).json({ error: e?.message || "Internal server error" });
        }
    }

    if (req.method === "PUT") {
        if (!authHeader) return res.status(401).json({ error: "Unauthorized" });

        try {
            const backendRes = await fetch(`${API_URL}/cards/${id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: authHeader,
                },
                body: JSON.stringify(req.body),
            });

            if (!backendRes.ok) {
                const txt = await backendRes.text();
                return res.status(backendRes.status).send(txt);
            }

            const data = await backendRes.json();
            return res.status(200).json(data);
        } catch (e: any) {
            return res.status(500).json({ error: e?.message || "Internal server error" });
        }
    }

    return res.status(405).json({ error: "Method not allowed" });
}
