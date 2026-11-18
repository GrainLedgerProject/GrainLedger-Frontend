import type { IssuedTokens } from "./auth";
/**
 * GrainLedger Core API Client
 * Shared authentication, token refresh and error handling.
 * Base URL: configured by VITE_API_BASE_URL (same-origin by default).
 */
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { normalizeUserRole } from "@/shared/types/roles";
import { COOKIE_KEYS, getCookie } from "@/shared/utils/cookies";
import { isJwtExpired } from "@/shared/utils/jwt";
import { logger } from "@/shared/utils/logger";
import { getApiUrl } from "./config";

export interface ApiFetchOptions extends RequestInit {
  responseType?: "json" | "blob" | "text";
  onResponse?: (response: Response) => void;
}

export interface ApiResource<T> {
  data: T;
  etag: string | null;
}

/** Keep concurrency metadata local to the record being edited, never in a shared cache. */
export async function apiFetchResource<T>(
  endpoint: string,
): Promise<ApiResource<T>> {
  let etag: string | null = null;
  const data = await apiFetch<T>(endpoint, {
    onResponse: (response) => {
      etag = response.headers.get("ETag");
    },
  });
  return { data, etag };
}

export class ApiError extends Error {
  public status: number;
  public problem?: ProblemDetails;

  constructor(status: number, message: string, problem?: ProblemDetails) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.problem = problem;
  }
}

export { isJwtExpired };

/** Single-flight mutex for token refresh so concurrent requests share the exact same refresh cycle */
let refreshPromise: Promise<string | null> | null = null;

/**
 * Executes a token refresh cycle against POST /api/auth/refresh.
 * Rotates the single-use refresh token, updates cookies and Zustand store.
 */
