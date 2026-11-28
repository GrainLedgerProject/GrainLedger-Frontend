import type { LoadingEdge } from "@/api/containerExecution";
import { Decimal } from "@/shared/utils/decimalMass";

export interface TraceFlowLotInput {
  id: string;
  code: string;
  stage?: string;
  producedKg?: string;
  quantityKg?: string;
  availableKg?: string;
  restrictions?: string[];
  directHold?: boolean;
  effectiveHold?: boolean;
  directHoldIds?: string[];
  effectiveHoldIds?: string[];
  positions?: {
    quantityKg?: string;
    availableKg?: string;
  }[];
}

export interface TraceFlowEdgeInput {
  inputLotId: string;
  outputLotId: string;
  operationId?: string | null;
  relationType?: string;
  kind?: string;
  inputConsumedKg: string;
  outputProducedKg?: string;
}

export interface TraceFlowOperationInput {
  id: string;
  kind: string;
  facilityId?: string | null;
  occurredAt?: string | null;
}

export interface TraceFlowCustodyInput {
  id: string;
  kind?: string;
  action?: string;
  lotId?: string;
  primaryOutputLotId?: string;
  locationId?: string | null;
  fromLocationId?: string | null;
  toLocationId?: string | null;
  quantityKg?: string;
  revision?: string | number | null;
  occurredAt?: string | null;
}

export type FlowNodeKind = "lot" | "operation" | "custody" | "container";

export interface FlowNode {
  id: string;
  kind: FlowNodeKind;
  label: string;
  sublabel: string;
  badge?: string;
  meta: string[];
  rank: number;
  x: number;
  y: number;
  width: number;
  height: number;
  lotId?: string;
  containerId?: string;
  restricted?: boolean;
  isFocus?: boolean;
}

export interface FlowEdge {
  id: string;
  from: string;
  to: string;
  path: string;
  label: string;
  labelX: number;
  labelY: number;
}

export type FlowLayout =
  | {
      status: "ready";
      nodes: FlowNode[];
      edges: FlowEdge[];
      width: number;
      height: number;
      maxRank: number;
    }
  | {
      status: "too_large" | "cyclic";
      nodeCount: number;
      edgeCount: number;
    };

const MAX_NODES = 250;
const MAX_EDGES = 500;
const NODE_W = 196;
const NODE_H = 68;
const COL_GAP = 256;
const ROW_GAP = 94;
const PAD_X = 36;
const PAD_Y = 36;

export function traceRelationLabel(
  kind: string | undefined,
  locale: "vi" | "en" = "vi",
): string {
  const key = (kind ?? "").toUpperCase();
  const map: Record<string, [string, string]> = {
    RECEIVING: ["Nhập kho / Thu mua", "Receiving"],
    CLEANING: ["Làm sạch", "Cleaning"],
    DRYING: ["Sấy", "Drying"],
    MILLING: ["Xay xát", "Milling"],
    PROCESSING: ["Chế biến", "Processing"],
    BLENDING: ["Phối trộn", "Blending"],
    PACKAGING: ["Đóng gói", "Packaging"],
    SPLIT: ["Tách lô", "Split"],
    MERGE: ["Gộp lô", "Merge"],
    TRANSFER: ["Điều chuyển", "Transfer"],
    CONTAINER_LOAD: ["Xếp container", "Container loading"],
    ADJUSTMENT: ["Điều chỉnh", "Adjustment"],
    RECONCILIATION: ["Đối soát", "Reconciliation"],
  };
  const found = map[key];
  if (found) return locale === "vi" ? found[0] : found[1];
  return kind || (locale === "vi" ? "Biến động" : "Operation");
}

function formatKg(value: string | undefined): string {
  if (!value) return "0";
  try {
    return new Decimal(value).toDecimalPlaces(3).toFixed();
  } catch {
    return value;
  }
}

