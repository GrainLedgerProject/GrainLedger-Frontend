import { confirmAction } from "@/app/store/feedbackStore";
import React, { useEffect, useState, useCallback, useId } from "react";
import { selectSessionOwner } from "@/app/store/sessionOwner";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { DuplicateWarning } from "../components/DuplicateWarning";
import {
  captureWasRejected,
  loadPendingCapture,
  submitPendingCapture,
} from "../offline/pendingCapture";
import { fieldPaths } from "../paths";
import { useTranslation } from "react-i18next";
import {
  procurementEndpoints,
  type RegisterFarmerRequest,
} from "@/api/procurement";
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import {
  getCachedFarmers,
  saveCachedFarmers,
  type CachedFarmer,
} from "@/features/field/offline/offlineCache";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { RecordPagination } from "@/shared/ui/RecordWorkspace";
import { Feedback } from "@/shared/ui/Workflow";
import {
  UserPlus,
  MagnifyingGlass,
  Phone,
  IdentificationCard,
  MapPin,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  CheckCircle,
  WarningCircle,
  X,
  CloudSlash,
  Eye,
} from "@phosphor-icons/react";
import { Link, useInRouterContext } from "react-router-dom";

interface FarmerRecord {
  id: string;
  code: string;
  name: string;
  contact?: string;
  createdAt?: string;
  version?: number;
  totalPlots?: number;
  totalAreaHa?: number;
}

interface FarmerPlotSummary {
  id: string;
  code: string;
  areaHa: number;
}

