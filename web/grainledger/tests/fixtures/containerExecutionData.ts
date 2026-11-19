import type { ContainerExecutionDetail, ContainerWorkflowDetail } from "@/api/containerExecution";

export const executionFixture: ContainerExecutionDetail = {
  container: { id: "container", orderId: "order", companyId: "company", code: "CT-001", targetKg: "10.000000", loadedKg: "0.000000", remainingKg: "10.000000", status: "PLANNED", version: 7, facilityId: "facility", containerNumber: null, sealNumber: null, dossierAvailable: false, holds: [], loads: [], approval: { proposalId: "approved-proposal", planId: "plan", decisionVersion: 3, mode: "DIRECT_STOCK", allocations: [{ lotId: "lot", lotCode: "RICE-001", locationId: "location", reservedKg: "10.000000", remainingKg: "10.000000", restricted: false, loadingPositionReady: true }] } },
  readiness: { phase: "LOADING", checkedAt: "2026-11-19T03:00:00Z", assessmentStatus: "PASS", findings: [] },
};
export const workflowFixture: ContainerWorkflowDetail = { containerId: "container", version: 7, documents: [], supplements: [], reviews: [], handoffs: [] };