export async function requestTokenRefresh(): Promise<string | null> {
  // If a refresh is already in flight, reuse the ongoing promise
  if (refreshPromise) {
    return refreshPromise;
  }

  const {
    refreshToken: stateRefreshToken,
    setTokens,
    setUser,
    logout,
  } = useAuthStore.getState();
  const refreshToken =
    stateRefreshToken || getCookie(COOKIE_KEYS.REFRESH_TOKEN);

  if (!refreshToken || refreshToken.startsWith("mock-")) {
    return null;
  }

  refreshPromise = (async () => {
    try {
      logger.info("Performing single-flight refresh token rotation...");
      const res = await fetch(getApiUrl("/api/auth/refresh"), {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({ refreshToken }),
      });

      if (!res.ok) {
        logger.warn(
          `Token refresh endpoint responded with status ${res.status}`,
        );
        logout();
        return null;
      }

      const data = (await res.json()) as IssuedTokens;
      const newAccessToken = data.accessToken;
      const newRefreshToken = data.refreshToken;

      if (!newAccessToken) {
        logger.warn("Refresh response did not return a valid accessToken");
        logout();
        return null;
      }

      // Persist fresh tokens into cookies and Zustand store
      setTokens(newAccessToken, newRefreshToken);

      const userDto = data.user;
      if (userDto) {
        setUser({
          id: userDto.id,
          email: userDto.email,
          displayName: userDto.displayName,
          phoneNumber: userDto.phoneNumber || undefined,
          role: normalizeUserRole(userDto.role),
          organizationId: userDto.organizationId || undefined,
          organizationName: userDto.organizationName || undefined,
          isActive: userDto.isActive,
          permissions: userDto.permissions,
        });
      }

      logger.info("Token refresh successfully completed and cookies updated.");
      return newAccessToken;
    } catch (err) {
      logger.error("Unexpected error during token refresh execution:", err);
      logout();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/** Base fetch wrapper with Bearer token injection, CSRF and refresh handling */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { responseType = "json", onResponse, ...requestOptions } = options;
  const isAuthEndpoint =
    endpoint.includes("/api/auth/login") ||
    endpoint.includes("/api/auth/web-login") ||
    endpoint.includes("/api/auth/refresh") ||
    endpoint.includes("/api/auth/register") ||
    endpoint.includes("/api/auth/verify-email") ||
    endpoint.includes("/api/auth/resend-verification") ||
    endpoint.includes("/api/auth/forgot-password") ||
    endpoint.includes("/api/auth/reset-password");

  let accessToken =
    useAuthStore.getState().accessToken || getCookie(COOKIE_KEYS.ACCESS_TOKEN);
  const refreshToken =
    useAuthStore.getState().refreshToken ||
    getCookie(COOKIE_KEYS.REFRESH_TOKEN);

  // Proactive Token Refresh:
  // If access token is expired (or missing) but a valid real refresh token exists, refresh before sending
  if (
    !isAuthEndpoint &&
    refreshToken &&
    !refreshToken.startsWith("mock-") &&
    isJwtExpired(accessToken)
  ) {
    logger.info(
      `Access token expired or missing for ${endpoint}, proactively refreshing...`,
    );
    const refreshedToken = await requestTokenRefresh();
    if (refreshedToken) {
      accessToken = refreshedToken;
    }
  }

  const headers = new Headers(options.headers || {});
  if (
    !headers.has("Content-Type") &&
    options.body !== undefined &&
    !(options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }

  if (accessToken) {
    headers.set("Authorization", `Bearer ${accessToken}`);
  }

  // Include cookies automatically in cross-origin / same-origin API requests
  const fetchOptions: RequestInit = {
    credentials: "include",
    ...requestOptions,
    headers,
  };

  const url = getApiUrl(endpoint);

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (netErr) {
    if (options.signal?.aborted) throw netErr;
    logger.warn(`Network error on ${url}:`, netErr);
    useUiStore.getState().setOnline(false);
    useUiStore.getState().setBackendConnected(false);
    throw new ApiError(0, "Không thể kết nối đến máy chủ backend.");
  }

  // Update backend connection status based on HTTP response
  if (response.status >= 502 && response.status <= 504) {
    useUiStore.getState().setOnline(false);
    useUiStore.getState().setBackendConnected(false);
  } else if (
    !useUiStore.getState().isBackendConnected &&
    response.status < 500
  ) {
    useUiStore.getState().setBackendConnected(true);
  }

  // Reactive Token Refresh:
  // If 401 Unauthorized is returned from backend on a protected endpoint, execute single-flight refresh
  if (response.status === 401 && !isAuthEndpoint) {
    const isMock =
      accessToken?.startsWith("mock-") || refreshToken?.startsWith("mock-");

    if (refreshToken && !isMock) {
      logger.info(
        `Endpoint ${url} returned 401, triggering single-flight token refresh...`,
      );
      const newAccessToken = await requestTokenRefresh();

      if (newAccessToken) {
        // Retry original request with fresh access token and credentials
        headers.set("Authorization", `Bearer ${newAccessToken}`);
        try {
          response = await fetch(url, {
            ...requestOptions,
            headers,
            credentials: "include",
          });
        } catch (retryErr) {
          if (options.signal?.aborted) throw retryErr;
          logger.warn(`Retry failed after token refresh on ${url}:`, retryErr);
          throw new ApiError(
            0,
            "Lỗi kết nối khi gửi lại yêu cầu sau khi cấp mới token.",
          );
        }
      } else {
        useAuthStore.getState().logout();
        throw new ApiError(
          401,
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        );
      }
    } else if (isMock) {
      logger.info(
        `Endpoint ${url} returned 401 for mock session, falling back safely.`,
      );
      throw new ApiError(
        401,
        "Phiên cục bộ chưa kết nối máy chủ backend. Chuyển sang dữ liệu mô phỏng.",
      );
    } else {
      useAuthStore.getState().logout();
      throw new ApiError(401, "Yêu cầu đăng nhập để tiếp tục.");
    }
  }

  if (response.ok) onResponse?.(response);

  // Handle successful empty response (204 No Content)
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  if (response.ok && responseType === "blob")
    return (await response.blob()) as T;
  if (response.ok && responseType === "text")
    return (await response.text()) as T;

  // Parse JSON response or problem details
  const contentType = response.headers.get("content-type") || "";
  const isJson =
    contentType.includes("application/json") ||
    contentType.includes("application/problem+json");
  if (response.ok && !isJson) {
    if (
      /application\/(pdf|octet-stream)|^(image|audio|video)\//.test(contentType)
    ) {
      return (await response.blob()) as T;
    }
    return ((await response.text()) || undefined) as T;
  }
  const data = isJson ? await response.json().catch(() => null) : null;

  if (!response.ok) {
    const problem = data as ProblemDetails;
    const msg =
      problem?.detail || problem?.title || `Lỗi máy chủ (${response.status})`;
    throw new ApiError(response.status, msg, problem);
  }

  return data as T;
}

export interface ProblemDetails {
  code?: string;
  errors?: Record<string, string[]>;
  type?: null | string;
  title?: null | string;
  status?: null | number | string;
  detail?: null | string;
  instance?: null | string;
}
