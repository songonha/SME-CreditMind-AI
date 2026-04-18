const API_BASE = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");
/** Default for quick JSON APIs (merchants, dashboard, etc.). */
const API_TIMEOUT_MS = 10000;
/** Multipart uploads (e.g. Qwen 3-step document pipeline) need a longer window than JSON calls. */
export const API_UPLOAD_TIMEOUT_MS = 120000;
/** POS image assessment: large base64 payload + vision LLM often needs 60–180s. */
export const API_POS_ASSESSMENT_TIMEOUT_MS = 180000;

export class ApiError extends Error {
  status?: number;
  code: string;
  details?: string;

  constructor(message: string, options?: { status?: number; code?: string; details?: string }) {
    super(message);
    this.name = "ApiError";
    this.status = options?.status;
    this.code = options?.code ?? "UNKNOWN_ERROR";
    this.details = options?.details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function buildErrorCode(status: number): string {
  if (status >= 500) return "SERVER_ERROR";
  if (status === 404) return "NOT_FOUND";
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status >= 400) return "BAD_REQUEST";
  return "UNKNOWN_ERROR";
}

function buildErrorMessage(status: number): string {
  if (status >= 500) return "The server is temporarily unavailable. Please try again later.";
  if (status === 404) return "The requested resource was not found.";
  if (status === 401 || status === 403) return "You do not have permission to access this resource.";
  if (status >= 400) return "Invalid request. Please check your input and try again.";
  return "Something went wrong. Please try again.";
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit,
  options?: { timeoutMs?: number }
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${normalizedPath}`;
  const controller = new AbortController();
  const timeoutMs = options?.timeoutMs ?? API_TIMEOUT_MS;
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...init,
      signal: init?.signal ?? controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...init?.headers,
      },
    });

    if (!res.ok) {
      let details = "";
      try {
        const data = await res.json();
        if (typeof data?.detail === "string") details = data.detail;
      } catch {
        // Ignore non-JSON error responses.
      }

      const friendlyMessage = buildErrorMessage(res.status);
      throw new ApiError(details || friendlyMessage, {
        status: res.status,
        code: buildErrorCode(res.status),
        details,
      });
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      const isLongWait = timeoutMs > 60_000;
      throw new ApiError(
        isLongWait
          ? "Request timed out. Vision AI can take a few minutes for large images — try again or use a smaller capture."
          : "Request timed out. Check your network and try again.",
        { code: "TIMEOUT" }
      );
    }
    if (isApiError(error)) throw error;
    if (error instanceof Error) {
      throw new ApiError(error.message, { code: "NETWORK_ERROR" });
    }
    throw new ApiError("Could not connect to the server.", { code: "NETWORK_ERROR" });
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * POST multipart/form-data (e.g. file upload). Do not set Content-Type; the browser sets the boundary.
 */
export async function apiUploadJson<T>(
  path: string,
  formData: FormData,
  options?: { timeoutMs?: number }
): Promise<T> {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${API_BASE}${normalizedPath}`;
  const timeoutMs = options?.timeoutMs ?? API_UPLOAD_TIMEOUT_MS;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: "POST",
      body: formData,
      signal: controller.signal,
    });

    if (!res.ok) {
      let details = "";
      try {
        const data = await res.json();
        if (typeof data?.detail === "string") details = data.detail;
      } catch {
        // Ignore non-JSON error responses.
      }

      const friendlyMessage = buildErrorMessage(res.status);
      throw new ApiError(details || friendlyMessage, {
        status: res.status,
        code: buildErrorCode(res.status),
        details,
      });
    }

    return res.json() as Promise<T>;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new ApiError(
        "Request timed out. The AI pipeline may need more than two minutes to complete.",
        {
          code: "TIMEOUT",
        }
      );
    }
    if (isApiError(error)) throw error;
    if (error instanceof Error) {
      throw new ApiError(error.message, { code: "NETWORK_ERROR" });
    }
    throw new ApiError("Could not connect to the server.", { code: "NETWORK_ERROR" });
  } finally {
    clearTimeout(timeout);
  }
}
