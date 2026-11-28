import React, { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  ArrowsClockwiseIcon,
  ArrowsLeftRight,
  CalendarIcon,
  CheckCircleIcon,
  DownloadSimpleIcon,
  LockSimpleIcon,
  MagnifyingGlass,
  ShieldWarningIcon,
  UploadSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { ContainerCommandFeedback } from "@/features/export/components/ContainerCommandFeedback";
import { ContainerNotices } from "@/features/export/components/ContainerNotices";
import { saveExportFile } from "@/features/export/model/saveExportFile";
import { millPaths } from "@/features/mill/paths";
import { useCommand } from "@/shared/hooks/useCommand";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { RecordPagination } from "@/shared/ui/RecordWorkspace";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import {
  PlaceHoldModal,
  type HoldSelectableLot,
} from "../components/PlaceHoldModal";

interface HoldOrder {
  id: string;
  lotId: string;
  lotCode: string;
  reason: string;
  status: string;
  ownerId: string;
  ownerName: string;
  response: string | null;
  createdAt: string;
  evidenceId: string | null;
}

interface LotPositionInfo {
  id: string;
  code: string;
  ownerId: string;
  positions: {
    facilityId: string;
    locationId: string;
    quantityKg: string;
    availableKg: string;
  }[];
}

function parseHoldPage(response: unknown): {
  items: HoldOrder[];
  totalCount: number;
  hasMore: boolean;
} {
  if (Array.isArray(response)) {
    return {
      items: response as HoldOrder[],
      totalCount: response.length,
      hasMore: false,
    };
  }
  const result = response as {
    items?: HoldOrder[];
    totalCount?: number;
    hasMore?: boolean;
  };
  if (!Array.isArray(result?.items)) {
    throw new Error("Invalid HOLD list response");
  }
  return {
    items: result.items,
    totalCount: result.totalCount ?? result.items.length,
    hasMore: Boolean(result.hasMore),
  };
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.onload = () => {
      const result = String(reader.result ?? "");
      resolve(result.includes(",") ? result.split(",")[1] : result);
    };
    reader.readAsDataURL(file);
  });
}

