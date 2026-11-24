import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { containerExecutionEndpoints, type ContainerNotice } from "@/api/containerExecution";
import { useAuthStore } from "@/app/store/authStore";
import { millPaths } from "@/features/mill/paths";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { containerPath, exportPaths } from "../paths";
import { Bell, WarningCircle } from "@phosphor-icons/react";
import { useContainerCommand } from "../hooks/useContainerCommand";
import { ContainerCommandFeedback } from "./ContainerCommandFeedback";

export function ContainerNotices() {
  const text = useWorkflowText();
  const user = useAuthStore(state => state.user);
  const notices = useQuery({
    queryKey: ["container-notifications", user?.id],
    queryFn: containerExecutionEndpoints.getNotifications,
    staleTime: 0,
  });

  return (
    <section
      aria-label={text("Cảnh báo container", "Container alerts")}
      className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised p-5 shadow-xs space-y-4"
    >
      <div className="flex items-center gap-2.5 border-b border-ink-tertiary/15 pb-3">
        <Bell size={20} className="text-accent-warning" />
        <h2 className="font-display text-sm font-bold text-ink-primary">
          {text("Cảnh báo container", "Container alerts")}
        </h2>
      </div>

      <Feedback pending={notices.isPending} error={notices.error} />

      {notices.data?.items.length === 0 && (
        <p className="text-xs text-ink-secondary py-1">
          {text("Chưa có cảnh báo container.", "No container alerts.")}
        </p>
      )}

      {notices.data && notices.data.items.length > 0 && (
        <ul className="space-y-2">
          {notices.data.items.map((n) => (
            <li
              key={n.id}
              className="p-3 rounded-xl bg-functional-rejected-bg border border-functional-rejected-border text-xs flex flex-wrap items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 text-ink-primary">
                <WarningCircle
                  size={16}
                  weight="fill"
                  className="text-accent-danger shrink-0"
                />
                <Link
                  className="font-mono font-bold text-accent-danger hover:underline"
                  to={user?.role === "MILL_MANAGER"
                    ? millPaths.executePlans + "?container=" + encodeURIComponent(n.containerId)
                    : containerPath(exportPaths.loading, n.containerId)}
                >
                  {n.code}
                </Link>
                <span>·</span>
                <span>{n.message}</span>
              </div>
              <span className="text-[11px] text-ink-secondary shrink-0 font-mono">
                {new Date(n.createdAt).toLocaleString()}
              </span>
              {!n.readAt && <ReadNotice notice={n} />}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ReadNotice({ notice }: { notice: ContainerNotice }) {
  const text = useWorkflowText();
  const cache = useQueryClient();
  const command = useContainerCommand((operationId, { version }: { version: number }) =>
    containerExecutionEndpoints.markNoticeRead(notice.containerId, { operationId, version, noticeId: notice.id }), async () => {
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["container-notifications"] }),
        cache.invalidateQueries({ queryKey: ["container-workflow", notice.containerId] }),
        cache.invalidateQueries({ queryKey: ["container-execution", notice.containerId] }),
      ]);
    });
  const prepare = useMutation({
    mutationFn: () => containerExecutionEndpoints.getWorkflow(notice.containerId),
    onSuccess: workflow => command.submit({ version: workflow.version }),
  });
  return (
    <div className="space-y-2">
      <button
        type="button"
        className="rounded-lg border border-ink-tertiary/20 bg-surface-base px-3 py-2 disabled:opacity-50"
        disabled={prepare.isPending || command.isPending || command.uncertain}
        onClick={() => prepare.mutate()}
      >{text("Đánh dấu đã đọc", "Mark read")}</button>
      <Feedback error={prepare.error} />
      <ContainerCommandFeedback error={command.error} uncertain={command.uncertain} retry={command.retry} success={command.isSuccess} />
    </div>
  );
}
