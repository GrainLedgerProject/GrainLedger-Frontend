import { labReportEndpoints, sampleEndpoints } from "@/api/compliance";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import { exportEndpoints } from "@/api/exports";
import { ledgerEndpoints } from "@/api/ledger";
import { procurementEndpoints } from "@/api/procurement";

export type BusinessGroup =
  | "ALL"
  | "CAPTURE"
  | "MILL_OPERATIONS"
  | "QUALITY_HOLD"
  | "EXPORT_CONTAINER";

export interface BusinessHistoryItem {
  id: string;
  group: Exclude<BusinessGroup, "ALL">;
  category: string;
  referenceCode: string;
  title: string;
  summary: string;
  actorName: string;
  status: string;
  timestamp: string;
  details: unknown;
}

function asArray<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];
  if (value && typeof value === "object" && "items" in value) {
    const items = (value as { items?: unknown }).items;
    if (Array.isArray(items)) return items as T[];
  }
  return [];
}

export async function fetchBusinessHistory(
  group: BusinessGroup,
): Promise<BusinessHistoryItem[]> {
  const results: BusinessHistoryItem[] = [];
  const want = (g: Exclude<BusinessGroup, "ALL">) =>
    group === "ALL" || group === g;

  const tasks: Promise<void>[] = [];

  if (want("CAPTURE")) {
    tasks.push(
      procurementEndpoints
        .getProcurements({ page: 1, pageSize: 25 })
        .then((res) => {
          for (const row of asArray<Record<string, unknown>>(res)) {
            const id = String(row.id ?? "");
            const code = String(row.code ?? row.receiptCode ?? id);
            results.push({
              id: `proc:${id}`,
              group: "CAPTURE",
              category: "PROCUREMENT",
              referenceCode: code,
              title: String(row.farmerName ?? code),
              summary: `${row.riceVariety ?? ""} · ${row.totalKg ?? row.netKg ?? "—"} kg`,
              actorName: String(row.createdByName ?? row.actorName ?? "Field Officer"),
              status: String(row.status ?? "RECORDED"),
              timestamp: String(row.receivedAt ?? row.createdAt ?? new Date(0).toISOString()),
              details: row,
            });
          }
        })
        .catch(() => undefined),
      sampleEndpoints
        .getSamples({ page: 1, pageSize: 25 })
        .then((res) => {
          for (const row of res.items ?? []) {
            results.push({
              id: `sample:${row.id}`,
              group: "CAPTURE",
              category: "SAMPLE",
              referenceCode: row.code || row.id,
              title: row.code || row.id,
              summary: `${row.sealCode || "—"} · ${row.materialDescription ?? ""}`.trim(),
              actorName: "QC / Field",
              status: `HANDOVERS:${row.handoverCount}`,
              timestamp: row.collectedAt,
              details: row,
            });
          }
        })
        .catch(() => undefined),
      labReportEndpoints
        .getLabReports({ page: 1, pageSize: 25 })
        .then((res) => {
          for (const row of res.items ?? []) {
            results.push({
              id: `lab:${row.id}`,
              group: "CAPTURE",
              category: "LAB_REPORT",
              referenceCode: row.reportNumber || row.id,
              title: `${row.reportNumber} (${row.laboratoryName})`,
              summary: row.assessmentStatus ?? row.reportKind,
              actorName: row.laboratoryName,
              status: row.status,
              timestamp: row.confirmedAt ?? row.receivedAt,
              details: row,
            });
          }
        })
        .catch(() => undefined),
    );
  }

  if (want("MILL_OPERATIONS")) {
    tasks.push(
      ledgerEndpoints
        .getOperations({ page: 1, pageSize: 25 })
        .then((res) => {
          for (const row of asArray<Record<string, unknown>>(res)) {
            const id = String(row.id ?? "");
            results.push({
              id: `op:${id}`,
              group: "MILL_OPERATIONS",
              category: String(row.kind ?? "OPERATION"),
              referenceCode: String(row.code ?? id),
              title: `${row.kind ?? "OPERATION"} · ${String(row.id ?? "").slice(0, 8)}`,
              summary: `${row.declaredLossKg ?? "0"} kg loss`,
              actorName: String(row.actorName ?? row.facilityId ?? "Mill"),
              status: String(row.status ?? "RECORDED"),
              timestamp: String(row.occurredAt ?? row.createdAt ?? new Date(0).toISOString()),
              details: row,
            });
          }
        })
        .catch(() => undefined),
      ledgerEndpoints
        .getCorrections({ page: 1, pageSize: 25 })
        .then((res) => {
          for (const row of asArray<Record<string, unknown>>(res)) {
            const id = String(row.id ?? "");
            results.push({
              id: `corr:${id}`,
              group: "MILL_OPERATIONS",
              category: "CORRECTION",
              referenceCode: String(row.originalOperationId ?? id),
              title: String(row.reason ?? "Ledger correction"),
              summary: `${row.originalOperationId ?? ""} → ${row.replacementOperationId ?? "—"}`,
              actorName: String(row.requestedBy ?? "Manager"),
              status: String(row.status ?? "OPEN"),
              timestamp: String(row.createdAt ?? new Date(0).toISOString()),
              details: row,
            });
          }
        })
        .catch(() => undefined),
    );
  }

  if (want("QUALITY_HOLD")) {
    tasks.push(
      ledgerEndpoints
        .getHolds({ page: 1, pageSize: 25 })
        .then((res) => {
          for (const row of asArray<Record<string, unknown>>(res)) {
            const id = String(row.id ?? "");
            results.push({
              id: `hold:${id}`,
              group: "QUALITY_HOLD",
              category: "HOLD_ORDER",
              referenceCode: String(row.lotCode ?? id),
              title: `${row.lotCode ?? row.lotId ?? id}`,
              summary: String(row.reason ?? ""),
              actorName: String(row.ownerName ?? "Quality Manager"),
              status: String(row.status ?? "ACTIVE"),
              timestamp: String(row.createdAt ?? new Date(0).toISOString()),
              details: row,
            });
          }
        })
        .catch(() => undefined),
    );
  }

  if (want("EXPORT_CONTAINER")) {
    tasks.push(
      exportEndpoints
        .getOrders({ page: 1, pageSize: 25 })
        .then((res) => {
          for (const row of res.items ?? []) {
            results.push({
              id: `order:${row.id}`,
              group: "EXPORT_CONTAINER",
              category: "EXPORT_ORDER",
              referenceCode: row.code,
              title: `${row.code} (${row.marketId})`,
              summary: `${row.requiredMassKg} kg · ${row.shippingFrom}..${row.shippingTo}`,
              actorName: "Export Officer",
              status: `v${row.version}`,
              timestamp: row.createdAt || `${row.shippingFrom}T00:00:00Z`,
              details: row,
            });
          }
        })
        .catch(() => undefined),
      containerExecutionEndpoints
        .getWorkItems()
        .then((res) => {
          for (const row of res.items ?? []) {
            results.push({
              id: `work:${row.containerId}`,
              group: "EXPORT_CONTAINER",
              category: "CONTAINER_WORK",
              referenceCode: row.code,
              title: `${row.code} (${row.mode})`,
              summary: row.proposalId,
              actorName: row.facilityId,
              status: row.state,
              timestamp: new Date().toISOString(),
              details: row,
            });
          }
        })
        .catch(() => undefined),
      containerExecutionEndpoints
        .getNotifications()
        .then((res) => {
          for (const row of res.items ?? []) {
            results.push({
              id: `notice:${row.id}`,
              group: "EXPORT_CONTAINER",
              category: "CONTAINER_NOTICE",
              referenceCode: row.code,
              title: row.code,
              summary: row.message,
              actorName: row.holdId,
              status: row.readAt ? "READ" : "UNREAD",
              timestamp: row.createdAt,
              details: row,
            });
          }
        })
        .catch(() => undefined),
    );
  }

  await Promise.allSettled(tasks);
  return results.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
