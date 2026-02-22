import type { NextApiRequest, NextApiResponse } from "next";

import { API_URL } from "../../lib/api-client";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const question_text = String(req.body?.question_text || "").trim();
  if (!question_text) return res.status(400).json({ error: "question_text is required" });

  const authHeader = req.headers.authorization;

  try {
    const r = await fetch(`${API_URL}/feed`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(authHeader ? { "Authorization": authHeader } : {})
      },
      body: JSON.stringify({ question_text }),
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(500).send(txt);
    }

    // после создания просто редиректим на главную, чтобы лента обновилась
    res.writeHead(302, { Location: "/" });
    res.end();
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || "fetch failed" });
  }
}
