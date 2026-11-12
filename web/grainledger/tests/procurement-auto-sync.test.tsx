import "fake-indexeddb/auto";
import { StrictMode } from "react";
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { procurementEndpoints, type RegisterProcurementRequest } from "@/api/procurement";
import { STORES, withStore } from "@/pwa/db";
import { getQueuedProcurementCount, isProcurementSyncing, queueProcurement, syncQueuedProcurements } from "@/pwa/procurementQueue";
import { useProcurementSync } from "@/pwa/useProcurementSync";

vi.mock("@/api/health", () => ({ checkBackendHealth: vi.fn().mockResolvedValue(false) }));
vi.mock("@/api/procurement", () => ({ procurementEndpoints: { registerProcurement: vi.fn() } }));
vi.mock("@/pwa/offlineCache", () => ({ syncOfflineCache: vi.fn().mockResolvedValue({ success: true }) }));

function request(id: string): RegisterProcurementRequest {
  return {
    deviceId: "test", clientOperationId: id, capturedAt: new Date().toISOString(), payloadSchemaVersion: 1,
    payload: { entityId: id, farmerId: "farmer", collectionSiteId: "site", receivingLocationId: "location", commodityId: "rice", receivedAt: new Date().toISOString(), items: [] },
  };
}

beforeEach(async () => {
  await useUiStore.getState().checkConnection();
  await withStore(STORES.PROCUREMENT_QUEUE, "readwrite", (store) => store.clear());
  vi.mocked(procurementEndpoints.registerProcurement).mockReset().mockResolvedValue({} as never);
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  useAuthStore.setState({ isAuthenticated: true });
  useUiStore.setState({ isOnline: false, isBackendConnected: false, procurementSyncMode: "auto", pendingOfflineCount: 0 });
});

afterEach(async () => {
  cleanup();
  if (isProcurementSyncing()) await syncQueuedProcurements();
  localStorage.removeItem("grainledger_procurement_sync_mode");
});

describe("procurement synchronization policy", () => {
  it("synchronizes once when React StrictMode remounts the effect", async () => {
    await queueProcurement(request("strict-mode"));
    useUiStore.setState({ isOnline: true, isBackendConnected: true });
    renderHook(() => useProcurementSync(), { wrapper: StrictMode });
    await waitFor(async () => expect(await getQueuedProcurementCount()).toBe(0));
    expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1);
  });
  it("drains a newly queued receipt captured during an active automatic batch", async () => {
    await queueProcurement(request("active-1"));
    let release!: () => void;
    vi.mocked(procurementEndpoints.registerProcurement).mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve({} as never); }),
    );
    useUiStore.setState({ isOnline: true, isBackendConnected: true });
    renderHook(() => useProcurementSync());
    await waitFor(() => expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1));
    await act(async () => { await queueProcurement(request("active-2")); });
    await act(async () => { release(); });
    await waitFor(async () => expect(await getQueuedProcurementCount()).toBe(0));
    expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(2);
  });

  it("switches to manual during a batch without sending the remaining receipt", async () => {
    await queueProcurement(request("switch-1"));
    await queueProcurement(request("switch-2"));
    let release!: () => void;
    vi.mocked(procurementEndpoints.registerProcurement).mockImplementationOnce(
      () => new Promise((resolve) => { release = () => resolve({} as never); }),
    );
    useUiStore.setState({ isOnline: true, isBackendConnected: true });
    renderHook(() => useProcurementSync());
    await waitFor(() => expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1));
    act(() => useUiStore.getState().setProcurementSyncMode("manual"));
    expect(localStorage.getItem("grainledger_procurement_sync_mode")).toBe("manual");
    await act(async () => { release(); });
    await waitFor(() => expect(isProcurementSyncing()).toBe(false));
    expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1);
    expect(await getQueuedProcurementCount()).toBe(1);
  });

  it("sends queued receipts when the backend recovers without a browser online event", async () => {
    await queueProcurement(request("reconnect"));
    renderHook(() => useProcurementSync());
    expect(procurementEndpoints.registerProcurement).not.toHaveBeenCalled();
    act(() => useUiStore.setState({ isOnline: true, isBackendConnected: true }));
    await waitFor(() => expect(useUiStore.getState().pendingOfflineCount).toBe(0));
    await waitFor(() => expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1));
    await waitFor(async () => expect(await getQueuedProcurementCount()).toBe(0));
  });

  it("keeps receipts queued in manual mode at startup and after reconnect, until explicitly sent", async () => {
    await queueProcurement(request("manual"));
    useUiStore.setState({ procurementSyncMode: "manual", isOnline: true, isBackendConnected: true });
    renderHook(() => useProcurementSync());
    await waitFor(() => expect(useUiStore.getState().pendingOfflineCount).toBe(1));
    act(() => useUiStore.setState({ isOnline: false, isBackendConnected: false }));
    act(() => useUiStore.setState({ isOnline: true, isBackendConnected: true }));
    expect(procurementEndpoints.registerProcurement).not.toHaveBeenCalled();
    await act(async () => { await syncQueuedProcurements(); });
    expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1);
    expect(await getQueuedProcurementCount()).toBe(0);
  });

  it("persists the preference and starts sending when automatic mode is enabled online", async () => {
    await queueProcurement(request("enable"));
    useUiStore.setState({ procurementSyncMode: "manual", isOnline: true, isBackendConnected: true });
    renderHook(() => useProcurementSync());
    act(() => useUiStore.getState().setProcurementSyncMode("auto"));
    expect(localStorage.getItem("grainledger_procurement_sync_mode")).toBe("auto");
    await waitFor(async () => expect(await getQueuedProcurementCount()).toBe(0));
    expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1);
  });

  it("keeps failures without a retry loop and retries on the next backend reconnection", async () => {
    await queueProcurement(request("retry"));
    vi.mocked(procurementEndpoints.registerProcurement).mockRejectedValueOnce(new Error("Server unavailable"));
    useUiStore.setState({ isOnline: true, isBackendConnected: true });
    renderHook(() => useProcurementSync());
    await waitFor(() => expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(isProcurementSyncing()).toBe(false));
    expect(await getQueuedProcurementCount()).toBe(1);
    expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(1);
    act(() => useUiStore.setState({ isOnline: false, isBackendConnected: false }));
    act(() => useUiStore.setState({ isOnline: true, isBackendConnected: true }));
    await waitFor(async () => expect(await getQueuedProcurementCount()).toBe(0));
    expect(procurementEndpoints.registerProcurement).toHaveBeenCalledTimes(2);
  });

  it("does not send before authentication and backend verification", async () => {
    await queueProcurement(request("auth"));
    useAuthStore.setState({ isAuthenticated: false });
    useUiStore.setState({ isOnline: true, isBackendConnected: true });
    renderHook(() => useProcurementSync());
    await waitFor(() => expect(useUiStore.getState().pendingOfflineCount).toBe(1));
    expect(procurementEndpoints.registerProcurement).not.toHaveBeenCalled();
    act(() => {
      useUiStore.setState({ isBackendConnected: false });
      useAuthStore.setState({ isAuthenticated: true });
    });
    expect(procurementEndpoints.registerProcurement).not.toHaveBeenCalled();
    act(() => useUiStore.setState({ isBackendConnected: true }));
    await waitFor(async () => expect(await getQueuedProcurementCount()).toBe(0));
  });
});
