import { useEffect } from "react";
import { useAuthStore } from "@/app/store/authStore";
import { selectSessionOwner } from "@/app/store/sessionOwner";
import { useUiStore } from "@/app/store/uiStore";
import { logger } from "@/shared/utils/logger";
import { syncOfflineCache } from "./offlineCache";
import {
  getQueuedProcurementCount,
  isProcurementSyncing,
  onProcurementQueueChanged,
  syncQueuedProcurements,
} from "./procurementQueue";

export function useProcurementSync() {
  const isOnline = useUiStore((state) => state.isOnline);
  const isBackendConnected = useUiStore((state) => state.isBackendConnected);
  const mode = useUiStore((state) => state.procurementSyncMode);
  const ownerKey = useAuthStore(selectSessionOwner);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    let active = true;
    let running = false;
    let requested = false;
    const canSync = () => {
      const state = useAuthStore.getState();
      const canPurchase =
        state.user?.role === "CUSTOMER_PROCUREMENT_OFFICER" ||
        Boolean(state.user?.permissions.includes("purchases.write"));
      return (
        active &&
        useUiStore.getState().isOnline &&
        useUiStore.getState().isBackendConnected &&
        useUiStore.getState().procurementSyncMode === "auto" &&
        state.isAuthenticated &&
        canPurchase
      );
    };
    const refreshCount = async () => {
      const count = await getQueuedProcurementCount();
      if (active) useUiStore.getState().setPendingOfflineCount(count);
    };
    const synchronize = async () => {
      if (!canSync()) return;
      requested = true;
      if (running) return;
      running = true;
      try {
        // A new capture during an active batch gets its own subsequent pass.
        // Completion/failure notifications never schedule an automatic retry loop.
        while (requested && canSync()) {
          requested = false;
          if (isProcurementSyncing()) await syncQueuedProcurements();
          if (!canSync()) break;
          await syncQueuedProcurements(canSync);
        }
      } catch (error) {
        logger.warn("Unable to synchronize queued procurements:", error);
      } finally {
        running = false;
        await refreshCount();
      }
    };
    const unsubscribe = onProcurementQueueChanged((reason) => {
      void refreshCount();
      if (reason === "queued") void synchronize();
    });
    void refreshCount();
    void synchronize();
    return () => {
      active = false;
      unsubscribe();
    };
  }, [isOnline, isBackendConnected, mode, isAuthenticated, ownerKey]);

  useEffect(() => {
    const perms = useAuthStore.getState().user?.permissions ?? [];
    const canSyncField =
      perms.includes("purchases.write") ||
      perms.includes("farms.read") ||
      perms.includes("farms.write");
    if (isOnline && isBackendConnected && isAuthenticated && canSyncField) {
      void syncOfflineCache().catch((error) =>
        logger.warn("Unable to refresh offline cache:", error),
      );
    }
  }, [isOnline, isBackendConnected, isAuthenticated, ownerKey]);
}
