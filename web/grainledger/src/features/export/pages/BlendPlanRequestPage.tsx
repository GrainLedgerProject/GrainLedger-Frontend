import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { exportEndpoints } from "@/api/exports";
import { ledgerEndpoints } from "@/api/ledger";
import { planningEndpoints, type BlendPlanDraftDto, type CreateBlendPlanDraftRequest } from "@/api/planning";
import { collectPages } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { Feedback, Panel, Workflow, useWorkflowText } from "@/shared/ui/Workflow";
import { useExportCommand } from "../hooks/useExportCommand";
import { exportPaths, planReviewPath } from "../paths";

export function BlendPlanRequestPage() {
  const { orderId = "", containerId = "" } = useParams();
  return <BlendPlanRequest key={containerId + orderId} orderId={orderId} containerId={containerId}/>;
}

function BlendPlanRequest({ orderId, containerId }: { orderId: string; containerId: string }) {
  const t = useWorkflowText();
  const [params, setParams] = useSearchParams();
  const [target, setTarget] = useState("");
  const canPropose = useAuthStore(s => s.user?.permissions.includes("blend.propose"));
  const container = useQuery({ queryKey: ["export-container", containerId], queryFn: () => exportEndpoints.getContainer(containerId) });
  const matched = container.data?.orderId === orderId;
  const context = useQuery({ queryKey: ["blend-context", containerId], queryFn: () => exportEndpoints.getPlanningContext(containerId), enabled: matched });
  const plans = useQuery({ queryKey: ["container-plans", containerId], queryFn: () => collectPages(q => planningEndpoints.getBlendPlans(containerId, q)), enabled: matched });
  const create = useExportCommand(async (operationId, input: Omit<CreateBlendPlanDraftRequest, "operationId">) => {
    const result = await planningEndpoints.createDraft(containerId, { ...input, operationId });
    setParams({ plan: result.id });
  }, async () => { await Promise.all([plans.refetch(), context.refetch()]); });
  const selected = plans.data?.find(p => p.id === params.get("plan"));
  return <Workflow title={t("Phương án phối trộn", "Blend planning")}>
    <Link to={exportPaths.orders + "?order=" + encodeURIComponent(orderId)}>{t("Về đơn hàng", "Back to order")}</Link>
    <Feedback error={container.error ?? context.error ?? plans.error} pending={container.isPending || (matched && context.isPending)}/>
    {container.data && !matched && <p role="alert">{t("Container không thuộc đơn hàng này.", "This container belongs to another order.")}</p>}
    {matched && container.data && context.data && <Panel title={container.data.internalCode}>
      <p>{t("Khối lượng mục tiêu", "Target mass")} · {container.data.targetMassKg} kg</p>
      {context.data.missingDependencies?.map(d => <p key={d.code}>{d.description}</p>)}
      {canPropose && context.data.canCreateDraft && <form className="space-y-3" onSubmit={e => { e.preventDefault(); if (context.data) create.submit({ orderVersion: context.data.orderVersion, containerVersion: context.data.containerVersion, targetProductIdentity: target }); }}>
        <label>{t("Sản phẩm đích", "Target product")}<select required value={target} onChange={e => setTarget(e.target.value)}><option value=""/>
          {context.data.allowedTargetProducts.map(x => <option key={x}>{x}</option>)}</select></label>
        <button type="submit" disabled={create.isPending}>{t("Tạo bản nháp", "Create draft")}</button><Feedback error={create.error}/>
      </form>}
    </Panel>}
    {plans.data && <Panel title={t("Phiên bản phương án", "Plan versions")}>
      {plans.data.length ? <label>{t("Chọn phiên bản", "Select version")}<select value={selected?.id ?? ""} onChange={e => setParams({ plan: e.target.value })}><option value=""/>
        {plans.data.map(p => <option key={p.id} value={p.id}>v{p.versionNo} · {p.targetProductIdentity} · {p.status}</option>)}</select></label> : <p>{t("Chưa có phương án.", "No plans yet.")}</p>}
      {selected?.hasProposal && <Link to={planReviewPath(selected.id)}>{t("Xem đề xuất và quyết định", "View proposal and decision")}</Link>}
      {selected && !selected.demandCurrent && <p role="status">{t("Nhu cầu đã thay đổi. Hãy tạo bản nháp mới.", "Demand has changed. Create a new draft.")}</p>}
      {selected && canPropose && selected.demandCurrent && selected.status === "DRAFT" && !selected.hasProposal && <PlanFacilities key={selected.id} plan={selected}/>}
    </Panel>}
  </Workflow>;
}

function PlanFacilities({ plan }: { plan: BlendPlanDraftDto }) {
  const t = useWorkflowText();
  const [facility, setFacility] = useState("");
  const lookups = useQuery({ queryKey: ["blend-facilities"], queryFn: async () => (await ledgerEndpoints.getLookups() as { facilities: { id: string; name: string }[] }).facilities });
  return <><Feedback pending={lookups.isPending} error={lookups.error}/>{lookups.data && <label>{t("Nhà máy", "Facility")}
    <select required value={facility} onChange={e => setFacility(e.target.value)}><option value=""/>{lookups.data.map(x => <option value={x.id} key={x.id}>{x.name}</option>)}</select>
  </label>}{facility && <PreviewPlan key={facility + plan.version} plan={plan} facility={facility}/>}</>;
}

function PreviewPlan({ plan, facility }: { plan: BlendPlanDraftDto; facility: string }) {
  const t = useWorkflowText();
  const cache = useQueryClient();
  const candidates = useQuery({ queryKey: ["plan-candidates", plan.id, facility], queryFn: () =>
    exportEndpoints.getCandidates(plan.containerId, { facilityId: facility, planId: plan.id, pageSize: 25 }) });
  const preview = useMutation({ mutationFn: (scopeRevision: string) => planningEndpoints.previewPlan(plan.id, { facilityId: facility, scopeRevision }) });
  const propose = useExportCommand((operationId, previewReference: string) => planningEndpoints.proposePlan(plan.id, { operationId, previewReference }),
    async () => { await cache.invalidateQueries({ queryKey: ["container-plans", plan.containerId] }); });
  const result = preview.data;
  return <div className="space-y-3"><Feedback error={candidates.error ?? preview.error ?? propose.error} pending={candidates.isPending || preview.isPending}/>
    {candidates.data && <><p>{t("Số vị trí ứng viên", "Candidate positions")} · {candidates.data.totalCount}</p>
      <button disabled={preview.isPending || propose.isPending} onClick={() => preview.mutate(candidates.data.scopeRevision)}>{t("Tính và đánh giá phương án", "Calculate and assess plan")}</button></>}
    {result && <><p>{result.outcome} · {result.assessmentStatus}</p>
      <ul>{result.reasons.map(r => <li key={r}>{r}</li>)}</ul>
      {result.selection?.allocations.map(a => <p key={a.lotId + a.locationId}>{a.lotCode} · {a.locationId} · {a.quantityKg} kg</p>)}
      {result.assessmentFindings.map((f, i) => <p key={i}>{f.code} · {f.status} · {f.actual ?? "—"} / {f.limit ?? "—"} {f.unit}</p>)}
      {result.canPropose && result.previewReference && <button disabled={propose.isPending || preview.isPending || preview.variables !== candidates.data?.scopeRevision} onClick={() => propose.submit(result.previewReference!)}>{t("Gửi đề xuất để duyệt", "Submit for approval")}</button>}
    </>}
  </div>;
}
