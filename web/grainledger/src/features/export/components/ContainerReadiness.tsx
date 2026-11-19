import type { ContainerReadiness as Readiness } from "@/api/containerExecution";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import {
  CheckCircle,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";

const findings: Record<string, [string, string]> = {
  CONTAINER_CLOSED: ["Container đã đóng niêm.", "The container is closed."],
  CONTAINER_HOLD: ["Container đang có lệnh HOLD.", "The container is on HOLD."],
  LOT_RESTRICTED: ["Một lô hàng đang bị hạn chế sử dụng.", "A lot is restricted."],
  ACTIVE_APPROVAL_REQUIRED: ["Cần phương án được duyệt còn hiệu lực.", "An active approved plan is required."],
  EXACT_TARGET_NOT_LOADED: ["Khối lượng thực xếp chưa đủ mục tiêu.", "Actual loading has not reached the exact target."],
  TARGET_ALREADY_LOADED: ["Đã xếp đủ mục tiêu. Chuyển sang niêm phong.", "The target is loaded. Continue to closure."],
  SEAL_METADATA_MISSING: ["Cần số container và số seal trước khi đóng niêm.", "Container and seal numbers are required."],
  APPROVED_DEMAND_CHANGED: ["Nhu cầu đã đổi sau khi duyệt. Cần đánh giá lại.", "Demand changed after approval. Reassessment is required."],
  APPROVAL_EVIDENCE_CHANGED: ["Chứng cứ đã đổi sau khi duyệt. Cần đánh giá lại.", "Evidence changed after approval. Reassessment is required."],
  POSITION_OR_SOURCE_HANDOFF_REQUIRED: ["Cần bàn giao hàng về vị trí đủ điều kiện xếp.", "Stock must be handed off to a loading-ready position."],
  OUTPUT_REVIEW_REQUIRED: ["Cần duyệt đầu ra thực tế trước khi xếp.", "Actual output review is required before loading."],
  OUTPUT_REVIEW_REJECTED: ["Đánh giá đầu ra đã bị từ chối.", "Output review was rejected."],
  BLEND_OUTPUT_HANDOFF_REQUIRED: ["Cần thực hiện phối trộn và bàn giao đầu ra đã duyệt trước khi xếp.", "Produce the approved blend and hand off its reviewed output before loading."],
  APPROVED_PRODUCTION_PENDING: ["Đang chờ vận hành ghi nhận mẻ sản xuất đã yêu cầu.", "The requested production batch is awaiting the operator."],
  RESIDUE_EVALUATE_PERMISSION_REQUIRED: ["Tài khoản cần quyền đánh giá dư lượng để ghi nhận.", "Residue evaluation permission is required."],
  QUALITY_LIMIT: ["Chỉ tiêu chất lượng chưa đạt giới hạn.", "A quality limit is not satisfied."],
};

export function ContainerReadiness({ readiness }: { readiness: Readiness }) {
  const text = useWorkflowText();
  const isPass = readiness.assessmentStatus === "PASS";

  return (
    <section
      aria-label={text("Kiểm tra điều kiện hiện tại", "Current readiness checks")}
      className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center gap-2.5 border-b border-ink-tertiary/15 pb-3">
        <ShieldCheck size={20} className="text-accent-primary" />
        <h2 className="font-display text-sm font-bold text-ink-primary">
          {text("Kiểm tra điều kiện hiện tại", "Current readiness checks")}
        </h2>
      </div>

      <div
        role="status"
        className={`p-3.5 rounded-xl border flex items-center gap-2.5 text-xs ${
          isPass
            ? "border-functional-balanced-border/40 bg-functional-balanced-bg text-accent-primary"
            : "border-functional-stale-border bg-functional-stale-bg/40 text-ink-primary"
        }`}
      >
        {isPass ? (
          <CheckCircle size={18} weight="fill" className="shrink-0" />
        ) : (
          <WarningCircle
            size={18}
            weight="fill"
            className="text-accent-warning shrink-0"
          />
        )}
        <span className="font-medium">
          {isPass
            ? text("Đủ điều kiện ở thời điểm kiểm tra", "Checks passed at the recorded time")
            : text("Cần xử lý trước khi tiếp tục", "Resolve the following before continuing")}{" "}
          · {new Date(readiness.checkedAt).toLocaleString()}
        </span>
      </div>

      {readiness.findings.length > 0 && (
        <ul className="space-y-1.5 pt-1">
          {readiness.findings.map((code, i) => (
            <li
              key={i}
              className="p-2.5 rounded-lg bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15 text-xs text-ink-secondary flex items-center gap-2"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent-warning shrink-0" />
              <span>{findings[code] ? text(...findings[code]) : code}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
