import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/api/client";
import { planningEndpoints } from "@/api/planning";
import { residueEndpoints } from "@/api/residue";
import { exportEndpoints } from "@/api/exports";
import { adminEndpoints } from "@/api/admin";

vi.mock("@/api/client", () => ({ apiFetch: vi.fn() }));
beforeEach(() => vi.mocked(apiFetch).mockResolvedValue({}));

describe("Direct API endpoints", () => {
  it("encodes path segments and repeats list query parameters", async () => {
    await planningEndpoints.getDecision("part/with?query");
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/blend-plans/part%2Fwith%3Fquery/decision",
    );
    await planningEndpoints.getQualityObservations({
      ownerId: "owner",
      facilityId: "facility",
      lotIds: ["one", "two"],
    });
    const [url] = vi.mocked(apiFetch).mock.calls.at(-1)!;
    expect(new URLSearchParams(url.split("?")[1]).getAll("lotIds")).toEqual([
      "one",
      "two",
    ]);
  });

  it("preserves the user access concurrency header and request body", async () => {
    const request = { role: null, organizationId: null, isActive: true };
    await adminEndpoints.updateUserAccess("user/1", "current-etag", request);
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/admin/users/user%2F1/access",
      expect.objectContaining({
        method: "PUT",
        headers: { "If-Match": "current-etag" },
        body: JSON.stringify(request),
      }),
    );
  });

  it.each(["approvePlan", "rejectPlan", "revokePlan"] as const)(
    "sends exact proposal and decision version through %s",
    async (method) => {
      const request = {
        operationId: "operation",
        proposalId: "proposal",
        expectedDecisionVersion: 7,
        reason: "Reviewed reason",
      };
      await planningEndpoints[method]("plan/1", request);
      const [url, init] = vi.mocked(apiFetch).mock.calls.at(-1)!;
      expect(url).toBe(
        `/api/blend-plans/plan%2F1/${method.replace("Plan", "")}`,
      );
      expect(init?.method).toBe("POST");
      expect(JSON.parse(String(init?.body))).toEqual(request);
    },
  );

  it("sends profile retirement to its dedicated endpoint", async () => {
    await residueEndpoints.retireRule("rule/1", {
      reason: "Replaced by reviewed profile",
    });
    expect(apiFetch).toHaveBeenCalledWith(
      "/api/residue-rules/rule%2F1/retire",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ reason: "Replaced by reviewed profile" }),
      }),
    );
  });

  it("passes candidate scope and paginates export lists", async () => {
    await exportEndpoints.getCandidateResiduePreview("container", "lot", {
      facilityId: "facility",
      locationId: "location",
      candidateRevision: "rev +1",
      substanceIds: "a,b",
    });
    const [url] = vi.mocked(apiFetch).mock.calls.at(-1)!;
    expect(
      new URLSearchParams(url.split("?")[1]).get("candidateRevision"),
    ).toBe("rev +1");
    expect(new URLSearchParams(url.split("?")[1]).get("facilityId")).toBe(
      "facility",
    );
    await planningEndpoints.getBlendPlans("container", {
      page: 2,
      pageSize: 20,
    });
    expect(apiFetch).toHaveBeenLastCalledWith(
      "/api/export-containers/container/blend-plans?page=2&pageSize=20",
    );
  });

  it("propagates API failures instead of reporting a successful decision", async () => {
    const error = new Error("Decision changed");
    vi.mocked(apiFetch).mockRejectedValueOnce(error);
    await expect(
      planningEndpoints.approvePlan("plan", {
        operationId: "op",
        proposalId: "proposal",
        expectedDecisionVersion: 1,
      }),
    ).rejects.toBe(error);
  });
});
import { ledgerEndpoints } from '@/api/ledger';

it('loads paginated notifications and sends the required JSON object when marking read', async () => {
  const signal = new AbortController().signal;
  await ledgerEndpoints.getNotifications({ page: 2, pageSize: 20, status: 'UNREAD', sortBy: 'createdAt', sortDirection: 'desc' }, { signal });
  expect(apiFetch).toHaveBeenLastCalledWith('/api/ledger/notifications?page=2&pageSize=20&status=UNREAD&sortBy=createdAt&sortDirection=desc', { signal });
  await ledgerEndpoints.readNotification('notice/1');
  expect(apiFetch).toHaveBeenLastCalledWith('/api/ledger/notifications/notice%2F1/read', { method: 'POST', body: '{}' });
});
