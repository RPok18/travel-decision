import type { NextApiRequest, NextApiResponse } from "next";
import { API_URL } from "../../lib/api-client";

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    const token = req.headers.authorization;

    try {
        const response = await fetch(`${API_URL}/profile`, {
            method: "GET",
            headers: {
                Authorization: token || "",
            },
        });

        if (!response.ok) {
            return res.status(response.status).json({ error: "Failed to fetch profile" });
        }

        const data = await response.json();
        res.status(200).json(data);
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
}
