import type { IssuedTokens } from "./auth";
/**
 * GrainLedger Core API Client
 * Shared authentication, token refresh and error handling.
 * Base URL: configured by VITE_API_BASE_URL (same-origin by default).
 */
import { apiSession, type ApiSession } from "./session";
import { isJwtExpired } from "@/shared/utils/jwt";
import { logger } from "@/shared/utils/logger";
import { getApiUrl } from "./config";

export interface ApiFetchOptions extends RequestInit {
  responseType?: "json" | "blob" | "text";
  browserSession?: boolean;
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

function sameSession(start: ApiSession, current: ApiSession) {
  return start.version === current.version && (!start.ownerKey || start.ownerKey === current.ownerKey);
}

function assertSameSession(start: ApiSession) {
  if (!sameSession(start, apiSession.read())) {
    throw new ApiError(401, "Phiên đăng nhập đã thay đổi. Vui lòng thực hiện lại thao tác.");
  }
}

let activeRefresh: { session: ApiSession; result: Promise<string | null> } | undefined;
let activeCsrf: { session: ApiSession; result: Promise<string> } | undefined;

function requestCsrf(session: ApiSession) {
  if (activeCsrf && sameSession(activeCsrf.session, session)) return activeCsrf.result;
  const result = apiFetch<{ token: string }>("/api/auth/csrf", { browserSession: true })
    .then(data => {
      if (!data?.token) throw new ApiError(502, "Không thể lấy mã xác thực phiên.");
      return data.token;
    })
    .finally(() => {
      if (activeCsrf?.result === result) activeCsrf = undefined;
    });
  activeCsrf = { session, result };
  return result;
}

async function rotateToken(start: ApiSession): Promise<string | null> {
  let res: Response;
  try {
    res = await fetch(getApiUrl("/api/auth/refresh"), {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ refreshToken: start.refreshToken }),
    });
  } catch {
    assertSameSession(start);
    apiSession.setConnected(false);
    throw new ApiError(0, "Không thể kết nối đến máy chủ.");
  }

  const tokens = res.ok ? await res.json().catch(() => null) as IssuedTokens | null : null;
  const current = apiSession.read();
  if (!sameSession(start, current)) return null;
  if (start.refreshToken !== current.refreshToken) return current.accessToken;
  if (res.status >= 500) {
    if (res.status >= 502 && res.status <= 504) apiSession.setConnected(false);
    throw new ApiError(res.status, `Lỗi máy chủ (${res.status})`);
  }
  if (!tokens?.accessToken || !tokens.refreshToken) {
    apiSession.expire();
    return null;
  }

  apiSession.apply(tokens);
  return tokens.accessToken;
}

/** Share rotations of the same single-use credential across concurrent requests. */
export function requestTokenRefresh(): Promise<string | null> {
  const session = apiSession.read();
  if (!session.refreshToken || session.refreshToken.startsWith("mock-")) return Promise.resolve(null);
  if (activeRefresh && sameSession(activeRefresh.session, session) &&
      activeRefresh.session.refreshToken === session.refreshToken) return activeRefresh.result;

  const result = rotateToken(session).finally(() => {
    if (activeRefresh?.result === result) activeRefresh = undefined;
  });
  activeRefresh = { session, result };
  return result;
}

/** Base fetch wrapper with Bearer token injection, CSRF and refresh handling */
export async function apiFetch<T>(
  endpoint: string,
  options: ApiFetchOptions = {},
): Promise<T> {
  const { responseType = "json", onResponse, browserSession, ...requestOptions } = options;
  const isLoginEndpoint =
    endpoint === "/api/auth/login" || endpoint === "/api/auth/web-login";
  const isAuthEndpoint =
    isLoginEndpoint || browserSession ||
    endpoint.includes("/api/auth/refresh") ||
    endpoint.includes("/api/auth/register") ||
    endpoint.includes("/api/auth/verify-email") ||
    endpoint.includes("/api/auth/resend-verification") ||
    endpoint.includes("/api/auth/forgot-password") ||
    endpoint.includes("/api/auth/reset-password");

  const session = apiSession.read();
  const useCookie = browserSession || session.cookieSession;
  let accessToken = useCookie ? null : session.accessToken;
  const { refreshToken } = session;

  // Proactive Token Refresh:
  // If access token is expired (or missing) but a valid real refresh token exists, refresh before sending
  if (
    !isAuthEndpoint && !useCookie &&
    refreshToken &&
    !refreshToken.startsWith("mock-") &&
    isJwtExpired(accessToken)
  ) {
    logger.info(
      `Access token expired or missing for ${endpoint}, proactively refreshing...`,
    );
    const refreshedToken = await requestTokenRefresh();
    if (!refreshedToken) throw new ApiError(401, "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
    assertSameSession(session);
    accessToken = refreshedToken;
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
  const method = (requestOptions.method ?? "GET").toUpperCase();
  if (session.cookieSession && !["GET", "HEAD", "OPTIONS"].includes(method) && !headers.has("X-CSRF-TOKEN")) {
    headers.set("X-CSRF-TOKEN", await requestCsrf(session));
    assertSameSession(session);
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
    if (!isAuthEndpoint) assertSameSession(session);
    logger.warn(`Network error on ${url}:`, netErr);
    apiSession.setConnected(false);
    throw new ApiError(0, "Không thể kết nối đến máy chủ.");
  }

  if (!isAuthEndpoint) assertSameSession(session);

  // Update backend connection status based on HTTP response
  if (response.status >= 502 && response.status <= 504) {
    apiSession.setConnected(false);
  } else if (response.status < 500) {
    apiSession.setConnected(true);
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
      const current = apiSession.read();
      const newAccessToken = current.accessToken && current.accessToken !== accessToken
        ? current.accessToken
        : await requestTokenRefresh();

      if (!newAccessToken) {
        const after = apiSession.read();
        if (after.ownerKey && after.ownerKey !== session.ownerKey) {
          assertSameSession(session);
        }
        throw new ApiError(
          401,
          "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
        );
      }

      assertSameSession(session);

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
    } else if (isMock) {
      logger.info(
        `Endpoint ${url} returned 401 for mock session, falling back safely.`,
      );
      throw new ApiError(
        401,
        "Phiên cục bộ chưa kết nối máy chủ backend. Chuyển sang dữ liệu mô phỏng.",
      );
    } else {
      apiSession.expire();
      throw new ApiError(401, "Yêu cầu đăng nhập để tiếp tục.");
    }
  }

  if (!isAuthEndpoint) assertSameSession(session);
  if (response.ok) onResponse?.(response);

  // Handle successful empty response (204 No Content)
  if (response.status === 204 || response.status === 205) {
    return undefined as T;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json") || contentType.includes("application/problem+json");
  let data: unknown;
  if (response.ok && responseType === "blob") {
    data = await response.blob();
  } else if (response.ok && responseType === "text") {
    data = await response.text();
  } else if (isJson) {
    data = await response.json().catch(() => null);
  } else if (response.ok && /application\/(pdf|octet-stream)|^(image|audio|video)\//.test(contentType)) {
    data = await response.blob();
  } else if (response.ok) {
    data = (await response.text()) || undefined;
  }
  if (!isAuthEndpoint) assertSameSession(session);

  if (!response.ok) {
    const problem = data as ProblemDetails;
    const msg =
      isLoginEndpoint && response.status === 401
        ? "Tài khoản hoặc mật khẩu không đúng"
        : problem?.detail || problem?.title || `Lỗi máy chủ (${response.status})`;
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
