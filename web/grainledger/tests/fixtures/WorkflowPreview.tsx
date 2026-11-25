/** Local visual QA only. Endpoint methods below use in-memory fixtures, never a live backend. */
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Link, MemoryRouter, Route, Routes } from "react-router-dom";
import "@/index.css";
import "@/app/i18n";
import { useAuthStore } from "@/app/store/authStore";
import { ledgerEndpoints, type CorrectionOperation } from "@/api/ledger";
import { exportEndpoints } from "@/api/exports";
import { planningEndpoints } from "@/api/planning";
import type { BlendPlanDraftDto } from "@/api/planning";
import { containerExecutionEndpoints, type ContainerDossier } from "@/api/containerExecution";
import { executionFixture, workflowFixture } from "./containerExecutionData";
import { Decimal } from "@/shared/utils/decimalMass";
import { CorrectionManagementPage } from "@/features/mill/pages/CorrectionManagementPage";
import { ExportWorkspacePage } from "@/features/export/pages/ExportWorkspacePage";
import { ContainerLoadingPage, ContainerClosurePage, ContainerDossierPage } from "@/features/export/pages/ContainerWorkflowPage";
import { TraceabilityPage } from "@/features/risk/pages/TraceabilityPage";

const params = new URL(location.href).searchParams;
document.documentElement.classList.toggle("dark", params.get("theme") === "dark");
useAuthStore.setState({ isAuthenticated: true, accessToken: "preview-only", user: { id: "preview", email: "preview@example.test", displayName: "Visual QA", role: params.get("screen")?.startsWith("/mill/") ? "MILL_MANAGER" : "CUSTOMER_EXPORT_OFFICER", isActive: true, permissions: ["corrections.reconcile", "conversions.confirm", "export-orders.read", "containers.write", "residue.evaluate"] } });
const page = <T,>(items: T[]) => ({ items, page: 1, pageSize: 100, totalCount: items.length, hasMore: false });
const original: CorrectionOperation = { id: "original", version: "b2f69384-537d-4216-947e-2560c5378eb4", kind: "MILLING", status: "COMMITTED", ownerId: "owner", facilityId: "facility", equipmentId: "equipment", occurredAt: "2026-11-19T03:00:00Z", declaredLossKg: "100.000000", inputs: [{ lotId: "PADDY-261119-01", locationId: "SILO-A", quantityKg: "10000.000000" }], outputs: [{ id: "RICE-261119-01", code: "RICE-261119-01", commodityId: "rice", stage: "HEAD_RICE", locationId: "KHO-01", quantityKg: "9900.000000" }] };
const replacement = { ...original, id: "replacement", status: "DRAFT", version: "071daf01-d894-408b-b6bc-aad3496c26f7", declaredLossKg: "110.000000", outputs: [{ ...original.outputs[0], id: "RICE-261119-02", code: "RICE-261119-02", quantityKg: "9890.000000" }] };
let status = "REQUESTED";
ledgerEndpoints.getOperations = async () => page([replacement]);
ledgerEndpoints.getOperation = async id => id === "original" ? original : replacement;
ledgerEndpoints.getCorrections = async () => page([{ id: "correction", operationId: "original", requestedAt: "2026-11-19T03:30:00Z", status, reason: "Kiểm tra lại phiếu cân sau hiệu chuẩn thiết bị. Khối lượng gạo đầu ra chênh 10 kg.", replacementOperationId: status === "RECONCILED" ? "replacement" : null }]);
ledgerEndpoints.getLot = async () => ({ id: "RICE-261119-01", positions: [{ locationId: "KHO-01", quantityKg: "9900.000000" }] });
ledgerEndpoints.uploadEvidence = async () => ({});
ledgerEndpoints.reconcileCorrection = async () => { status = "RECONCILED"; return {}; };
ledgerEndpoints.cancelCorrection = async () => { status = "CANCELLED"; return {}; };
const c = { id: "container", orderId: "order", internalCode: "CONT-2026-001", targetMassKg: "25000.000000", originalMass: "25", originalUnit: "T", status: "PLANNED", version: 1 };
exportEndpoints.getOrders = async () => page([{ id: "order", code: "EXP-2026-001", marketId: "EU", commodityId: "RICE", requiredMassKg: "100000.000000", shippingFrom: "2026-12-01", shippingTo: "2026-12-10", createdAt: "2026-11-19T03:00:00Z", version: 1 }, { id: "order-2", code: "EXP-2026-002", marketId: "EU", commodityId: "RICE", requiredMassKg: "50000.000000", shippingFrom: "2026-12-15", shippingTo: "2026-12-20", createdAt: "2026-11-19T03:00:00Z", version: 1 }]);
exportEndpoints.getContainers = async orderId => page(orderId === "order" ? [{ ...c, status: execution.container.status, version: execution.container.version }, { ...c, id: "loading", internalCode: "CONT-2026-002", status: "LOADING" }, { ...c, id: "closed", internalCode: "CONT-2026-003", status: "CLOSED" }] : []);
exportEndpoints.getContainer = async () => c;
exportEndpoints.getOrderResource = async id => ({ etag: '"v1"', data: { ...(await exportEndpoints.getOrders()).items.find(o => o.id === id)!, limits: [{ attributeId: "broken", attributeName: "Tỷ lệ tấm", minValue: null, maxValue: "5", unit: "%" }], allocatedMassKg: id === "order" ? "75000" : "0", remainingMassKg: id === "order" ? "25000" : "50000", specificationVersion: 1, canEdit: false } });
planningEndpoints.getBlendPlans = async containerId => {
  const draft: BlendPlanDraftDto = { id: "plan-3", orderId: "order", containerId, specificationId: "spec", versionNo: 3, version: 1, status: "DRAFT", targetMassKg: c.targetMassKg, targetProductIdentity: "Gạo trắng 5% tấm", demandSnapshot: "preview", createdAt: "2026-11-19T03:00:00Z", cancelledAt: null, demandCurrent: true, canCancel: false, hasProposal: true };
  return page([draft, { ...draft, id: "plan-2", versionNo: 2, targetProductIdentity: "Gạo trắng 5% tấm", demandCurrent: false, hasProposal: false, canCancel: true, createdAt: "2026-11-18T03:00:00Z" }, { ...draft, id: "plan-1", versionNo: 1, status: "CANCELLED", hasProposal: false, cancelledAt: "2026-11-17T04:00:00Z", createdAt: "2026-11-17T03:00:00Z" }]);
};
const execution = structuredClone(executionFixture);
execution.container = { ...execution.container, code: c.internalCode, targetKg: c.targetMassKg, remainingKg: c.targetMassKg };
execution.container.approval!.allocations[0].reservedKg = c.targetMassKg;
execution.container.approval!.allocations[0].remainingKg = c.targetMassKg;
const workflow = structuredClone(workflowFixture);
workflow.documents = [{ id: "packing-v2", documentType: "PACKING_LIST", version: 2, filename: "Packing-list-CONT-2026-003.pdf", contentType: "application/pdf", sha256: "preview", reason: "Bản đã ký", recordedAt: "2026-11-19T05:00:00Z" }, { id: "packing-v1", documentType: "PACKING_LIST", version: 1, filename: "Packing-list-draft.pdf", contentType: "application/pdf", sha256: "preview", reason: "Bản đầu", recordedAt: "2026-11-18T05:00:00Z" }, { id: "coa-v1", documentType: "CERTIFICATE_OF_ANALYSIS", version: 1, filename: "Certificate-of-analysis.pdf", contentType: "application/pdf", sha256: "preview", reason: "Kết quả kiểm nghiệm", recordedAt: "2026-11-19T04:00:00Z" }];
const closedDossier: ContainerDossier = { schemaVersion: 1, containerId: "closed", orderId: "order", containerNumber: "GLCU 2026003", sealNumber: "SEAL-VN-081126", targetKg: c.targetMassKg, closedAt: "2026-11-19T03:00:00Z", closedBy: "preview", redacted: true, assessment: { assessmentStatus: "PASS", checkedAt: "2026-11-19T03:00:00Z", findings: [] }, lines: [] };
let issued: ContainerDossier | null = null;
containerExecutionEndpoints.getDetail = async () => {
  const complete = new Decimal(execution.container.remainingKg).isZero();
  execution.readiness = { ...execution.readiness, phase: complete ? "CLOSE" : "LOADING", assessmentStatus: complete && !execution.container.sealNumber ? "INCOMPLETE" : "PASS", findings: complete && !execution.container.sealNumber ? ["SEAL_METADATA_MISSING"] : [] };
  return structuredClone(execution);
};
containerExecutionEndpoints.getHistory = async () => page([]);
containerExecutionEndpoints.getNotifications = async () => ({ items: [] });
containerExecutionEndpoints.getWorkflow = async () => ({ ...workflow, version: execution.container.version });
containerExecutionEndpoints.recordLoad = async (_id, input) => {
  const total = input.lines.reduce((sum, l) => sum.plus(l.quantityKg), new Decimal(0));
  execution.container.loadedKg = new Decimal(execution.container.loadedKg).plus(total).toFixed(6);
  execution.container.remainingKg = new Decimal(execution.container.targetKg).minus(execution.container.loadedKg).toFixed(6);
  execution.container.approval!.allocations[0].remainingKg = execution.container.remainingKg;
  execution.container.loads.push({ id: input.operationId, proposalId: input.proposalId, loadedAt: input.loadedAt, recordedAt: new Date().toISOString(), lines: input.lines.map(l => ({ ...l, lotCode: "RICE-001" })) });
  execution.container.status = "LOADING"; execution.container.version++;
  return structuredClone(execution.container);
};
containerExecutionEndpoints.saveMetadata = async (_id, input) => {
  execution.container.containerNumber = input.containerNumber; execution.container.sealNumber = input.sealNumber; execution.container.version++;
  return structuredClone(execution.container);
};
containerExecutionEndpoints.close = async () => {
  execution.container.status = "CLOSED"; execution.container.dossierAvailable = true; execution.container.version++;
  issued = { schemaVersion: 1, containerId: c.id, orderId: c.orderId, containerNumber: execution.container.containerNumber!, sealNumber: execution.container.sealNumber!, targetKg: c.targetMassKg, closedAt: new Date().toISOString(), closedBy: "preview", redacted: true, assessment: { ...execution.readiness }, lines: [] };
  return structuredClone(execution.container);
};
containerExecutionEndpoints.getDossier = async id => structuredClone(id === "closed" ? closedDossier : issued!);
containerExecutionEndpoints.downloadDossier = async id => new Blob([JSON.stringify(id === "closed" ? closedDossier : issued)], { type: "application/json" });
containerExecutionEndpoints.addDocument = async (_id, input) => {
  workflow.documents.push({ id: input.operationId, documentType: input.documentType, version: workflow.documents.filter(d => d.documentType === input.documentType).length + 1, filename: input.filename, contentType: input.contentType, reason: input.reason, sha256: "preview-only", recordedAt: new Date().toISOString() });
  execution.container.version++; return { ...workflow, version: execution.container.version };
};
containerExecutionEndpoints.addSupplement = async (_id, input) => {
  workflow.supplements.push({ id: input.operationId, evidenceId: input.evidenceId, reason: input.reason, recordedAt: new Date().toISOString() });
  execution.container.version++; return { ...workflow, version: execution.container.version };
};
ledgerEndpoints.getTraceStarts = async () => page([{ id: "lot", code: "RICE-261119-01", stage: "HEAD_RICE" }]);
ledgerEndpoints.traceLot = async () => ({ traceId: "preview", asOf: "2026-11-19T03:00:00Z", complete: true, lots: [{ id: "lot", code: "RICE-261119-01", stage: "HEAD_RICE", producedKg: "9900", restrictions: [] }], edges: [], sources: [] });
// Block all unexpected traffic so preview cannot reach a configured API proxy.
window.fetch = async () => new Response(JSON.stringify({ title: "Preview fixture does not support this request" }), { status: 503, headers: { "Content-Type": "application/problem+json" } });
createRoot(document.getElementById("root")!).render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><MemoryRouter initialEntries={[params.get("screen") ?? "/export/orders"]}>
  <div className="app-workspace min-h-screen bg-surface-base text-ink-primary p-4 sm:p-8"><div className="mx-auto max-w-6xl space-y-6">
    <nav className="flex flex-wrap gap-5 border-b border-ink-tertiary/20 pb-4 text-accent-primary"><span>GRAINLEDGER · QA</span><Link to="/export/orders">Đơn hàng</Link><Link to="/export/containers/container/loading">Xếp hàng</Link><Link to="/mill/reconciliations">Đối soát</Link><Link to="/risk/traceback?lotId=lot">Truy xuất</Link></nav>
    <Routes><Route path="/export/orders" element={<ExportWorkspacePage/>}/><Route path="/export/plans" element={<ExportWorkspacePage view="plans"/>}/><Route path="/export/containers" element={<ExportWorkspacePage view="containers"/>}/><Route path="/export/dossiers" element={<ExportWorkspacePage view="dossiers"/>}/><Route path="/export/containers/:id/loading" element={<ContainerLoadingPage/>}/><Route path="/export/containers/:id/closure" element={<ContainerClosurePage/>}/><Route path="/export/containers/:id/dossier" element={<ContainerDossierPage/>}/><Route path="/mill/reconciliations" element={<CorrectionManagementPage/>}/><Route path="/mill/reconciliations/:id" element={<CorrectionManagementPage/>}/><Route path="/risk/traceback" element={<TraceabilityPage/>}/></Routes>
  </div></div>
</MemoryRouter></QueryClientProvider>);
