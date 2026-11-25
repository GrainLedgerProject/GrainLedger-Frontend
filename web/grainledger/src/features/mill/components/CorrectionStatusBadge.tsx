import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useTranslation } from "react-i18next";
import { type CorrectionRecord } from "../model/correction";

export function CorrectionStatusBadge({ status }: { status: CorrectionRecord["status"] }) {
  const { t } = useTranslation();
    switch (status) {
      case "PENDING_REVIEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-functional-stale-bg text-accent-warning border border-functional-stale-border/40">
            <span className="w-1.5 h-1.5 rounded-full bg-functional-stale-bg0 animate-pulse" />
            {t(
              "mill.pendingCorrections.statusPendingReview",
              "Chờ Quản lý đối soát",
            )}
          </span>
        );
      case "RECONCILED":
        return (
          <StatusBadge
            status="BALANCED"
            label={t(
              "mill.pendingCorrections.statusReconciled",
              "Đã đối soát xong",
            )}
          />
        );
      case "COMMITTED":
        return (
          <StatusBadge
            status="BALANCED"
            label={t(
              "mill.pendingCorrections.statusCommitted",
              "Đã chốt bút toán bù",
            )}
          />
        );
      case "CANCELLED":
        return (
          <StatusBadge
            status="REJECTED"
            label={t("mill.pendingCorrections.statusCancelled", "Đã hủy")}
          />
        );
    }
}
