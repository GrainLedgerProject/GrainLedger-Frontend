import { useUiStore } from "@/app/store/uiStore";
import { ArrowsClockwise, CloudCheck, CloudSlash } from "@phosphor-icons/react";
import React, { useEffect } from "react";
import { Link } from "react-router-dom";

export interface NetworkStatusIndicatorProps {
  className?: string;
  showSyncLink?: boolean;
}

export const NetworkStatusIndicator: React.FC<NetworkStatusIndicatorProps> = ({
  className = "",
  showSyncLink = true,
}) => {
  const isOnline = useUiStore((s) => s.isOnline);
  const isBackendConnected = useUiStore((s) => s.isBackendConnected);
  const hasInitialChecked = useUiStore((s) => s.hasInitialChecked);
  const isCheckingConnection = useUiStore((s) => s.isCheckingConnection);
  const pendingOfflineCount = useUiStore((s) => s.pendingOfflineCount);
  const checkConnection = useUiStore((s) => s.checkConnection);

  useEffect(() => {
    // Initial verification on mount (first visit / F5)
    void checkConnection(true);

    // Periodically verify connectivity to backend server every 15s (silent background check)
    const interval = setInterval(() => {
      void checkConnection(false);
    }, 15000);

    return () => clearInterval(interval);
  }, [checkConnection]);

  // Only show checking state when newly entering the page or on F5 refresh
  if (!hasInitialChecked || isCheckingConnection) {
    return (
      <div
        className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors select-none bg-sky-500/10 text-sky-700 border-sky-500/30 dark:bg-sky-950/30 dark:text-sky-400 ${className}`}
        role="status"
        title="Đang kiểm tra kết nối đến máy chủ backend..."
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-sky-400" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500" />
        </span>
        <span className="flex items-center gap-1.5">
          <ArrowsClockwise
            size={13}
            className="animate-spin text-sky-600 dark:text-sky-400"
          />
          <span>Đang kiểm tra kết nối...</span>
        </span>
      </div>
    );
  }

  const isConnected = isOnline && isBackendConnected;

  return (
    <div
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors select-none ${
        isConnected
          ? pendingOfflineCount > 0
            ? "bg-accent-warning/10 text-accent-warning border-functional-stale-border/40"
            : "bg-accent-primary/10 text-accent-primary border-accent-primary/20"
          : "bg-accent-danger/10 text-accent-danger border-accent-danger/30"
      } ${className}`}
      role="status"
      title={
        isConnected
          ? "Đang trực tuyến (Đã kết nối máy chủ backend)"
          : "Đang ngoại tuyến (Offline - Local)"
      }
    >
      <span className="relative flex h-2 w-2">
        {isConnected && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
              pendingOfflineCount > 0 ? "bg-accent-warning" : "bg-accent-primary"
            }`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${
            !isConnected
              ? "bg-accent-danger"
              : pendingOfflineCount > 0
                ? "bg-functional-stale-bg0"
                : "bg-accent-primary"
          }`}
        />
      </span>

      <span className="flex items-center gap-1">
        {isConnected ? (
          pendingOfflineCount > 0 ? (
            <>
              <CloudCheck size={14} />
              <span>
                Trực tuyến ({pendingOfflineCount} bản ghi chờ đồng bộ)
              </span>
            </>
          ) : (
            <>
              <CloudCheck size={14} />
              <span>Trực tuyến</span>
            </>
          )
        ) : (
          <>
            <CloudSlash size={14} />
            <span>
              Offline - Local
              {pendingOfflineCount > 0 ? ` (${pendingOfflineCount} bản ghi cục bộ)` : ""}
            </span>
          </>
        )}
      </span>

      {showSyncLink && pendingOfflineCount > 0 && isConnected && (
        <Link
          to="/field/sync"
          onClick={(e) => e.stopPropagation()}
          className="ml-1 hover:text-ink-primary font-semibold flex items-center gap-0.5"
        >
          <ArrowsClockwise
            size={14}
            className="animate-spin"
            style={{ animationDuration: "3s" }}
          />
          Đồng bộ
        </Link>
      )}
    </div>
  );
};
