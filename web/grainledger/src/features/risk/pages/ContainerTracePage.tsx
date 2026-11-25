import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import { useAuthStore } from "@/app/store/authStore";
import { ExportTable } from "@/features/export/components/ExportWorkspaceUI";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { riskPaths } from "../paths";
import { ActualLoading, ContainerLotFlow } from "../components/ActualLoading";
import { ResidueBounds } from "../components/ResidueBounds";

const uuidPattern = "[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}";
const containerIdPattern = new RegExp(`^${uuidPattern}$`);

export function ContainerTracePage() {
  const text = useWorkflowText();
  const [params, setParams] = useSearchParams();
  const containerId = params.get("container") ?? "";
  const user = useAuthStore(state => state.user);
  const allowed = user?.permissions.some(p => p === "trace.read.tenant" || p === "trace.read.all");
  const trace = useQuery({
    queryKey: ["actual-container-trace", user?.id, containerId],
    queryFn: () => containerExecutionEndpoints.trace(containerId),
    enabled: Boolean(allowed && containerIdPattern.test(containerId)),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  const [input, setInput] = useState(containerId);
  const record = trace.data;
  const lots = new Map(record?.graph?.lots.map(lot => [lot.id, lot.code]));

  return (
    <Workflow title={text("Truy xuất nguồn container", "Container source trace")}>
      <Link className="text-sm text-accent-primary underline underline-offset-2" to={riskPaths.traceback}>{text("Truy xuất lô hàng", "Trace lots")}</Link>
      {!allowed ? <p role="status">{text("Tài khoản cần quyền truy xuất theo phạm vi dữ liệu.", "Trace access is required for this data scope.")}</p> : (
        <>
          <Panel title={text("Chọn container", "Select a container")}>
            <form className="grid gap-3 sm:grid-cols-[1fr_auto]" onSubmit={event => {
              event.preventDefault();
              if (input.trim() === containerId) void trace.refetch();
              else setParams({ container: input.trim() });
            }}>
              <label>{text("Định danh container (UUID)", "Container ID (UUID)")}
                <input required pattern={uuidPattern} value={input} onChange={event => setInput(event.target.value)} />
              </label>
              <button type="submit" disabled={trace.isFetching} className="self-end">{text("Truy xuất", "Trace")}</button>
            </form>
            {containerId && !containerIdPattern.test(containerId) && <p role="alert">{text("Định danh container không hợp lệ.", "The container ID is invalid.")}</p>}
          </Panel>
          <Feedback error={trace.error} pending={trace.isFetching} />
          {record && (
            <Panel title={text("Nguồn từ khối lượng thực xếp", "Sources from actual loading")}>
              <p>{text("Khối lượng đã thực xếp", "Actual loaded mass")}: {record.loadedKg} kg</p>
              {!record.complete && <p role="status" className="text-accent-warning">{text("Kết quả chưa đầy đủ.", "The trace is incomplete.")} {record.findings?.join(", ")}</p>}
              <ExportTable caption={text("Đóng góp nguồn vào container", "Container source contributions")} columns={[
                text("Lô nguồn", "Source lot"), text("Thực xếp (kg)", "Loaded mass (kg)"), text("Tỷ lệ (%)", "Share (%)"), text("Phiếu thu mua / Thửa ruộng", "Receipt / Plot"),
              ]}>
                {record.sourceContributions.map(source => (
                  <tr key={source.sourceLotId}>
                    <td>{lots.get(source.sourceLotId) || source.sourceLotId}</td>
                    <td>{source.quantityKg}</td>
                    <td>{source.percentage ?? "—"}</td>
                    <td>{source.provenance?.procurementCode ?? source.provenance?.plotId ?? source.status ?? "—"}</td>
                  </tr>
                ))}
              </ExportTable>
              {!!record.graph?.lots.length && <ContainerLotFlow key={containerId} names={lots} edges={record.graph.edges}
                loading={record.graph.loadingEdges ?? []} />}
              {!!record.graph?.loadingEdges?.length && <ActualLoading edges={record.graph.loadingEdges} names={lots} />}
              {record.graph?.loadingEdges?.length ? <LoadedLotResidue key={containerId} lots={lots}
                lotIds={[...new Set(record.graph.loadingEdges.map(edge => edge.lotId))]} /> : null}
              {record.graph?.edges.length ? <details className="space-y-3">
                <summary>{text("Liên kết lịch sử giữa các lô", "Historical lot relationships")}</summary>
                <ExportTable caption={text("Quan hệ nguồn gốc", "Ancestry relationships")} columns={[text("Lô đầu vào", "Input lot"), text("Lô đầu ra", "Output lot"), text("Khối lượng đầu vào (kg)", "Input mass (kg)")]}>
                  {record.graph.edges.map((edge, index) => <tr key={`${edge.inputLotId}:${edge.outputLotId}:${index}`}>
                    <td>{lots.get(edge.inputLotId) || edge.inputLotId}</td>
                    <td>{lots.get(edge.outputLotId) || edge.outputLotId}</td>
                    <td>{edge.inputConsumedKg}</td>
                  </tr>)}
                </ExportTable>
              </details> : null}
            </Panel>
          )}
        </>
      )}
    </Workflow>
  );
}

function LoadedLotResidue({ lots, lotIds }: { lots: Map<string, string>; lotIds: string[] }) {
  const text = useWorkflowText();
  const allowed = useAuthStore(s => s.user?.permissions.includes("residue.evaluate"));
  const [id, setId] = useState(lotIds[0]);
  if (!allowed) return null;
  return <div className="space-y-2">
    <label>{text("Đánh giá dư lượng của lô đã xếp", "Evaluate residue bounds for a loaded lot")}
      <select value={id} onChange={e => setId(e.target.value)}>
        {lotIds.map(lotId => <option key={lotId} value={lotId}>{lots.get(lotId) ?? lotId}</option>)}
      </select>
    </label>
    <ResidueBounds lotId={id} />
  </div>;
}