function buildContainerFlowNode({
  containerId,
  info,
  lineCount,
  proposals = [],
  focusContainerId,
  containerLabel,
  locale,
}: {
  containerId: string;
  info?: {
    containerId: string;
    code: string;
    linkedLoadedKg?: string;
    sourceLoadedKg?: string | null;
    status?: string;
    held?: boolean;
    restricted?: boolean;
  };
  lineCount?: number;
  proposals?: string[];
  focusContainerId?: string;
  containerLabel?: string;
  locale: "vi" | "en";
}): Omit<FlowNode, "rank" | "x" | "y" | "width" | "height"> {
  const meta: string[] = [];
  if (lineCount != null) {
    meta.push(`${locale === "vi" ? "Dòng loading" : "Loading lines"}: ${lineCount}`);
  }
  if (info?.linkedLoadedKg != null) {
    meta.push(`${locale === "vi" ? "Thực xếp liên kết" : "Linked loaded"}: ${formatKg(info.linkedLoadedKg)} kg`);
  }
  if (info?.sourceLoadedKg != null) {
    meta.push(`${locale === "vi" ? "Quy thuộc nguồn gốc" : "Source attributed"}: ${formatKg(info.sourceLoadedKg)} kg`);
  }
  if (info?.restricted && !info?.held) {
    meta.push(locale === "vi" ? "Lô đã nạp đang bị hạn chế" : "Loaded lot restricted");
  }
  if (proposals.length) {
    meta.push(`${locale === "vi" ? "Phương án" : "Proposal"}: ${proposals.join(", ")}`);
  }
  return {
    id: `container:${containerId}`,
    kind: "container",
    label: info?.code || (containerId === focusContainerId ? containerLabel : undefined) || containerId.slice(0, 12),
    sublabel: info?.status || "CONTAINER",
    badge: info?.held ? "HOLD container" : info?.restricted ? (locale === "vi" ? "Lô hạn chế" : "Restricted lot") : undefined,
    meta,
    containerId,
    restricted: Boolean(info?.held || info?.restricted),
    isFocus: containerId === focusContainerId,
  };
}

export function traceLotOrder<T extends { id: string }>(
  lots: T[],
  edges: { inputLotId: string; outputLotId: string }[],
  rootLotId?: string,
): T[] {
  const byId = new Map(lots.map((l) => [l.id, l]));
  const inDegree = new Map<string, number>();
  const children = new Map<string, string[]>();
  for (const lot of lots) {
    inDegree.set(lot.id, 0);
    children.set(lot.id, []);
  }
  for (const edge of edges) {
    if (!byId.has(edge.inputLotId) || !byId.has(edge.outputLotId)) continue;
    children.get(edge.inputLotId)!.push(edge.outputLotId);
    inDegree.set(edge.outputLotId, (inDegree.get(edge.outputLotId) ?? 0) + 1);
  }
  const queue: string[] = [];
  for (const lot of lots) {
    if ((inDegree.get(lot.id) ?? 0) === 0) queue.push(lot.id);
  }
  const ordered: T[] = [];
  const seen = new Set<string>();
  while (queue.length > 0) {
    const id = queue.shift()!;
    if (seen.has(id)) continue;
    seen.add(id);
    const node = byId.get(id);
    if (node) ordered.push(node);
    for (const next of children.get(id) ?? []) {
      const rem = (inDegree.get(next) ?? 0) - 1;
      inDegree.set(next, rem);
      if (rem <= 0) queue.push(next);
    }
  }
  for (const lot of lots) {
    if (!seen.has(lot.id)) ordered.push(lot);
  }
  if (rootLotId && byId.has(rootLotId)) {
    const rootIndex = ordered.findIndex((l) => l.id === rootLotId);
    if (rootIndex > 0) {
      const [root] = ordered.splice(rootIndex, 1);
      ordered.unshift(root);
    }
  }
  return ordered;
}

