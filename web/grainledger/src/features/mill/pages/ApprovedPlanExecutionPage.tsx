import { useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  containerExecutionEndpoints,
  type ContainerProduction,
  type ContainerProductionDraft,
  type ContainerWorkItem,
} from "@/api/containerExecution";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { confirmAction } from "@/app/store/feedbackStore";
import { useAuthStore } from "@/app/store/authStore";
import { ContainerCommandFeedback } from "@/features/export/components/ContainerCommandFeedback";
import { ContainerControls } from "@/features/export/components/ContainerControls";
import { useContainerCommand } from "@/features/export/hooks/useContainerCommand";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { millPaths } from "../paths";

type ProductionCommand =
  | { action: "draft"; version: number; draft: ContainerProductionDraft }
  | { action: "commit" | "next"; version: number };

function massUnits(value: string): bigint {
  if (!/^\d{1,14}(\.\d{1,6})?$/.test(value)) throw new Error("Invalid kg");
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 1_000_000n + BigInt(fraction.padEnd(6, "0"));
}

function massText(value: bigint): string {
  return `${value / 1_000_000n}.${(value % 1_000_000n).toString().padStart(6, "0")}`;
}

function localDateTime(date: Date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function ApprovedPlanExecutionPage() {
  const text = useWorkflowText();
  const user = useAuthStore((state) => state.user);
  const { planId } = useParams();
  const [params, setParams] = useSearchParams();
  const operator = user?.role === "MILL_OPERATOR" && user.permissions.includes("containers.operate");
  const manager = user?.role === "MILL_MANAGER" && user.permissions.includes("holds.process");
  const allowed = operator || manager;
  const workItems = useQuery({
    queryKey: ["container-work-items", user?.id],
    queryFn: containerExecutionEndpoints.getWorkItems,
    enabled: allowed,
  });
  const production = useQuery({
    queryKey: ["container-production-list", user?.id],
    queryFn: containerExecutionEndpoints.listProduction,
    enabled: operator,
  });
  const selected = workItems.data?.items.find(item => item.containerId === params.get("container"));
  const productionStates = new Map(production.data?.items.map(item => [item.containerId, item.state]));
  const canWrite = Boolean(operator && user?.permissions.includes("conversions.write"));

  return (
    <Workflow title={text("Thực thi kế hoạch container", "Container work queue")}>
      <div className="flex flex-wrap items-center gap-3">
        <Link className="text-sm text-accent-primary underline underline-offset-2" to={millPaths.stock}>
          {text("Kiểm tra tồn kho", "Check stock")}
        </Link>
        {allowed && <button type="button" disabled={workItems.isFetching} onClick={() => {
          void workItems.refetch();
          if (operator) void production.refetch();
        }}>{text("Tải lại công việc", "Reload work")}</button>}
      </div>
      {allowed ? (
        <>
          <Panel title={text("Công việc tại cơ sở được phân công", "Work at assigned facilities")}>
            <Feedback error={workItems.error} pending={workItems.isPending} />
            <Feedback error={production.error} />
            {workItems.data?.items.length === 0 && <p>{text("Chưa có công việc đang mở.", "There is no open container work.")}</p>}
            {Boolean(workItems.data?.items.length) && (
              <label>
                {text("Container", "Container")}
                <select value={selected?.containerId ?? ""} onChange={(event) => {
                  const next = new URLSearchParams(params);
                  if (event.target.value) next.set("container", event.target.value);
                  else next.delete("container");
                  setParams(next);
                }}>
                  <option value="">{text("Chọn container", "Select a container")}</option>
                  {workItems.data?.items.map(item => (
                    <option key={item.containerId} value={item.containerId}>
                      {item.code} · {productionStates.get(item.containerId) ?? item.state}
                    </option>
                  ))}
                </select>
              </label>
            )}
            {planId && !selected && <p>{text("Chọn container để đối chiếu phương án trong liên kết.", "Choose a container to match the plan in this link.")}</p>}
          </Panel>
          {selected && (
            <WorkItem key={selected.containerId} item={selected} planId={planId} canWrite={canWrite} canRespond={Boolean(manager)} />
          )}
        </>
      ) : <p role="status">{text("Cần quyền vận hành container hoặc xử lý HOLD tại cơ sở được phân công.", "This screen requires container operations or HOLD processing access at an assigned facility.")}</p>}
    </Workflow>
  );
}

function WorkItem({ item, planId, canWrite, canRespond }: { item: ContainerWorkItem; planId?: string; canWrite: boolean; canRespond: boolean }) {
  const text = useWorkflowText();
  const cache = useQueryClient();
  const workflow = useQuery({
    queryKey: ["container-workflow", item.containerId],
    queryFn: () => containerExecutionEndpoints.getWorkflow(item.containerId),
  });
  const refresh = async () => {
    await Promise.all([
      cache.invalidateQueries({ queryKey: ["container-work-items"] }),
      cache.invalidateQueries({ queryKey: ["container-production-list"] }),
      cache.invalidateQueries({ queryKey: ["container-production", item.containerId] }),
      cache.invalidateQueries({ queryKey: ["container-workflow", item.containerId] }),
    ]);
  };
  const matchesPlan = !planId || workflow.data?.proposals?.some(proposal => proposal.planId === planId);
  return (
    <>
      <Feedback error={workflow.error} pending={workflow.isPending} />
      {workflow.data && !matchesPlan && <p role="status">{text("Container này không có phương án trong liên kết.", "This container does not contain the linked plan.")}</p>}
      {workflow.data && matchesPlan && (
        <>
          {canWrite && item.mode === "BLEND_INPUT_STOCK" && item.state !== "HANDOFF_AVAILABLE" && (
            <ProductionWork id={item.containerId} refresh={refresh} />
          )}
          <ContainerControls workflow={workflow.data} facilityId={item.facilityId} canOperate={canWrite} canRespond={canRespond} refresh={refresh} />
        </>
      )}
    </>
  );
}

function ProductionWork({ id, refresh }: { id: string; refresh: () => Promise<void> }) {
  const text = useWorkflowText();
  const [error, setError] = useState<Error | null>(null);
  const task = useQuery({ queryKey: ["container-production", id], queryFn: () => containerExecutionEndpoints.getProduction(id) });
  const lookups = useQuery({ queryKey: ["production-lookups"], queryFn: async () => await ledgerEndpoints.getLookups() as SetupApiResponse });
  const command = useContainerCommand<ProductionCommand>((operationId, input) => {
    const body = { operationId, version: input.version };
    if (input.action === "draft") return containerExecutionEndpoints.saveProductionDraft(id, { ...body, draft: input.draft });
    return input.action === "commit" ? containerExecutionEndpoints.commitProduction(id, body) : containerExecutionEndpoints.prepareNextProduction(id, body);
  }, refresh);
  const current = task.data;
  const blocked = command.isPending || command.uncertain || task.isFetching;
  async function commit(version: number) {
    if (await confirmAction({
      title: text("Chốt bản nháp đã lưu", "Commit the saved draft"),
      description: text("Xác nhận số liệu đã lưu phản ánh mẻ sản xuất thực tế.", "Confirm that the saved draft records the actual batch."),
      confirmLabel: text("Chốt sản xuất", "Commit production"),
    })) command.submit({ action: "commit", version });
  }
  return (
    <Panel title={text("Ghi nhận mẻ phối trộn", "Record a blend batch")}>
      <Feedback error={task.error || lookups.error || error} pending={task.isPending || lookups.isPending} />
      {current && (
        <>
          <p>{current.state}{current.outputCode ? ` · ${current.outputCode}` : ""}</p>
          {current.remainingProductionKg && <p>{text("Khối lượng còn phải sản xuất", "Remaining production")}: {current.remainingProductionKg} kg</p>}
          {current.inputs?.length ? (
            <ul className="grid gap-1 text-xs">
              {current.inputs.map(line => <li key={`${line.lotId}:${line.locationId}`}>{line.lotCode} · {line.quantityKg} kg</li>)}
            </ul>
          ) : null}
          {lookups.data && ["REQUESTED", "DRAFT"].includes(current.state) && (
            <ProductionDraftForm key={current.version} task={current} lookups={lookups.data} disabled={blocked} submit={(draft) => {
              setError(null);
              command.submit({ action: "draft", version: current.version, draft });
            }} onError={setError} />
          )}
          {current.state === "DRAFT" && current.operation && (
            <div className="flex flex-wrap items-center gap-3">
              <span>{text("Khối lượng đầu ra đã lưu", "Saved output")}: {current.operation.outputs[0]?.quantityKg} kg</span>
              <button type="button" disabled={blocked} onClick={() => void commit(current.version)}>{text("Chốt bản nháp đã lưu", "Commit saved draft")}</button>
            </div>
          )}
          {["PRODUCED", "APPROVED", "REJECTED"].includes(current.state) && /[1-9]/.test(current.remainingProductionKg ?? "") && (
            <button type="button" disabled={blocked} onClick={() => command.submit({ action: "next", version: current.version })}>
              {text("Chuẩn bị mẻ tiếp theo", "Prepare next batch")}
            </button>
          )}
        </>
      )}
      <ContainerCommandFeedback error={command.error} uncertain={command.uncertain} retry={command.retry} success={command.isSuccess} />
    </Panel>
  );
}

function ProductionDraftForm({ task, lookups, disabled, submit, onError }: {
  task: ContainerProduction;
  lookups: SetupApiResponse;
  disabled: boolean;
  submit: (draft: ContainerProductionDraft) => void;
  onError: (error: Error) => void;
}) {
  const text = useWorkflowText();
  const existing = task.operation;
  const [equipment, setEquipment] = useState(existing?.equipmentId ?? "");
  const [location, setLocation] = useState(existing?.outputs[0]?.locationId ?? "");
  const [when, setWhen] = useState(() => localDateTime(existing ? new Date(existing.occurredAt) : new Date()));
  const [output, setOutput] = useState(existing?.outputs[0]?.quantityKg ?? task.targetKg ?? "");
  const [loss, setLoss] = useState(existing?.declaredLossKg ?? "0");
  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const total = massUnits(task.plannedKg ?? "");
      const actual = massUnits(output);
      massUnits(loss);
      if (!task.inputs?.length || !task.ownerId || !task.facilityId || !task.outputCommodityId || !actual || !total) {
        throw new Error("Incomplete production scope");
      }
      const inputs = task.inputs.map((line) => {
        const scaled = massUnits(line.approvedKg) * actual;
        const quantity = scaled / total;
        if (scaled % total || quantity <= 0n || quantity > massUnits(line.quantityKg)) throw new Error("Outside approved recipe");
        return { lotId: line.lotId, locationId: line.locationId, quantityKg: massText(quantity), ...(line.poolRevision != null && { poolRevision: line.poolRevision }) };
      });
      submit({
        id: existing?.id ?? crypto.randomUUID(),
        ownerId: task.ownerId,
        facilityId: task.facilityId,
        kind: "BLENDING",
        occurredAt: new Date(when).toISOString(),
        equipmentId: equipment,
        inputs,
        outputs: [{
          id: existing?.outputs[0]?.id ?? crypto.randomUUID(),
          code: existing?.outputs[0]?.code ?? "",
          commodityId: task.outputCommodityId,
          stage: "BLENDED_RICE",
          productIdentity: "BLENDED_RICE",
          locationId: location,
          quantityKg: output,
        }],
        declaredLossKg: loss,
        ...(existing?.version && { version: existing.version }),
      });
    } catch {
      onError(new Error(text("Kiểm tra lại dữ liệu mẻ. Khối lượng phải giữ đúng tỷ lệ phê duyệt và giới hạn tồn kho, với tối đa sáu chữ số thập phân.", "Check the batch values. Mass must preserve the approved recipe and stock limits, with up to six decimal places.")));
    }
  }
  return (
    <form onSubmit={save}>
      <fieldset className="grid gap-3 sm:grid-cols-2" disabled={disabled}>
        <label>{text("Thiết bị", "Equipment")}
          <select value={equipment} required onChange={event => setEquipment(event.target.value)}>
            <option value="">{text("Chọn thiết bị", "Select equipment")}</option>
            {lookups.equipment?.filter(item => item.facilityId === task.facilityId).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>{text("Vị trí đầu ra", "Output location")}
          <select value={location} required onChange={event => setLocation(event.target.value)}>
            <option value="">{text("Chọn vị trí", "Select location")}</option>
            {lookups.locations?.filter(item => item.facilityId === task.facilityId && item.kind !== "ISOLATION" && !item.mixedBulk && (!item.ownerId || item.ownerId === task.ownerId)).map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <label>{text("Thời điểm sản xuất", "Production time")}<input type="datetime-local" required value={when} onChange={event => setWhen(event.target.value)} /></label>
        <label>{text("Đầu ra thực tế (kg)", "Actual output (kg)")}<input inputMode="decimal" required value={output} onChange={event => setOutput(event.target.value)} /></label>
        <label>{text("Hao hụt khai báo (kg)", "Declared loss (kg)")}<input inputMode="decimal" required value={loss} onChange={event => setLoss(event.target.value)} /></label>
        <button type="submit" className="self-end">{text("Lưu bản nháp", "Save draft")}</button>
      </fieldset>
    </form>
  );
}
