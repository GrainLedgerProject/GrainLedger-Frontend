import { useRef, useState, type FormEvent } from "react";
import Decimal from "decimal.js";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ledgerEndpoints, type ReceivingQuery, type ReceivingReviewAction, type ReceivingStatus,
  type ReceivingTask, type ReceivingUnit, type SetupApiResponse } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { CorrectionEvidence, CorrectionEvidenceDownload } from "../components/CorrectionEvidence";

const scope = ["ledger-receiving"];
const statuses: Record<ReceivingStatus, [string, string]> = {
  PENDING_ARRIVAL: ["Chờ tiếp nhận", "Pending arrival"],
  AWAITING_MANAGER_REVIEW: ["Chờ quản lý đối soát", "Awaiting manager review"],
  REMEASUREMENT_REQUESTED: ["Yêu cầu cân lại", "Remeasurement requested"],
  BLOCKED_UNRESOLVED: ["Đang chặn nhập kho", "Blocked — unresolved"],
  RECEIVED_MATCHED: ["Đã nhận đúng khối lượng", "Received — exact match"],
  RECEIVED_WITHIN_TOLERANCE: ["Đã nhận trong ngưỡng", "Received — within tolerance"],
  RECEIVED_SHORTAGE_APPROVED: ["Đã duyệt nhập thiếu", "Received — shortage approved"],
};
const decisions: Record<ReceivingReviewAction, [string, string]> = {
  APPROVE_SHORTAGE: ["Duyệt nhập theo khối lượng thiếu", "Approve measured shortage"],
  REQUEST_REMEASUREMENT: ["Yêu cầu cân lại", "Request remeasurement"],
  KEEP_BLOCKED: ["Tiếp tục chặn nhập kho", "Keep blocked"],
};
const units: ReceivingUnit[] = ["KG", "G", "T"];
const Exact = Decimal.clone({ precision: 40 });

function actualKg(value: string, unit: ReceivingUnit) {
  if (!/^\d{1,12}(\.\d{1,12})?$/.test(value)) return null;
  const kg = new Exact(value).times(unit === "G" ? "0.001" : unit === "T" ? "1000" : "1");
  return kg.gt(0) && kg.lt("100000000000000") && kg.decimalPlaces() <= 6 ? kg : null;
}

