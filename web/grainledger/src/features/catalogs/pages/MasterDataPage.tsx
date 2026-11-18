import { confirmAction } from "@/app/store/feedbackStore";
import React, { useId, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collectPages } from "@/api/query";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/app/store/authStore";
import { useTranslation } from "react-i18next";
import { catalogsEndpoints } from "@/api/catalogs";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import { Modal } from "@/components/Modal";
import {
  Database,
  Plus,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  CheckCircle,
  WarningCircle,
  X,
  MagnifyingGlass,
  Tag,
  Scales,
  Flask,
  Globe,
  Certificate,
  Plant,
} from "@phosphor-icons/react";

type CatalogTab =
  | "COMMODITIES"
  | "UNITS"
  | "SUBSTANCES"
  | "MARKETS"
  | "VARIETIES"
  | "ATTRIBUTES";

interface CatalogItem {
  id: string;
  code?: string;
  name: string;
  quantityKind?: string;
  unit?: string;
  canEdit?: boolean;
  canDelete?: boolean;
}

const modalField =
  "w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg";
const modalButton =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-ink-tertiary/20 bg-surface-base px-4 py-2.5 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50";

export const MasterDataPage: React.FC = () => {
  const user = useAuthStore((state) => state.user);
  return (
    <MasterDataWorkspace
      key={[
        user?.id,
        user?.organizationId,
        user?.permissions.toSorted().join("|"),
      ].join(":")}
    />
  );
};

