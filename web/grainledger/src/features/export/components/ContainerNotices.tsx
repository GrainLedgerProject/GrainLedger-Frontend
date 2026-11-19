import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { containerPath, exportPaths } from "../paths";
import { Bell, WarningCircle } from "@phosphor-icons/react";

export function ContainerNotices() {
  const text = useWorkflowText();
  const notices = useQuery({
    queryKey: ["container-notifications"],
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
              className="p-3 rounded-xl bg-functional-rejected-bg border border-functional-rejected-border text-xs flex items-center justify-between gap-3"
            >
              <div className="flex items-center gap-2 text-ink-primary">
                <WarningCircle
                  size={16}
                  weight="fill"
                  className="text-accent-danger shrink-0"
                />
                <Link
                  className="font-mono font-bold text-accent-danger hover:underline"
                  to={containerPath(exportPaths.loading, n.containerId)}
                >
                  {n.code}
                </Link>
                <span>·</span>
                <span>{n.message}</span>
              </div>
              <span className="text-[11px] text-ink-secondary shrink-0 font-mono">
                {new Date(n.createdAt).toLocaleString()}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
