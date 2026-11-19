import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/api/client";
import { catalogsEndpoints } from "@/api/catalogs";
import { residueEndpoints } from "@/api/residue";
import { collectPages } from "@/api/query";
import { mrlImportSchema } from "@/features/catalogs/model/mrlImport";
import { policyChoices } from "@/features/compliance/model/companyPolicies";
import type { ResidueProfileVersion } from "@/api/residue";

vi.mock("@/api/client", () => ({
  apiFetch: vi.fn(),
  apiFetchResource: vi.fn(),
}));
beforeEach(() => vi.mocked(apiFetch).mockResolvedValue({}));
const request = {
  marketId: "00000000-0000-4000-8000-000000000001",
  commodityId: "00000000-0000-4000-8000-000000000002",
  effectiveFrom: "2026-11-18T10:00:00+07:00",
  sourceRef: "Verified regulation",
  limits: [{ substanceCode: "SUB-1", limitValue: "0.010", unit: "mg/kg" }],
};

describe("Audit API contracts", () => {
  it("sends the decision scope with an encoded explicit time zone", async () => {
    await catalogsEndpoints.resolveMrlVersion({
      marketId: "market",
      commodityId: "rice",
      decisionAt: request.effectiveFrom,
    });
    const [url] = vi.mocked(apiFetch).mock.calls.at(-1)!;
    const query = new URLSearchParams(url.split("?")[1]);
    expect(url.split("?")[0]).toBe("/api/mrl-versions/resolve");
    expect(Object.fromEntries(query)).toEqual({
      marketId: "market",
      commodityId: "rice",
      decisionAt: request.effectiveFrom,
    });
  });
  it("sends the viewed ETag for draft edits, limits and publication", async () => {
    await catalogsEndpoints.updateMrlVersion(
      "version/1",
      { sourceRef: "Updated source" },
      '"7"',
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/mrl-versions/version%2F1",
      expect.objectContaining({
        method: "PATCH",
        headers: { "If-Match": '"7"' },
      }),
    );
    await catalogsEndpoints.upsertMrlLimit(
      "version",
      "substance/1",
      { limitValue: 0, unit: "mg/kg" },
      '"8"',
    );
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/mrl-versions/version/limits/substance%2F1",
      expect.objectContaining({
        method: "PUT",
        headers: { "If-Match": '"8"' },
        body: JSON.stringify({ limitValue: 0, unit: "mg/kg" }),
      }),
    );
    await catalogsEndpoints.publishMrlVersion("version", '"9"');
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/mrl-versions/version/publish",
      { method: "POST", headers: { "If-Match": '"9"' } },
    );
  });
  it("uses bodyless catalog DELETE with the required concurrency header", async () => {
    await catalogsEndpoints.deleteActiveSubstance("sub/1", '"3"');
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/active-substances/sub%2F1",
      { method: "DELETE", headers: { "If-Match": '"3"' } },
    );
    await catalogsEndpoints.deleteCommodity("rice", '"4"');
    expect(apiFetch).toHaveBeenLastCalledWith("/api/commodities/rice", {
      method: "DELETE",
      headers: { "If-Match": '"4"' },
    });
    expect(() => catalogsEndpoints.deleteCommodity("rice", "")).toThrow();
  });
  it("preserves the exact decimal token when writing a reviewed MRL limit", async () => {
    await catalogsEndpoints.upsertMrlLimit(
      "version",
      "substance",
      { limitValue: "123456789012.123456789012", unit: "mg/kg" },
      '"1"',
    );
    expect(vi.mocked(apiFetch).mock.calls.at(-1)![1]?.body).toBe(
      '{"limitValue":123456789012.123456789012,"unit":"mg/kg"}',
    );
    expect(() =>
      catalogsEndpoints.upsertMrlLimit(
        "version",
        "substance",
        { limitValue: "Infinity", unit: "mg/kg" },
        '"1"',
      ),
    ).toThrow();
  });
  it("loads every catalog/limit page and rejects invalid pagination", async () => {
    const load = vi
      .fn()
      .mockResolvedValueOnce({ items: ["first"], hasMore: true })
      .mockResolvedValueOnce({ items: ["second"], hasMore: false });
    expect(await collectPages(load)).toEqual(["first", "second"]);
    expect(load).toHaveBeenNthCalledWith(2, { page: 2, pageSize: 100 });
    await expect(
      collectPages(vi.fn().mockResolvedValue({ items: [], hasMore: true })),
    ).rejects.toThrow("pagination");
  });
  it("uses the actual import and batch routes, propagating unsupported-server errors", async () => {
    await catalogsEndpoints.importMrlVersion({ ...request, effectiveTo: null });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/mrl-versions/import",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ ...request, effectiveTo: null }),
      }),
    );
    const error = new Error("Unsupported backend");
    vi.mocked(apiFetch).mockRejectedValueOnce(error);
    await expect(
      residueEndpoints.batchPolicySettings({ items: [] }),
    ).rejects.toBe(error);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/residue-policy-settings/batch",
      { method: "POST", body: '{"items":[]}' },
    );
  });
});

describe("MRL import validation", () => {
  it("preserves precise decimal strings and accepts an explicit offset", () => {
    const result = mrlImportSchema.parse(request);
    expect(result.limits[0].limitValue).toBe("0.010");
    expect(result.effectiveTo).toBeNull();
  });
  it.each([
    { limits: [] },
    { marketId: "not-an-id" },
    { effectiveFrom: "2026-11-18T10:00" },
    { effectiveTo: "2026-11-17T00:00:00Z" },
    { limits: [{ substanceCode: "SUB-1", limitValue: "-0.1", unit: "mg/kg" }] },
    { limits: [{ substanceCode: "SUB-1", limitValue: "NaN", unit: "mg/kg" }] },
    { limits: [{ substanceCode: "SUB-1", limitValue: "1", unit: "ppm" }] },
    {
      limits: [
        request.limits[0],
        { ...request.limits[0], substanceCode: "sub-1" },
      ],
    },
  ])("rejects invalid or duplicate import data: %j", (change) => {
    expect(mrlImportSchema.safeParse({ ...request, ...change }).success).toBe(
      false,
    );
  });
});

describe("Company policy source selection", () => {
  const profile = {
    id: "old",
    code: "FLOW-1",
    kind: "FLOW",
    schemaVersion: 2,
    companyId: null,
    supersedesId: null,
  } as ResidueProfileVersion;
  it("selects the unique series tip in the requested owning scope", () => {
    const rules = [
      profile,
      { ...profile, id: "tip", supersedesId: "old" },
      { ...profile, id: "other-company", companyId: "other" },
    ];
    expect(
      policyChoices(rules, [], "company", "SYSTEM_DEFAULT")[0].source?.id,
    ).toBe("tip");
    expect(policyChoices(rules, [], "company", "COMPANY_OVERRIDE")).toEqual([]);
  });
  it("never falls back from retired or conflicting tips to an earlier version", () => {
    const retired = {
      ...profile,
      id: "retired",
      supersedesId: "old",
      retirement: { reason: "Retired" },
    } as ResidueProfileVersion;
    expect(
      policyChoices([profile, retired], [], "company", "SYSTEM_DEFAULT")[0]
        .source,
    ).toBeNull();
    expect(
      policyChoices(
        [profile, { ...profile, id: "conflict" }],
        [],
        "company",
        "SYSTEM_DEFAULT",
      )[0].conflict,
    ).toBe(true);
  });
});
