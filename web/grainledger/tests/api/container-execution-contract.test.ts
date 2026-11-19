import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApplicationApi } from "@/app/providers/configureApi";
import { useAuthStore } from "@/app/store/authStore";
import { containerExecutionEndpoints } from "@/api/containerExecution";

beforeEach(() => {
  useAuthStore.setState({ accessToken: "mock-export", refreshToken: null });
  configureApplicationApi();
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({})));
});
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); useAuthStore.setState({ accessToken: null }); });

describe("container execution HTTP contracts", () => {
  it("sends exact typed loading fields to the public execution endpoint", async () => {
    const body = { operationId: "command", version: 7, proposalId: "proposal", decisionVersion: 3, loadedAt: "2026-11-19T03:00:00Z", lines: [{ lotId: "lot", locationId: "location", quantityKg: "4.123456" }] };
    await containerExecutionEndpoints.recordLoad("container/id", body);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(String(url)).toMatch(/\/api\/export-containers\/container%2Fid\/execution\/loads$/);
    expect(init?.method).toBe("POST"); expect(JSON.parse(String(init?.body))).toEqual(body);
    expect(new Headers(init?.headers).get("Authorization")).toBe("Bearer mock-export");
  });
  it("downloads the original dossier bytes without parsing or rounding JSON numbers", async () => {
    const snapshot = '{"quantity_kg":99999999999999.123456,"redacted":true}';
    vi.mocked(fetch).mockResolvedValue(new Response(snapshot, { headers: { "Content-Type": "application/json" } }));
    const blob = await containerExecutionEndpoints.downloadDossier("container");
    expect(await blob.text()).toBe(snapshot);
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toMatch(/\/execution\/dossier$/);
  });
  it("uses workflow document paths and keeps file responses binary", async () => {
    vi.mocked(fetch).mockResolvedValue(new Response("pdf bytes", { headers: { "Content-Type": "application/pdf" } }));
    const blob = await containerExecutionEndpoints.downloadDocument("container", "document/id");
    expect(await blob.text()).toBe("pdf bytes");
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toMatch(/\/workflow\/documents\/document%2Fid\/file$/);
  });
  it("passes history pagination and production version separately from execution data", async () => {
    await containerExecutionEndpoints.getHistory("container", { page: 2, pageSize: 20 });
    await containerExecutionEndpoints.requestProduction("container", { operationId: "request", proposalId: "proposal", version: 7 });
    expect(String(vi.mocked(fetch).mock.calls[0][0])).toMatch(/\/execution\/history\?page=2&pageSize=20$/);
    expect(String(vi.mocked(fetch).mock.calls[1][0])).toMatch(/\/production\/request$/);
    expect(JSON.parse(String(vi.mocked(fetch).mock.calls[1][1]?.body))).toEqual({ operationId: "request", proposalId: "proposal", version: 7 });
  });
});
