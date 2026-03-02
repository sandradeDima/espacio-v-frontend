const rawBaseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:1001";

function normalizeBaseUrl(value: string): string {
  const trimmed = value.trim().replace(/\/+$/, "");
  if (!trimmed) return "http://localhost:1001";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `http://${trimmed}`;
}

export const API_BASE_URL = normalizeBaseUrl(rawBaseUrl);
