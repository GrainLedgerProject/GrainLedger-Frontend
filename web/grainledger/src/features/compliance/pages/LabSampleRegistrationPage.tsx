import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  sampleEndpoints,
  type CaptureSampleRequest,
  type RecordSampleHandoverRequest,
} from "@/api/compliance";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { Modal } from "@/components/Modal/Modal";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import {
  Flask,
  ShieldCheck,
  Truck,
  Cube,
  Plus,
  ArrowsClockwise,
  CheckCircle,
  WarningCircle,
  X,
  MagnifyingGlass,
  Calendar,
  Eye,
  ClockCounterClockwise,
  Check,
} from "@phosphor-icons/react";

export interface SampleSummary {
  id: string;
  sourceLotId: string;
  code: string;
  sealCode: string;
  collectedAt: string;
  handoverCount: number;
  materialDescription?: string | null;
}

export interface HandoverRecord {
  id?: string;
  entityId?: string;
  fromParty: string | null;
  toParty: string | null;
  handedOverAt: string;
  sealCondition: string | null;
  evidenceRef?: string | null;
  handoverKind?: string | null;
  laboratoryName?: string | null;
  laboratoryReference?: string | null;
}

function extractSampleList(response: unknown): {
  items: SampleSummary[];
  hasMore: boolean;
} {
  if (Array.isArray(response)) {
    return { items: response as SampleSummary[], hasMore: false };
  }
  if (
    response &&
    typeof response === "object" &&
    "items" in response &&
    Array.isArray((response as { items: unknown }).items)
  ) {
    const data = response as { items: SampleSummary[]; hasMore?: boolean };
    return { items: data.items, hasMore: Boolean(data.hasMore) };
  }
  return { items: [], hasMore: false };
}

function extractHandovers(response: unknown): HandoverRecord[] {
  if (Array.isArray(response)) {
    return response as HandoverRecord[];
  }
  if (
    response &&
    typeof response === "object" &&
    "items" in response &&
    Array.isArray((response as { items: unknown }).items)
  ) {
    return (response as { items: HandoverRecord[] }).items;
  }
  return [];
}

interface Props {
  defaultTab?: "LIST" | "CREATE";
}