export function ReceivingTasksPage() {
  const text = useWorkflowText();
  const user = useAuthStore(s => s.user);
  const measure = user?.role === "MILL_OPERATOR" && user.permissions.includes("lots.receive");
  const review = user?.role === "MILL_MANAGER" && user.permissions.includes("receiving.reconcile");
  const [filters, setFilters] = useState<ReceivingQuery>({ facilityId: "", page: 1, pageSize: 20, sortBy: "receivedAt", sortDirection: "desc" });
  const [selected, setSelected] = useState("");
  const [status, setStatus] = useState("");
  const client = useQueryClient();
  const lookups = useQuery({
    queryKey: [...scope, "lookups"],
    queryFn: async () => await ledgerEndpoints.getLookups() as SetupApiResponse,
    enabled: Boolean(measure || review),
  });
  const facilities = lookups.data?.facilities ?? [];
  const facilityId = filters.facilityId || (facilities.length === 1 ? facilities[0].id : "");
  const queue = useQuery({
    queryKey: [...scope, "queue", { ...filters, facilityId }],
    queryFn: () => ledgerEndpoints.getReceivingTasks({ ...filters, facilityId }),
    enabled: Boolean(facilityId && (measure || review)),
  });
  const detailKey = [...scope, "detail", selected];
  const detail = useQuery({
    queryKey: detailKey,
    queryFn: () => ledgerEndpoints.getReceiving(selected),
    enabled: Boolean(selected),
  });
  const owners = new Map<string, string>();
  for (const owner of (lookups.data?.owners ?? []) as { id: string; name: string }[]) owners.set(owner.id, owner.name);
  for (const row of queue.data?.items ?? []) owners.set(row.ownerCompanyId, row.ownerCompanyName);

  function filter(patch: Partial<ReceivingQuery>) {
    setSelected("");
    setFilters(current => ({ ...current, page: 1, ...patch }));
  }

  return <Workflow title={text("Tiếp nhận tại nhà máy", "Mill receiving")} actions={(measure || review) && <button type="button"
    onClick={() => void client.invalidateQueries({ queryKey: scope })}>{text("Tải lại", "Refresh")}</button>}>
    {!measure && !review ? <p role="alert">{text("Cần quyền cân hoặc đối soát tiếp nhận tại cơ sở được phân công.", "Receiving requires measurement or review permission at an assigned facility.")}</p> : <>
      {status && <p role="status">{status}</p>}
      <Panel title={text("Hàng đợi tiếp nhận", "Receiving queue")}>
        <Feedback error={lookups.error} pending={lookups.isPending} />
        <search className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label>{text("Cơ sở được phân công", "Assigned facility")}
            <select value={facilityId} onChange={e => filter({ facilityId: e.target.value, ownerId: undefined })}>
              <option value="">{text("Chọn cơ sở", "Choose a facility")}</option>
              {facilities.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
            </select>
          </label>
          <form onSubmit={e => {
            e.preventDefault();
            filter({ search: String(new FormData(e.currentTarget).get("search") ?? "").trim() });
          }}>
            <label>{text("Tìm phiếu tiếp nhận", "Search receiving tasks")}
              <input type="search" name="search" defaultValue={filters.search} />
            </label>
            <button type="submit" className="mt-2">{text("Tìm kiếm", "Search")}</button>
          </form>
          <label>{text("Chủ hàng", "Stock owner")}
            <select value={filters.ownerId ?? ""} onChange={e => filter({ ownerId: e.target.value || undefined })}>
              <option value="">{text("Tất cả", "All")}</option>
              {[...owners].map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label>{text("Trạng thái", "Status")}
            <select value={filters.status ?? ""} onChange={e => filter({ status: (e.target.value || undefined) as ReceivingStatus | undefined })}>
              <option value="">{text("Tất cả", "All")}</option>
              {Object.entries(statuses).map(([value, label]) => <option key={value} value={value}>{text(...label)}</option>)}
            </select>
          </label>
          <label>{text("Sắp xếp theo", "Sort by")}
            <select value={filters.sortBy} onChange={e => filter({ sortBy: e.target.value as ReceivingQuery["sortBy"] })}>
              <option value="receivedAt">{text("Ngày thu mua", "Procurement date")}</option>
              <option value="status">{text("Trạng thái", "Status")}</option>
              <option value="owner">{text("Chủ hàng", "Stock owner")}</option>
            </select>
          </label>
          <label>{text("Thứ tự", "Direction")}
            <select value={filters.sortDirection} onChange={e => filter({ sortDirection: e.target.value as ReceivingQuery["sortDirection"] })}>
              <option value="desc">{text("Giảm dần", "Descending")}</option>
              <option value="asc">{text("Tăng dần", "Ascending")}</option>
            </select>
          </label>
        </search>
        {!facilityId && !lookups.isPending && <p>{text("Chọn cơ sở để xem phiếu tiếp nhận.", "Choose a facility to see its receiving tasks.")}</p>}
        <Feedback error={queue.error} pending={Boolean(facilityId) && queue.isPending} />
        {queue.data && <>
          {queue.data.items.length ? <div className="overflow-x-auto"><table>
            <thead><tr>
              <th scope="col">{text("Phiếu thu mua", "Procurement")}</th>
              <th scope="col">{text("Chủ hàng", "Stock owner")}</th>
              <th scope="col">{text("Dự kiến (kg)", "Expected (kg)")}</th>
              <th scope="col">{text("Thực tế (kg)", "Actual (kg)")}</th>
              <th scope="col">{text("Trạng thái", "Status")}</th>
            </tr></thead>
            <tbody>{queue.data.items.map(row => <tr key={row.id}>
              <th scope="row"><button type="button" aria-pressed={selected === row.id} onClick={() => setSelected(row.id)}>{row.code}</button></th>
              <td>{row.ownerCompanyName}</td><td>{row.expectedTotalKg}</td><td>{row.actualTotalKg ?? "—"}</td>
              <td>{text(...statuses[row.status])}</td>
            </tr>)}</tbody>
          </table></div> : <p>{text("Không có phiếu trong phạm vi đã chọn.", "No tasks match this scope.")}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button type="button" disabled={queue.data.page === 1} onClick={() => filter({ page: queue.data!.page - 1 })}>{text("Trang trước", "Previous")}</button>
            <span>{queue.data.page} · {queue.data.totalCount} {text("phiếu", "tasks")}</span>
            <button type="button" disabled={!queue.data.hasMore} onClick={() => filter({ page: queue.data!.page + 1 })}>{text("Trang sau", "Next")}</button>
          </div>
        </>}
      </Panel>
      {selected && <Panel title={detail.data?.code ?? text("Chi tiết tiếp nhận", "Receiving detail")}>
        <Feedback error={detail.error} pending={detail.isPending} />
        {detail.data && <ReceivingDetail key={`${selected}:${detail.data.receivingVersion}`} task={detail.data}
          measure={measure} review={review} onSaved={saved => {
            setStatus(`${saved.code} · ${text(...statuses[saved.status])}`);
            client.setQueryData(detailKey, saved);
            void client.invalidateQueries({ queryKey: [...scope, "queue"] });
          }} />}
      </Panel>}
    </>}
  </Workflow>;
}

function ReceivingDetail({ task, measure, review, onSaved }: {
  task: ReceivingTask;
  measure: boolean | undefined;
  review: boolean | undefined;
  onSaved: (task: ReceivingTask) => void;
}) {
  const text = useWorkflowText();
  const [values, setValues] = useState<Record<string, string>>({});
  const [selectedUnits, setUnits] = useState<Record<string, ReceivingUnit>>({});
  const [observations, setObservations] = useState("");
  const [reason, setReason] = useState("");
  const [action, setAction] = useState<ReceivingReviewAction | "">("");
  const [evidenceId, setEvidenceId] = useState("");
  const request = useRef<{ key: string; operationId: string; capturedAt: string } | null>(null);
  const mutation = useMutation({ mutationFn: (command: () => Promise<ReceivingTask>) => command(), onSuccess: onSaved });
  const latest = task.measurementSets.find(row => row.id === task.latestMeasurementSetId);
  const shortage = task.items.some(row => row.actualKg !== null && new Exact(row.actualKg).lt(row.expectedKg));
  const surplus = task.items.some(row => row.actualKg !== null && new Exact(row.actualKg).gt(row.expectedKg));
  const threshold = task.effectiveThreshold;
  const thresholdLabel = (value: ReceivingTask["effectiveThreshold"]) => value
    ? `${value.percentage}% · ${value.source === "COMPANY_OVERRIDE" ? text("Ngưỡng theo doanh nghiệp", "Company override") : text("Ngưỡng hệ thống", "System default")} · ${value.revision}`
    : text("Chưa ghi nhận", "Unavailable");

  function operation(payload: object) {
    const key = JSON.stringify(payload);
    if (request.current?.key !== key) request.current = { key, operationId: crypto.randomUUID(), capturedAt: new Date().toISOString() };
    return request.current;
  }

  function submitMeasurements(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending) return;
    const items = task.items.map(row => ({
      procurementItemId: row.id,
      measuredValue: values[row.id] ?? "",
      measuredUnit: selectedUnits[row.id] ?? "KG" as const,
    }));
    const payload = { items, observations: observations.trim(), expectedReceivingVersion: task.receivingVersion };
    const { operationId, capturedAt } = operation(payload);
    mutation.mutate(async () => {
      if (!items.length || items.some(row => !actualKg(row.measuredValue, row.measuredUnit))) {
        throw new Error(text("Mỗi dòng cần khối lượng dương, với tối đa 6 chữ số thập phân sau khi quy đổi sang kg.", "Each line needs a positive quantity with at most six fractional digits after conversion to kg."));
      }
      return ledgerEndpoints.recordReceivingMeasurement(task.id, { ...payload, operationId, capturedAt });
    });
  }

  function submitReview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (mutation.isPending || !latest || !action || !reason.trim() || !evidenceId) return;
    const payload = { action, reason: reason.trim(), evidenceId, measurementSetId: latest.id, expectedReceivingVersion: task.receivingVersion };
    mutation.mutate(() => ledgerEndpoints.reviewReceiving(task.id, { ...payload, operationId: operation(payload).operationId }));
  }

  return <>
    <p>{task.facilityName} · {task.receivingLocationName} · {task.ownerCompanyName} · {text(...statuses[task.status])}</p>
    <p>{text("Ngưỡng hiệu lực cho lần cân mới", "Effective threshold for a new measurement")} · {thresholdLabel(threshold)}</p>
    <div className="overflow-x-auto"><table>
      <thead><tr><th scope="col">{text("Dòng và lô", "Line and lot")}</th><th scope="col">{text("Dự kiến (kg)", "Expected (kg)")}</th><th scope="col">{text("Thực tế (kg)", "Actual (kg)")}</th></tr></thead>
      <tbody>{task.items.map(row => <tr key={row.id}><th scope="row">{row.lineNo} · {row.lotCode}</th><td>{row.expectedKg}</td><td>{row.actualKg ?? "—"}</td></tr>)}</tbody>
    </table></div>
    {task.measurementSets.length > 0 && <section className="space-y-2">
      <h3 className="font-semibold">{text("Lịch sử cân", "Measurement history")}</h3>
      {task.measurementSets.map(set => <details key={set.id} className="rounded-lg border border-ink-tertiary/20 p-3">
        <summary>{new Date(set.recordedAt).toLocaleString()} · {set.id === latest?.id ? text("Bộ số cân gần nhất", "Latest measurement set") : set.id}</summary>
        <p>{text("Ngưỡng lúc ghi nhận", "Recorded threshold")} · {thresholdLabel(set.threshold)}</p>
        {set.observations && <p>{set.observations}</p>}
        <ul className="list-disc ps-5">{set.items.map(item => {
          const source = task.items.find(row => row.id === item.procurementItemId);
          return <li key={item.procurementItemId}>{source?.lotCode ?? item.procurementItemId} · {item.measuredValue} {item.measuredUnit} · {item.actualKg} kg</li>;
        })}</ul>
      </details>)}
    </section>}
    {task.reviews.length > 0 && <section className="space-y-2">
      <h3 className="font-semibold">{text("Lịch sử đối soát", "Review history")}</h3>
      <ul className="space-y-2">{task.reviews.map(entry => <li key={entry.id}>
        {new Date(entry.recordedAt).toLocaleString()} · {text(...decisions[entry.action])} · {entry.reason}
        {entry.evidenceId && <CorrectionEvidenceDownload id={entry.evidenceId} />}
      </li>)}</ul>
    </section>}
    <Feedback error={mutation.error} pending={mutation.isPending} />
    {measure && ["PENDING_ARRIVAL", "REMEASUREMENT_REQUESTED"].includes(task.status) && <form method="post" onSubmit={submitMeasurements} className="space-y-3">
      <fieldset disabled={mutation.isPending} className="space-y-3">
        <legend className="font-semibold">{text("Cân từng dòng thu mua", "Measure each procurement line")}</legend>
        {task.items.map(row => {
          const kg = actualKg(values[row.id] ?? "", selectedUnits[row.id] ?? "KG");
          const lost = kg && new Exact(row.expectedKg).minus(kg);
          const outside = lost && (lost.lt(0) || (threshold && lost.times(100).gt(new Exact(row.expectedKg).times(threshold.percentage))));
          return <fieldset key={row.id} className="rounded-lg border border-ink-tertiary/20 p-3">
            <legend>{row.lineNo} · {row.lotCode} · {row.expectedKg} kg</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              <label>{text("Khối lượng cân thực tế", "Measured quantity")} *
                <input name={`mass-${row.lineNo}`} required inputMode="decimal" pattern="[0-9]{1,12}([.][0-9]{1,12})?"
                  value={values[row.id] ?? ""} onChange={e => setValues({ ...values, [row.id]: e.target.value })} />
              </label>
              <label>{text("Đơn vị", "Unit")}
                <select name={`unit-${row.lineNo}`} value={selectedUnits[row.id] ?? "KG"} onChange={e => setUnits({ ...selectedUnits, [row.id]: e.target.value as ReceivingUnit })}>
                  {units.map(unit => <option key={unit} value={unit}>{unit}</option>)}
                </select>
              </label>
            </div>
            {kg && <p>{kg.toFixed()} kg{outside ? ` · ${text("Dự kiến cần đối soát", "Expected to require review")}` : ""}</p>}
          </fieldset>;
        })}
        <label>{text("Ghi chú lần cân", "Measurement observations")}
          <textarea name="observations" maxLength={4000} value={observations} onChange={e => setObservations(e.target.value)} />
        </label>
        <label className="!flex-row items-center gap-2">
          <input name="confirmed" type="checkbox" required />{text("Tôi xác nhận số cân của từng dòng.", "I confirm the measurement for each line.")}
        </label>
      </fieldset>
      <button type="submit" disabled={mutation.isPending || !threshold || !task.items.length}>{text("Ghi nhận số cân", "Save measurements")}</button>
    </form>}
    {review && latest && ["AWAITING_MANAGER_REVIEW", "BLOCKED_UNRESOLVED"].includes(task.status) && <form method="post" onSubmit={submitReview} className="space-y-3">
      <fieldset disabled={mutation.isPending} className="space-y-3">
        <legend className="font-semibold">{text("Đối soát bộ số cân gần nhất", "Review latest measurement set")}</legend>
        <p>{thresholdLabel(latest.threshold)}</p>
        <label>{text("Quyết định", "Decision")} *
          <select name="decision" required value={action} onChange={e => setAction(e.target.value as ReceivingReviewAction)}>
            <option value="" disabled>{text("Chọn quyết định", "Choose a decision")}</option>
            {Object.entries(decisions).map(([value, label]) => <option key={value} value={value}
              disabled={value === "APPROVE_SHORTAGE" && (surplus || !shortage)}>{text(...label)}</option>)}
          </select>
        </label>
        <label>{text("Lý do", "Reason")} *
          <textarea name="reason" required maxLength={4000} value={reason} onChange={e => setReason(e.target.value)} />
        </label>
        <CorrectionEvidence original={{ ownerId: task.ownerCompanyId, facilityId: task.facilityId }} value={evidenceId} onChange={setEvidenceId} />
      </fieldset>
      <button type="submit" disabled={mutation.isPending || !evidenceId}>{text("Lưu quyết định", "Record decision")}</button>
    </form>}
  </>;
}