export function buildTraceFlowGraph({
  lots,
  edges,
  operations = [],
  custodyEvents = [],
  loadingEdges = [],
  actualContainers = [],
  rootLotId,
  focusContainerId,
  containerLabel,
  facilityNames,
  locationNames,
  locale = "vi",
}: {
  lots: TraceFlowLotInput[];
  edges: TraceFlowEdgeInput[];
  operations?: TraceFlowOperationInput[];
  custodyEvents?: TraceFlowCustodyInput[];
  loadingEdges?: LoadingEdge[];
  actualContainers?: {
    containerId: string;
    code: string;
    linkedLoadedKg?: string;
    sourceLoadedKg?: string | null;
    status?: string;
    held?: boolean;
    restricted?: boolean;
  }[];
  rootLotId?: string;
  focusContainerId?: string;
  containerLabel?: string;
  facilityNames?: Map<string, string>;
  locationNames?: Map<string, string>;
  locale?: "vi" | "en";
}): FlowLayout {
  const nodesMap = new Map<string, Omit<FlowNode, "rank" | "x" | "y" | "width" | "height">>();
  const rawEdges: { id: string; from: string; to: string; label: string }[] = [];
  const opById = new Map(operations.map((o) => [o.id, o]));
  const lotNames = new Map(lots.map((l) => [l.id, l.code]));
  const containerMetaMap = new Map(
    actualContainers.map((c) => [c.containerId, c]),
  );

  for (const lot of lots) {
    const held =
      Boolean(lot.restrictions?.length) ||
      Boolean(lot.directHold) ||
      Boolean(lot.effectiveHold) ||
      Boolean(lot.directHoldIds?.length) ||
      Boolean(lot.effectiveHoldIds?.length);
    const positionQuantity = lot.positions?.length
      ? lot.positions.reduce((sum, p) => sum.plus(new Decimal(p.quantityKg || "0")), new Decimal(0)).toString()
      : undefined;
    const positionAvailable = lot.positions?.some((p) => p.availableKg != null)
      ? lot.positions.reduce((sum, p) => sum.plus(new Decimal(p.availableKg || "0")), new Decimal(0)).toString()
      : undefined;
    const physicalKg = lot.quantityKg ?? positionQuantity;
    const availKg = lot.availableKg ?? positionAvailable;
    const meta: string[] = [];
    if (lot.producedKg) meta.push(`${locale === "vi" ? "Sản lượng" : "Produced"}: ${formatKg(lot.producedKg)} kg`);
    if (physicalKg) meta.push(`${locale === "vi" ? "Tồn vật lý" : "Physical"}: ${formatKg(physicalKg)} kg`);
    if (availKg) meta.push(`${locale === "vi" ? "Khả dụng" : "Available"}: ${formatKg(availKg)} kg`);
    if (lot.restrictions?.length) meta.push(`HOLD: ${lot.restrictions.join(", ")}`);
    nodesMap.set(`lot:${lot.id}`, {
      id: `lot:${lot.id}`,
      kind: "lot",
      label: lot.code || lot.id,
      sublabel: lot.stage || (locale === "vi" ? "Lô hàng" : "Lot"),
      badge: held ? "HOLD" : undefined,
      meta,
      lotId: lot.id,
      restricted: held,
      isFocus: lot.id === rootLotId,
    });
  }

  for (let i = 0; i < edges.length; i++) {
    const e = edges[i];
    const fromLotKey = `lot:${e.inputLotId}`;
    const toLotKey = `lot:${e.outputLotId}`;
    if (!nodesMap.has(fromLotKey)) {
      nodesMap.set(fromLotKey, {
        id: fromLotKey,
        kind: "lot",
        label: lotNames.get(e.inputLotId) ?? e.inputLotId,
        sublabel: locale === "vi" ? "Lô" : "Lot",
        meta: [],
        lotId: e.inputLotId,
      });
    }
    if (!nodesMap.has(toLotKey)) {
      nodesMap.set(toLotKey, {
        id: toLotKey,
        kind: "lot",
        label: lotNames.get(e.outputLotId) ?? e.outputLotId,
        sublabel: locale === "vi" ? "Lô" : "Lot",
        meta: [],
        lotId: e.outputLotId,
      });
    }
    const opKeyId = e.operationId || `${e.relationType ?? e.kind ?? "OP"}:${e.outputLotId}`;
    const opNodeId = `op:${opKeyId}`;
    const opRecord = e.operationId ? opById.get(e.operationId) : undefined;
    const opKind = opRecord?.kind ?? e.relationType ?? e.kind;
    if (!nodesMap.has(opNodeId)) {
      const meta: string[] = [];
      if (opRecord?.facilityId) {
        meta.push(facilityNames?.get(opRecord.facilityId) ?? opRecord.facilityId);
      }
      if (opRecord?.occurredAt) {
        meta.push(new Date(opRecord.occurredAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-GB"));
      }
      nodesMap.set(opNodeId, {
        id: opNodeId,
        kind: "operation",
        label: traceRelationLabel(opKind, locale),
        sublabel: e.operationId ? e.operationId.slice(0, 8) : (opKind ?? "OP"),
        meta,
      });
    }
    const inEdgeId = `${fromLotKey}->${opNodeId}`;
    if (!rawEdges.some((item) => item.id === inEdgeId)) {
      rawEdges.push({
        id: inEdgeId,
        from: fromLotKey,
        to: opNodeId,
        label: `${formatKg(e.inputConsumedKg)} kg`,
      });
    }
    const outEdgeId = `${opNodeId}->${toLotKey}`;
    if (!rawEdges.some((item) => item.id === outEdgeId)) {
      rawEdges.push({
        id: outEdgeId,
        from: opNodeId,
        to: toLotKey,
        label: e.outputProducedKg ? `${formatKg(e.outputProducedKg)} kg` : "",
      });
    }
  }

  for (const evt of custodyEvents) {
    const evtLotId = evt.lotId ?? evt.primaryOutputLotId;
    if (!evtLotId) continue;
    const lotKey = `lot:${evtLotId}`;
    if (!nodesMap.has(lotKey)) continue;
    const custodyKey = `custody:${evt.id}`;
    const fromLoc = evt.fromLocationId ? (locationNames?.get(evt.fromLocationId) ?? evt.fromLocationId) : null;
    const toLoc = (evt.toLocationId ?? evt.locationId)
      ? (locationNames?.get((evt.toLocationId ?? evt.locationId)!) ?? (evt.toLocationId ?? evt.locationId)!)
      : null;
    const locLine = fromLoc && toLoc ? `${fromLoc} → ${toLoc}` : (toLoc ?? fromLoc ?? "—");
    const kindLabel = evt.kind ?? evt.action ?? "CUSTODY";
    nodesMap.set(custodyKey, {
      id: custodyKey,
      kind: "custody",
      label: traceRelationLabel(kindLabel, locale),
      sublabel: evt.quantityKg ? `${formatKg(evt.quantityKg)} kg` : (evt.revision ? `rev ${evt.revision}` : kindLabel),
      meta: [
        locLine,
        ...(evt.occurredAt ? [new Date(evt.occurredAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-GB")] : []),
      ],
      lotId: evtLotId,
    });
    rawEdges.push({
      id: `${lotKey}->${custodyKey}`,
      from: lotKey,
      to: custodyKey,
      label: evt.quantityKg ? `${formatKg(evt.quantityKg)} kg` : "",
    });
  }

  for (const edge of loadingEdges) {
    const fromLotKey = `lot:${edge.lotId}`;
    const containerKey = `container:${edge.containerId}`;
    if (!nodesMap.has(fromLotKey)) {
      nodesMap.set(fromLotKey, {
        id: fromLotKey,
        kind: "lot",
        label: lotNames.get(edge.lotId) ?? edge.lotId,
        sublabel: locale === "vi" ? "Lô xuất" : "Loaded lot",
        meta: [],
        lotId: edge.lotId,
      });
    }
    const info = containerMetaMap.get(edge.containerId);
    if (!nodesMap.has(containerKey)) {
      const proposals = Array.from(new Set(edge.lines.map((l) => l.proposalId).filter(Boolean)));
      nodesMap.set(
        containerKey,
        buildContainerFlowNode({
          containerId: edge.containerId,
          info,
          lineCount: edge.lines.length,
          proposals,
          focusContainerId,
          containerLabel,
          locale,
        }),
      );
    }
    rawEdges.push({
      id: `${fromLotKey}->${containerKey}`,
      from: fromLotKey,
      to: containerKey,
      label: `${formatKg(edge.quantityKg)} kg`,
    });
  }

  for (const info of actualContainers) {
    const containerKey = `container:${info.containerId}`;
    if (nodesMap.has(containerKey)) continue;
    nodesMap.set(
      containerKey,
      buildContainerFlowNode({
        containerId: info.containerId,
        info,
        focusContainerId,
        containerLabel,
        locale,
      }),
    );
  }

  if (nodesMap.size > MAX_NODES || rawEdges.length > MAX_EDGES) {
    return { status: "too_large", nodeCount: nodesMap.size, edgeCount: rawEdges.length };
  }

  // Kahn topological ranking
  const inDeg = new Map<string, number>();
  const outAdj = new Map<string, string[]>();
  const rankMap = new Map<string, number>();
  for (const id of nodesMap.keys()) {
    inDeg.set(id, 0);
    outAdj.set(id, []);
    rankMap.set(id, 0);
  }
  for (const edge of rawEdges) {
    outAdj.get(edge.from)!.push(edge.to);
    inDeg.set(edge.to, (inDeg.get(edge.to) ?? 0) + 1);
  }
  const queue: string[] = [];
  for (const [id, deg] of inDeg.entries()) {
    if (deg === 0) queue.push(id);
  }
  let visited = 0;
  while (queue.length > 0) {
    const id = queue.shift()!;
    visited++;
    const currentRank = rankMap.get(id) ?? 0;
    for (const next of outAdj.get(id) ?? []) {
      rankMap.set(next, Math.max(rankMap.get(next) ?? 0, currentRank + 1));
      const nextDeg = (inDeg.get(next) ?? 0) - 1;
      inDeg.set(next, nextDeg);
      if (nextDeg === 0) queue.push(next);
    }
  }
  if (visited < nodesMap.size) {
    return { status: "cyclic", nodeCount: nodesMap.size, edgeCount: rawEdges.length };
  }

  // Group into rank columns
  const columns = new Map<number, string[]>();
  let maxRank = 0;
  for (const [id, rank] of rankMap.entries()) {
    maxRank = Math.max(maxRank, rank);
    const col = columns.get(rank) ?? [];
    col.push(id);
    columns.set(rank, col);
  }
  const kindOrder: Record<FlowNodeKind, number> = {
    lot: 0,
    operation: 1,
    custody: 2,
    container: 3,
  };
  let maxRows = 1;
  for (const col of columns.values()) {
    col.sort((a, b) => {
      const na = nodesMap.get(a)!;
      const nb = nodesMap.get(b)!;
      return kindOrder[na.kind] - kindOrder[nb.kind] || na.label.localeCompare(nb.label);
    });
    maxRows = Math.max(maxRows, col.length);
  }

  const totalH = Math.max(260, PAD_Y * 2 + maxRows * ROW_GAP);
  const positioned = new Map<string, FlowNode>();
  for (let r = 0; r <= maxRank; r++) {
    const col = columns.get(r) ?? [];
    const colHeight = col.length * ROW_GAP;
    const startY = Math.max(PAD_Y, Math.round((totalH - colHeight) / 2));
    col.forEach((id, rowIdx) => {
      const base = nodesMap.get(id)!;
      positioned.set(id, {
        ...base,
        rank: r,
        x: PAD_X + r * COL_GAP,
        y: startY + rowIdx * ROW_GAP,
        width: NODE_W,
        height: NODE_H,
      });
    });
  }

  const flowEdges: FlowEdge[] = rawEdges.map((edge, idx) => {
    const fromNode = positioned.get(edge.from)!;
    const toNode = positioned.get(edge.to)!;
    const x1 = fromNode.x + fromNode.width;
    const y1 = fromNode.y + fromNode.height / 2;
    const x2 = toNode.x;
    const y2 = toNode.y + toNode.height / 2;
    const span = Math.max(1, toNode.rank - fromNode.rank);
    const laneOffset = span > 1 ? ((idx % 3) - 1) * 28 - 22 : 0;
    const mx = (x1 + x2) / 2;
    const my = (y1 + y2) / 2 + laneOffset;
    const path =
      span > 1
        ? `M ${x1} ${y1} Q ${mx} ${my}, ${x2} ${y2}`
        : `M ${x1} ${y1} C ${x1 + 36} ${y1}, ${x2 - 36} ${y2}, ${x2} ${y2}`;
    return {
      id: edge.id,
      from: edge.from,
      to: edge.to,
      path,
      label: edge.label,
      labelX: mx,
      labelY: span > 1 ? my - 6 : (y1 + y2) / 2 - 8,
    };
  });

  const width = Math.max(520, PAD_X * 2 + maxRank * COL_GAP + NODE_W);
  return {
    status: "ready",
    nodes: Array.from(positioned.values()),
    edges: flowEdges,
    width,
    height: totalH,
    maxRank,
  };
}
