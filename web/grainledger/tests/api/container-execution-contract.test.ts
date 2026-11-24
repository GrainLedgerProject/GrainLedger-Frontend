import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { configureApplicationApi } from "@/app/providers/configureApi";
import { useAuthStore } from "@/app/store/authStore";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import { containerPreparationEndpoints } from "@/api/containerPreparation";

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

  it("uses the dedicated work, trace, production and workflow endpoints", async () => {
    const id = "container/id";
    const version = { operationId: "command", version: 7 };
    const review = { ...version, reason: "Reviewed" };
    const handoff = { ...version, handoffId: "handoff", handoffVersion: 2 };
    const content = { lotId: "lot", fromLocationId: "from", toLocationId: "to", quantityKg: "4.000001", occurredAt: "2026-11-19T03:00:00Z" };
    const draft = { id: "draft", ownerId: "owner", facilityId: "facility", kind: "BLENDING" as const, equipmentId: "equipment",
      occurredAt: content.occurredAt, inputs: [], outputs: [], declaredLossKg: "0" };
    const cases = [
      ["GET", "/api/container-production", undefined, () => containerExecutionEndpoints.listProduction()],
      ["GET", "/api/container-work-items", undefined, () => containerExecutionEndpoints.getWorkItems()],
      ["POST", "/execution/trace", undefined, () => containerExecutionEndpoints.trace(id)],
      ["POST", "/execution/holds", review, () => containerExecutionEndpoints.placeHold(id, review)],
      ["POST", "/production/draft", { ...version, draft }, () => containerExecutionEndpoints.saveProductionDraft(id, { ...version, draft })],
      ["POST", "/production/commit", version, () => containerExecutionEndpoints.commitProduction(id, version)],
      ["POST", "/production/next", version, () => containerExecutionEndpoints.prepareNextProduction(id, version)],
      ["POST", "/production/approve", review, () => containerExecutionEndpoints.approveProduction(id, review)],
      ["POST", "/production/reject", review, () => containerExecutionEndpoints.rejectProduction(id, review)],
      ["POST", "/workflow/reviews", { ...review, proposalId: "proposal", scope: "OUTPUT_ONLY", decision: "APPROVED" }, () =>
        containerExecutionEndpoints.reviewScope(id, { ...review, proposalId: "proposal", scope: "OUTPUT_ONLY", decision: "APPROVED" })],
      ["POST", "/workflow/handoffs", { ...version, proposalId: "proposal", kind: "TRANSFER", content }, () =>
        containerExecutionEndpoints.draftHandoff(id, { ...version, proposalId: "proposal", kind: "TRANSFER", content })],
      ["POST", "/workflow/handoffs/approve", { ...handoff, reason: "Reviewed" }, () => containerExecutionEndpoints.approveHandoff(id, { ...handoff, reason: "Reviewed" })],
      ["POST", "/workflow/handoffs/commit", handoff, () => containerExecutionEndpoints.commitHandoff(id, handoff)],
      ["POST", "/workflow/notifications/read", { ...version, noticeId: "notice" }, () => containerExecutionEndpoints.markNoticeRead(id, { ...version, noticeId: "notice" })],
      ["POST", "/workflow/hold-responses", { ...review, holdId: "hold", facilityId: "facility", evidenceId: "evidence", responseAction: "ACKNOWLEDGE" }, () =>
        containerExecutionEndpoints.respondToHold(id, { ...review, holdId: "hold", facilityId: "facility", evidenceId: "evidence", responseAction: "ACKNOWLEDGE" })],
    ] as const;
    for (const [method, path, body, invoke] of cases) {
      await invoke();
      const [url, init] = vi.mocked(fetch).mock.calls.at(-1)!;
      expect(new URL(String(url), "https://example.test").pathname).toBe(path.startsWith("/api/") ? path : "/api/export-containers/container%2Fid" + path);
      expect(init?.method ?? "GET").toBe(method);
      expect(init?.body).toBe(body === undefined ? undefined : JSON.stringify(body));
    }
  });

  it("keeps legacy preparation separate from actual export execution", async () => {
    const id = "container/id";
    const request = { requestId: "request", version: "revision" };
    const draft = { ...request, draftId: "draft", loadedAt: "2026-11-19T03:00:00Z", lines: [] };
    const body = { id, requestId: "request", code: "CT-01", facilityId: "facility", targetKg: "20.000000" };
    const cases = [
      ["GET", "?page=2&pageSize=25&search=CT+01", undefined, () => containerPreparationEndpoints.list({ page: 2, pageSize: 25, search: "CT 01" })],
      ["POST", "", body, () => containerPreparationEndpoints.create(body)],
      ["GET", "/container%2Fid", undefined, () => containerPreparationEndpoints.detail(id)],
      ["GET", "/container%2Fid/history?page=2", undefined, () => containerPreparationEndpoints.history(id, { page: 2 })],
      ["POST", "/container%2Fid/metadata", { ...request, sealNumber: "seal" }, () => containerPreparationEndpoints.updateMetadata(id, { ...request, sealNumber: "seal" })],
      ["POST", "/container%2Fid/loading-draft", draft, () => containerPreparationEndpoints.saveDraft(id, draft)],
      ["POST", "/container%2Fid/loading-check", { draftId: "draft" }, () => containerPreparationEndpoints.checkLoading(id, "draft")],
      ["POST", "/container%2Fid/close-check", {}, () => containerPreparationEndpoints.checkClosure(id)],
      ["POST", "/container%2Fid/commit-loading", { ...request, draftId: "draft" }, () => containerPreparationEndpoints.commitLoading(id, { ...request, draftId: "draft" })],
      ["POST", "/container%2Fid/close", request, () => containerPreparationEndpoints.close(id, request)],
    ] as const;
    for (const [method, suffix, data, invoke] of cases) {
      await invoke();
      const [url, init] = vi.mocked(fetch).mock.calls.at(-1)!;
      const parsed = new URL(String(url), "https://example.test");
      expect(parsed.pathname + parsed.search).toBe("/api/ledger/containers" + suffix);
      expect(init?.method ?? "GET").toBe(method);
      expect(init?.body).toBe(data === undefined ? undefined : JSON.stringify(data));
    }
  });
});
