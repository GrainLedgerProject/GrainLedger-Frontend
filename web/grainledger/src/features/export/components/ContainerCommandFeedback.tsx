import { ApiError } from "@/api/client";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import {
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
} from "@phosphor-icons/react";

export function ContainerCommandFeedback({
  error,
  uncertain,
  retry,
  success,
}: {
  error: unknown;
  uncertain: boolean;
  retry: () => void;
  success?: boolean;
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
        <div className="p-3.5 rounded-xl bg-functional-stale-bg/40 border border-functional-stale-border space-y-2 text-xs">
          <div className="flex items-start gap-2 text-ink-primary">
            <WarningCircle
              size={16}
              className="text-accent-warning shrink-0 mt-0.5"
            />
            <p role="status">
              {text(
                "Chưa xác định được kết quả ghi. Gửi lại đúng yêu cầu cũ để nhận kết quả, tránh ghi trùng.",
                "The write result is uncertain. Retry the exact original request to resolve it without duplication.",
              )}
            </p>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              onClick={retry}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-accent-warning text-ink-primary font-semibold hover:bg-accent-warning/90 transition-all shadow-xs"
            >
              <ArrowsClockwise size={14} />
              <span>
                {text("Thử lại cùng yêu cầu", "Retry original request")}
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
