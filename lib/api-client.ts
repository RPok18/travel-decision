const LOCAL_API_URL = "http://localhost:8000";
const RENDER_API_URL = "https://travel-decision.onrender.com";

const isProduction = process.env.NODE_ENV === "production";

export const API_URL = typeof window === "undefined"
  ? (process.env.API_URL || (isProduction ? RENDER_API_URL : LOCAL_API_URL))
  : (process.env.NEXT_PUBLIC_API_URL || (isProduction ? RENDER_API_URL : LOCAL_API_URL));

export const fetcher = async <T>(path: string, token?: string): Promise<T> => {
  const url = `${API_URL}${path}`;
  console.log(`[Fetcher] Requesting: ${url}`);
  const response = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} for ${url}`);
  }
  return response.json() as Promise<T>;
};

export const authedFetcher = async <T>(path: string): Promise<T> => {
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null;
  return fetcher<T>(path, token || undefined);
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