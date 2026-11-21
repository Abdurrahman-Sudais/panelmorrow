import { apiConfig } from "./config";
import { authService } from "./auth";

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

/** Thin fetch wrapper for the live backend (API Gateway → Lambda). */
export async function http<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await authService.getIdToken();
  const res = await fetch(`${apiConfig.baseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) throw new ApiError(res.status, await res.text());
  return (await res.json()) as T;
}
