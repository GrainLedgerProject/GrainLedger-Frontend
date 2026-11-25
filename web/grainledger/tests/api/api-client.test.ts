import { configureApplicationApi } from "@/app/providers/configureApi";
import { authEndpoints } from "@/api/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  apiFetch,
  apiFetchResource,
  ApiError,
  requestTokenRefresh,
} from "@/api/client";

const state = vi.hoisted(() => ({
  auth: {
    sessionVersion: 1,
    accessToken: "mock-access",
    refreshToken: null as string | null,
    logout: vi.fn(),
    setTokens: vi.fn(),
    setUser: vi.fn(),
  },
  ui: {
    isBackendConnected: true,
    setOnline: vi.fn(),
    setBackendConnected: vi.fn(),
  },
}));
vi.mock("@/app/store/authStore", () => ({
  useAuthStore: { getState: () => state.auth },
}));
vi.mock("@/app/store/uiStore", () => ({
  useUiStore: { getState: () => state.ui },
}));
vi.mock("@/shared/utils/cookies", () => ({
  COOKIE_KEYS: {},
  getCookie: () => null,
}));

describe("API transport", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.auth.sessionVersion = 1;
    configureApplicationApi();
    vi.stubGlobal("fetch", vi.fn());
    state.auth.accessToken = "mock-access";
    state.auth.refreshToken = null;
    state.ui.isBackendConnected = true;
  });

  it("sends Bearer and cookies, without a JSON Content-Type on bodyless GET", async () => {
    vi.mocked(fetch).mockResolvedValue(Response.json({ items: [] }));
    await apiFetch("/api/export-orders");
    const [, init] = vi.mocked(fetch).mock.calls[0];
    expect(new Headers(init?.headers).get("Authorization")).toBe(
      "Bearer mock-access",
    );
    expect(new Headers(init?.headers).has("Content-Type")).toBe(false);
    expect(init?.credentials).toBe("include");
  });

  it("returns undefined for No Content", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response(null, { status: 204 }));
    expect(
      await apiFetch("/api/auth/logout", { method: "POST" }),
    ).toBeUndefined();
  });

  it.each(["login", "webLogin"] as const)(
    "shows the invalid credentials message for a 401 from %s",
    async (endpoint) => {
      vi.mocked(fetch)
        .mockResolvedValueOnce(new Response(null, { status: 401 }))
        .mockResolvedValueOnce(
          Response.json({ detail: "Unauthorized" }, { status: 401 }),
        );
      const credentials = { email: "user@example.com", password: "wrong-password" };
      const expected = { status: 401, message: "Tài khoản hoặc mật khẩu không đúng" };

      await expect(authEndpoints[endpoint](credentials)).rejects.toMatchObject(expected);
      await expect(authEndpoints[endpoint](credentials)).rejects.toMatchObject(expected);
    },
  );

  it("keeps each record ETag with its response without leaking callbacks into fetch", async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(
        Response.json({ id: "first" }, { headers: { ETag: '"41"' } }),
      )
      .mockResolvedValueOnce(
        Response.json({ id: "second" }, { headers: { ETag: '"98"' } }),
      );
    const records = await Promise.all([
      apiFetchResource("/api/commodities/first"),
      apiFetchResource("/api/commodities/second"),
    ]);
    expect(records).toEqual([
      { data: { id: "first" }, etag: '"41"' },
      { data: { id: "second" }, etag: '"98"' },
    ]);
    expect(vi.mocked(fetch).mock.calls[0][1]).not.toHaveProperty("onResponse");
  });

  it("downloads binary files and still parses ProblemDetails on failures", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response("pdf bytes", {
        headers: { "Content-Type": "application/pdf" },
      }),
    );
    const file = await apiFetch<Blob>("/api/lab-reports/report/file", {
      responseType: "blob",
    });
    expect(await file.text()).toBe("pdf bytes");
    vi.mocked(fetch).mockResolvedValueOnce(
      Response.json(
        { title: "Version conflict", status: 412 },
        {
          status: 412,
          headers: { "Content-Type": "application/problem+json" },
        },
      ),
    );
    await expect(
      apiFetch("/api/admin/users/user/access", { responseType: "blob" }),
    ).rejects.toMatchObject({ status: 412, message: "Version conflict" });
  });

  it("does not mark the backend offline when the caller cancels a request", async () => {
    const controller = new AbortController();
    controller.abort();
    const error = new DOMException("Cancelled", "AbortError");
    vi.mocked(fetch).mockRejectedValue(error);
    await expect(
      apiFetch("/api/ledger/lots", { signal: controller.signal }),
    ).rejects.toBe(error);
    expect(state.ui.setOnline).not.toHaveBeenCalled();
    expect(state.ui.setBackendConnected).not.toHaveBeenCalled();
  });

  it("keeps network failures as actionable API errors", async () => {
    vi.mocked(fetch).mockRejectedValue(new TypeError("Failed to fetch"));
    await expect(apiFetch("/health")).rejects.toBeInstanceOf(ApiError);
    expect(state.ui.setBackendConnected).toHaveBeenCalledWith(false);
  });

  it("discards a token rotation completed after switching sessions", async () => {
    state.auth.refreshToken = "old-refresh";
    let finish!: (response: Response) => void;
    vi.mocked(fetch).mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const pending = requestTokenRefresh();
    state.auth.sessionVersion++;
    state.auth.refreshToken = "new-account-refresh";
    finish(Response.json({ accessToken: "obsolete", refreshToken: "rotated" }));
    expect(await pending).toBeNull();
    expect(state.auth.setTokens).not.toHaveBeenCalled();
    expect(state.auth.logout).not.toHaveBeenCalled();
  });

  it("shares one refresh request and applies the documented token/session schema", async () => {
    state.auth.refreshToken = "real-refresh-token";
    const user = {
      id: "user",
      email: "user@example.com",
      displayName: "User",
      phoneNumber: null,
      role: "MillManager",
      organizationId: null,
      organizationName: null,
      isActive: true,
      permissions: [],
    };
    vi.mocked(fetch).mockResolvedValue(
      Response.json({
        accessToken: "fresh-access",
        refreshToken: "fresh-refresh",
        tokenType: "Bearer",
        expiresIn: 3600,
        user,
      }),
    );
    const tokens = await Promise.all([
      requestTokenRefresh(),
      requestTokenRefresh(),
    ]);
    expect(tokens).toEqual(["fresh-access", "fresh-access"]);
    expect(fetch).toHaveBeenCalledTimes(1);
    expect(state.auth.setTokens).toHaveBeenCalledWith(
      "fresh-access",
      "fresh-refresh",
    );
    expect(state.auth.setUser).toHaveBeenCalledWith(
      expect.objectContaining({ id: "user", role: "MILL_MANAGER" }),
    );
  });
});
