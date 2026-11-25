import { useId, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Drop,
  Eye,
  Flask,
  GitBranch,
  HandCoins,
  MapPin,
  Package,
  Scales,
  SprayBottle,
  TestTube,
} from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useParams } from "react-router-dom";
import {
  procurementEndpoints,
  type ProcurementLineResponse,
  type SourceLotDetail,
} from "@/api/procurement";
import { useAuthStore } from "@/app/store/authStore";
import { labResultPath } from "@/features/compliance/paths";
import { StockLotDetailModal } from "@/features/mill/components/StockLotDetailModal";
import { MassValue } from "@/shared/ui/MassValue";
import {
  RecordDialog,
  RecordEmpty,
  RecordFeedback,
  RecordRefresh,
  RecordTable,
  RecordWorkspace,
} from "@/shared/ui/RecordWorkspace";
import { StatusBadge, type StatusType } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { fieldPaths, receiptPath, sourceLotPath } from "../paths";

const STAGE_LABELS: Record<string, [string, string]> = {
  RAW_PADDY: ["Lúa tươi", "Raw paddy"],
  DRIED_PADDY: ["Lúa khô", "Dried paddy"],
  HEAD_RICE: ["Gạo nguyên", "Head rice"],
  BROKEN_RICE: ["Gạo tấm", "Broken rice"],
  BRAN: ["Cám", "Bran"],
  HUSK: ["Trấu", "Husk"],
  BLENDED_RICE: ["Gạo phối trộn", "Blended rice"],
  BAGGED_RICE: ["Gạo đóng bao", "Bagged rice"],
};

const STATUS_META: Record<string, { badge: StatusType; label: [string, string] }> = {
  PENDING_ARRIVAL: {
    badge: "IN_PROGRESS",
    label: ["Chờ về nhà máy", "Pending arrival"],
  },
  AWAITING_MANAGER_REVIEW: {
    badge: "PENDING",
    label: ["Chờ quản lý đối soát", "Awaiting manager review"],
  },
  REMEASUREMENT_REQUESTED: {
    badge: "STALE",
    label: ["Yêu cầu cân lại", "Remeasurement requested"],
  },
  BLOCKED_UNRESOLVED: {
    badge: "HOLD",
    label: ["Đang chặn nhập kho", "Blocked — unresolved"],
  },
  RECEIVED_MATCHED: {
    badge: "BALANCED",
    label: ["Đã khớp kho", "Received — matched"],
  },
  RECEIVED_WITHIN_TOLERANCE: {
    badge: "BALANCED",
    label: ["Trong ngưỡng dung sai", "Received — within tolerance"],
  },
  RECEIVED_SHORTAGE_APPROVED: {
    badge: "BALANCED",
    label: ["Đã duyệt nhập thiếu", "Shortage approved"],
  },
  CONFIRMED: {
    badge: "BALANCED",
    label: ["Đã ghi sổ", "Confirmed"],
  },
  DRAFT: {
    badge: "PENDING",
    label: ["Bản nháp", "Draft"],
  },
};

function resolveStageLabel(
  stage: string,
  text: (vi: string, en: string) => string,
): string {
  const pair = STAGE_LABELS[stage];
  return pair ? text(pair[0], pair[1]) : stage;
}

function resolveStatusMeta(
  status: string,
  text: (vi: string, en: string) => string,
): { badge: StatusType; label: string } {
  const known = STATUS_META[status];
  if (known) {
    return { badge: known.badge, label: text(known.label[0], known.label[1]) };
  }
  const badge: StatusType = status.startsWith("RECEIVED_")
    ? "BALANCED"
    : status.startsWith("BLOCKED")
      ? "HOLD"
      : "PENDING";
  return { badge, label: status || "—" };
}

function DetailKpiCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  icon: ReactNode;
}) {
  return (
    <div className="space-y-1 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xs dark:bg-surface-raised">
      <div className="flex items-center justify-between gap-2 text-ink-secondary">
        <span className="text-xs font-medium">{label}</span>
        <span aria-hidden="true" className="shrink-0">
          {icon}
        </span>
      </div>
      <div className="font-display text-2xl font-bold text-ink-primary">{value}</div>
      {hint && <p className="text-[11px] text-ink-tertiary [overflow-wrap:anywhere]">{hint}</p>}
    </div>
  );
}

