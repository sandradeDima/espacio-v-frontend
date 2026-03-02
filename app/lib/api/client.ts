// lib/api/client.ts
import type { MensajeApi } from "@/types/api";
import { API_BASE_URL } from "./base-url";

/**
 * Custom error that wraps API failures.
 * This way you can catch errors in UI with a clear message/code.
 */
export class ApiError extends Error {
  code?: number;
  technicalMessage?: string;

  constructor(message: string, code?: number, technicalMessage?: string) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.technicalMessage = technicalMessage;
  }
}

/**
 * Core request function.
 * - Accepts an HTTP method (GET/POST/etc.), a path, and optional body.
 * - Calls fetch with JSON headers.
 * - Parses the backend response (MensajeApi<T>).
 * - Throws ApiError if `error: true`.
 * - Returns only `data` for convenience.
 */
async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  accessToken?: string
): Promise<T> {
  // If path is absolute (starts with http), use as-is; else prefix with base URL.
  const url = path.startsWith("http") ? path : `${API_BASE_URL}${path}`;
  
  // Prepare headers
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  
  const res = await fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store", // ensures fresh fetch in Next.js App Router
  });

  // Parse JSON into the expected MensajeApi<T> shape
  let payload: MensajeApi<T | undefined> = {
    code: 0,
    error: false,
    message: '',
    technicalMessage: '',
    data: undefined
  };
  try {
    payload = (await res.json()) as MensajeApi<T | undefined>;
  } catch {
    // If JSON parse fails, it's not a valid API response
    throw new ApiError("Respuesta inválida del servidor", res.status);
  }

  // If backend says "error: true", throw as ApiError
  if (payload.error) {
    throw new ApiError(payload.message, payload.code, payload.technicalMessage);
  }
  // Otherwise return just the data
  return payload as T;
}

/**
 * Public API object with typed methods.
 * Each method calls the generic request() with proper HTTP verb.
 */
export const api = {
  get:    <T>(path: string, accessToken?: string) => request<T>("GET", path, undefined, accessToken),
  post:   <T>(path: string, body?: unknown, accessToken?: string) => request<T>("POST", path, body, accessToken),
  put:    <T>(path: string, body?: unknown, accessToken?: string) => request<T>("PUT", path, body, accessToken),
  patch:  <T>(path: string, body?: unknown, accessToken?: string) => request<T>("PATCH", path, body, accessToken),
  delete: <T>(path: string, body?: unknown, accessToken?: string) => request<T>("DELETE", path, body, accessToken),
};
