import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("API environment configuration", () => {
  it.each([undefined, "", "   "])(
    "uses same-origin paths when the API origin is %s",
    async (origin) => {
      vi.stubEnv("VITE_API_BASE_URL", origin);
      vi.resetModules();
      const { getApiUrl } = await import("@/api/config");
      expect(getApiUrl("/api/auth/login")).toBe("/api/auth/login");
      expect(getApiUrl("health")).toBe("/health");
    },
  );

  it("uses the configured origin for API, refresh, health and OAuth paths", async () => {
    vi.stubEnv("VITE_API_BASE_URL", " https://api.example.com/// ");
    vi.resetModules();
    const { getApiUrl } = await import("@/api/config");
    for (const path of [
      "/api/auth/login",
      "/api/auth/refresh",
      "/health",
      "/api/auth/google?returnUrl=%2Fdashboard",
      "/api/auth/google/complete",
    ]) {
      expect(getApiUrl(path)).toBe(`https://api.example.com${path}`);
    }
  });
});
