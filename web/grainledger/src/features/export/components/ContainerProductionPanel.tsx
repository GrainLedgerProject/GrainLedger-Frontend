import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  containerExecutionEndpoints,
  type ContainerExecution,
} from "@/api/containerExecution";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useContainerCommand } from "../hooks/useContainerCommand";
import { ContainerCommandFeedback } from "./ContainerCommandFeedback";
import { Factory, PaperPlaneTilt } from "@phosphor-icons/react";

export function ContainerProductionPanel({
  container: c,
  canWrite,
  canReview = false,
  saved,
}: {
  container: ContainerExecution;
  canWrite: boolean;
  canReview?: boolean;
  saved: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const [reason, setReason] = useState("");
  const production = useQuery({
    queryKey: ["container-production", c.id],
    queryFn: () => containerExecutionEndpoints.getProduction(c.id),
    staleTime: 0,
  });

  const command = useContainerCommand<{
    version: number;
    action: "request";
    proposalId: string;
  } | {
    version: number;
    action: "approve" | "reject";
    reason: string;
  }>((operationId, input) => {
    if (input.action === "request") {
      return containerExecutionEndpoints.requestProduction(c.id, { operationId, version: input.version, proposalId: input.proposalId });
    }
    const body = { operationId, version: input.version, reason: input.reason };
    return input.action === "approve"
      ? containerExecutionEndpoints.approveProduction(c.id, body)
      : containerExecutionEndpoints.rejectProduction(c.id, body);
  }, async () => {
    setReason("");
    await saved();
  }, { persistKey: `container:${c.id}:production` });
  const reviewable = canReview && production.data && ["PRODUCED", "APPROVED", "REJECTED"].includes(production.data.state)
    && Boolean(production.data.outputId) && c.status !== "CLOSED" && !c.holds.length;
  function review(action: "approve" | "reject") {
    if (production.data && reason.trim()) command.submit({ action, version: production.data.version, reason: reason.trim() });
  }

  return (
    <section
      aria-label={text(
        "Bàn giao phối trộn cho nhà máy",
        "Blend production handoff",
      )}
      className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center gap-2.5 border-b border-ink-tertiary/15 pb-3">
        <Factory size={20} className="text-accent-primary" />
        <h2 className="font-display text-sm font-bold text-ink-primary">
          {text("Bàn giao phối trộn cho nhà máy", "Blend production handoff")}
        </h2>
      </div>

      <Feedback pending={production.isPending} error={production.error} />

      {production.data && (
        <div className="p-3.5 rounded-xl bg-surface-raised/40 dark:bg-surface-overlay/20 border border-ink-tertiary/15 text-xs">
          <p className="font-medium text-ink-primary flex items-center gap-2">
            <span>
              {text("Trạng thái sản xuất", "Production state")}:
            </span>
            <span className="font-mono font-bold text-accent-primary">
              {production.data.state}
            </span>
            {production.data.outputCode && (
              <span className="font-mono text-ink-secondary">
                · {production.data.outputCode}
              </span>
            )}
          </p>
        </div>
      )}

      <p className="text-xs text-ink-secondary">
        {text(
          "Nhân viên vận hành ghi nhận mẻ thực tế, sau đó quản lý duyệt đầu ra trước khi Export xếp hàng.",
          "The operator records the actual batch, then a manager reviews its output before Export loads it.",
        )}
      </p>

      {canWrite &&
        ["NOT_REQUESTED", "APPROVAL_CHANGED"].includes(
          production.data?.state ?? "",
        ) &&
        c.status === "PLANNED" &&
        c.approval &&
        c.holds.length === 0 && (
          <div className="flex justify-end pt-1">
            <button
              type="button"
              disabled={
                command.isPending || command.uncertain || production.isFetching
              }
              onClick={() =>
                command.submit({
                  action: "request",
                  version: c.version,
                  proposalId: c.approval!.proposalId,
                })
              }
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-accent-primary hover:bg-accent-primary/90 text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-50"
            >
              <PaperPlaneTilt size={16} />
              <span>
                {text("Gửi yêu cầu sản xuất", "Request production")}
              </span>
            </button>
          </div>
        )}

      {reviewable && (
        <form onSubmit={event => { event.preventDefault(); review("approve"); }} className="gl-workflow">
          <fieldset disabled={command.isPending || command.uncertain || production.isFetching} className="space-y-3">
            <label>{text("Lý do duyệt đầu ra thực tế", "Actual output review reason")}
              <textarea value={reason} onChange={event => setReason(event.target.value)} maxLength={1000} required />
            </label>
            <div className="flex flex-wrap gap-2">
              <button type="submit" disabled={!reason.trim()}>{text("Duyệt đầu ra", "Approve output")}</button>
              <button type="button" disabled={!reason.trim()} onClick={() => review("reject")}>{text("Từ chối đầu ra", "Reject output")}</button>
            </div>
          </fieldset>
        </form>
      )}

      <ContainerCommandFeedback
        error={command.error}
        uncertain={command.uncertain}
        retry={command.retry}
        success={command.isSuccess}
        isPending={command.isPending}
        restoredPending={command.restoredPending}
        discardPending={command.discardPending}
      />
    </section>
  );
}
