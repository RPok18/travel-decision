const RENDER_API_URL = "https://travel-decision.onrender.com";

const INTERNAL_API_URL = process.env.API_URL || RENDER_API_URL;
const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL || RENDER_API_URL;

// Use localhost only if we are explicitly in a local environment and no URL is provided
const isLocal = typeof window !== "undefined" && window.location.hostname === "localhost";
const fallback = isLocal ? "http://localhost:8000" : RENDER_API_URL;

export const API_URL = typeof window === "undefined"
  ? (process.env.API_URL || RENDER_API_URL)
  : (process.env.NEXT_PUBLIC_API_URL || fallback);

export const fetcher = async <T>(path: string): Promise<T> => {
  const url = `${API_URL}${path}`;
  console.log(`[Fetcher] Requesting: ${url}`);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} for ${url}`);
  }
  return response.json() as Promise<T>;
};

export const uploadFile = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append("file", file);

  const token = localStorage.getItem("access_token");
  const response = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers: {
      Authorization: token ? `Bearer ${token}` : "",
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status}`);
  }

  return response.json();
};



