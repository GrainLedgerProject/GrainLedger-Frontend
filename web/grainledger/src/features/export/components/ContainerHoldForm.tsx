import { useState } from "react";
import { containerExecutionEndpoints, type ContainerExecution } from "@/api/containerExecution";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { Panel } from "@/shared/ui/Workflow";
import { useContainerCommand } from "../hooks/useContainerCommand";
import { ContainerCommandFeedback } from "./ContainerCommandFeedback";

export function ContainerHoldForm({ container, saved }: { container: ContainerExecution; saved: () => Promise<void> }) {
  const text = useWorkflowText();
  const [reason, setReason] = useState("");
  const command = useContainerCommand((operationId, input: { version: number; reason: string }) =>
    containerExecutionEndpoints.placeHold(container.id, { operationId, ...input }), async () => {
      setReason("");
      await saved();
    }, { persistKey: `container:${container.id}:hold` });

  return (
    <div className="gl-workflow">
      <Panel title={text("Ban hành HOLD cho container", "Place container on HOLD")}>
        <form onSubmit={event => {
          event.preventDefault();
          if (reason.trim()) command.submit({ version: container.version, reason: reason.trim() });
        }}>
          <fieldset disabled={command.isPending || command.uncertain} className="space-y-3">
            <label>{text("Lý do HOLD", "HOLD reason")}
              <textarea value={reason} onChange={event => setReason(event.target.value)} required maxLength={1000} />
            </label>
            <button type="submit" disabled={!reason.trim()}>{text("Ban hành HOLD", "Place HOLD")}</button>
          </fieldset>
        </form>
        <ContainerCommandFeedback error={command.error} uncertain={command.uncertain} retry={command.retry} success={command.isSuccess} isPending={command.isPending} restoredPending={command.restoredPending} discardPending={command.discardPending} />
      </Panel>
    </div>
  );
}