const MasterDataWorkspace: React.FC = () => {
  const { t } = useTranslation();
  const formId = useId();
  const [activeTab, setActiveTab] = useState<CatalogTab>("COMMODITIES");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionError, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    extra: "",
  });
  const [editingEtag, setEditingEtag] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const user = useAuthStore((state) => state.user);
  const list = useQuery({
    queryKey: [
      "master-data",
      user?.id,
      user?.organizationId,
      activeTab,
      searchQuery,
    ],
    retry: false,
    queryFn: (): Promise<CatalogItem[]> => {
      const q = searchQuery || undefined;
      switch (activeTab) {
        case "COMMODITIES":
          return collectPages((query) =>
            catalogsEndpoints.getCommodities({ ...query, q }),
          );
        case "UNITS":
          return collectPages((query) =>
            catalogsEndpoints.getMeasurementUnits({ ...query, q }),
          );
        case "SUBSTANCES":
          return collectPages((query) =>
            catalogsEndpoints.getActiveSubstances({ ...query, q }),
          );
        case "MARKETS":
          return collectPages((query) =>
            catalogsEndpoints.getMarkets({ ...query, q }),
          );
        case "VARIETIES":
          return collectPages((query) =>
            catalogsEndpoints.getRiceVarieties({ ...query, q }),
          );
        case "ATTRIBUTES":
          return collectPages((query) =>
            catalogsEndpoints.getQualityAttributes({ ...query, q }),
          );
      }
    },
  });
  const items = list.data ?? [];
  const loading = list.isPending || list.isFetching;
  const error = actionError || list.error?.message;
  const loadData = async () => {
    setError(null);
    await list.refetch();
  };

  const handleOpenCreate = () => {
    setEditingItem(null);
    setEditingEtag(null);
    setError(null);
    setSuccessMsg(null);
    setFormData({ code: "", name: "", extra: "" });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    if (submitting) return;
    setIsModalOpen(false);
    setError(null);
  };

  const readItem = (id: string) => {
    switch (activeTab) {
      case "COMMODITIES":
        return catalogsEndpoints.getCommodity(id);
      case "UNITS":
        return catalogsEndpoints.getMeasurementUnit(id);
      case "SUBSTANCES":
        return catalogsEndpoints.getActiveSubstance(id);
      case "MARKETS":
        return catalogsEndpoints.getMarket(id);
      case "VARIETIES":
        return catalogsEndpoints.getRiceVariety(id);
      case "ATTRIBUTES":
        return catalogsEndpoints.getQualityAttribute(id);
    }
  };

  const handleOpenEdit = async (item: CatalogItem) => {
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const resource = await readItem(item.id);
      if (!resource.etag) throw new Error(t("apiAudit.missingEtag"));
      const current: CatalogItem = resource.data;
      setEditingItem(current);
      setEditingEtag(resource.etag);
      setFormData({
        code: current.code || "",
        name: current.name,
        extra: current.quantityKind || current.unit || "",
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("catalogs.master.errorLoad"),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingItem) {
        if (!editingEtag) throw new Error(t("apiAudit.missingEtag"));
        // Update
        switch (activeTab) {
          case "COMMODITIES":
            await catalogsEndpoints.updateCommodity(
              editingItem.id,
              {
                name: formData.name,
              },
              editingEtag,
            );
            break;
          case "UNITS":
            await catalogsEndpoints.updateMeasurementUnit(
              editingItem.id,
              {
                code: formData.code,
                name: formData.name,
                quantityKind: formData.extra || "MASS",
              },
              editingEtag,
            );
            break;
          case "SUBSTANCES":
            await catalogsEndpoints.updateActiveSubstance(
              editingItem.id,
              {
                name: formData.name,
              },
              editingEtag,
            );
            break;
          case "MARKETS":
            await catalogsEndpoints.updateMarket(
              editingItem.id,
              {
                name: formData.name,
              },
              editingEtag,
            );
            break;
          case "VARIETIES":
            await catalogsEndpoints.updateRiceVariety(
              editingItem.id,
              {
                name: formData.name,
              },
              editingEtag,
            );
            break;
          case "ATTRIBUTES":
            await catalogsEndpoints.updateQualityAttribute(
              editingItem.id,
              {
                code: formData.code,
                name: formData.name,
                unit: formData.extra || "%",
              },
              editingEtag,
            );
            break;
        }
        setSuccessMsg(
          t("catalogs.master.successUpdate", 'Đã cập nhật mục "{{name}}"', {
            name: formData.name,
          }),
        );
      } else {
        // Create
        switch (activeTab) {
          case "COMMODITIES":
            await catalogsEndpoints.createCommodity({
              code: formData.code,
              name: formData.name,
            });
            break;
          case "UNITS":
            await catalogsEndpoints.createMeasurementUnit({
              code: formData.code,
              name: formData.name,
              quantityKind: formData.extra || "MASS",
            });
            break;
          case "SUBSTANCES":
            await catalogsEndpoints.createActiveSubstance({
              code: formData.code,
              name: formData.name,
            });
            break;
          case "MARKETS":
            await catalogsEndpoints.createMarket({
              code: formData.code,
              name: formData.name,
            });
            break;
          case "VARIETIES":
            await catalogsEndpoints.createRiceVariety({
              code: formData.code,
              name: formData.name,
            });
            break;
          case "ATTRIBUTES":
            await catalogsEndpoints.createQualityAttribute({
              code: formData.code,
              name: formData.name,
              unit: formData.extra || "%",
            });
            break;
        }
        setSuccessMsg(
          t("catalogs.master.successCreate", 'Đã tạo mới mục "{{name}}"', {
            name: formData.name,
          }),
        );
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 412) {
        setEditingEtag(null);
        setError(t("apiAudit.conflict"));
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t("catalogs.master.errorAction", "Thao tác không thành công."),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (item: CatalogItem) => {
    const supportsDeletion = ["COMMODITIES", "UNITS", "SUBSTANCES"].includes(
      activeTab,
    );
    if (!supportsDeletion) {
      setError(
        t(
          "catalogs.master.deleteUnsupported",
          "Danh mục này chưa có API xoá; hãy chỉnh sửa để ngừng sử dụng thay vì xoá.",
        ),
      );
      return;
    }
    setError(null);
    setSuccessMsg(null);
    let etag: string;
    try {
      const resource = await readItem(item.id);
      if (!resource.etag) throw new Error(t("apiAudit.missingEtag"));
      etag = resource.etag;
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t("catalogs.master.errorLoad"),
      );
      return;
    }
    const confirmed = await confirmAction({
      title: t("catalogs.master.confirmDeleteTitle", "Xác nhận xóa danh mục"),
      description: t(
        "catalogs.master.confirmDelete",
        'Xoá mục "{{name}}" khỏi danh mục vận hành?',
        {
          name: item.name,
        },
      ),
      confirmLabel: t("common.delete", "Xóa"),
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      if (activeTab === "COMMODITIES")
        await catalogsEndpoints.deleteCommodity(item.id, etag);
      if (activeTab === "UNITS")
        await catalogsEndpoints.deleteMeasurementUnit(item.id, etag);
      if (activeTab === "SUBSTANCES")
        await catalogsEndpoints.deleteActiveSubstance(item.id, etag);
      setSuccessMsg(
        t("catalogs.master.successDelete", 'Đã xoá mục "{{name}}"', {
          name: item.name,
        }),
      );
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("catalogs.master.errorDelete", "Không thể xoá mục này."));
      }
    }
  };

  const catalogContext = {
    COMMODITIES: { Icon: Tag, label: t("catalogs.master.tabCommodities") },
    UNITS: { Icon: Scales, label: t("catalogs.master.tabUnits") },
    SUBSTANCES: { Icon: Flask, label: t("catalogs.master.tabSubstances") },
    MARKETS: { Icon: Globe, label: t("catalogs.master.tabMarkets") },
    VARIETIES: { Icon: Plant, label: t("catalogs.master.tabVarieties") },
    ATTRIBUTES: {
      Icon: Certificate,
      label: t("catalogs.master.tabAttributes"),
    },
  }[activeTab];
  const CatalogIcon = catalogContext.Icon;
  const modalTitle = editingItem
    ? t("catalogs.master.modalTitleEdit")
    : t("catalogs.master.modalTitleNew");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t("catalogs.master.badge", "DANH MỤC DỮ LIỆU VẬN HÀNH")}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("catalogs.master.title", "Danh mục Chuẩn Hóa Chuỗi Cung Ứng")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {t(
              "catalogs.master.subtitle",
              "Duy trì các danh mục dùng chung: Hàng hoá lúa gạo, đơn vị đo lường, hoạt chất BVTV, thị trường xuất khẩu.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={t("catalogs.master.reload", "Tải lại danh mục")}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "motion-safe:animate-spin" : undefined}
            />
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs"
          >
            <Plus size={16} weight="bold" />
            <span>{t("catalogs.master.addNew", "Thêm Bản Ghi Mới")}</span>
          </button>
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

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-ink-tertiary/20 pb-2 overflow-x-auto text-xs font-semibold">
        {[
          {
            id: "COMMODITIES",
            labelKey: "catalogs.master.tabCommodities",
            defaultLabel: "Hàng hoá lúa gạo",
            icon: Tag,
          },
          {
            id: "SUBSTANCES",
            labelKey: "catalogs.master.tabSubstances",
            defaultLabel: "Hoạt chất BVTV",
            icon: Flask,
          },
          {
            id: "UNITS",
            labelKey: "catalogs.master.tabUnits",
            defaultLabel: "Đơn vị đo lường",
            icon: Scales,
          },
          {
            id: "MARKETS",
            labelKey: "catalogs.master.tabMarkets",
            defaultLabel: "Thị trường xuất khẩu",
            icon: Globe,
          },
          {
            id: "VARIETIES",
            labelKey: "catalogs.master.tabVarieties",
            defaultLabel: "Giống lúa canh tác",
            icon: Plant,
          },
          {
            id: "ATTRIBUTES",
            labelKey: "catalogs.master.tabAttributes",
            defaultLabel: "Chỉ tiêu chất lượng",
            icon: Certificate,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id as CatalogTab)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all shrink-0 ${
                activeTab === tab.id
                  ? "bg-accent-primary text-white shadow-xs"
                  : "bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary"
              }`}
            >
              <Icon size={15} />
              <span>{t(tab.labelKey, tab.defaultLabel)}</span>
            </button>
          );
        })}
      </div>

      {/* Search Toolbar */}
      <div className="flex justify-between p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-3">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder={t(
              "catalogs.master.searchPlaceholder",
              "Tìm theo tên hoặc mã code...",
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
          />
          <MagnifyingGlass
            size={16}
            className="absolute left-3 top-2.5 text-ink-tertiary"
          />
        </div>

        <div className="text-xs text-ink-secondary">
          {t("catalogs.master.totalRecords", "Tổng số bản ghi:")}{" "}
          <strong className="font-mono text-ink-primary">{items.length}</strong>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex justify-center">
            <GrainLoader
              label={t(
                "catalogs.master.loading",
                "Đang tải dữ liệu danh mục...",
              )}
            />
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Database
              size={40}
              className="mx-auto text-ink-tertiary opacity-60"
            />
            <p className="text-sm font-semibold text-ink-primary">
              {t("catalogs.master.noRecords", "Chưa có bản ghi nào")}
            </p>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">
              {t(
                "catalogs.master.noRecordsHint",
                'Nhấn "Thêm Bản Ghi Mới" để tạo dữ liệu cho danh mục này.',
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/20 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3 px-4">
                    {t("catalogs.master.thCode", "Mã Code")}
                  </th>
                  <th className="py-3 px-4">
                    {t("catalogs.master.thName", "Tên hiển thị chuẩn")}
                  </th>
                  <th className="py-3 px-4">
                    {t("catalogs.master.thSpecs", "Thông số / Phân loại")}
                  </th>
                  <th className="py-3 px-4">
                    {t("catalogs.master.thStatus", "Trạng thái")}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {t("catalogs.master.thActions", "Thao tác")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10">
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-accent-primary">
                      {item.code || "N/A"}
                    </td>
                    <td className="py-3 px-4 font-semibold text-ink-primary">
                      {item.name}
                    </td>
                    <td className="py-3 px-4 font-mono text-ink-secondary">
                      {item.quantityKind || item.unit || "-"}
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status="BALANCED"
                        label={t(
                          "catalogs.master.statusActive",
                          "Đang áp dụng",
                        )}
                      />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => void handleOpenEdit(item)}
                        disabled={submitting || item.canEdit === false}
                        className="p-1.5 rounded hover:bg-surface-overlay text-ink-secondary hover:text-ink-primary transition-colors"
                        title={t("catalogs.master.btnEdit", "Chỉnh sửa")}
                      >
                        <PencilSimple size={15} />
                      </button>
                      {["COMMODITIES", "UNITS", "SUBSTANCES"].includes(
                        activeTab,
                      ) && (
                        <button
                          type="button"
                          onClick={() => void handleDelete(item)}
                          disabled={submitting || item.canDelete === false}
                          className="p-1.5 rounded hover:bg-accent-danger/10 text-accent-danger transition-colors"
                          title={t("catalogs.master.btnDelete", "Xoá")}
                        >
                          <Trash size={15} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        ariaLabel={modalTitle}
        className="w-[40rem]"
        closeOnBackdrop={!submitting}
      >
        <div className="overflow-hidden rounded-2xl border border-ink-tertiary/20 bg-surface-base shadow-xs dark:bg-surface-raised">
          <header className="flex items-center justify-between gap-3 border-b border-ink-tertiary/15 bg-surface-raised p-5">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
                <CatalogIcon size={20} weight="bold" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-ink-secondary">
                  {catalogContext.label}
                </p>
                <h3 className="break-words font-display text-lg font-bold text-ink-primary">
                  {modalTitle}
                </h3>
              </div>
            </div>
            <button
              type="button"
              onClick={closeModal}
              disabled={submitting}
              aria-label={t("common.close")}
              className="rounded-full border border-ink-tertiary/20 bg-surface-base p-2.5 text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <form onSubmit={handleSubmit} aria-busy={submitting}>
            <div className="space-y-5 p-4 sm:p-6">
              {actionError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
                >
                  <WarningCircle
                    size={18}
                    weight="fill"
                    aria-hidden="true"
                    className="shrink-0"
                  />
                  <div>
                    <p>{actionError}</p>
                    {editingItem && !editingEtag && (
                      <button
                        type="button"
                        disabled={submitting}
                        className="mt-2 inline-flex min-h-9 items-center gap-2 font-semibold underline disabled:opacity-50"
                        onClick={() => void handleOpenEdit(editingItem)}
                      >
                        <ArrowsClockwise size={16} aria-hidden="true" />
                        {t("common.reload")}
                      </button>
                    )}
                  </div>
                </div>
              )}
              <fieldset
                disabled={submitting}
                className="grid gap-4 sm:grid-cols-2"
              >
                <div>
                  <label
                    htmlFor={`${formId}-code`}
                    className="mb-1.5 block text-xs font-semibold text-ink-secondary"
                  >
                    {t("catalogs.master.lblCode")}
                  </label>
                  <input
                    id={`${formId}-code`}
                    type="text"
                    autoFocus={!editingItem}
                    required
                    disabled={Boolean(editingItem) || submitting}
                    value={formData.code}
                    onChange={(e) =>
                      setFormData({ ...formData, code: e.target.value })
                    }
                    placeholder={t("catalogs.master.placeholderCode")}
                    className={`${modalField} font-mono uppercase`}
                  />
                </div>
                <div>
                  <label
                    htmlFor={`${formId}-name`}
                    className="mb-1.5 block text-xs font-semibold text-ink-secondary"
                  >
                    {t("catalogs.master.lblName")}
                  </label>
                  <input
                    id={`${formId}-name`}
                    type="text"
                    autoFocus={Boolean(editingItem)}
                    required
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    placeholder={t("catalogs.master.placeholderName")}
                    className={modalField}
                  />
                </div>
                {(activeTab === "UNITS" || activeTab === "ATTRIBUTES") && (
                  <div className="sm:col-span-2">
                    <label
                      htmlFor={`${formId}-extra`}
                      className="mb-1.5 block text-xs font-semibold text-ink-secondary"
                    >
                      {t("catalogs.master.lblExtra")}
                    </label>
                    <input
                      id={`${formId}-extra`}
                      type="text"
                      value={formData.extra}
                      onChange={(e) =>
                        setFormData({ ...formData, extra: e.target.value })
                      }
                      placeholder={t("catalogs.master.placeholderExtra")}
                      className={`${modalField} font-mono`}
                    />
                  </div>
                )}
              </fieldset>
            </div>

            <footer className="flex flex-wrap justify-end gap-2 border-t border-ink-tertiary/15 p-4 sm:px-6">
              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className={modalButton}
              >
                {t("catalogs.master.btnCancel", "Huỷ")}
              </button>
              <button
                type="submit"
                disabled={submitting || (Boolean(editingItem) && !editingEtag)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent-primary px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-accent-primary-dim disabled:opacity-50"
              >
                {submitting ? (
                  <ArrowsClockwise
                    size={16}
                    aria-hidden="true"
                    className="motion-safe:animate-spin"
                  />
                ) : (
                  <CheckCircle size={16} aria-hidden="true" />
                )}
                {submitting
                  ? t("catalogs.master.saving", "Đang lưu...")
                  : t("catalogs.master.btnSave", "Lưu bản ghi")}
              </button>
            </footer>
          </form>
        </div>
      </Modal>
    </div>
  );
};
