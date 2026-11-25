import { ApiError } from "@/api/client";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import type { PendingCommandRecord } from "@/shared/hooks/pendingCommandStore";
import {
  ArrowsClockwise,
  CheckCircle,
  Trash,
  WarningCircle,
} from "@phosphor-icons/react";

export function ContainerCommandFeedback({
  error,
  uncertain,
  retry,
  success,
  isPending,
  restoredPending,
  discardPending,
}: {
  error: unknown;
  uncertain: boolean;
  retry: () => void;
  success?: boolean;
  isPending?: boolean;
  restoredPending?: PendingCommandRecord<unknown> | null;
  discardPending?: () => void | Promise<void>;
}) {
  const text = useWorkflowText();
  const details =
    error instanceof ApiError
      ? (error.problem as { readiness?: { findings?: string[] } } | undefined)
      : undefined;

  return (
    <div className="space-y-3 pt-2">
      <Feedback error={error} />

      {details?.readiness?.findings?.length ? (
        <ul className="space-y-1 p-3 rounded-xl bg-functional-rejected-bg border border-functional-rejected-border text-xs text-accent-danger">
          {details.readiness.findings.map((f, i) => (
            <li key={i} className="flex items-center gap-1.5">
              <span className="h-1 w-1 rounded-full bg-accent-danger shrink-0" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      ) : null}

      {uncertain && (
        <div className="p-3.5 rounded-xl bg-functional-stale-bg/40 border border-functional-stale-border space-y-2.5 text-xs">
          <div className="flex items-start gap-2 text-ink-primary">
            <WarningCircle
              size={16}
              className="text-accent-warning shrink-0 mt-0.5"
            />
            <div className="space-y-1">
              <p role="status">
                {restoredPending && !error
                  ? text(
                      "Đã khôi phục yêu cầu chưa rõ kết quả từ phiên trước. Gửi lại cùng mã thao tác để xác nhận kết quả mà không ghi trùng.",
                      "Recovered an unresolved request from your previous view. Retry with the same operation ID to resolve without duplication.",
                    )
                  : text(
                      "Chưa xác định được kết quả ghi. Gửi lại đúng yêu cầu cũ để nhận kết quả, tránh ghi trùng.",
                      "The write result is uncertain. Retry the exact original request to resolve it without duplication.",
                    )}
              </p>
              {restoredPending && (
                <p className="text-[11px] font-mono text-ink-secondary break-all">
                  {text("Mã thao tác", "Operation ID")}:{" "}
                  {restoredPending.operationId}
                  {restoredPending.etag
                    ? ` · ${text("Phiên bản/ETag", "Version/ETag")}: ${restoredPending.etag}`
                    : ""}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-2">
            {restoredPending && discardPending && (
              <button
                type="button"
                disabled={isPending}
                onClick={() => void discardPending()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-ink-tertiary/30 bg-surface-base dark:bg-surface-raised text-ink-secondary font-medium hover:text-ink-primary hover:border-ink-tertiary/60 disabled:opacity-50 transition-all"
              >
                <Trash size={14} />
                <span>
                  {text("Bỏ yêu cầu chờ", "Discard pending")}
                </span>
              </button>
            )}
            <button
              type="button"
              disabled={isPending}
              onClick={retry}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-warning text-ink-primary font-semibold hover:bg-accent-warning/90 disabled:opacity-50 transition-all shadow-xs"
            >
              <ArrowsClockwise
                size={14}
                className={isPending ? "animate-spin" : ""}
              />
              <span>
                {isPending
                  ? text("Đang gửi lại...", "Retrying...")
                  : text("Thử lại cùng yêu cầu", "Retry original request")}
              </span>
            </button>
          </div>
        </div>
      )}

      {success && (
        <div
          role="status"
          className="p-3 rounded-xl bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2"
        >
          <CheckCircle size={16} weight="fill" className="shrink-0" />
          <span>
            {text("Đã ghi nhận trên máy chủ.", "Saved on the server.")}
          </span>
        </div>
      )}
    </div>
  );
}