export const FarmerRegistrationPage: React.FC = () => {
  const { t } = useTranslation();
  const inRouter = useInRouterContext();
  const { user } = useAuthStore();
  const canWrite = user?.permissions.includes("farms.write") ?? false;
  const text = useWorkflowText();
  const owner = selectSessionOwner({ user });
  const storageKey = owner ? `grainledger:farmer:${owner}` : "";
  const isOnline = useUiStore((state) => state.isOnline);
  const [farmers, setFarmers] = useState<FarmerRecord[]>([]);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Farmer detail modal state
  const [viewingFarmer, setViewingFarmer] = useState<FarmerRecord | null>(null);
  const [farmerPlots, setFarmerPlots] = useState<FarmerPlotSummary[]>([]);
  const [farmerPlotsPage, setFarmerPlotsPage] = useState(1);
  const [farmerPlotsHasMore, setFarmerPlotsHasMore] = useState(false);
  const [farmerPlotsTotal, setFarmerPlotsTotal] = useState(0);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFarmer, setEditingFarmer] = useState<FarmerRecord | null>(null);
  const formId = useId();
  const [formData, setFormData] = useState({
    name: "",
    contact: "",
  });
  const [formError, setFormError] = useState<Error | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingRegistration, setPendingRegistration] =
    useState<RegisterFarmerRequest | null>(null);

  // Manual reload / refresh handler used by user actions (reload button, submit, delete)
  const loadFarmers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const cached = await getCachedFarmers();
      if (cached && cached.length > 0) {
        setFarmers(cached as FarmerRecord[]);
      }

      if (isOnline) {
        const params: Record<string, string | number> = { page, pageSize: 20 };
        if (searchQuery) params.search = searchQuery;
        const res = await procurementEndpoints.getFarmers(params);
        const items = Array.isArray(res)
          ? res
          : (res as { items?: FarmerRecord[] })?.items || [];
        const total = Array.isArray(res)
          ? res.length
          : ((res as { totalCount?: number })?.totalCount ?? items.length);
        const more = Array.isArray(res)
          ? false
          : Boolean((res as { hasMore?: boolean })?.hasMore);
        setFarmers(items as FarmerRecord[]);
        setTotalCount(total);
        setHasMore(more);
        if (items.length > 0) {
          void saveCachedFarmers(items as CachedFarmer[], false);
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t(
            "field.farmer.errLoad",
            "Không thể tải danh sách nông hộ từ máy chủ.",
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  }, [isOnline, page, searchQuery, t]);

  // Synchronize effect with external system (network / cache) using active cancellation flag
  useEffect(() => {
    let active = true;

    async function syncFarmers() {
      try {
        // 1. Immediately read cached farmers
        const cached = await getCachedFarmers();
        if (!active) return;
        if (cached && cached.length > 0 && page === 1 && !searchQuery) {
          setFarmers(cached as FarmerRecord[]);
        }

        // 2. If online, fetch fresh farmers from server
        if (isOnline) {
          const params: Record<string, string | number> = {
            page,
            pageSize: 20,
          };
          if (searchQuery) params.search = searchQuery;
          const res = await procurementEndpoints.getFarmers(params);
          if (!active) return;
          const items = Array.isArray(res)
            ? res
            : (res as { items?: FarmerRecord[] })?.items || [];
          const total = Array.isArray(res)
            ? res.length
            : ((res as { totalCount?: number })?.totalCount ?? items.length);
          const more = Array.isArray(res)
            ? false
            : Boolean((res as { hasMore?: boolean })?.hasMore);
          setFarmers(items as FarmerRecord[]);
          setTotalCount(total);
          setHasMore(more);
          if (items.length > 0) {
            void saveCachedFarmers(items as CachedFarmer[], false);
          }
        }
      } catch (err: unknown) {
        if (!active) return;
        if (err instanceof Error) {
          setError(err.message);
        } else {
          setError(
            t(
              "field.farmer.errLoad",
              "Không thể tải danh sách nông hộ từ máy chủ.",
            ),
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void syncFarmers();

    return () => {
      active = false;
    };
  }, [isOnline, page, searchQuery, t]);

  const openFarmerDetail = useCallback(
    async (farmer: FarmerRecord, targetPage = 1) => {
      setViewingFarmer(farmer);
      setFarmerPlotsPage(targetPage);
      setLoadingDetail(true);
      try {
        const [detailRes, plotsRes] = await Promise.all([
          procurementEndpoints.getFarmer(farmer.id).catch(() => null),
          procurementEndpoints
            .getPlots({ farmerId: farmer.id, page: targetPage, pageSize: 10 })
            .catch(() => null),
        ]);
        if (detailRes && typeof detailRes === "object") {
          setViewingFarmer((prev) => ({
            ...(prev ?? farmer),
            ...(detailRes as Partial<FarmerRecord>),
          }));
        }
        const plotItems = Array.isArray(plotsRes)
          ? plotsRes
          : ((plotsRes as { items?: FarmerPlotSummary[] } | null)?.items ?? []);
        setFarmerPlots(plotItems as FarmerPlotSummary[]);
        setFarmerPlotsTotal(
          Array.isArray(plotsRes)
            ? plotItems.length
            : ((plotsRes as { totalCount?: number } | null)?.totalCount ??
                plotItems.length),
        );
        setFarmerPlotsHasMore(
          Array.isArray(plotsRes)
            ? false
            : Boolean((plotsRes as { hasMore?: boolean } | null)?.hasMore),
        );
      } finally {
        setLoadingDetail(false);
      }
    },
    [],
  );

  const handleOpenCreate = () => {
    setEditingFarmer(null);
    setFormError(null);
    const pending = storageKey
      ? (loadPendingCapture<RegisterFarmerRequest>(storageKey) ??
        pendingRegistration)
      : pendingRegistration;
    setPendingRegistration(pending);
    setFormData({
      name: pending?.payload?.name ?? "",
      contact: pending?.payload?.contact ?? "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (farmer: FarmerRecord) => {
    setEditingFarmer(farmer);
    setFormError(null);
    setFormData({
      name: farmer.name || "",
      contact: farmer.contact || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    const name = formData.name.trim();
    const contact = formData.contact.trim() || null;
    if (!name) {
      setFormError(
        new Error(
          t("field.farmer.nameRequired", "Vui lòng nhập họ và tên nông dân."),
        ),
      );
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setSuccessMsg(null);

    try {
      if (editingFarmer) {
        const version = editingFarmer.version;
        if (version === undefined || version < 1) {
          throw new Error(
            t(
              "field.farmer.reloadBeforeEditing",
              "Tải lại danh sách nông hộ trước khi chỉnh sửa.",
            ),
          );
        }
        await procurementEndpoints.updateFarmer(editingFarmer.id, {
          code: null,
          name,
          contact,
          expectedVersion: version,
        });
        setSuccessMsg(
          t(
            "field.farmer.updatedSuccess",
            "Đã cập nhật thông tin nông hộ {{name}}",
            {
              name,
            },
          ),
        );
      } else {
        const request = pendingRegistration ?? {
          deviceId: "grainledger-web",
          clientOperationId: crypto.randomUUID(),
          capturedAt: new Date().toISOString(),
          payloadSchemaVersion: 2,
          payload: { entityId: crypto.randomUUID(), code: null, name, contact },
        };
        setPendingRegistration(request);
        const farmer = await (storageKey
          ? submitPendingCapture(
              storageKey,
              request,
              procurementEndpoints.createFarmer,
            )
          : procurementEndpoints.createFarmer(request));
        setPendingRegistration(null);
        setSuccessMsg(
          t(
            "field.farmer.registeredSuccess",
            "Đã đăng ký nông hộ {{name}} (mã {{code}})",
            {
              name: farmer.name,
              code: farmer.code,
            },
          ),
        );
      }

      setIsModalOpen(false);
      await loadFarmers();
    } catch (err: unknown) {
      if (!editingFarmer && captureWasRejected(err))
        setPendingRegistration(null);
      setFormError(
        err instanceof Error
          ? err
          : new Error(
              t("field.farmer.errAction", "Thao tác không thành công."),
            ),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (farmer: FarmerRecord) => {
    const confirmed = await confirmAction({
      title: t("field.farmer.confirmDeleteTitle", "Xác nhận xóa nông hộ"),
      description: t(
        "field.farmer.confirmDelete",
        'Bạn có chắc muốn xoá hồ sơ nông hộ "{{name}}"?',
        {
          name: farmer.name,
        },
      ),
      confirmLabel: t("common.delete", "Xóa"),
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await procurementEndpoints.deleteFarmer(farmer.id, {
        version: farmer.version || 1,
      });
      setSuccessMsg(
        t("field.farmer.deletedSuccess", "Đã xoá hồ sơ nông hộ {{name}}", {
          name: farmer.name,
        }),
      );
      await loadFarmers();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("field.farmer.errDelete", "Không thể xoá nông hộ."));
      }
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
            {t("field.farmer.badge", "QUẢN LÝ NGUỒN CUNG ỨNG NÔNG HỘ")}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("field.farmer.pageTitle", "Đăng ký Nông hộ & Hồ sơ Canh tác")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {t(
              "field.farmer.pageSubtitle",
              "Quản lý định danh các nông hộ nhỏ liên kết chuỗi cung ứng lúa gạo tại Đồng bằng sông Cửu Long.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadFarmers}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={t("common.refresh", "Tải lại danh sách")}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "motion-safe:animate-spin" : undefined}
            />
          </button>
          {canWrite && (
            <button
              type="button"
              onClick={handleOpenCreate}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs"
            >
              <UserPlus size={16} weight="bold" />
              <span>{t("field.farmer.btnAddFarmer", "Thêm Nông hộ mới")}</span>
            </button>
          )}
        </div>
      </div>

      {/* Offline Notice */}
      {!isOnline && (
        <div className="p-3.5 rounded-xl bg-functional-stale-bg border border-functional-stale-border/60 text-accent-warning text-xs flex items-center gap-2.5 shadow-xs">
          <CloudSlash size={20} weight="fill" className="shrink-0" />
          <div>
            <p className="font-bold text-ink-primary">
              {t("field.farmer.offlineTitle", "Chế độ hiện trường ngoại tuyến")}
            </p>
            <p className="text-ink-secondary text-xs mt-0.5">
              {t(
                "field.farmer.offlineDesc",
                "Hiển thị danh sách nông hộ đã lưu trên thiết bị để hỗ trợ lập phiếu thu mua ngoại tuyến.",
              )}
            </p>
          </div>
        </div>
      )}

      {/* Alert Notices */}
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

      {/* Search & Statistics Filter Bar */}
      <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-3">
        <div className="relative w-full sm:w-80">
          <MagnifyingGlass
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <input
            type="text"
            placeholder={t(
              "field.farmer.searchPlaceholder",
              "Tìm theo tên nông hộ hoặc mã số...",
            )}
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="filter-control border-ink-tertiary/20 bg-surface-base ps-10 font-body dark:bg-surface-base"
          />
        </div>

        <div className="flex items-center gap-4 text-xs text-ink-secondary">
          <div>
            {t("field.farmer.totalFarmers", "Tổng số nông hộ:")}{" "}
            <strong className="font-mono text-ink-primary font-bold">
              {totalCount || farmers.length}
            </strong>
          </div>
          <div className="hidden md:block">
            {t("field.farmer.orgInCharge", "Doanh nghiệp phụ trách:")}{" "}
            <span className="font-semibold text-accent-primary">
              {user?.organizationName ||
                t("field.farmer.allFarmers", "Tất cả nông hộ")}
            </span>
          </div>
        </div>
      </div>

      {/* Farmers Data Table */}
      <div className="border dark:border-surface-overlay rounded-xl border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex justify-center">
            <GrainLoader
              label={t("field.farmer.loading", "Đang tải danh sách nông hộ...")}
            />
          </div>
        ) : farmers.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <IdentificationCard
              size={40}
              className="mx-auto text-ink-tertiary opacity-60"
            />
            <p className="text-sm font-semibold text-ink-primary">
              {t("field.farmer.emptyTitle", "Chưa có nông hộ nào")}
            </p>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">
              {t(
                "field.farmer.emptyDesc",
                'Nhấn "Thêm Nông hộ mới" để đăng ký hồ sơ nông dân liên kết chuỗi thu mua lúa gạo.',
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="dark:border-surface-overlay border bg-surface-raised dark:bg-surface-overlay border-ink-tertiary/20 text-ink-secondary font-semibold uppercase tracking-wider text-xs shadow-xs">
                <tr>
                  <th className="py-3 px-4">
                    {t("field.farmer.thCode", "Mã số")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.farmer.thName", "Họ và Tên nông dân")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.farmer.thContact", "Số điện thoại / Liên hệ")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.farmer.thPlots", "Thửa ruộng liên kết")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.farmer.thStatus", "Trạng thái")}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {t("field.farmer.thActions", "Thao tác")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10">
                {farmers.map((farmer) => (
                  <tr
                    key={farmer.id}
                    className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-accent-primary">
                      {farmer.code || "N/A"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-ink-primary">
                      <button
                        type="button"
                        onClick={() => void openFarmerDetail(farmer, 1)}
                        className="text-left hover:text-accent-primary hover:underline cursor-pointer"
                      >
                        {farmer.name}
                      </button>
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-secondary">
                      {farmer.contact ? (
                        <span className="inline-flex items-center gap-1">
                          <Phone size={13} className="text-ink-tertiary" />
                          <span>{farmer.contact}</span>
                        </span>
                      ) : (
                        <span className="text-ink-tertiary italic">
                          {t("field.farmer.notRecorded", "Chưa ghi nhận")}
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center gap-1 font-mono text-xs">
                        <MapPin size={13} className="text-accent-primary" />
                        <a
                          className="underline underline-offset-2"
                          href={`${fieldPaths.plots}?farmerId=${encodeURIComponent(farmer.id)}`}
                        >
                          {farmer.totalPlots == null
                            ? text("Xem thửa ruộng", "View plots")
                            : t("field.farmer.plotsUnit", "{{count}} thửa", {
                                count: farmer.totalPlots,
                              })}
                        </a>
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status="BALANCED"
                        label={t("field.farmer.statusVerified", "Đã xác thực")}
                      />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => void openFarmerDetail(farmer, 1)}
                        className="p-1.5 rounded hover:bg-surface-overlay text-ink-secondary hover:text-accent-primary transition-colors"
                        title={text("Xem hồ sơ nông hộ", "View farmer profile")}
                      >
                        <Eye size={15} />
                      </button>
                      {canWrite && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(farmer)}
                            className="p-1.5 rounded hover:bg-surface-overlay text-ink-secondary hover:text-ink-primary transition-colors"
                            title={t(
                              "field.farmer.editFarmer",
                              "Chỉnh sửa nông hộ",
                            )}
                          >
                            <PencilSimple size={15} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(farmer)}
                            className="p-1.5 rounded hover:bg-accent-danger/10 text-accent-danger transition-colors"
                            title={t(
                              "field.farmer.deleteFarmer",
                              "Xoá nông hộ",
                            )}
                          >
                            <Trash size={15} />
                          </button>
                        </>
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
            label={t("field.farmer.title", "Nông hộ")}
          />
        </div>
      </div>

      {/* Farmer Profile & Linked Plots Detail Modal */}
      <Modal
        isOpen={Boolean(viewingFarmer)}
        onClose={() => setViewingFarmer(null)}
        ariaLabel={text("Hồ sơ chi tiết nông hộ", "Farmer profile details")}
      >
        {viewingFarmer && (
          <div className="w-[calc(100vw-2rem)] max-w-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
            <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
              <div>
                <span className="font-mono text-xs font-bold text-accent-primary">
                  {viewingFarmer.code}
                </span>
                <h3 className="font-display text-lg font-bold text-ink-primary">
                  {viewingFarmer.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingFarmer(null)}
                aria-label={t("common.close", "Đóng")}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary"
              >
                <X size={18} />
              </button>
            </header>

            <div className="p-5 space-y-4 text-xs">
              <dl className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl bg-surface-raised/60 dark:bg-surface-overlay/40 border border-ink-tertiary/15">
                <div>
                  <dt className="text-ink-tertiary">
                    {text("Mã nông hộ", "Farmer code")}
                  </dt>
                  <dd className="font-mono font-bold text-ink-primary mt-0.5">
                    {viewingFarmer.code}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-tertiary">
                    {text("Liên hệ", "Contact")}
                  </dt>
                  <dd className="text-ink-primary mt-0.5">
                    {viewingFarmer.contact || "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-ink-tertiary">
                    {text("Ngày đăng ký", "Registered at")}
                  </dt>
                  <dd className="font-mono text-ink-primary mt-0.5">
                    {viewingFarmer.createdAt
                      ? new Date(viewingFarmer.createdAt).toLocaleString(
                          "vi-VN",
                        )
                      : "—"}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <h4 className="font-bold text-sm text-ink-primary">
                  {text("Thửa ruộng liên kết", "Linked plots")} (
                  {farmerPlotsTotal})
                </h4>
                {canWrite &&
                  (inRouter ? (
                    <Link
                      to={`${fieldPaths.plots}?farmerId=${encodeURIComponent(viewingFarmer.id)}&create=1`}
                      onClick={() => setViewingFarmer(null)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 font-semibold text-white hover:bg-accent-primary-dim"
                    >
                      <MapPin size={14} weight="bold" />
                      <span>
                        {text("Thêm thửa cho nông hộ", "Add plot for farmer")}
                      </span>
                    </Link>
                  ) : (
                    <a
                      href={`${fieldPaths.plots}?farmerId=${encodeURIComponent(viewingFarmer.id)}&create=1`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-primary px-3 py-1.5 font-semibold text-white hover:bg-accent-primary-dim"
                    >
                      <MapPin size={14} weight="bold" />
                      <span>
                        {text("Thêm thửa cho nông hộ", "Add plot for farmer")}
                      </span>
                    </a>
                  ))}
              </div>

              {loadingDetail ? (
                <div className="py-6 flex justify-center">
                  <GrainLoader
                    label={text(
                      "Đang tải thửa ruộng liên kết...",
                      "Loading linked plots...",
                    )}
                  />
                </div>
              ) : farmerPlots.length === 0 ? (
                <p className="py-6 text-center text-ink-secondary border border-dashed border-ink-tertiary/20 rounded-xl">
                  {text(
                    "Nông hộ chưa có thửa ruộng nào được đăng ký.",
                    "No plots registered for this farmer yet.",
                  )}
                </p>
              ) : (
                <ul className="divide-y divide-ink-tertiary/15 rounded-xl border border-ink-tertiary/15 bg-surface-raised/30">
                  {farmerPlots.map((p) => (
                    <li
                      key={p.id}
                      className="flex items-center justify-between px-3.5 py-2.5"
                    >
                      <a
                        href={`${fieldPaths.plots}?farmerId=${encodeURIComponent(viewingFarmer.id)}`}
                        className="font-mono font-bold text-accent-primary hover:underline"
                      >
                        {p.code}
                      </a>
                      <span className="font-mono text-ink-primary">
                        {Number(p.areaHa).toFixed(2)} ha
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <RecordPagination
                page={farmerPlotsPage}
                hasMore={farmerPlotsHasMore}
                count={farmerPlotsTotal}
                onPage={(nextPage) =>
                  void openFarmerDetail(viewingFarmer, nextPage)
                }
                label={text("Thửa ruộng liên kết", "Linked plots")}
              />
            </div>
          </div>
        )}
      </Modal>

      {/* Create / Edit Farmer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        className="w-96"
        ariaLabel={
          editingFarmer
            ? t("field.farmer.modalEdit", "Cập nhật nông hộ")
            : t("field.farmer.modalNew", "Đăng ký nông hộ")
        }
      >
        <div className="w-full bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in focus:rounded-lg">
          <div className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-ink-primary">
              {editingFarmer
                ? t("field.farmer.modalEditTitle", "Cập nhật thông tin Nông hộ")
                : t("field.farmer.modalAddTitle", "Đăng ký Nông hộ mới")}
            </h3>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            <div>
              <p className="mb-1 font-semibold text-ink-secondary">
                {t("field.farmer.farmerCodeLabel", "Mã nông hộ")}
              </p>
              {editingFarmer ? (
                <p className="font-mono text-ink-primary">
                  {editingFarmer.code}
                </p>
              ) : (
                <p className="text-ink-secondary">
                  {t(
                    "field.farmer.farmerCodeAssigned",
                    "Hệ thống sẽ cấp mã sau khi đăng ký.",
                  )}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor={`${formId}-name`}
                className="block font-semibold text-ink-secondary mb-1"
              >
                {t("field.farmer.farmerNameLabel", "Họ và tên Nông dân *")}
              </label>
              <input
                id={`${formId}-name`}
                type="text"
                required
                value={formData.name}
                disabled={
                  submitting || (!editingFarmer && Boolean(pendingRegistration))
                }
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="VD: Nguyễn Văn An"
                className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
              />
            </div>

            <div>
              <label
                htmlFor={`${formId}-contact`}
                className="block font-semibold text-ink-secondary mb-1"
              >
                {t(
                  "field.farmer.farmerContactLabel",
                  "Số điện thoại / Thông tin liên hệ",
                )}
              </label>
              <input
                id={`${formId}-contact`}
                type="text"
                value={formData.contact}
                disabled={
                  submitting || (!editingFarmer && Boolean(pendingRegistration))
                }
                onChange={(e) =>
                  setFormData({ ...formData, contact: e.target.value })
                }
                placeholder="VD: 0912 345 678 · Huyện Cái Bè, Tiền Giang"
                className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
              />
            </div>

            <DuplicateWarning
              request={
                isModalOpen &&
                isOnline &&
                !submitting &&
                (editingFarmer || !pendingRegistration) &&
                formData.name.trim().length >= 2
                  ? {
                      name: formData.name.trim(),
                      contact: formData.contact.trim() || null,
                      excludeId: editingFarmer?.id ?? null,
                    }
                  : null
              }
            />
            {!editingFarmer && pendingRegistration && !submitting && (
              <p role="status">
                {text(
                  "Lưu lại để gửi đúng yêu cầu đang chờ.",
                  "Save again to retry the pending request.",
                )}
              </p>
            )}
            <Feedback error={formError} />
            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary"
              >
                {t("common.cancel", "Huỷ")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60"
              >
                {submitting
                  ? t("common.saving", "Đang lưu...")
                  : editingFarmer
                    ? t("common.saveChanges", "Lưu thay đổi")
                    : t("common.register", "Đăng ký")}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
