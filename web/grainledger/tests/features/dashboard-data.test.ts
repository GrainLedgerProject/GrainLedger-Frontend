import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "@/api/client";
import {
  loadDashboardSource,
  parseDashboardCollection,
} from "@/features/dashboard/api/dashboardApi";
import { canReadSource } from "@/features/dashboard/model/dashboardConfig";
import {
  getChart,
  getMetrics,
  getPriorities,
  shippingBucket,
  stockMass,
} from "@/features/dashboard/model/dashboardData";
import { dashboardFixtures } from "../fixtures/dashboardData";

vi.mock("@/api/client", () => ({ apiFetch: vi.fn() }));
beforeEach(() => vi.mocked(apiFetch).mockReset());
const now = new Date("2026-11-16T03:00:00Z");

describe("Dashboard data boundaries", () => {
  it("keeps stock-viewer access scoped and never treats an administrator as a permission wildcard", () => {
    expect(canReadSource("stock", "AUTHORIZED_STOCK_VIEWER", [])).toBe(true);
    expect(canReadSource("users", "AUTHORIZED_STOCK_VIEWER", [])).toBe(false);
    expect(canReadSource("users", "MILL_ADMIN", [])).toBe(false);
    expect(
      canReadSource("organizations", "MILL_ADMIN", ["identity.manage"]),
    ).toBe(true);
  });

  it("rejects malformed or missing datasets instead of displaying zero", () => {
    expect(() => parseDashboardCollection("users", {})).toThrow(
      "Invalid dashboard data",
    );
    expect(() =>
      parseDashboardCollection("stock", { items: [{ id: "lot", code: "L1" }] }),
    ).toThrow();
    const metrics = getMetrics("MILL_ADMIN", {}, "vi", 0, now);
    expect(metrics.every((metric) => metric.value === null)).toBe(true);
  });

  it("distinguishes a page aggregate from the server-wide authorized count", () => {
    const data = {
      users: parseDashboardCollection("users", {
        items: [
          { id: "user", email: "a@example.test", role: null, isActive: true },
        ],
        totalCount: 120,
        hasMore: true,
      }),
    };
    const metrics = getMetrics("MILL_ADMIN", data, "vi", 0, now);
    expect(metrics[1].value).toBe("1");
    expect(metrics[1].detail).toContain("chưa phải toàn bộ");
    expect(metrics[3].value).toBe("1");
  });

  it("uses exact decimal sums across positions and filters them by selected facility", async () => {
    const exact = [
      {
        positions: [
          { quantityKg: "0.100001", availableKg: "0.100001" },
          { quantityKg: "0.200002", availableKg: "0.200002" },
        ],
      },
    ];
    expect(stockMass(exact, "availableKg").toString()).toBe("0.300003");
    vi.mocked(apiFetch).mockResolvedValue(dashboardFixtures.stock);
    const signal = new AbortController().signal;
    const stock = await loadDashboardSource("stock", "facility-2", signal);
    expect(stockMass(stock.items, "availableKg").toString()).toBe(
      "5000.200002",
    );
    expect(apiFetch).toHaveBeenCalledWith(
      expect.stringContaining("facilityId=facility-2"),
      { signal },
    );
  });

  it("requires a facility before requesting arrival data", async () => {
    await expect(loadDashboardSource("receiving", undefined)).rejects.toThrow(
      "Select a receiving facility",
    );
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("groups procurement dates using Vietnam time, including UTC midnight boundaries", () => {
    const procurements = parseDashboardCollection("procurements", {
      items: [
        {
          id: "p",
          code: "PRC",
          totalNetMassKg: "0.300003",
          receivedAt: "2026-11-15T18:00:00Z",
        },
      ],
      hasMore: false,
    });
    const bars = getChart(
      "CUSTOMER_PROCUREMENT_OFFICER",
      { procurements },
      "vi",
      now,
    );
    expect(bars.at(-1)).toMatchObject({ label: "16/11", value: "0.300003" });
    expect(bars.slice(0, -1).every((bar) => bar.value === "0")).toBe(true);
  });

  it("does not call ended shipping windows unfulfilled or overdue orders", () => {
    expect(
      shippingBucket(
        { shippingFrom: "2026-11-01", shippingTo: "2026-11-15" },
        now,
      ),
    ).toBe("past");
    expect(
      shippingBucket(
        { shippingFrom: "2026-11-16", shippingTo: "2026-11-20" },
        now,
      ),
    ).toBe("current");
    expect(
      shippingBucket(
        { shippingFrom: "2026-11-20", shippingTo: "2026-11-24" },
        now,
      ),
    ).toBe("soon");
  });

  it("does not ask users to confirm a superseded report", () => {
    const labs = parseDashboardCollection("labs", {
      items: [
        {
          id: "report",
          reportNumber: "LAB",
          status: "SUPERSEDED",
          confirmedAt: null,
          assessmentStatus: "INCOMPLETE",
        },
      ],
    });
    expect(
      getPriorities("CUSTOMER_MANAGER", { labs }, "vi", 0, now),
    ).toHaveLength(0);
    expect(
      getMetrics("CUSTOMER_MANAGER", { labs }, "vi", 0, now)[0].value,
    ).toBe("0");
  });
});
