import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuthStore } from "@/app/store/authStore";
import { LabReportEditor } from "../components/LabReportEditor";
import { DeleteLabReportDialog, LabReportConfirmation } from "../components/LabReportDraftActions";
import { compliancePaths, labResultPath } from "../paths";
import {
  labReportEndpoints,
  type LabReportResponse,
} from "@/api/compliance";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  TestTube,
  ShieldCheck,
  WarningCircle,
  Clock,
  Plus,
  ArrowsClockwise,
  CheckCircle,
  X,
  MagnifyingGlass,
  Calendar,
  Eye,
  Buildings,
  Tag,
  DownloadSimple,
  SquaresFour,
  Table as TableIcon,
  Check,
  FileText,
} from "@phosphor-icons/react";

export type LabReportItem = LabReportResponse;

function isConfirmed(report: LabReportItem): boolean {
  return report.confirmedAt != null || report.status === "CONFIRMED";
}

function parseReports(value: unknown): {
  items: LabReportItem[];
  hasMore: boolean;
} {
  if (Array.isArray(value)) {
    return { items: value as LabReportItem[], hasMore: false };
  }
  if (
    value &&
    typeof value === "object" &&
    "items" in value &&
    Array.isArray((value as { items: unknown }).items)
  ) {
    const response = value as { items: LabReportItem[]; hasMore?: boolean };
    return { items: response.items, hasMore: Boolean(response.hasMore) };
  }
  return { items: [], hasMore: false };
}

