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
  saved,
}: {
  container: ContainerExecution;
  canWrite: boolean;
  saved: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const production = useQuery({
    queryKey: ["container-production", c.id],
    queryFn: () => containerExecutionEndpoints.getProduction(c.id),
    staleTime: 0,
  });

  const command = useContainerCommand(
    (operationId, input: { version: number; proposalId: string }) =>
      containerExecutionEndpoints.requestProduction(c.id, {
        operationId,
        ...input,
      }),
    saved,
  );

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

      <ContainerCommandFeedback
        error={command.error}
        uncertain={command.uncertain}
        retry={command.retry}
        success={command.isSuccess}
      />
    </section>
  );
}