export const LabSampleRegistrationPage: React.FC<Props> = ({
  defaultTab = "LIST",
}) => {
  const { t } = useTranslation();
  const [samples, setSamples] = useState<SampleSummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<
    "ALL" | "HANDED_OVER" | "IN_STORE"
  >("ALL");

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim().toLowerCase());
    }, 350);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Selected sample for Detail & Chain-of-custody Modal
  const [selectedSample, setSelectedSample] = useState<SampleSummary | null>(
    null,
  );
  const [handovers, setHandovers] = useState<HandoverRecord[]>([]);
  const [loadingHandovers, setLoadingHandovers] = useState(false);

  // Create Modal
  const [isCreateOpen, setIsCreateOpen] = useState(defaultTab === "CREATE");
  const [createSealCode, setCreateSealCode] = useState("");
  const [createSourceLotId, setCreateSourceLotId] = useState("");
  const [createMaterialDesc, setCreateMaterialDesc] = useState(
    "Lúa tươi thu mua vụ Đông Xuân",
  );
  const [submittingCreate, setSubmittingCreate] = useState(false);

  // Handover Modal
  const [isHandoverOpen, setIsHandoverOpen] = useState(false);
  const [handoverTargetSample, setHandoverTargetSample] =
    useState<SampleSummary | null>(null);
  const [handoverFrom, setHandoverFrom] = useState(
    "Đại diện Thu Mua & Kiểm Phẩm GrainLedger",
  );
  const [handoverTo, setHandoverTo] = useState("");
  const [handoverLab, setHandoverLab] = useState("Eurofins Sắc Ký Hải Đăng");
  const [handoverSealCondition, setHandoverSealCondition] = useState(
    "Niêm phong nguyên vẹn, số niêm chì trùng khớp với biên bản",
  );
  const [handoverEvidenceRef, setHandoverEvidenceRef] = useState("");
  const [submittingHandover, setSubmittingHandover] = useState(false);

  const [reloadCount, setReloadCount] = useState(0);

  const fetchSamples = useCallback(() => {
    setLoading(true);
    setError(null);
    setReloadCount((c) => c + 1);
  }, []);

  useEffect(() => {
    let active = true;
    sampleEndpoints
      .getSamples({ page, pageSize: 20 })
      .then((response) => {
        if (!active) return;
        const parsed = extractSampleList(response);
        setSamples(parsed.items);
        setHasMore(parsed.hasMore);
        setError(null);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : t(
                "compliance.lab.errorLoad",
                "Không thể tải danh sách mẫu niêm phong.",
              ),
        );
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [page, reloadCount, t]);

  // Load handovers when selectedSample changes
  useEffect(() => {
    if (!selectedSample) return;
    let active = true;
    sampleEndpoints
      .getSampleHandovers(selectedSample.id)
      .then((res) => {
        if (!active) return;
        setHandovers(extractHandovers(res));
      })
      .catch(() => {
        if (!active) return;
        setHandovers([]);
      })
      .finally(() => {
        if (active) setLoadingHandovers(false);
      });

    return () => {
      active = false;
    };
  }, [selectedSample]);

  // KPI counts
  const kpiTotal = samples.length;
  const kpiSealed = samples.filter((s) => Boolean(s.sealCode)).length;
  const kpiHandedOver = samples.filter(
    (s) => (s.handoverCount ?? 0) > 0,
  ).length;
  const kpiInStore = samples.filter((s) => (s.handoverCount ?? 0) === 0).length;

  // Filtered samples
  const filteredSamples = useMemo(() => {
    return samples.filter((item) => {
      const matchSearch =
        !debouncedSearch ||
        (item.code && item.code.toLowerCase().includes(debouncedSearch)) ||
        (item.sealCode &&
          item.sealCode.toLowerCase().includes(debouncedSearch)) ||
        (item.sourceLotId &&
          item.sourceLotId.toLowerCase().includes(debouncedSearch)) ||
        (item.materialDescription &&
          item.materialDescription.toLowerCase().includes(debouncedSearch));

      const matchStatus =
        statusFilter === "ALL" ||
        (statusFilter === "HANDED_OVER" && (item.handoverCount ?? 0) > 0) ||
        (statusFilter === "IN_STORE" && (item.handoverCount ?? 0) === 0);

      return matchSearch && matchStatus;
    });
  }, [samples, debouncedSearch, statusFilter]);

  // Handle Create Sample
  const handleCreateSample = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createSealCode.trim() || !createSourceLotId.trim()) {
      setError("Vui lòng điền đầy đủ mã niêm chì và mã lô nguyên liệu.");
      return;
    }

    setSubmittingCreate(true);
    setError(null);
    try {
      const entityId = crypto.randomUUID();
      const capturedAt = new Date().toISOString();
      const payload: CaptureSampleRequest = {
        deviceId: "grainledger-web",
        clientOperationId: crypto.randomUUID(),
        capturedAt,
        payloadSchemaVersion: 2,
        payload: {
          entityId,
          code: null,
          sealCode: createSealCode.trim(),
          sourceLotId: createSourceLotId.trim(),
          collectedAt: capturedAt,
          materialDescription: createMaterialDesc.trim() || null,
        },
      };

      await sampleEndpoints.captureSample(payload);
      setSuccessMsg(
        t(
          "compliance.lab.successCreate",
          "Đã ghi nhận mẫu niêm phong mới thành công!",
        ),
      );
      setCreateSealCode("");
      setCreateSourceLotId("");
      setIsCreateOpen(false);
      setPage(1);
      fetchSamples();
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể ghi nhận mẫu niêm phong mới.",
      );
    } finally {
      setSubmittingCreate(false);
    }
  };

  // Open Handover Modal for specific sample
  const handleOpenHandover = (sample: SampleSummary) => {
    setHandoverTargetSample(sample);
    setHandoverTo("");
    setHandoverEvidenceRef("");
    setIsHandoverOpen(true);
  };

  // Handle Record Handover
  const handleRecordHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!handoverTargetSample) return;

    if (!handoverFrom.trim() || !handoverTo.trim() || !handoverLab.trim()) {
      setError(
        "Vui lòng điền đầy đủ thông tin bên giao, bên nhận và phòng kiểm nghiệm.",
      );
      return;
    }

    setSubmittingHandover(true);
    setError(null);
    try {
      const capturedAt = new Date().toISOString();
      const payload: RecordSampleHandoverRequest = {
        deviceId: "grainledger-web",
        clientOperationId: crypto.randomUUID(),
        capturedAt,
        payloadSchemaVersion: 1,
        payload: {
          entityId: crypto.randomUUID(),
          fromParty: handoverFrom.trim(),
          toParty: handoverTo.trim(),
          handedOverAt: capturedAt,
          sealCondition: handoverSealCondition.trim() || "Nguyên vẹn",
          evidenceRef: handoverEvidenceRef.trim() || null,
          handoverKind: "LAB_DISPATCH",
          laboratoryName: handoverLab.trim(),
        },
      };

      await sampleEndpoints.recordSampleHandover(
        handoverTargetSample.id,
        payload,
      );
      setSuccessMsg(
        `Đã ghi nhận bàn giao mẫu "${handoverTargetSample.code || handoverTargetSample.sealCode}" đến "${handoverLab}" thành công!`,
      );
      setIsHandoverOpen(false);
      setHandoverTargetSample(null);

      // Refresh list and detail if open
      fetchSamples();
      if (selectedSample && selectedSample.id === handoverTargetSample.id) {
        setSelectedSample({
          ...selectedSample,
          handoverCount: (selectedSample.handoverCount ?? 0) + 1,
        });
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Không thể lưu thông tin bàn giao mẫu.",
      );
    } finally {
      setSubmittingHandover(false);
    }
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
              "compliance.lab.badge",
              "QUẢN LÝ MẪU NIÊM PHONG & CHUỖI BÀN GIAO",
            )}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("compliance.lab.sampleTitle", "Mẫu Niêm Phong (Lab Samples)")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {t(
              "compliance.lab.sampleSubtitle",
              "Theo dõi mẫu lưu, mã niêm chì, nguồn gốc lô lúa và chuỗi hành trình bàn giao mẫu đến các đơn vị kiểm định độc lập.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchSamples()}
            disabled={loading}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={t("common.reload", "Làm mới danh sách")}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "motion-safe:animate-spin" : undefined}
            />
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs"
          >
            <Plus size={16} weight="bold" />
            <span>{t("compliance.lab.newSample", "Đăng Ký Mẫu Mới")}</span>
          </button>
        </div>
      </div>

      {/* Role Notice if navigated from CREATE tab */}
      {defaultTab === "CREATE" && (
        <div className="p-4 rounded-xl border border-accent-primary/20 bg-functional-balanced-bg/30 text-ink-primary text-xs flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <Flask size={20} className="text-accent-primary shrink-0" />
            <span>
              {t(
                "compliance.lab.createHint",
                "Bạn đang ở chế độ đăng ký mẫu niêm chì. Bạn có thể tạo mẫu đại diện mới hoặc kiểm tra danh sách hiện có bên dưới.",
              )}
            </span>
          </div>
          <Link
            to="/compliance/lab-samples"
            className="font-semibold text-accent-primary hover:underline shrink-0"
          >
            {t("compliance.lab.viewAll", "Xem toàn bộ")}
          </Link>
        </div>
      )}

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
            <span className="text-xs font-medium">Tổng số mẫu lưu</span>
            <Flask size={18} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiTotal}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Mẫu đã đăng ký trong hệ thống
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Niêm chì hợp lệ</span>
            <ShieldCheck size={18} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiSealed}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Có mã seal chống tráo đổi
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Đã bàn giao phòng Lab</span>
            <Truck size={18} className="text-sky-500" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiHandedOver}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Gửi tới SGS, Eurofins, NIFC...
          </span>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs">
          <div className="flex items-center justify-between text-ink-secondary mb-1.5">
            <span className="text-xs font-medium">Lưu kho trạm thu mua</span>
            <Cube size={18} className="text-accent-warning" />
          </div>
          <div className="text-2xl font-bold font-display text-ink-primary">
            {kpiInStore}
          </div>
          <span className="text-[11px] text-ink-tertiary">
            Chờ lệnh vận chuyển hoặc đối chứng
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="md:col-span-3 relative">
            <MagnifyingGlass
              className="absolute left-3 top-2.5 text-ink-tertiary"
              size={16}
            />
            <input
              type="text"
              placeholder={t(
                "compliance.lab.searchPlaceholder",
                "Tìm kiếm theo mã mẫu, mã niêm chì, mã lô lúa, mô tả...",
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
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(
                  e.target.value as "ALL" | "HANDED_OVER" | "IN_STORE",
                )
              }
              className="w-full py-2 px-3 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none focus:rounded-lg transition-colors"
            >
              <option value="ALL">Tất cả tình trạng bàn giao</option>
              <option value="HANDED_OVER">
                Đã bàn giao phòng Lab ({kpiHandedOver})
              </option>
              <option value="IN_STORE">Lưu kho trạm ({kpiInStore})</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-ink-secondary pt-1 border-t border-ink-tertiary/10">
          <span>
            {t("compliance.lab.showing", "Hiển thị")}{" "}
            <strong className="text-ink-primary">
              {filteredSamples.length}
            </strong>{" "}
            {t("compliance.lab.ofTotal", "trên tổng số")}{" "}
            <strong className="text-ink-primary">{samples.length}</strong>{" "}
            {t("compliance.lab.samplesCount", "mẫu niêm chì")}
          </span>
          <span className="font-mono text-xs text-accent-primary font-bold">
            {t(
              "compliance.lab.chainStandard",
              "ISO 22095:2020 Chain of Custody",
            )}
          </span>
        </div>
      </div>

      {/* Samples Table */}
      <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex justify-center">
            <GrainLoader
              label={t(
                "compliance.lab.loading",
                "Đang tải danh sách mẫu niêm chì...",
              )}
            />
          </div>
        ) : filteredSamples.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Flask size={40} className="mx-auto text-ink-tertiary opacity-60" />
            <p className="text-sm font-semibold text-ink-primary">
              {t(
                "compliance.lab.emptyTitle",
                "Không tìm thấy mẫu niêm chì phù hợp",
              )}
            </p>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">
              {t(
                "compliance.lab.emptyDesc",
                "Chưa có mẫu nào được ghi nhận hoặc không khớp với bộ lọc tìm kiếm.",
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/15 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                  <th className="py-3.5 px-4">
                    {t("compliance.lab.thCode", "Mã mẫu & Thời gian")}
                  </th>
                  <th className="py-3.5 px-4">
                    {t("compliance.lab.thSeal", "Mã niêm chì")}
                  </th>
                  <th className="py-3.5 px-4">
                    {t("compliance.lab.thLot", "Lô nguyên liệu")}
                  </th>
                  <th className="py-3.5 px-4">
                    {t("compliance.lab.thMaterial", "Mô tả nguyên liệu")}
                  </th>
                  <th className="py-3.5 px-4">
                    {t("compliance.lab.thStatus", "Trạng thái bàn giao")}
                  </th>
                  <th className="py-3.5 px-4 text-right">
                    {t("common.actions", "Thao tác")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10">
                {filteredSamples.map((sample) => {
                  const hasHandover = (sample.handoverCount ?? 0) > 0;
                  return (
                    <tr
                      key={sample.id}
                      className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                    >
                      <td className="py-3.5 px-4 text-ink-secondary whitespace-nowrap">
                        <div className="font-mono font-bold text-ink-primary text-xs">
                          {sample.code || sample.id.slice(0, 13)}
                        </div>
                        <div className="flex items-center gap-1.5 text-ink-tertiary text-[11px] mt-0.5">
                          <Calendar size={13} />
                          <span>
                            {sample.collectedAt
                              ? new Date(sample.collectedAt).toLocaleString(
                                  "vi-VN",
                                )
                              : "—"}
                          </span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-functional-balanced-bg border border-accent-primary/20 font-mono text-xs font-semibold text-accent-primary">
                          <ShieldCheck size={14} weight="bold" />
                          <span>{sample.sealCode || "CHƯA NIÊM CHÌ"}</span>
                        </span>
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-1.5 font-mono text-xs text-ink-secondary">
                          <Cube size={14} className="text-ink-tertiary" />
                          <span>{sample.sourceLotId}</span>
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-ink-secondary max-w-[200px] truncate">
                        {sample.materialDescription ||
                          "Lúa tươi thu hoạch vụ mùa"}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {hasHandover ? (
                          <StatusBadge
                            status="COMPLIANT"
                            label={`Đã bàn giao (${sample.handoverCount} lượt)`}
                          />
                        ) : (
                          <StatusBadge
                            status="PENDING"
                            label="Lưu kho trạm chờ gửi"
                          />
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              setHandovers([]);
                              setLoadingHandovers(true);
                              setSelectedSample(sample);
                            }}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-primary text-xs font-semibold transition-colors"
                            title="Xem chi tiết & lịch sử bàn giao"
                          >
                            <Eye size={14} />
                            <span>{t("common.details", "Chi tiết")}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenHandover(sample)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary text-xs font-semibold transition-colors"
                            title="Ghi nhận bàn giao mẫu tới phòng Lab"
                          >
                            <Truck size={14} />
                            <span>
                              {t("compliance.lab.handoverBtn", "Bàn giao")}
                            </span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        <div className="p-4 border-t border-ink-tertiary/15 flex items-center justify-between text-xs bg-surface-raised/40">
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
      </div>

      {/* Modal: Chi tiết & Lịch sử Bàn giao */}
      <Modal
        isOpen={Boolean(selectedSample)}
        onClose={() => setSelectedSample(null)}
        ariaLabel="Chi tiết mẫu niêm phong và chuỗi bàn giao"
      >
        {selectedSample && (
          <div className="w-full max-w-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
            <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                  <Flask size={18} weight="bold" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-ink-primary">
                    Mã mẫu: {selectedSample.code || selectedSample.id}
                  </h2>
                  <p className="text-[11px] text-ink-secondary">
                    Chi tiết mẫu niêm phong & chuỗi hành trình bàn giao (Chain
                    of Custody)
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSample(null)}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
              >
                <X size={18} />
              </button>
            </header>

            <div className="p-5 space-y-4 text-xs">
              {/* General Info Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 text-xs">
                <div>
                  <span className="text-ink-tertiary block">
                    Mã niêm chì (Seal Code):
                  </span>
                  <span className="font-mono font-bold text-accent-primary">
                    {selectedSample.sealCode}
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">
                    Lô nguyên liệu nguồn:
                  </span>
                  <span className="font-mono font-bold text-ink-primary">
                    {selectedSample.sourceLotId}
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block">
                    Thời gian lấy mẫu:
                  </span>
                  <span className="text-ink-primary">
                    {new Date(selectedSample.collectedAt).toLocaleString(
                      "vi-VN",
                    )}
                  </span>
                </div>
                <div className="col-span-2 sm:col-span-3">
                  <span className="text-ink-tertiary block">
                    Mô tả nguyên liệu:
                  </span>
                  <span className="text-ink-secondary">
                    {selectedSample.materialDescription ||
                      "Lúa tươi thu hoạch tại vùng nguyên liệu"}
                  </span>
                </div>
              </div>

              {/* Handover Timeline */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-ink-primary uppercase tracking-wider flex items-center gap-1.5">
                    <ClockCounterClockwise
                      size={16}
                      className="text-accent-primary"
                    />
                    <span>Lịch sử chuyển giao mẫu (Handovers)</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      handleOpenHandover(selectedSample);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-colors"
                  >
                    <Plus size={14} weight="bold" />
                    <span>Thêm lượt bàn giao</span>
                  </button>
                </div>

                {loadingHandovers ? (
                  <div className="py-8 flex justify-center">
                    <GrainLoader label="Đang tải lịch sử bàn giao..." />
                  </div>
                ) : handovers.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-ink-tertiary/20 text-center text-xs text-ink-secondary">
                    Chưa có lượt bàn giao nào được ghi nhận cho mẫu này. Mẫu
                    hiện đang được lưu trữ tại kho trạm.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {handovers.map((h, idx) => (
                      <div
                        key={h.id || h.entityId || idx}
                        className="p-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised dark:bg-surface-overlay text-xs space-y-1.5"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-ink-primary flex items-center gap-1.5">
                            <Truck size={14} className="text-sky-500" />
                            <span>
                              Lượt {idx + 1}: Bàn giao đến{" "}
                              {h.laboratoryName || h.toParty || "Phòng Lab"}
                            </span>
                          </span>
                          <span className="text-[11px] text-ink-tertiary font-mono">
                            {new Date(h.handedOverAt).toLocaleString("vi-VN")}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] text-ink-secondary pt-1 border-t border-ink-tertiary/10">
                          <div>
                            <span className="text-ink-tertiary">
                              Bên giao:{" "}
                            </span>
                            <span className="font-medium text-ink-primary">
                              {h.fromParty || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-ink-tertiary">
                              Bên nhận:{" "}
                            </span>
                            <span className="font-medium text-ink-primary">
                              {h.toParty || "—"}
                            </span>
                          </div>
                          <div>
                            <span className="text-ink-tertiary">
                              Tình trạng seal:{" "}
                            </span>
                            <span className="font-medium text-accent-primary">
                              {h.sealCondition || "Nguyên vẹn"}
                            </span>
                          </div>
                          {h.evidenceRef && (
                            <div>
                              <span className="text-ink-tertiary">
                                Biên bản số:{" "}
                              </span>
                              <span className="font-mono text-ink-primary">
                                {h.evidenceRef}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-ink-tertiary/15 flex justify-end">
                <button
                  type="button"
                  onClick={() => setSelectedSample(null)}
                  className="px-4 py-2 rounded-lg border border-ink-tertiary/20 text-xs font-semibold text-ink-secondary hover:bg-surface-raised transition-colors"
                >
                  {t("common.close", "Đóng")}
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal: Đăng ký Mẫu Niêm Phong Mới */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        ariaLabel="Lấy Mẫu Niêm Phong Mới"
      >
        <div className="w-full max-w-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
          <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                <ShieldCheck size={18} weight="bold" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink-primary">
                  {t("compliance.lab.newSampleTitle", "Lấy Mẫu Niêm Phong Mới")}
                </h2>
                <p className="text-[11px] text-ink-secondary">
                  {t(
                    "compliance.lab.newSampleSub",
                    "Thủ tục lấy mẫu đại diện và niêm chì đối chứng tại điểm thu mua",
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              disabled={submittingCreate}
              className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </header>

          <form onSubmit={handleCreateSample} className="p-5 space-y-4 text-xs">
            <div className="space-y-3">
              <div>
                <label className="block text-ink-secondary font-medium mb-1">
                  Mã lô lúa nguyên liệu nguồn (Source Lot ID) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: LOT-2026-DX-001"
                  value={createSourceLotId}
                  onChange={(e) => setCreateSourceLotId(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary font-mono focus:border-accent-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-ink-secondary font-medium mb-1">
                  Mã niêm chì vật lý (Seal Code) *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: SEAL-VN-984321"
                  value={createSealCode}
                  onChange={(e) => setCreateSealCode(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary font-mono focus:border-accent-primary focus:outline-none transition-colors"
                />
                <p className="text-[11px] text-ink-tertiary mt-1">
                  Số seri trên seal kim loại hoặc nhựa dùng để niêm phong túi
                  mẫu đối chứng.
                </p>
              </div>

              <div>
                <label className="block text-ink-secondary font-medium mb-1">
                  Mô tả quy cách mẫu & giống lúa
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Lúa tươi ST25 - Độ ẩm 14.5% - Trọng lượng 1.0kg"
                  value={createMaterialDesc}
                  onChange={(e) => setCreateMaterialDesc(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsCreateOpen(false)}
                disabled={submittingCreate}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary text-xs transition-colors"
              >
                {t("common.cancel", "Hủy bỏ")}
              </button>
              <button
                type="submit"
                disabled={submittingCreate}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60 shadow-xs"
              >
                {submittingCreate ? (
                  <ArrowsClockwise
                    size={15}
                    className="motion-safe:animate-spin"
                  />
                ) : (
                  <Check size={15} weight="bold" />
                )}
                <span>
                  {t("compliance.lab.saveSample", "Xác nhận tạo mẫu")}
                </span>
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Modal: Ghi nhận Bàn Giao Mẫu Đến Phòng Lab */}
      <Modal
        isOpen={isHandoverOpen}
        onClose={() => setIsHandoverOpen(false)}
        ariaLabel="Ghi nhận bàn giao phòng lab"
      >
        <div className="w-full max-w-lg bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
          <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                <Truck size={18} weight="bold" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink-primary">
                  {t(
                    "compliance.lab.handoverTitle",
                    "Ghi Nhận Bàn Giao Phòng Lab",
                  )}
                </h2>
                <p className="text-[11px] text-ink-secondary">
                  {t(
                    "compliance.lab.handoverSub",
                    "Biên bản chuyển giao mẫu và số niêm chì đến đơn vị kiểm định độc lập",
                  )}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsHandoverOpen(false)}
              disabled={submittingHandover}
              className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
            >
              <X size={18} />
            </button>
          </header>

          <form
            onSubmit={handleRecordHandover}
            className="p-5 space-y-4 text-xs"
          >
            {handoverTargetSample && (
              <div className="p-3 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/15 text-xs flex justify-between items-center">
                <div>
                  <span className="text-ink-tertiary block">
                    Mẫu đang bàn giao:
                  </span>
                  <span className="font-mono font-bold text-ink-primary">
                    {handoverTargetSample.code || handoverTargetSample.id}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-ink-tertiary block">Niêm chì:</span>
                  <span className="font-mono font-bold text-accent-primary">
                    {handoverTargetSample.sealCode}
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-ink-secondary font-medium mb-1">
                  Phòng kiểm nghiệm / Đơn vị tiếp nhận *
                </label>
                <select
                  value={handoverLab}
                  onChange={(e) => setHandoverLab(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors"
                >
                  <option value="Eurofins Sắc Ký Hải Đăng">
                    Eurofins Sắc Ký Hải Đăng (ISO 17025)
                  </option>
                  <option value="SGS Vietnam - Cần Thơ Lab">
                    SGS Vietnam - Chi nhánh Cần Thơ
                  </option>
                  <option value="Viện Kiểm Nghiệm NIFC">
                    Viện Kiểm Nghiệm ATTP Quốc Gia (NIFC)
                  </option>
                  <option value="Quatest 3 - TP. Hồ Chí Minh">
                    Trung tâm Kỹ thuật Tiêu chuẩn Đo lường 3 (Quatest 3)
                  </option>
                  <option value="Vinacontrol TP. Cần Thơ">
                    Vinacontrol TP. Cần Thơ
                  </option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-ink-secondary font-medium mb-1">
                    Đại diện bên giao *
                  </label>
                  <input
                    type="text"
                    required
                    value={handoverFrom}
                    onChange={(e) => setHandoverFrom(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-ink-secondary font-medium mb-1">
                    Người / Đơn vị nhận mẫu *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Nguyễn Văn A (Eurofins)"
                    value={handoverTo}
                    onChange={(e) => setHandoverTo(e.target.value)}
                    className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-ink-secondary font-medium mb-1">
                  Tình trạng niêm chì khi giao nhận *
                </label>
                <input
                  type="text"
                  required
                  value={handoverSealCondition}
                  onChange={(e) => setHandoverSealCondition(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors"
                />
              </div>

              <div>
                <label className="block text-ink-secondary font-medium mb-1">
                  Mã chứng từ / Biên bản giao nhận đính kèm
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: BBGN-2026/04/EF-09"
                  value={handoverEvidenceRef}
                  onChange={(e) => setHandoverEvidenceRef(e.target.value)}
                  className="w-full py-2 px-3 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary font-mono focus:border-accent-primary focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsHandoverOpen(false)}
                disabled={submittingHandover}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary text-xs transition-colors"
              >
                {t("common.cancel", "Hủy bỏ")}
              </button>
              <button
                type="submit"
                disabled={submittingHandover}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60 shadow-xs"
              >
                {submittingHandover ? (
                  <ArrowsClockwise
                    size={15}
                    className="motion-safe:animate-spin"
                  />
                ) : (
                  <Check size={15} weight="bold" />
                )}
                <span>Xác nhận giao nhận</span>
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