export const MrlComplianceCheckPage: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const canWrite = useAuthStore(state => state.user?.permissions.includes("lab.write") ?? false);
  const canSelectEvidence = useAuthStore(state => state.user?.permissions.includes("residue.evidence.manage") ?? false);

  const [reports, setReports] = useState<LabReportItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<LabReportItem | null>(
    null,
  );
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);

  // View mode: Cards vs Table
  const [viewMode, setViewMode] = useState<"CARDS" | "TABLE">("CARDS");

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [assessmentFilter, setAssessmentFilter] = useState<string>("ALL");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const [editor, setEditor] = useState<{ report: LabReportItem | null } | null>(null);
  const [deleting, setDeleting] = useState<LabReportItem | null>(null);

  // Fetch reports
  useEffect(() => {
    let active = true;
    const request = id
      ? labReportEndpoints.getLabReport(id)
      : labReportEndpoints.getLabReports({ page, pageSize: 20 });

    request
      .then((response) => {
        if (!active) return;
        if (id) {
          const report = response as LabReportItem;
          setReports(report ? [report] : []);
          setSelectedReport(report || null);
          setHasMore(false);
        } else {
          const parsed = parseReports(response);
          setReports(parsed.items);
          setHasMore(parsed.hasMore);
        }
        setError(null);
      })
      .catch((cause: unknown) => {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : t(
                "compliance.mrl.errorLoad",
                "Không thể tải báo cáo kiểm nghiệm.",
              ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [id, page, reloadCount, t]);

  const handleRefresh = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadCount((c) => c + 1);
  }, []);

  // KPI counts
  const kpiTotal = reports.length;
  const kpiCompliant = reports.filter((r) =>
    ["COMPLIANT", "PASS", "CONFORMING"].includes(
      r.assessmentStatus?.toUpperCase(),
    ),
  ).length;
  const kpiNonCompliant = reports.filter((r) =>
    ["NON_COMPLIANT", "FAIL", "REJECTED"].includes(
      r.assessmentStatus?.toUpperCase(),
    ),
  ).length;
  const kpiPending = reports.filter(
    (r) =>
      !isConfirmed(r) &&
      !["COMPLIANT", "PASS"].includes(r.assessmentStatus?.toUpperCase()),
  ).length;

  // Filtered reports
  const filteredReports = useMemo(() => {
    return reports.filter((report) => {
      const matchSearch =
        !debouncedSearch ||
        report.reportNumber.toLowerCase().includes(debouncedSearch) ||
        report.laboratoryName.toLowerCase().includes(debouncedSearch) ||
        (report.statedStandard &&
          report.statedStandard.toLowerCase().includes(debouncedSearch)) ||
        (report.laboratoryConclusion &&
          report.laboratoryConclusion.toLowerCase().includes(debouncedSearch));

      const statusUpper = report.assessmentStatus?.toUpperCase() || "";
      const matchAssessment =
        assessmentFilter === "ALL" ||
        (assessmentFilter === "COMPLIANT" &&
          ["COMPLIANT", "PASS"].includes(statusUpper)) ||
        (assessmentFilter === "NON_COMPLIANT" &&
          ["NON_COMPLIANT", "FAIL", "REJECTED"].includes(statusUpper)) ||
        (assessmentFilter === "PENDING" &&
          !["COMPLIANT", "PASS", "NON_COMPLIANT", "FAIL"].includes(
            statusUpper,
          ));

      return matchSearch && matchAssessment;
    });
  }, [reports, debouncedSearch, assessmentFilter]);

  // Download Report Attachment File
  const handleDownloadFile = async (
    reportId: string,
    fileName?: string | null,
  ) => {
    try {
      const blob = await labReportEndpoints.getLabReportFile(reportId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        fileName || `Chung-thu-kiem-nghiem-${reportId.slice(0, 8)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể tải tệp đính kèm chứng thư kiểm nghiệm.",
      );
    }
  };

  const getStatusBadge = (statusStr: string) => {
    const upper = statusStr?.toUpperCase() || "";
    if (["COMPLIANT", "PASS", "CONFORMING"].includes(upper)) {
      return (
        <StatusBadge
          status="COMPLIANT"
          label={t("compliance.mrl.compliant", "ĐẠT CHUẨN XUẤT KHẨU")}
        />
      );
    }
    if (["NON_COMPLIANT", "FAIL", "REJECTED"].includes(upper)) {
      return (
        <StatusBadge
          status="NON_COMPLIANT"
          label={t("compliance.mrl.nonCompliant", "VƯỢT NGƯỠNG MRL")}
        />
      );
    }
    return (
      <StatusBadge
        status="PENDING"
        label={t("compliance.mrl.warningMargin", "CHỜ ĐỐI SOÁT")}
      />
    );
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t(
              "compliance.mrl.badge",
              "KẾT QUẢ PHÂN TÍCH & ĐỐI SOÁT DƯ LƯỢNG MRL",
            )}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("compliance.mrl.title", "Báo Cáo Kiểm Nghiệm (Lab Reports)")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {t(
              "compliance.mrl.subtitle",
              "Quản lý phiếu kết quả thử nghiệm từ SGS, Eurofins, Quatest; đối soát tự động dư lượng thuốc BVTV và kim loại nặng theo tiêu chuẩn xuất khẩu.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleRefresh}
            disabled={loading}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={t("common.reload", "Làm mới danh sách")}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "motion-safe:animate-spin" : undefined}
            />
          </button>
          {canWrite && <button
            type="button"
            onClick={() => setEditor({ report: null })}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs"
          >
            <Plus size={16} weight="bold" />
            <span>{t("compliance.mrl.newReport", "Nhập Báo Cáo Mới")}</span>
          </button>}
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2">
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3.5 rounded-lg bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2">
          <CheckCircle size={18} weight="fill" className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Tổng số báo cáo</span>
            <TestTube size={18} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiTotal}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Chứng thư từ các phòng kiểm nghiệm
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Đạt chuẩn MRL</span>
            <ShieldCheck size={18} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiCompliant}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Đủ điều kiện xuất khẩu sang EU / Mỹ
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Cảnh báo / Vượt ngưỡng</span>
            <WarningCircle size={18} className="text-accent-danger" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiNonCompliant}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Cần kích hoạt lệnh HOLD cách ly lô
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Chờ xác nhận</span>
            <Clock size={18} className="text-accent-warning" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiPending}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Cần cán bộ kiểm tra đối soát
          </span>
        </div>
      </div>

      {/* Filter and View Mode Bar */}
      <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-center">
          <div className="md:col-span-2 relative">
            <MagnifyingGlass
              className="absolute left-3 top-2.5 text-ink-tertiary"
              size={16}
            />
            <input
              type="text"
              placeholder={t(
                "compliance.mrl.searchPlaceholder",
                "Tìm kiếm theo số báo cáo, đơn vị kiểm nghiệm, quy chuẩn...",
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary placeholder:text-ink-tertiary focus:border-accent-primary focus:outline-none focus:rounded-lg transition-colors"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-2.5 p-0.5 text-ink-tertiary hover:text-ink-primary transition-colors"
                title="Xóa tìm kiếm"
              >
                <X size={14} />
              </button>
            )}
          </div>

          <div>
            <select
              value={assessmentFilter}
              onChange={(e) => setAssessmentFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none focus:rounded-lg transition-colors"
            >
              <option value="ALL">Tất cả kết quả đánh giá</option>
              <option value="COMPLIANT">Đạt chuẩn MRL ({kpiCompliant})</option>
              <option value="NON_COMPLIANT">
                Vượt ngưỡng MRL ({kpiNonCompliant})
              </option>
              <option value="PENDING">Chờ đối soát ({kpiPending})</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <span className="text-xs text-ink-tertiary mr-1">Hiển thị:</span>
            <button
              type="button"
              onClick={() => setViewMode("CARDS")}
              className={`p-2 rounded-lg border text-xs transition-colors ${
                viewMode === "CARDS"
                  ? "bg-accent-primary text-white border-accent-primary"
                  : "bg-surface-base dark:bg-surface-overlay border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary"
              }`}
              title="Xem dạng thẻ"
            >
              <SquaresFour size={16} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("TABLE")}
              className={`p-2 rounded-lg border text-xs transition-colors ${
                viewMode === "TABLE"
                  ? "bg-accent-primary text-white border-accent-primary"
                  : "bg-surface-base dark:bg-surface-overlay border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary"
              }`}
              title="Xem dạng bảng"
            >
              <TableIcon size={16} />
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-secondary pt-1 border-t border-ink-tertiary/10">
          <span>
            {t("compliance.mrl.showing", "Hiển thị")}{" "}
            <strong className="text-ink-primary">
              {filteredReports.length}
            </strong>{" "}
            {t("compliance.mrl.ofTotal", "trên tổng số")}{" "}
            <strong className="text-ink-primary">{reports.length}</strong>{" "}
            {t("compliance.mrl.reportsCount", "báo cáo kiểm nghiệm")}
          </span>
          <span className="font-mono text-xs text-accent-primary font-bold">
            {t("compliance.mrl.loqStandard", "Chuẩn định lượng LOQ / LOD")}
          </span>
        </div>
      </div>

      {/* Reports Display: Cards or Table */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <GrainLoader label="Đang tải chứng thư và dữ liệu kiểm nghiệm..." />
        </div>
      ) : filteredReports.length === 0 ? (
        <div className="py-16 text-center border-2 border-dashed border-ink-tertiary/15 rounded-2xl bg-surface-base dark:bg-surface-raised space-y-2">
          <TestTube
            size={40}
            className="mx-auto text-ink-tertiary opacity-60"
          />
          <p className="text-sm font-semibold text-ink-primary">
            Chưa có báo cáo kiểm nghiệm nào phù hợp
          </p>
          <p className="text-xs text-ink-secondary max-w-sm mx-auto">
            Bấm &ldquo;Nhập Báo Cáo Mới&rdquo; để ghi nhận chứng thư kiểm định
            từ các phòng thí nghiệm quốc tế.
          </p>
        </div>
      ) : viewMode === "CARDS" ? (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredReports.map((report) => (
            <article
              key={report.id}
              className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised p-5 hover:border-accent-primary/40 transition-all shadow-xs space-y-3.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-ink-primary text-base">
                      {report.reportNumber}
                    </span>
                    {isConfirmed(report) && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary bg-functional-balanced-bg px-2 py-0.5 rounded-full">
                        <Check size={12} weight="bold" />
                        <span>Đã xác nhận</span>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-ink-secondary mt-1">
                    <Buildings size={14} className="text-accent-primary" />
                    <span className="font-medium">{report.laboratoryName}</span>
                  </div>
                </div>
                <div>{getStatusBadge(report.assessmentStatus)}</div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-ink-tertiary/10">
                <div>
                  <span className="text-ink-tertiary block text-[11px]">
                    Ngày phát hành:
                  </span>
                  <div className="flex items-center gap-1 text-ink-primary font-medium mt-0.5">
                    <Calendar size={13} className="text-ink-tertiary" />
                    <span>{report.issuedOn}</span>
                  </div>
                </div>
                <div>
                  <span className="text-ink-tertiary block text-[11px]">
                    Tiêu chuẩn áp dụng:
                  </span>
                  <div className="flex items-center gap-1 text-ink-primary font-medium mt-0.5 truncate">
                    <Tag size={13} className="text-ink-tertiary shrink-0" />
                    <span className="truncate">
                      {report.statedStandard || "EC 396/2005"}
                    </span>
                  </div>
                </div>
              </div>

              {report.laboratoryConclusion && (
                <div className="p-2.5 rounded-xl bg-surface-raised dark:bg-surface-overlay text-xs text-ink-secondary flex items-start gap-2">
                  <FileText
                    size={15}
                    className="text-accent-primary shrink-0 mt-0.5"
                  />
                  <span className="line-clamp-2">
                    <strong>Kết luận phòng Lab:</strong>{" "}
                    {report.laboratoryConclusion}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-ink-tertiary">
                  Số bộ kết quả: <strong>{report.resultSets.length}</strong>
                </span>
                <div className="flex items-center gap-2">
                  {report.fileName && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadFile(report.id, report.fileName)
                      }
                      className="p-2 rounded-lg border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary hover:bg-surface-raised transition-colors"
                      title="Tải chứng thư gốc"
                    >
                      <DownloadSimple size={15} />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedReport(report)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary font-semibold text-xs transition-colors"
                  >
                    <Eye size={14} />
                    <span>Xem chi tiết & Đối soát</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/15 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                  <th className="py-3.5 px-4">Số báo cáo & Ngày cấp</th>
                  <th className="py-3.5 px-4">Phòng kiểm nghiệm</th>
                  <th className="py-3.5 px-4">Quy chuẩn đối chiếu</th>
                  <th className="py-3.5 px-4">Kết luận đánh giá</th>
                  <th className="py-3.5 px-4">Xác nhận doanh nghiệp</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10">
                {filteredReports.map((report) => (
                  <tr
                    key={report.id}
                    className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-ink-primary text-xs">
                        {report.reportNumber}
                      </div>
                      <div className="flex items-center gap-1.5 text-ink-tertiary text-[11px] mt-0.5">
                        <Calendar size={13} />
                        <span>{report.issuedOn}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-1.5 text-ink-primary font-medium">
                        <Buildings size={14} className="text-accent-primary" />
                        <span>{report.laboratoryName}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-ink-secondary max-w-[200px] truncate">
                      {report.statedStandard || "EC 396/2005"}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {getStatusBadge(report.assessmentStatus)}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      {isConfirmed(report) ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary bg-functional-balanced-bg border border-accent-primary/20 px-2 py-0.5 rounded-full">
                          <Check size={12} weight="bold" />
                          <span>Đã đối chiếu</span>
                        </span>
                      ) : (
                        <span className="text-xs text-ink-tertiary">
                          Chưa xác nhận
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="inline-flex items-center gap-1.5">
                        {report.fileName && (
                          <button
                            type="button"
                            onClick={() =>
                              handleDownloadFile(report.id, report.fileName)
                            }
                            className="p-1.5 rounded-lg border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary hover:bg-surface-raised transition-colors"
                            title="Tải chứng thư PDF"
                          >
                            <DownloadSimple size={14} />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedReport(report)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-primary text-xs font-semibold transition-colors"
                        >
                          <Eye size={14} />
                          <span>Chi tiết</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {!id && (
        <div className="p-4 border-t border-ink-tertiary/15 flex items-center justify-between text-xs bg-surface-raised/40 rounded-2xl border border-ink-tertiary/20">
          <span className="text-ink-secondary">
            {t("common.page", "Trang")}{" "}
            <strong className="text-ink-primary">{page}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page === 1 || loading}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="px-3 py-1.5 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {t("common.prev", "Trang trước")}
            </button>
            <button
              type="button"
              disabled={!hasMore || loading}
              onClick={() => setPage((prev) => prev + 1)}
              className="px-3 py-1.5 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-primary disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {t("common.next", "Trang sau")}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Chi tiết Báo Cáo Kiểm Nghiệm & Đối Soát MRL */}
      <Modal
        isOpen={Boolean(selectedReport) && !editor && !deleting}
        onClose={() => setSelectedReport(null)}
        ariaLabel="Chi tiết báo cáo kiểm nghiệm"
      >
        {selectedReport && (
          <div className="w-full max-w-3xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
            <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                  <TestTube size={18} weight="bold" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-ink-primary">
                    Báo cáo: {selectedReport.reportNumber}
                  </h2>
                  <p className="text-[11px] text-ink-secondary">
                    Kết quả phân tích sắc ký & đối soát dư lượng MRL thị trường
                    đích
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReport(null)}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </header>

            <div className="p-5 space-y-4 text-xs">
              {/* General Report Information */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 text-xs">
                <div>
                  <span className="text-ink-tertiary block">
                    Đơn vị thử nghiệm:
                  </span>
                  <span className="font-semibold text-ink-primary">
                    {selectedReport.laboratoryName}
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">
                    Ngày phát hành:
                  </span>
                  <span className="font-medium text-ink-primary">
                    {selectedReport.issuedOn}
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">Đánh giá MRL:</span>
                  <div className="mt-0.5">
                    {getStatusBadge(selectedReport.assessmentStatus)}
                  </div>
                </div>
                <div>
                  <span className="text-ink-tertiary block">
                    Quy chuẩn đối chiếu:
                  </span>
                  <span className="font-medium text-ink-primary">
                    {selectedReport.statedStandard || "EC No 396/2005"}
                  </span>
                </div>
              </div>

              {/* Assessment Reasons / Conclusions */}
              {selectedReport.assessmentReasons &&
                selectedReport.assessmentReasons.length > 0 && (
                  <div className="p-3.5 rounded-xl bg-functional-balanced-bg/40 border border-functional-balanced-border/40 text-xs space-y-1.5">
                    <span className="font-bold text-accent-primary uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck size={16} />
                      <span>Kết luận đánh giá từ hệ thống GrainLedger</span>
                    </span>
                    <ul className="list-disc list-inside space-y-1 text-ink-secondary">
                      {selectedReport.assessmentReasons.map((reason, idx) => (
                        <li key={idx} className="text-ink-primary font-medium">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

              {/* Test Results Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-ink-primary uppercase tracking-wider flex items-center gap-1.5">
                    <TestTube size={16} className="text-accent-primary" />
                    <span>
                      Chỉ tiêu phân tích dư lượng hoạt chất (Test Results)
                    </span>
                  </h4>
                  {selectedReport.fileName && (
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadFile(
                          selectedReport.id,
                          selectedReport.fileName,
                        )
                      }
                      className="inline-flex items-center gap-1 text-xs text-accent-primary hover:underline font-semibold"
                    >
                      <DownloadSimple size={14} />
                      <span>Tải chứng thư gốc ({selectedReport.fileName})</span>
                    </button>
                  )}
                </div>

                <div className="rounded-xl border border-ink-tertiary/15 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/15 text-ink-secondary font-semibold uppercase text-[11px]">
                        <th className="py-2.5 px-3">Hoạt chất / Chỉ tiêu</th>
                        <th className="py-2.5 px-3">Nồng độ đo được</th>
                        <th className="py-2.5 px-3">Giới hạn LOQ</th>
                        <th className="py-2.5 px-3">Phương pháp thử</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-ink-tertiary/10">
                      {selectedReport.resultSets &&
                      selectedReport.resultSets.length > 0 ? (
                        selectedReport.resultSets.flatMap((rs, rsIdx) =>
                          (rs.results || []).map((res, resIdx) => (
                            <tr
                              key={`${rsIdx}-${resIdx}`}
                              className="hover:bg-surface-raised/40 transition-colors"
                            >
                              <td className="py-2.5 px-3 font-semibold text-ink-primary">
                                {res.testLabel || "Chưa có tên chỉ tiêu"}
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-accent-primary">
                                {res.numericValue
                                  ? `${res.numericValue} ${res.unit ?? ""}`
                                  : res.originalResultText || "Chưa có kết quả"}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-ink-secondary">
                                {res.loq ?? "Chưa có dữ liệu"}
                              </td>
                              <td className="py-2.5 px-3 text-ink-tertiary">
                                {res.method || "Chưa có dữ liệu"}
                              </td>
                            </tr>
                          )),
                        )
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-4 px-3 text-ink-secondary"
                          >
                            Báo cáo chưa có bộ kết quả xét nghiệm.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {canWrite && !isConfirmed(selectedReport) && ["UNRESOLVED", "PENDING_REVIEW"].includes(selectedReport.status) && <>
                <div className="gl-workflow flex flex-wrap gap-2">
                  <button type="button" onClick={() => setEditor({ report: selectedReport })}>{t("workflows.lab.edit")}</button>
                  <button type="button" className="!text-accent-danger" onClick={() => setDeleting(selectedReport)}>{t("workflows.lab.delete")}</button>
                </div>
                {!!selectedReport.resultSets.length && <LabReportConfirmation key={selectedReport.id} report={selectedReport} onSaved={report => { setSelectedReport(report); setSuccessMsg(t("workflows.lab.confirmed")); handleRefresh(); }} />}
              </>}
              {canSelectEvidence && isConfirmed(selectedReport) && <Link className="font-semibold text-accent-primary underline" to={compliancePaths.residueEvidence + "?report=" + encodeURIComponent(selectedReport.id)}>
                {t("workflows.residue.selection")}
              </Link>}

              <div className="pt-3 border-t border-ink-tertiary/15 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedReport(null)}
                  className="px-4 py-2 rounded-lg border border-ink-tertiary/20 text-xs font-semibold text-ink-secondary hover:bg-surface-raised transition-colors"
                >
                  {t("common.close", "Đóng")}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {editor && <LabReportEditor key={editor.report?.id ?? "new"} report={editor.report} onClose={() => setEditor(null)} onSaved={report => {
        setEditor(null);
        setSelectedReport(report);
        setSuccessMsg(t("workflows.lab.savedDraft"));
        handleRefresh();
        if (id && id !== report.id) navigate(labResultPath(report.id), { replace: true });
      }} />}
      {deleting && <DeleteLabReportDialog report={deleting} onClose={() => setDeleting(null)} onSaved={() => {
        setDeleting(null);
        setSelectedReport(null);
        setSuccessMsg(t("workflows.lab.deleted"));
        handleRefresh();
        if (id) navigate(compliancePaths.results, { replace: true });
      }} />}
    </div>
  );
};
