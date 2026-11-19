import { CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { alert } from "./mrlStyles";

export function MrlAlerts({ error, notice }: { error: string; notice: string }) {
  return (
    <>
      {error && (
        <div role="alert" className={alert}>
          <WarningCircle
            size={18}
            weight="fill"
            aria-hidden="true"
            className="shrink-0"
          />
          <span>{error}</span>
        </div>
      )}
      {notice && (
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-functional-balanced-border/40 bg-functional-balanced-bg p-3.5 text-xs text-accent-primary"
        >
          <CheckCircle
            size={18}
            weight="fill"
            aria-hidden="true"
            className="shrink-0"
          />
          <span>{notice}</span>
        </div>
      )}
    </>
  );
}
