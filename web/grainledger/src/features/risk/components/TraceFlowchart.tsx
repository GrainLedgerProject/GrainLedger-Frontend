import { useMemo, useRef, useState } from "react";
import {
  ArrowsClockwise,
  ArrowsOutSimple,
  Crosshair,
  MagnifyingGlassMinus,
  MagnifyingGlassPlus,
  Table as TableIcon,
  WarningCircle,
} from "@phosphor-icons/react";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import type { FlowLayout, FlowNode } from "../model/traceFlow";

export function TraceFlowchart({
  layout,
  selectedLotId,
  onSelectLot,
  onSwitchToTable,
}: {
  layout: FlowLayout;
  selectedLotId?: string;
  onSelectLot?: (lotId: string) => void;
  onSwitchToTable: () => void;
}) {
  const text = useWorkflowText();
  const viewportRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [manualNodeId, setManualNodeId] = useState<string | null>(null);

  const selectedNodeId = useMemo(() => {
    if (layout.status !== "ready") return null;
    if (selectedLotId) {
      const matched = layout.nodes.find((n) => n.lotId === selectedLotId);
      if (matched) return matched.id;
    }
    if (manualNodeId && layout.nodes.some((n) => n.id === manualNodeId)) {
      return manualNodeId;
    }
    return layout.nodes.find((n) => n.isFocus)?.id ?? layout.nodes[0]?.id ?? null;
  }, [layout, selectedLotId, manualNodeId]);

  const selectedNode = useMemo<FlowNode | null>(() => {
    if (layout.status !== "ready") return null;
    return layout.nodes.find((n) => n.id === selectedNodeId) ?? null;
  }, [layout, selectedNodeId]);

  if (layout.status !== "ready") {
    return (
      <div
        role="status"
        className="rounded-2xl border border-functional-stale-border bg-functional-stale-bg/40 p-5 space-y-3 text-xs"
      >
        <div className="flex items-start gap-2.5 text-ink-primary">
          <WarningCircle size={18} className="text-accent-warning shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold">
              {layout.status === "too_large"
                ? text(
                    `Đồ thị quá lớn để hiển thị trực quan (${layout.nodeCount} nút / ${layout.edgeCount} liên kết).`,
                    `Graph exceeds interactive rendering limits (${layout.nodeCount} nodes / ${layout.edgeCount} edges).`,
                  )
                : text(
                    "Phát hiện chu trình trong dữ liệu liên kết, không thể dựng sơ đồ DAG.",
                    "A cycle was detected in the relationship graph; DAG flowchart fallback activated.",
                  )}
            </p>
            <p className="text-ink-secondary">
              {text(
                "Đã kích hoạt chế độ xem bảng đầy đủ để không mất dữ liệu truy vết.",
                "Switch to the full table view so all trace records remain accessible.",
              )}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onSwitchToTable}
          className="inline-flex items-center gap-1.5 rounded-xl bg-accent-primary px-3.5 py-2 text-xs font-semibold text-white hover:bg-accent-primary/90 transition-colors"
        >
          <TableIcon size={15} />
          <span>{text("Xem dạng bảng", "Switch to table view")}</span>
        </button>
      </div>
    );
  }

  function fitGraph() {
    if (layout.status !== "ready" || !viewportRef.current) return;
    const vw = viewportRef.current.clientWidth || 720;
    const fitted = Math.max(0.45, Math.min(1.15, (vw - 16) / layout.width));
    setZoom(Number(fitted.toFixed(2)));
    viewportRef.current.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }

  function resetZoom() {
    setZoom(1);
    viewportRef.current?.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  }

  function focusNode() {
    if (layout.status !== "ready" || !viewportRef.current) return;
    const target =
      selectedNode ??
      layout.nodes.find((n) => n.isFocus) ??
      layout.nodes[0];
    if (!target) return;
    const el = viewportRef.current;
    const cx = target.x * zoom + (target.width * zoom) / 2 - el.clientWidth / 2;
    const cy = target.y * zoom + (target.height * zoom) / 2 - el.clientHeight / 2;
    el.scrollTo({
      left: Math.max(0, cx),
      top: Math.max(0, cy),
      behavior: "smooth",
    });
  }

  const nodeColors = (node: FlowNode, isSelected: boolean) => {
    if (node.restricted) {
      return {
        fill: "var(--color-functional-rejected-bg, #fdf2f2)",
        stroke: isSelected
          ? "var(--color-accent-danger, #b91c1c)"
          : "var(--color-functional-rejected-border, #f5c2c7)",
      };
    }
    if (node.kind === "container") {
      return {
        fill: "var(--color-functional-balanced-bg, #eef7f1)",
        stroke: isSelected
          ? "var(--color-accent-primary, #1f6f54)"
          : "var(--color-accent-primary, #1f6f54)",
      };
    }
    if (node.kind === "operation") {
      return {
        fill: "var(--color-surface-raised, #f4f5f3)",
        stroke: isSelected
          ? "var(--color-accent-primary, #1f6f54)"
          : "var(--color-ink-tertiary, #9aa59f)",
      };
    }
    if (node.kind === "custody") {
      return {
        fill: "var(--color-functional-stale-bg, #fef9ec)",
        stroke: isSelected
          ? "var(--color-accent-warning, #b45309)"
          : "var(--color-functional-stale-border, #f59e0b)",
      };
    }
    return {
      fill: "var(--color-surface-base, #ffffff)",
      stroke: isSelected
        ? "var(--color-accent-primary, #1f6f54)"
        : "var(--color-ink-tertiary, #b0bab4)",
    };
  };

  return (
    <div className="space-y-3 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-tertiary/15 pb-3">
        <div className="flex flex-wrap items-center gap-1.5 text-[11px] font-medium text-ink-secondary">
          <span className="inline-flex items-center gap-1 rounded-full border border-ink-tertiary/25 bg-surface-base px-2.5 py-0.5">
            {text("Lô hàng", "Lot")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-ink-tertiary/25 bg-surface-raised px-2.5 py-0.5">
            {text("Công đoạn", "Operation")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-functional-stale-border bg-functional-stale-bg px-2.5 py-0.5 text-ink-primary">
            {text("Lưu ký / Điều chuyển", "Custody")}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-accent-primary/40 bg-functional-balanced-bg px-2.5 py-0.5 text-accent-primary">
            Container
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-functional-rejected-border bg-functional-rejected-bg px-2.5 py-0.5 text-accent-danger">
            HOLD
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <button
            type="button"
            aria-label={text("Thu nhỏ sơ đồ", "Zoom out")}
            onClick={() =>
              setZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))
            }
            className="inline-flex items-center justify-center rounded-lg border border-ink-tertiary/25 bg-surface-raised px-2 py-1.5 hover:bg-surface-overlay"
          >
            <MagnifyingGlassMinus size={14} />
          </button>
          <span className="min-w-[3.2rem] text-center font-mono text-[11px] font-semibold">
            {Math.round(zoom * 100)}%
          </span>
          <button
            type="button"
            aria-label={text("Phóng to sơ đồ", "Zoom in")}
            onClick={() =>
              setZoom((z) => Math.min(1.8, Number((z + 0.15).toFixed(2))))
            }
            className="inline-flex items-center justify-center rounded-lg border border-ink-tertiary/25 bg-surface-raised px-2 py-1.5 hover:bg-surface-overlay"
          >
            <MagnifyingGlassPlus size={14} />
          </button>
          <button
            type="button"
            onClick={fitGraph}
            className="inline-flex items-center gap-1 rounded-lg border border-ink-tertiary/25 bg-surface-raised px-2.5 py-1.5 text-[11px] font-semibold hover:bg-surface-overlay"
          >
            <ArrowsOutSimple size={13} />
            <span>{text("Vừa khung", "Fit graph")}</span>
          </button>
          <button
            type="button"
            onClick={resetZoom}
            className="inline-flex items-center gap-1 rounded-lg border border-ink-tertiary/25 bg-surface-raised px-2.5 py-1.5 text-[11px] font-semibold hover:bg-surface-overlay"
          >
            <ArrowsClockwise size={13} />
            <span>{text("Đặt lại thu phóng", "Reset zoom")}</span>
          </button>
          <button
            type="button"
            onClick={focusNode}
            className="inline-flex items-center gap-1 rounded-lg border border-accent-primary/35 bg-accent-primary/10 px-2.5 py-1.5 text-[11px] font-semibold text-accent-primary hover:bg-accent-primary/20"
          >
            <Crosshair size={13} />
            <span>{text("Tập trung điểm gốc", "Focus")}</span>
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="max-h-[30rem] overflow-auto rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-2 dark:bg-surface-base/60"
      >
        <svg
          role="img"
          aria-label={text("Sơ đồ dòng truy vết", "Traceability flow diagram")}
          width={Math.round(layout.width * zoom)}
          height={Math.round(layout.height * zoom)}
          viewBox={`0 0 ${layout.width} ${layout.height}`}
          className="block select-none"
        >
          <defs>
            <marker
              id="trace-arrow"
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 z" fill="currentColor" opacity="0.55" />
            </marker>
          </defs>

          {layout.edges.map((edge) => (
            <g key={edge.id} className="text-ink-secondary">
              <path
                d={edge.path}
                fill="none"
                stroke="currentColor"
                strokeOpacity="0.45"
                strokeWidth={1.75}
                markerEnd="url(#trace-arrow)"
              />
              {edge.label && (
                <text
                  x={edge.labelX}
                  y={edge.labelY}
                  textAnchor="middle"
                  className="fill-ink-primary text-[10px] font-mono font-semibold"
                >
                  {edge.label}
                </text>
              )}
            </g>
          ))}

          {layout.nodes.map((node) => {
            const isSelected =
              node.id === selectedNodeId ||
              (Boolean(selectedLotId) && node.lotId === selectedLotId);
            const colors = nodeColors(node, isSelected);
            return (
              <g
                key={node.id}
                role="button"
                tabIndex={0}
                aria-label={`${node.label} · ${node.sublabel}`}
                aria-pressed={isSelected}
                transform={`translate(${node.x}, ${node.y})`}
                onClick={() => {
                  setManualNodeId(node.id);
                  if (node.lotId && onSelectLot) onSelectLot(node.lotId);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    setManualNodeId(node.id);
                    if (node.lotId && onSelectLot) onSelectLot(node.lotId);
                  }
                }}
                className="cursor-pointer focus:outline-none"
              >
                <rect
                  width={node.width}
                  height={node.height}
                  rx={12}
                  ry={12}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={isSelected ? 2.5 : 1.25}
                />
                <text
                  x={12}
                  y={23}
                  className="fill-ink-primary text-[11.5px] font-mono font-bold"
                >
                  {node.label.length > 22
                    ? `${node.label.slice(0, 20)}…`
                    : node.label}
                </text>
                <text
                  x={12}
                  y={40}
                  className="fill-ink-secondary text-[10px]"
                >
                  {node.sublabel.length > 26
                    ? `${node.sublabel.slice(0, 24)}…`
                    : node.sublabel}
                </text>
                {node.badge && (
                  <text
                    x={node.width - 12}
                    y={56}
                    textAnchor="end"
                    className="fill-accent-danger text-[9.5px] font-bold"
                  >
                    {node.badge}
                  </text>
                )}
                {node.isFocus && (
                  <text
                    x={12}
                    y={56}
                    className="fill-accent-primary text-[9.5px] font-bold"
                  >
                    {text("Điểm gốc", "Focus")}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {selectedNode && (
        <div className="rounded-xl border border-ink-tertiary/20 bg-surface-raised/50 p-3.5 text-xs space-y-1.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <span className="font-mono font-bold text-ink-primary">
                {selectedNode.label}
              </span>
              <span className="ml-2 text-ink-secondary">
                ({selectedNode.sublabel})
              </span>
            </div>
            {selectedNode.lotId && onSelectLot && (
              <button
                type="button"
                onClick={() => onSelectLot(selectedNode.lotId!)}
                className="rounded-lg bg-accent-primary px-3 py-1 text-[11px] font-semibold text-white hover:bg-accent-primary/90"
              >
                {text("Chọn lô kiểm tra", "Inspect this lot")}
              </button>
            )}
          </div>
          {selectedNode.meta.length > 0 && (
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-ink-secondary">
              {selectedNode.meta.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
