import { ApiError } from "@/api/client";

export function loadPendingCapture<T>(key: string): T | null {
  try {
    return JSON.parse(localStorage.getItem(key) ?? "null") as T | null;
  } catch {
    return null;
  }
}

export async function submitPendingCapture<T, TResult>(
  key: string, request: T, send: (request: T) => Promise<TResult>,
): Promise<TResult> {
  try { localStorage.setItem(key, JSON.stringify(request)); } catch { /* In-memory retry is still available. */ }
  const clear = () => {
    try { localStorage.removeItem(key); } catch { /* Storage can be restricted. */ }
  };
  try {
    const result = await send(request);
    clear();
    return result;
  } catch (error) {
    if (captureWasRejected(error)) clear();
    throw error;
  }
}

export function captureWasRejected(error: unknown) {
  return error instanceof ApiError && [400, 403, 404, 412, 422].includes(error.status);
}