export const HoldManagementPage: React.FC = () => {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const location = useLocation();
  const [params] = useSearchParams();
  const user = useAuthStore((s) => s.user);
  const canIssue =
    user?.role === "CUSTOMER_MANAGER" &&
    user.permissions.includes("holds.manage");
  const canRespond =
    user?.role === "MILL_MANAGER" && user.permissions.includes("holds.process");

  const requestedLotId = params.get("lotId") ?? "";
  const routeModalTrigger = `${location.pathname}:${requestedLotId}`;
  const wantsCreateModal =
    canIssue && (location.pathname.endsWith("/new") || Boolean(requestedLotId));

  const [page, setPage] = useState(1);
  const [actionError, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [ownerFilter, setOwnerFilter] = useState("");
  const [sortBy, setSortBy] = useState<"createdAt" | "status" | "owner">(
    "createdAt",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isModalOpen, setIsModalOpen] = useState(() => wantsCreateModal);
  const [prevRouteTrigger, setPrevRouteTrigger] = useState(routeModalTrigger);
  if (routeModalTrigger !== prevRouteTrigger) {
    setPrevRouteTrigger(routeModalTrigger);
    if (wantsCreateModal) {
      setIsModalOpen(true);
    }
  }
  const [activeHold, setActiveHold] = useState<HoldOrder | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const lookups = useQuery({
    queryKey: ["hold-owner-lookups", user?.id],
    queryFn: () =>
      typeof ledgerEndpoints.getLookups === "function"
        ? (ledgerEndpoints.getLookups() as Promise<SetupApiResponse>)
        : Promise.resolve({} as SetupApiResponse),
    enabled: Boolean(user),
    retry: false,
  });

  const holdsQuery = useQuery({
    queryKey: [
      "hold-management-list",
      page,
      statusFilter,
      debouncedSearch,
      ownerFilter,
      sortBy,
      sortDirection,
    ],
    queryFn: async () =>
      parseHoldPage(
        await ledgerEndpoints.getHolds({
          page,
          pageSize: 20,
          status: statusFilter === "ALL" ? undefined : statusFilter,
          search: debouncedSearch || undefined,
          ownerId: ownerFilter || undefined,
          sortBy,
          sortDirection,
        }),
      ),
  });

  const holds = holdsQuery.data?.items ?? [];
  const totalCount = holdsQuery.data?.totalCount ?? 0;
  const hasMore = holdsQuery.data?.hasMore ?? false;
  const loading = holdsQuery.isFetching;
  const error =
    actionError ??
    (holdsQuery.error instanceof Error
      ? holdsQuery.error.message
      : holdsQuery.error
        ? t("risk.hold.errLoad", "Không thể tải danh sách lệnh HOLD.")
        : null);

  const loadHolds = useCallback(async () => {
    setError(null);
    await holdsQuery.refetch();
  }, [holdsQuery]);

  const requestedLot = useQuery({
    queryKey: ["hold-prefill-lot", requestedLotId],
    queryFn: () =>
      ledgerEndpoints.getLot(requestedLotId) as Promise<HoldSelectableLot>,
    enabled: Boolean(requestedLotId && canIssue),
    retry: false,
  });

  const filteredHolds = holds;
  const ownerOptions = lookups.data?.owners ?? [];

  async function downloadHoldEvidence(evidenceId: string) {
    try {
      const blob = await ledgerEndpoints.getEvidence(evidenceId);
      saveExportFile(blob, `hold-evidence-${evidenceId}.bin`);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : text("Không thể tải tệp chứng cứ.", "Could not download evidence."),
      );
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-mono font-bold text-accent-danger uppercase tracking-wider block"
          >
            {t("risk.hold.badge", "QUẢN LÝ PHONG TOẢ & CẢNH BÁO RỦI RO")}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("risk.hold.title", "Lệnh Giữ Phong Toả An Toàn (HOLD Orders)")}
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            {t(
              "risk.hold.subtitle",
              "Ngăn chặn xuất xưởng khi phát hiện vi phạm MRL hoặc sai lệch chất lượng. Tuyệt đối không cho phép RELEASE tự do mà phải có quy trình cách ly vật lý.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void loadHolds()}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={t("common.refresh", "Tải lại dữ liệu")}
          >
            <ArrowsClockwiseIcon size={16} />
          </button>
          {canIssue && (
            <button
              type="button"
              onClick={() => setIsModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-accent-danger text-white font-semibold text-xs hover:opacity-90 transition-all shadow-xs"
            >
              <LockSimpleIcon size={16} weight="bold" />
              <span>{t("risk.hold.newHold", "Ban hành Lệnh HOLD mới")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
        <div className="relative lg:col-span-2">
          <MagnifyingGlass
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <input
            type="search"
            aria-label={text("Tìm lệnh HOLD", "Search HOLD orders")}
            placeholder={text(
              "Tìm mã lô, lý do, chủ sở hữu...",
              "Search lot code, reason, owner...",
            )}
            value={searchInput}
            onChange={(e) => {
              setSearchInput(e.target.value);
              setPage(1);
            }}
            className="filter-control border-ink-tertiary/20 bg-surface-raised ps-9 dark:bg-surface-overlay"
          />
        </div>

        <select
          aria-label={text("Lọc trạng thái HOLD", "Filter HOLD status")}
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="filter-control border-ink-tertiary/20 bg-surface-raised font-semibold dark:bg-surface-overlay"
        >
          <option value="ALL">
            {text("Tất cả trạng thái", "All statuses")}
          </option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="ACKNOWLEDGED">ACKNOWLEDGED</option>
          <option value="ISOLATED">ISOLATED</option>
          <option value="RESPONDED">RESPONDED</option>
        </select>

        {ownerOptions.length > 0 ? (
          <select
            aria-label={text("Lọc chủ sở hữu", "Filter by owner")}
            value={ownerFilter}
            onChange={(e) => {
              setOwnerFilter(e.target.value);
              setPage(1);
            }}
            className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
          >
            <option value="">{text("Tất cả chủ sở hữu", "All owners")}</option>
            {ownerOptions.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}

        <div className="flex items-center gap-2">
          <select
            aria-label={text("Sắp xếp HOLD theo", "Sort HOLD by")}
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value as typeof sortBy);
              setPage(1);
            }}
            className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
          >
            <option value="createdAt">
              {text("Ngày tạo", "Created date")}
            </option>
            <option value="status">{text("Trạng thái", "Status")}</option>
            <option value="owner">{text("Chủ sở hữu", "Owner")}</option>
          </select>
          <button
            type="button"
            aria-label={text("Đổi chiều sắp xếp", "Toggle sort direction")}
            onClick={() => {
              setSortDirection((d) => (d === "desc" ? "asc" : "desc"));
              setPage(1);
            }}
            className="inline-flex h-10 shrink-0 items-center justify-center rounded-lg border border-ink-tertiary/20 bg-surface-raised px-2.5 text-ink-secondary hover:text-ink-primary"
            title={sortDirection === "desc" ? "Mới/cao trước" : "Cũ/thấp trước"}
          >
            <ArrowsLeftRight size={14} />
            <span className="ml-1 font-mono text-[11px] uppercase">
              {sortDirection}
            </span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(user?.role === "CUSTOMER_EXPORT_OFFICER" ||
        user?.role === "CUSTOMER_MANAGER" ||
        user?.role === "MILL_MANAGER") && <ContainerNotices />}

      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2"
        >
          <WarningCircleIcon size={18} weight="fill" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div
          role="status"
          className="p-3.5 rounded-lg bg-functional-balanced-bg border border-functional-balanced-border/40 text-accent-primary text-xs flex items-center gap-2"
        >
          <CheckCircleIcon size={18} weight="fill" className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Table */}
      <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex justify-center">
            <GrainLoader
              label={t(
                "risk.hold.loading",
                "Đang đồng bộ danh sách lệnh HOLD...",
              )}
            />
          </div>
        ) : filteredHolds.length === 0 ? (
          error ? null : (
          <div className="py-16 px-4 text-center space-y-2">
            <CheckCircleIcon
              size={40}
              className="mx-auto text-accent-primary opacity-60"
            />
            <p className="text-sm font-semibold text-ink-primary">
              {t(
                "risk.hold.emptyTitle",
                "Không tìm thấy lệnh HOLD lô trong phạm vi hiện tại",
              )}
            </p>
            <p className="text-xs text-ink-secondary max-w-md mx-auto">
              {t(
                "risk.hold.emptyDesc",
                "Trạng thái an toàn và đạt chuẩn MRL phụ thuộc vào kết quả đánh giá tương ứng của từng lô hoặc container.",
              )}
            </p>
          </div>
          )
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/20 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3 px-4">
                    {t("risk.hold.thLot", "Lô hàng bị phong toả")}
                  </th>
                  <th className="py-3 px-4">
                    {t("risk.hold.thReason", "Lý do phát lệnh HOLD")}
                  </th>
                  <th className="py-3 px-4">
                    {t("risk.hold.thIssuedAt", "Thời điểm ban hành")}
                  </th>
                  <th className="py-3 px-4">
                    {t("risk.hold.thOwner", "Chủ sở hữu")}
                  </th>
                  <th className="py-3 px-4">
                    {t("risk.hold.thStatus", "Trạng thái")}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {t("risk.hold.thActions", "Thao tác xử lý")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10">
                {filteredHolds.map((h) => (
                  <tr
                    key={h.id}
                    className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-accent-danger">
                      <span className="inline-flex items-center gap-1.5">
                        <LockSimpleIcon size={14} weight="fill" />
                        <span>{h.lotCode}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-primary space-y-1 max-w-sm">
                      <p className="font-semibold">{h.reason}</p>
                      {h.response && (
                        <p className="text-[11px] text-ink-secondary">
                          {text("Phản hồi nhà máy", "Mill response")}:{" "}
                          {h.response}
                        </p>
                      )}
                      {h.evidenceId && (
                        <button
                          type="button"
                          onClick={() =>
                            void downloadHoldEvidence(h.evidenceId!)
                          }
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary hover:underline"
                        >
                          <DownloadSimpleIcon size={12} />
                          <span>
                            {text("Tải chứng cứ", "Download evidence")} (
                            {h.evidenceId.slice(0, 8)})
                          </span>
                        </button>
                      )}
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-secondary whitespace-nowrap">
                      <span className="inline-flex items-center gap-1">
                        <CalendarIcon size={13} />
                        <span>
                          {new Date(h.createdAt).toLocaleDateString("vi-VN")}
                        </span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-ink-secondary max-w-xs truncate">
                      {h.ownerName}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status={
                          h.status === "ISOLATED" || h.status === "RELEASED"
                            ? "COMPLIANT"
                            : h.status === "ACTIVE"
                              ? "HOLD"
                              : "PENDING"
                        }
                        label={h.status}
                        size="sm"
                      />
                    </td>
                    <td className="py-3 px-4 text-right">
                      {canRespond && (
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <Link
                            to={`${millPaths.stockTransfer}?lotId=${encodeURIComponent(h.lotId)}&holdId=${encodeURIComponent(h.id)}`}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-functional-stale-border bg-functional-stale-bg text-ink-primary font-semibold text-xs hover:opacity-90"
                          >
                            {t(
                              "risk.hold.btnTransferQuarantine",
                              "Chuyển kho cách ly",
                            )}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setActiveHold(h)}
                            className="px-2.5 py-1 rounded-lg bg-accent-primary text-white font-semibold text-xs hover:opacity-90"
                          >
                            {text("Xử lý & phản hồi", "Respond HOLD")}
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className="border-t border-ink-tertiary/15 px-4">
          <RecordPagination
            page={page}
            hasMore={hasMore}
            count={totalCount}
            onPage={setPage}
            label={t("risk.hold.title", "Lệnh HOLD")}
          />
        </div>
      </div>

      {/* Issue HOLD Modal (uses real searchable lotId & file evidence) */}
      <PlaceHoldModal
        isOpen={isModalOpen && canIssue}
        onClose={() => setIsModalOpen(false)}
        initialLot={requestedLot.data ?? null}
        onSuccess={async () => {
          setSuccessMsg(
            text(
              "Đã ban hành lệnh HOLD lên sổ cái thành công.",
              "Issued HOLD order to ledger successfully.",
            ),
          );
          await loadHolds();
        }}
      />

      {/* Respond / Isolate HOLD Modal */}
      {activeHold && canRespond && (
        <RespondHoldModal
          hold={activeHold}
          onClose={() => setActiveHold(null)}
          onSaved={async () => {
            setSuccessMsg(
              t(
                "risk.hold.updatedSuccess",
                "Đã cập nhật xử lý lệnh HOLD cho lô {{lot}}",
                {
                  lot: activeHold.lotCode,
                },
              ),
            );
            setActiveHold(null);
            await loadHolds();
          }}
        />
      )}
    </div>
  );
};

function RespondHoldModal({
  hold,
  onClose,
  onSaved,
}: {
  hold: HoldOrder;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const text = useWorkflowText();
  const uid = useId();
  const cache = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [status, setStatus] = useState<
    "ACKNOWLEDGED" | "ISOLATED" | "RESPONDED"
  >("ACKNOWLEDGED");
  const [responseText, setResponseText] = useState("");
  const [evidenceId, setEvidenceId] = useState(hold.evidenceId ?? "");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const uploadedEvidenceRef = useRef<{ file: File; id: string } | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const lotDetail = useQuery({
    queryKey: ["respond-hold-lot", hold.lotId],
    queryFn: () =>
      ledgerEndpoints.getLot(hold.lotId) as Promise<LotPositionInfo>,
  });

  const lookups = useQuery({
    queryKey: ["respond-hold-lookups"],
    queryFn: () => ledgerEndpoints.getLookups() as Promise<SetupApiResponse>,
  });

  const command = useCommand<{
    status: "ACKNOWLEDGED" | "ISOLATED" | "RESPONDED";
    response: string;
    evidenceId: string;
  }>(
    (id, input) =>
      ledgerEndpoints.respondToHold(hold.id, {
        id,
        ...input,
      }),
    onSaved,
    { persistKey: `hold-respond:${hold.id}` },
  );

  const locationsMap = useMemo(
    () => new Map((lookups.data?.locations ?? []).map((l) => [l.id, l])),
    [lookups.data?.locations],
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLocalError(null);
    if (!responseText.trim()) return;

    try {
      let resolvedEvidenceId = evidenceId.trim();
      if (evidenceFile && uploadedEvidenceRef.current?.file === evidenceFile) {
        resolvedEvidenceId = uploadedEvidenceRef.current.id;
      } else if (evidenceFile) {
        setUploading(true);
        const ownerId = hold.ownerId || user?.organizationId || "";
        const facilityId =
          lotDetail.data?.positions?.[0]?.facilityId ||
          lookups.data?.facilities?.[0]?.id ||
          "";
        if (!ownerId || !facilityId) {
          throw new Error(
            text(
              "Không xác định được cơ sở/chủ sở hữu để tải tệp chứng cứ.",
              "Could not determine owner/facility to upload evidence.",
            ),
          );
        }
        const newEvidenceId = crypto.randomUUID();
        const contentBase64 = await readFileAsBase64(evidenceFile);
        await ledgerEndpoints.uploadEvidence({
          id: newEvidenceId,
          ownerId,
          facilityId,
          fileName: evidenceFile.name,
          contentType: evidenceFile.type || "application/octet-stream",
          contentBase64,
        });
        uploadedEvidenceRef.current = { file: evidenceFile, id: newEvidenceId };
        resolvedEvidenceId = newEvidenceId;
        setEvidenceId(newEvidenceId);
      }

      if (!resolvedEvidenceId) {
        throw new Error(
          text(
            "Vui lòng tải tệp chứng cứ hoặc nhập mã chứng cứ UUID.",
            "Please upload an evidence file or provide an evidence UUID.",
          ),
        );
      }
      if (
        !/^[0-9a-fA-F]{8}(-[0-9a-fA-F]{4}){3}-[0-9a-fA-F]{12}$/.test(
          resolvedEvidenceId,
        )
      ) {
        throw new Error(
          text(
            "Mã chứng cứ phải là UUID hợp lệ.",
            "Evidence ID must be a valid UUID.",
          ),
        );
      }

      command.submit({
        status,
        response: responseText.trim(),
        evidenceId: resolvedEvidenceId,
      });
      void cache.invalidateQueries({ queryKey: ["respond-hold-lot", hold.lotId] });
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : String(err));
    } finally {
      setUploading(false);
    }
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      closeOnBackdrop={!uploading && !command.isPending}
      ariaLabel={text("Xử lý lệnh HOLD tại nhà máy", "Respond to lot HOLD")}
    >
      <div className="w-[calc(100vw-2rem)] max-w-xl rounded-2xl border border-ink-tertiary/20 bg-surface-base p-6 text-ink-primary shadow-xl dark:bg-surface-raised space-y-4">
        <div className="flex items-start gap-3 border-b border-ink-tertiary/15 pb-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-warning/15 text-accent-warning">
            <ShieldWarningIcon size={22} weight="fill" />
          </span>
          <div className="space-y-0.5">
            <h3 className="font-display text-lg font-bold">
              {text("Xử lý lệnh HOLD tại nhà máy", "Process HOLD order")} ·{" "}
              <span className="font-mono text-accent-danger">
                {hold.lotCode}
              </span>
            </h3>
            <p className="text-xs text-ink-secondary">{hold.reason}</p>
          </div>
        </div>

        {/* Lot stock positions & ISOLATION guidance */}
        <div className="rounded-xl border border-ink-tertiary/20 bg-surface-raised/50 p-3 text-xs space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-semibold text-ink-secondary">
              {text("Vị trí tồn kho của lô", "Affected lot stock positions")}
            </span>
            <Link
              to={`${millPaths.stockTransfer}?lotId=${encodeURIComponent(hold.lotId)}&holdId=${encodeURIComponent(hold.id)}`}
              className="font-semibold text-accent-primary hover:underline"
            >
              {text(
                "Mở phiếu chuyển kho cách ly (ISOLATION) →",
                "Open ISOLATION transfer →",
              )}
            </Link>
          </div>
          {lotDetail.isPending ? (
            <p className="text-ink-secondary">
              {text("Đang tải vị trí tồn...", "Loading positions...")}
            </p>
          ) : (
            <ul className="space-y-1">
              {(lotDetail.data?.positions ?? []).map((pos) => {
                const loc = locationsMap.get(pos.locationId);
                const isolated = loc?.kind === "ISOLATION";
                return (
                  <li
                    key={pos.locationId}
                    className="flex flex-wrap items-center justify-between gap-2"
                  >
                    <span>
                      {loc?.name ?? pos.locationId}{" "}
                      <span className="text-[11px] font-semibold">
                        ({isolated ? "ISOLATION" : (loc?.kind ?? "WAREHOUSE")})
                      </span>
                    </span>
                    <span className="font-mono">
                      {pos.quantityKg} kg ({text("khả dụng", "avail")}:{" "}
                      {pos.availableKg} kg)
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="space-y-4 text-xs"
        >
          <label htmlFor={`${uid}-status`} className="block space-y-1">
            <span className="font-semibold text-ink-secondary">
              {text("Trạng thái xử lý", "Response status")} *
            </span>
            <select
              id={`${uid}-status`}
              value={status}
              onChange={(e) =>
                setStatus(
                  e.target.value as "ACKNOWLEDGED" | "ISOLATED" | "RESPONDED",
                )
              }
              className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-raised px-3 py-2 focus:border-accent-primary focus:outline-none"
            >
              <option value="ACKNOWLEDGED">
                ACKNOWLEDGED — {text("Đã tiếp nhận xử lý", "Acknowledged")}
              </option>
              <option value="ISOLATED">
                ISOLATED —{" "}
                {text(
                  "Đã chuyển toàn bộ lô vào kho ISOLATION",
                  "Confirmed moved to ISOLATION",
                )}
              </option>
              <option value="RESPONDED">
                RESPONDED —{" "}
                {text("Ghi nhận báo cáo phản hồi", "Recorded full response")}
              </option>
            </select>
          </label>

          <label htmlFor={`${uid}-response`} className="block space-y-1">
            <span className="font-semibold text-ink-secondary">
              {text("Nội dung phản hồi / biên bản xử lý", "Response notes")} *
            </span>
            <textarea
              id={`${uid}-response`}
              required
              rows={3}
              maxLength={1000}
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              placeholder={text(
                "Mô tả thao tác cách ly vật lý, niêm phong hoặc kiểm tra bổ sung...",
                "Describe physical isolation, sealing, or verification actions...",
              )}
              className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-raised px-3 py-2 focus:border-accent-primary focus:outline-none"
            />
          </label>

          <div className="rounded-xl border border-dashed border-ink-tertiary/30 bg-surface-raised/40 p-3 space-y-2">
            <p className="font-semibold text-ink-secondary flex items-center gap-1.5">
              <UploadSimpleIcon size={15} className="text-accent-primary" />
              <span>
                {text("Tài liệu chứng cứ xử lý HOLD", "HOLD response evidence")}
              </span>
            </p>
            <input
              type="file"
              aria-label={text(
                "Tệp chứng cứ xử lý HOLD",
                "HOLD response evidence file",
              )}
              onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)}
              className="w-full text-[11px]"
            />
            <label htmlFor={`${uid}-evid`} className="block space-y-1">
              <span className="text-[11px] text-ink-secondary">
                {text(
                  "Mã chứng cứ UUID (tự điền khi tải tệp)",
                  "Evidence UUID (auto-filled on upload)",
                )}
              </span>
              <input
                id={`${uid}-evid`}
                type="text"
                value={evidenceId}
                onChange={(e) => setEvidenceId(e.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                className="w-full rounded-lg border border-ink-tertiary/20 bg-surface-base px-2.5 py-1.5 font-mono text-[11px]"
              />
            </label>
          </div>

          {localError && <Feedback error={new Error(localError)} />}
          <ContainerCommandFeedback
            error={command.error}
            uncertain={command.uncertain}
            retry={command.retry}
            success={command.isSuccess}
            isPending={command.isPending}
            restoredPending={command.restoredPending}
            discardPending={command.discardPending}
          />

          <div className="flex justify-end gap-2 border-t border-ink-tertiary/15 pt-3">
            <button
              type="button"
              disabled={uploading || command.isPending}
              onClick={onClose}
              className="rounded-xl border border-ink-tertiary/25 px-4 py-2 font-semibold text-ink-secondary hover:bg-surface-raised"
            >
              {text("Đóng", "Close")}
            </button>
            <button
              type="submit"
              disabled={
                uploading ||
                command.isPending ||
                command.uncertain ||
                !responseText.trim() ||
                (!evidenceFile && !evidenceId.trim())
              }
              className="rounded-xl bg-accent-primary px-4 py-2 font-semibold text-white hover:bg-accent-primary/90 disabled:opacity-50"
            >
              {uploading || command.isPending
                ? text("Đang lưu...", "Saving...")
                : text("Ghi nhận phản hồi HOLD", "Submit HOLD response")}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
