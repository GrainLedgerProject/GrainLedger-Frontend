import "fake-indexeddb/auto";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { RegisterProcurementRequest } from "@/api/procurement";
import { procurementEndpoints } from "@/api/procurement";
import { STORES, withStore } from "@/pwa/db";
import {
  getQueuedProcurementCount,
  getQueuedProcurements,
  queueProcurement,
  syncQueuedProcurements,
} from "@/pwa/procurementQueue";

vi.mock("@/api/procurement", () => ({
  procurementEndpoints: { registerProcurement: vi.fn() },
}));

function request(id: string): RegisterProcurementRequest {
  return {
    deviceId: "web-test",
    clientOperationId: id,
    capturedAt: "2026-11-09T08:00:00.000Z",
    payloadSchemaVersion: 1,
    payload: {
      entityId: `entity-${id}`,
      farmerId: "farmer-1",
      collectionSiteId: "site-1",
      receivingLocationId: "location-1",
      commodityId: "commodity-1",
      receivedAt: "2026-11-09T08:00:00.000Z",
      items: [{ itemId: `item-${id}`, lineNo: 1, plotSeasonId: "season-1", measuredValue: "100.000", measuredUnit: "kg", moisturePercent: "20", lotId: "lot-1", sourceLotId: "source-1" }],
    },
  };
}

beforeEach(async () => {
  await withStore(STORES.PROCUREMENT_QUEUE, "readwrite", (store) => store.clear());
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  vi.mocked(procurementEndpoints.registerProcurement).mockReset();
});

describe("Hàng đợi thu mua ngoại tuyến", () => {
  it("shares concurrent manual and automatic sync calls", async () => {
    await queueProcurement(request("concurrent"));
    let release!: () => void;
    vi.mocked(procurementEndpoints.registerProcurement).mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve({} as never); }),
    );
    const first = syncQueuedProcurements();
    const second = syncQueuedProcurements();
    expect(first).toBe(second);
    await vi.waitFor(() => expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1));
    release();
    expect(await first).toEqual({ synced: 1, failed: 0 });
    expect(await getQueuedProcurementCount()).toBe(0);
  });

  it("finishes the current receipt and stops when automatic sync is disabled", async () => {
    await queueProcurement(request("pause-1"));
    await queueProcurement(request("pause-2"));
    let enabled = true;
    vi.mocked(procurementEndpoints.registerProcurement).mockImplementationOnce(async () => {
      enabled = false;
      return {} as never;
    });
    expect(await syncQueuedProcurements(() => enabled)).toEqual({ synced: 1, failed: 0 });
    expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1);
    expect(await getQueuedProcurementCount()).toBe(1);
  });

  it("stops sending the remaining receipts after losing the network", async () => {
    await queueProcurement(request("disconnect-1"));
    await queueProcurement(request("disconnect-2"));
    vi.mocked(procurementEndpoints.registerProcurement).mockImplementationOnce(async () => {
      Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
      return {} as never;
    });
    expect(await syncQueuedProcurements()).toEqual({ synced: 1, failed: 0 });
    expect(await getQueuedProcurementCount()).toBe(1);
  });
  it("lưu phiếu bằng clientOperationId và không tạo bản sao khi lưu lại", async () => {
    await queueProcurement(request("op-1"));
    await queueProcurement(request("op-1"));
    expect(await getQueuedProcurementCount()).toBe(1);
    expect((await getQueuedProcurements())[0].request.clientOperationId).toBe("op-1");
  });

  it("không gửi phiếu khi offline và giữ nguyên hàng đợi", async () => {
    await queueProcurement(request("op-2"));
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    expect(await syncQueuedProcurements()).toEqual({ synced: 0, failed: 0 });
    expect(procurementEndpoints.registerProcurement).not.toHaveBeenCalled();
    expect(await getQueuedProcurementCount()).toBe(1);
  });

  it("đồng bộ thành công và xóa phiếu đã gửi", async () => {
    const queued = request("op-3");
    await queueProcurement(queued);
    vi.mocked(procurementEndpoints.registerProcurement).mockResolvedValueOnce({} as never);
    expect(await syncQueuedProcurements()).toEqual({ synced: 1, failed: 0 });
    expect(procurementEndpoints.registerProcurement).toHaveBeenCalledWith(queued);
    expect(await getQueuedProcurementCount()).toBe(0);
  });

  it("giữ phiếu lỗi để thử lại với cùng mã thao tác", async () => {
    const queued = request("op-4");
    await queueProcurement(queued);
    vi.mocked(procurementEndpoints.registerProcurement).mockRejectedValueOnce(new Error("Mất kết nối"));
    expect(await syncQueuedProcurements()).toEqual({ synced: 0, failed: 1 });
    expect((await getQueuedProcurements())[0]).toMatchObject({ id: "op-4", attempts: 1, lastError: "Mất kết nối" });
    vi.mocked(procurementEndpoints.registerProcurement).mockResolvedValueOnce({} as never);
    expect(await syncQueuedProcurements()).toEqual({ synced: 1, failed: 0 });
    expect(procurementEndpoints.registerProcurement).toHaveBeenLastCalledWith(queued);
    expect(await getQueuedProcurementCount()).toBe(0);
  });

  it("tiếp tục đồng bộ phiếu tiếp theo khi một phiếu lỗi nhưng vẫn còn mạng", async () => {
    await queueProcurement(request("op-5"));
    await queueProcurement(request("op-6"));
    vi.mocked(procurementEndpoints.registerProcurement)
      .mockRejectedValueOnce(new Error("API từ chối phiếu"))
      .mockResolvedValueOnce({} as never);
    expect(await syncQueuedProcurements()).toEqual({ synced: 1, failed: 1 });
    expect((await getQueuedProcurements()).map((item) => item.id)).toEqual(["op-5"]);
  });
});