function useSourceLotPermissions() {
  const canCapture = useAuthStore((s) =>
    Boolean(s.user?.permissions.includes("purchases.write")),
  );
  const canReadLab = useAuthStore((s) =>
    Boolean(s.user?.permissions.some((p) => p === "lab.read" || p === "lab.write")),
  );
  return { canCapture, canReadLab };
}

function SourceLotDetailBody({
  record,
  samplePage,
  canReadLab,
  compact = false,
}: {
  record: SourceLotDetail;
  samplePage: string;
  canReadLab: boolean;
  compact?: boolean;
}) {
  const text = useWorkflowText();
  const provenanceHeadingId = useId();
  const stockHeadingId = useId();
  const lineageHeadingId = useId();
  const samplesHeadingId = useId();
  const [selectedStockLot, setSelectedStockLot] = useState<{
    id: string;
    code: string;
  } | null>(null);
  const receivingMeta = resolveStatusMeta(record.receivingStatus, text);
  const stageText = resolveStageLabel(record.stage, text);

  return (
    <div className="space-y-5">
      {/* KPI Summary Strip */}
      <div
        className={`grid grid-cols-1 gap-4 ${compact ? "sm:grid-cols-2" : "sm:grid-cols-2 lg:grid-cols-4"}`}
      >
        <DetailKpiCard
          label={text("Khối lượng lúc thu mua", "Procurement net mass")}
          value={<MassValue value={record.initialNetMassKg} />}
          hint={`${stageText} · ${record.riceVariety}`}
          icon={<Scales size={18} className="text-accent-primary" />}
        />
        <DetailKpiCard
          label={text("Tồn khả dụng", "Usable stock")}
          value={<MassValue value={record.usableStockKg} />}
          hint={receivingMeta.label}
          icon={<Package size={18} className="text-accent-primary" />}
        />
        <DetailKpiCard
          label={text("Độ ẩm", "Moisture")}
          value={
            <span className="font-mono text-accent-info">
              {record.moisturePercent}%
            </span>
          }
          hint={record.plotCode ?? record.seasonName ?? "—"}
          icon={<Drop size={18} className="text-accent-info" />}
        />
        <DetailKpiCard
          label={text("Mẫu & Kiểm nghiệm", "Samples & Lab")}
          value={record.sampleIds.length}
          hint={
            canReadLab
              ? text(
                  `${record.sampleIds.length} mẫu · ${record.confirmedLabReportIds.length} báo cáo đã duyệt`,
                  `${record.sampleIds.length} samples · ${record.confirmedLabReportIds.length} confirmed reports`,
                )
              : text(
                  `${record.sampleIds.length} mẫu niêm phong`,
                  `${record.sampleIds.length} sealed samples`,
                )
          }
          icon={<TestTube size={18} className="text-accent-primary" />}
        />
      </div>

      {/* Provenance & Receiving Card */}
      <section className="record-card rounded-2xl" aria-labelledby={provenanceHeadingId}>
        <header className="record-card-header">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 id={provenanceHeadingId} className="record-card-title">
              <MapPin size={20} className="shrink-0 text-accent-primary" aria-hidden="true" />
              <span>{text("Nguồn gốc", "Provenance")}</span>
            </h2>
            <StatusBadge
              status={receivingMeta.badge}
              label={receivingMeta.label}
              size="sm"
            />
          </div>
          <Link
            className="record-link inline-flex items-center gap-1.5"
            to={`${fieldPaths.declarations}?plotSeasonId=${encodeURIComponent(record.plotSeasonId)}`}
          >
            <SprayBottle size={15} aria-hidden="true" />
            <span>{text("Lịch sử phun thuốc", "Pesticide history")}</span>
          </Link>
        </header>
        <div className="p-4 sm:p-5">
          <dl
            className={`record-details [overflow-wrap:anywhere] sm:grid-cols-2 ${compact ? "" : "lg:grid-cols-3"}`}
          >
            <div>
              <dt>{text("Nông hộ", "Farmer")}</dt>
              <dd className="text-ink-primary">{record.farmerName || "—"}</dd>
            </div>
            <div>
              <dt>{text("Thửa ruộng", "Plot")}</dt>
              <dd className="font-mono text-ink-primary">
                {record.plotCode || "—"}
              </dd>
            </div>
            <div>
              <dt>{text("Vụ mùa", "Crop season")}</dt>
              <dd className="text-ink-primary">{record.seasonName || "—"}</dd>
            </div>
            <div>
              <dt>{text("Giống lúa", "Rice variety")}</dt>
              <dd className="text-ink-primary">{record.riceVariety}</dd>
            </div>
            <div>
              <dt>{text("Giai đoạn sản phẩm", "Stage")}</dt>
              <dd className="text-ink-primary">{stageText}</dd>
            </div>
            <div>
              <dt>{text("Phiếu thu mua", "Procurement receipt")}</dt>
              <dd>
                <Link
                  className="record-link font-mono"
                  to={receiptPath(record.procurementId)}
                >
                  {record.procurementCode}
                </Link>
              </dd>
            </div>
            <div>
              <dt>{text("Khối lượng lúc thu mua", "Procurement net mass")}</dt>
              <dd>
                <MassValue value={record.initialNetMassKg} />
              </dd>
            </div>
            <div>
              <dt>{text("Độ ẩm", "Moisture")}</dt>
              <dd className="font-mono text-accent-info">
                {record.moisturePercent}%
              </dd>
            </div>
            <div>
              <dt>{text("Khả dụng", "Usable stock")}</dt>
              <dd>
                <MassValue value={record.usableStockKg} />
              </dd>
            </div>
          </dl>
        </div>
      </section>

      {/* Stock Positions & Lineage Card */}
      <section className="record-card rounded-2xl" aria-labelledby={stockHeadingId}>
        <header className="record-card-header">
          <h2 id={stockHeadingId} className="record-card-title">
            <Package size={20} className="shrink-0 text-accent-primary" aria-hidden="true" />
            <span>{text("Vị trí tồn kho và dòng dõi", "Stock positions and lineage")}</span>
          </h2>
          <span className="text-xs font-medium text-ink-secondary">
            {record.currentStock.length} {text("vị trí tồn kho", "stock positions")}
          </span>
        </header>

        {!record.currentStock.length ? (
          <RecordEmpty icon={<Package size={36} />}>
            {text("Chưa có vị trí tồn kho.", "No stock positions.")}
          </RecordEmpty>
        ) : (
          <RecordTable labelledBy={stockHeadingId}>
            <thead>
              <tr>
                <th scope="col">{text("Mã lô tồn kho", "Stock lot")}</th>
                <th scope="col">{text("Vị trí lưu kho", "Location ID")}</th>
                <th scope="col" className="text-end">
                  {text("Tồn thực tế", "On hand")}
                </th>
                <th scope="col" className="text-end">
                  {text("Khả dụng", "Available")}
                </th>
              </tr>
            </thead>
            <tbody>
              {record.currentStock.map((row) => (
                <tr key={`${row.currentStockLotId}:${row.locationId}`}>
                  <th scope="row" className="whitespace-nowrap">
                    <button
                      type="button"
                      className="record-link font-mono"
                      onClick={() =>
                        setSelectedStockLot({
                          id: row.currentStockLotId,
                          code: row.currentStockLotCode,
                        })
                      }
                    >
                      {row.currentStockLotCode}
                    </button>
                  </th>
                  <td className="font-mono text-ink-secondary [overflow-wrap:anywhere]">
                    {row.locationId}
                  </td>
                  <td className="text-end whitespace-nowrap">
                    <MassValue value={row.onHandKg} />
                  </td>
                  <td className="text-end whitespace-nowrap">
                    <MassValue value={row.availableKg} />
                  </td>
                </tr>
              ))}
            </tbody>
          </RecordTable>
        )}

        {record.lineage.length > 0 && (
          <div className="border-t border-ink-tertiary/15">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-surface-raised/50 px-4 py-3 dark:bg-surface-overlay/25 sm:px-5">
              <h3
                id={lineageHeadingId}
                className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-secondary"
              >
                <GitBranch size={15} className="text-accent-primary" aria-hidden="true" />
                <span>{text("Dòng dõi chế biến & phân bổ", "Downstream lineage")}</span>
              </h3>
              <span className="text-xs font-medium text-ink-secondary">
                {record.lineage.length} {text("lô liên kết", "linked lots")}
              </span>
            </div>
            <RecordTable labelledBy={lineageHeadingId}>
              <thead>
                <tr>
                  <th scope="col">{text("Lô kế tiếp", "Linked lot")}</th>
                  <th scope="col" className="text-end">
                    {text("Khối lượng phân bổ", "Quantity")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {record.lineage.map((row, index) => (
                  <tr key={`${row.lotId}:${index}`}>
                    <th scope="row" className="whitespace-nowrap">
                      <button
                        type="button"
                        className="record-link font-mono"
                        onClick={() =>
                          setSelectedStockLot({
                            id: row.lotId,
                            code: row.lotCode,
                          })
                        }
                      >
                        {row.lotCode}
                      </button>
                    </th>
                    <td className="text-end whitespace-nowrap">
                      <MassValue value={row.quantityKg} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </RecordTable>
          </div>
        )}
      </section>

      {/* Samples & Lab Results Card */}
      <section className="record-card rounded-2xl" aria-labelledby={samplesHeadingId}>
        <header className="record-card-header">
          <h2 id={samplesHeadingId} className="record-card-title">
            <TestTube size={20} className="shrink-0 text-accent-primary" aria-hidden="true" />
            <span>{text("Mẫu và kết quả xét nghiệm", "Samples and laboratory results")}</span>
          </h2>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="record-button rounded-full" to={samplePage}>
              <TestTube size={15} aria-hidden="true" />
              <span>
                {text("Mở danh sách mẫu", "Open samples")} ({record.sampleIds.length})
              </span>
            </Link>
          </div>
        </header>

        <div className="space-y-4 p-4 sm:p-5">
          <div className="rounded-xl border border-ink-tertiary/15 bg-surface-raised/60 p-4 dark:bg-surface-overlay/30">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-semibold text-ink-primary">
                  {text("Mẫu niêm phong gắn với lô nguồn", "Sealed samples linked to this source lot")}
                </p>
                <p className="text-xs text-ink-secondary">
                  {record.sampleIds.length > 0
                    ? text(
                        `Đã ghi nhận ${record.sampleIds.length} mẫu niêm phong từ lô nguồn này.`,
                        `${record.sampleIds.length} sealed samples recorded for this source lot.`,
                      )
                    : text(
                        "Chưa có mẫu niêm phong nào được lấy từ lô nguồn này.",
                        "No sealed samples collected from this source lot yet.",
                      )}
                </p>
              </div>
              <Link
                to={samplePage}
                className="record-link inline-flex items-center gap-1"
              >
                <span>{text("Xem chi tiết mẫu", "View sample history")}</span>
                <ArrowRight size={14} aria-hidden="true" />
              </Link>
            </div>

            {record.sampleIds.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {record.sampleIds.map((sampleId) => (
                  <Link
                    key={sampleId}
                    to={`${fieldPaths.samples}?sourceLotId=${encodeURIComponent(record.id)}&sampleId=${encodeURIComponent(sampleId)}`}
                    className="inline-flex items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3 py-1 font-mono text-xs font-medium text-ink-primary transition-colors hover:border-accent-primary/40 hover:text-accent-primary dark:bg-surface-raised"
                  >
                    <TestTube size={13} className="text-accent-primary" aria-hidden="true" />
                    <span className="[overflow-wrap:anywhere]">{sampleId}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {canReadLab && (
            <div className="space-y-2.5 border-t border-ink-tertiary/15 pt-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-secondary">
                  <Flask size={15} className="text-accent-primary" aria-hidden="true" />
                  <span>
                    {text("Kết quả xét nghiệm đã xác nhận", "Confirmed lab results")}
                  </span>
                </h3>
                <span className="text-xs font-medium text-ink-secondary">
                  {record.confirmedLabReportIds.length} {text("báo cáo", "reports")}
                </span>
              </div>

              {record.confirmedLabReportIds.length === 0 ? (
                <p className="rounded-xl border border-dashed border-ink-tertiary/20 px-4 py-3 text-xs text-ink-secondary">
                  {text(
                    "Chưa có báo cáo kiểm nghiệm được xác nhận cho lô nguồn này.",
                    "No confirmed lab results for this source lot yet.",
                  )}
                </p>
              ) : (
                <ul className="grid gap-2.5 sm:grid-cols-2">
                  {record.confirmedLabReportIds.map((id) => (
                    <li key={id}>
                      <Link
                        to={labResultPath(id)}
                        className="flex items-center justify-between gap-3 rounded-xl border border-ink-tertiary/20 bg-surface-base px-3.5 py-2.5 font-mono text-xs font-semibold text-accent-primary transition-colors hover:border-accent-primary/40 hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
                      >
                        <span className="inline-flex min-w-0 items-center gap-2">
                          <Flask size={15} className="shrink-0" aria-hidden="true" />
                          <span className="truncate">{id}</span>
                        </span>
                        <ArrowRight size={14} className="shrink-0" aria-hidden="true" />
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      </section>

      {selectedStockLot && (
        <StockLotDetailModal
          key={selectedStockLot.id}
          lotId={selectedStockLot.id}
          initialCode={selectedStockLot.code}
          showStockPageLink
          onClose={() => setSelectedStockLot(null)}
        />
      )}
    </div>
  );
}

function SourceLotDetailModal({
  line,
  onClose,
}: {
  line: ProcurementLineResponse;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const titleId = useId();
  const { canCapture, canReadLab } = useSourceLotPermissions();
  const query = useQuery({
    queryKey: ["procurement-source-lot", line.sourceLotId],
    queryFn: () => procurementEndpoints.getSourceLot(line.sourceLotId),
  });
  const samplePage = `${fieldPaths.samples}?sourceLotId=${encodeURIComponent(line.sourceLotId)}`;

  return (
    <RecordDialog
      title={query.data?.lotCode ?? line.lotCode}
      titleId={titleId}
      subtitle={[
        text(`Dòng #${line.lineNo}`, `Line #${line.lineNo}`),
        line.plotCode ?? line.plotId,
        line.seasonName ?? line.seasonId,
        line.riceVariety,
      ]
        .filter(Boolean)
        .join(" · ")}
      icon={<Package size={22} />}
      onClose={onClose}
      wide
      dismissOnBackdrop
    >
      <RecordFeedback
        error={query.error}
        pending={query.isPending}
        label={text("Đang tải chi tiết lô nguồn…", "Loading source lot details…")}
      />

      {query.data && (
        <SourceLotDetailBody
          record={query.data}
          samplePage={samplePage}
          canReadLab={canReadLab}
          compact
        />
      )}

      <footer className="record-form-footer justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            className="record-button rounded-full"
            to={sourceLotPath(line.sourceLotId)}
          >
            <span>{text("Mở trang chi tiết", "Open full page")}</span>
            <ArrowRight size={15} aria-hidden="true" />
          </Link>
          {query.data && canCapture && (
            <Link
              to={`${samplePage}&create=1`}
              className="record-button record-primary rounded-full"
            >
              <TestTube size={15} weight="bold" aria-hidden="true" />
              <span>{text("Lấy mẫu từ lô này", "Collect sample from this lot")}</span>
            </Link>
          )}
        </div>
        <button type="button" className="record-button" onClick={onClose}>
          {t("field.seasons.close")}
        </button>
      </footer>
    </RecordDialog>
  );
}

export function ProcurementDetailPage() {
  const { i18n } = useTranslation();
  const text = useWorkflowText();
  const { receiptId } = useParams();
  const infoHeadingId = useId();
  const itemsHeadingId = useId();
  const [selectedLine, setSelectedLine] =
    useState<ProcurementLineResponse | null>(null);
  const query = useQuery({
    queryKey: ["procurement-detail", receiptId],
    queryFn: () => procurementEndpoints.getProcurement(receiptId!),
    enabled: Boolean(receiptId),
  });
  const record = query.data;
  const statusMeta = record ? resolveStatusMeta(record.status, text) : null;
  const dateTime = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <RecordWorkspace
      section={text("THU MUA NÔNG SẢN & TIẾP NHẬN", "FIELD PROCUREMENT & RECEIVING")}
      title={record?.code ?? text("Chi tiết phiếu thu mua", "Procurement receipt")}
      description={text(
        "Xem thông tin nông hộ, khối lượng cân tại điểm thu mua và danh sách các lô nguồn phát sinh.",
        "Inspect farmer metadata, weigh-in totals, and individual source lots created by this receipt.",
      )}
      actions={
        <>
          <Link to={fieldPaths.receipts} className="record-button rounded-full">
            <ArrowLeft size={16} aria-hidden="true" />
            <span>{text("Danh sách phiếu", "Receipts")}</span>
          </Link>
          <RecordRefresh
            pending={query.isFetching}
            onRefresh={() => {
              void query.refetch();
            }}
          />
        </>
      }
    >
      <RecordFeedback
        error={query.error}
        pending={query.isPending}
        label={text("Đang tải chi tiết phiếu thu mua…", "Loading procurement receipt…")}
      />

      {record && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <DetailKpiCard
              label={text("Tổng khối lượng tịnh", "Total net mass")}
              value={<MassValue value={record.totalNetMassKg} />}
              hint={
                record.farmerName ||
                record.farmerCode ||
                record.farmerId
              }
              icon={<Scales size={18} className="text-accent-primary" />}
            />
            <DetailKpiCard
              label={text("Số dòng lô nguồn", "Source lot lines")}
              value={record.items.length}
              hint={text(
                `${record.items.length} lô nguồn được tạo từ phiếu`,
                `${record.items.length} source lots captured on receipt`,
              )}
              icon={<HandCoins size={18} className="text-accent-primary" />}
            />
            <DetailKpiCard
              label={text("Trạng thái tiếp nhận", "Receiving status")}
              value={
                <span className="inline-flex pt-1 font-sans font-normal">
                  <StatusBadge
                    status={statusMeta!.badge}
                    label={statusMeta!.label}
                  />
                </span>
              }
              hint={
                <time dateTime={record.receivedAt}>
                  {dateTime.format(new Date(record.receivedAt))}
                </time>
              }
              icon={<CheckCircle size={18} className="text-accent-primary" />}
            />
          </div>

          <section className="record-card rounded-2xl" aria-labelledby={infoHeadingId}>
            <header className="record-card-header">
              <h2 id={infoHeadingId} className="record-card-title">
                <HandCoins size={20} className="shrink-0 text-accent-primary" aria-hidden="true" />
                <span>{text("Thông tin thu mua", "Procurement details")}</span>
              </h2>
              {statusMeta && (
                <StatusBadge status={statusMeta.badge} label={statusMeta.label} size="sm" />
              )}
            </header>
            <div className="p-4 sm:p-5">
              <dl className="record-details [overflow-wrap:anywhere] sm:grid-cols-2 lg:grid-cols-4">
                <div>
                  <dt>{text("Mã phiếu", "Receipt code")}</dt>
                  <dd className="font-mono text-ink-primary">{record.code}</dd>
                </div>
                <div>
                  <dt>{text("Nông hộ", "Farmer")}</dt>
                  <dd className="text-ink-primary">
                    {record.farmerName ?? record.farmerCode ?? record.farmerId}
                  </dd>
                </div>
                <div>
                  <dt>{text("Thời điểm thu mua", "Received at")}</dt>
                  <dd className="inline-flex items-center gap-1.5 text-ink-primary">
                    <Calendar size={14} className="text-ink-tertiary" aria-hidden="true" />
                    <time dateTime={record.receivedAt}>
                      {dateTime.format(new Date(record.receivedAt))}
                    </time>
                  </dd>
                </div>
                <div>
                  <dt>{text("Tổng khối lượng thu mua", "Total net mass")}</dt>
                  <dd>
                    <MassValue value={record.totalNetMassKg} />
                  </dd>
                </div>
              </dl>
            </div>
          </section>

          <section className="record-card rounded-2xl" aria-labelledby={itemsHeadingId}>
            <header className="record-card-header">
              <h2 id={itemsHeadingId} className="record-card-title">
                <Package size={20} className="shrink-0 text-accent-primary" aria-hidden="true" />
                <span>{text("Chi tiết lô nguồn theo dòng", "Receipt source lot lines")}</span>
              </h2>
              <span className="text-xs font-medium text-ink-secondary">
                {record.items.length} {text("dòng", "lines")}
              </span>
            </header>
            {record.items.length === 0 ? (
              <RecordEmpty icon={<Package size={36} />}>
                {text("Phiếu chưa có dòng lô nguồn nào.", "No source lot lines recorded.")}
              </RecordEmpty>
            ) : (
              <RecordTable labelledBy={itemsHeadingId}>
                <thead>
                  <tr>
                    <th scope="col">{text("Dòng và lô nguồn", "Line and source lot")}</th>
                    <th scope="col">{text("Thửa và mùa vụ", "Plot and season")}</th>
                    <th scope="col" className="text-end">
                      {text("Khối lượng tịnh (kg)", "Net mass (kg)")}
                    </th>
                    <th scope="col" className="text-end">
                      {text("Độ ẩm (%)", "Moisture (%)")}
                    </th>
                    <th scope="col" className="text-end">
                      <span className="sr-only sm:not-sr-only">
                        {text("Thao tác", "Action")}
                      </span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {record.items.map((line) => (
                    <tr key={line.id}>
                      <th scope="row" className="whitespace-nowrap">
                        <span className="mr-1.5 font-mono text-ink-tertiary">
                          #{line.lineNo}
                        </span>
                        <button
                          type="button"
                          className="record-row-action font-mono text-accent-primary"
                          onClick={() => setSelectedLine(line)}
                        >
                          {line.lotCode}
                        </button>
                      </th>
                      <td className="[overflow-wrap:anywhere]">
                        <span className="font-semibold text-ink-primary">
                          {line.plotCode ?? line.plotId}
                        </span>
                        <span className="mt-0.5 block text-xs text-ink-secondary">
                          {line.seasonName ?? line.seasonId} · {line.riceVariety}
                        </span>
                      </td>
                      <td className="text-end whitespace-nowrap">
                        <MassValue value={line.netMassKg} />
                      </td>
                      <td className="text-end whitespace-nowrap font-mono font-semibold text-accent-info">
                        {line.moisturePercent}%
                      </td>
                      <td className="text-end">
                        <button
                          type="button"
                          className="record-row-action whitespace-nowrap"
                          onClick={() => setSelectedLine(line)}
                        >
                          <Eye size={16} aria-hidden="true" />
                          <span>{text("Xem chi tiết", "View details")}</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </RecordTable>
            )}
          </section>
        </>
      )}

      {selectedLine && (
        <SourceLotDetailModal
          line={selectedLine}
          onClose={() => setSelectedLine(null)}
        />
      )}
    </RecordWorkspace>
  );
}

export function SourceLotDetailPage() {
  const text = useWorkflowText();
  const { sourceLotId } = useParams();
  const { canCapture, canReadLab } = useSourceLotPermissions();
  const query = useQuery({
    queryKey: ["procurement-source-lot", sourceLotId],
    queryFn: () => procurementEndpoints.getSourceLot(sourceLotId!),
    enabled: Boolean(sourceLotId),
  });
  const record = query.data;
  const samplePage = `${fieldPaths.samples}?sourceLotId=${encodeURIComponent(sourceLotId ?? "")}`;

  return (
    <RecordWorkspace
      section={text("NGUỒN GỐC & THEO DÕI LÔ THU MUA", "SOURCE LOT PROVENANCE & TRACKING")}
      title={record?.lotCode ?? text("Chi tiết lô nguồn", "Source lot details")}
      description={text(
        "Theo dõi nguồn gốc canh tác, trạng thái tiếp nhận kho, tồn kho định danh và hồ sơ lấy mẫu kiểm nghiệm.",
        "Review field provenance, receiving status, stock positions, downstream lineage, sealed samples, and lab reports.",
      )}
      actions={
        <>
          <Link
            to={record ? receiptPath(record.procurementId) : fieldPaths.receipts}
            className="record-button rounded-full"
          >
            <ArrowLeft size={16} aria-hidden="true" />
            <span>
              {record?.procurementCode ??
                text("Phiếu thu mua", "Procurement receipts")}
            </span>
          </Link>
          {record && canCapture && (
            <Link
              to={`${samplePage}&create=1`}
              className="record-button record-primary rounded-full"
            >
              <TestTube size={16} weight="bold" aria-hidden="true" />
              <span>{text("Lấy mẫu từ lô này", "Collect sample from this lot")}</span>
            </Link>
          )}
          <RecordRefresh
            pending={query.isFetching}
            onRefresh={() => {
              void query.refetch();
            }}
          />
        </>
      }
    >
      <RecordFeedback
        error={query.error}
        pending={query.isPending}
        label={text("Đang tải chi tiết lô nguồn…", "Loading source lot details…")}
      />

      {record && (
        <SourceLotDetailBody
          record={record}
          samplePage={samplePage}
          canReadLab={canReadLab}
        />
      )}
    </RecordWorkspace>
  );
}
