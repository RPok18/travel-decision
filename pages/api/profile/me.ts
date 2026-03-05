import type { NextApiRequest, NextApiResponse } from "next";
import { API_URL } from "../../../lib/api-client";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const token = req.headers.authorization;

    try {
        const response = await fetch(`${API_URL}/users/profile/me`, {
            method: req.method,
            headers: {
                "Content-Type": "application/json",
                Authorization: token || "",
            },
            body: req.method === "PUT" ? JSON.stringify(req.body) : undefined,
        });

        if (!response.ok) {
            const txt = await response.text();
            return res.status(response.status).send(txt);
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        console.error("Profile proxy error:", error);
        res.status(500).json({ error: "Internal server error" });
    }
}
