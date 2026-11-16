import { confirmAction } from "@/app/store/feedbackStore";
import React, { useEffect, useState } from "react";
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
}

export const MasterDataPage: React.FC = () => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<CatalogTab>("COMMODITIES");
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    extra: "",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      let res: unknown;
      switch (activeTab) {
        case "COMMODITIES":
          res = await catalogsEndpoints.getCommodities({
            q: searchQuery || undefined,
          });
          break;
        case "UNITS":
          res = await catalogsEndpoints.getMeasurementUnits({
            q: searchQuery || undefined,
          });
          break;
        case "SUBSTANCES":
          res = await catalogsEndpoints.getActiveSubstances({
            q: searchQuery || undefined,
          });
          break;
        case "MARKETS":
          res = await catalogsEndpoints.getMarkets({
            q: searchQuery || undefined,
          });
          break;
        case "VARIETIES":
          res = await catalogsEndpoints.getRiceVarieties({
            q: searchQuery || undefined,
          });
          break;
        case "ATTRIBUTES":
          res = await catalogsEndpoints.getQualityAttributes({
            q: searchQuery || undefined,
          });
          break;
      }
      const data = Array.isArray(res)
        ? res
        : res &&
            typeof res === "object" &&
            "items" in res &&
            Array.isArray(res.items)
          ? res.items
          : [];
      setItems(data as CatalogItem[]);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t("catalogs.master.errorLoad", "Không thể tải danh mục từ máy chủ."),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [activeTab, searchQuery]);

  const handleOpenCreate = () => {
    setEditingItem(null);
    setFormData({ code: "", name: "", extra: "" });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CatalogItem) => {
    setEditingItem(item);
    setFormData({
      code: item.code || "",
      name: item.name || "",
      extra: item.quantityKind || item.unit || "",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      if (editingItem) {
        // Update
        switch (activeTab) {
          case "COMMODITIES":
            await catalogsEndpoints.updateCommodity(editingItem.id, {
              name: formData.name,
            });
            break;
          case "UNITS":
            await catalogsEndpoints.updateMeasurementUnit(editingItem.id, {
              code: formData.code,
              name: formData.name,
              quantityKind: formData.extra || "MASS",
            });
            break;
          case "SUBSTANCES":
            await catalogsEndpoints.updateActiveSubstance(editingItem.id, {
              name: formData.name,
            });
            break;
          case "MARKETS":
            await catalogsEndpoints.updateMarket(editingItem.id, {
              name: formData.name,
            });
            break;
          case "VARIETIES":
            await catalogsEndpoints.updateRiceVariety(editingItem.id, {
              name: formData.name,
            });
            break;
          case "ATTRIBUTES":
            await catalogsEndpoints.updateQualityAttribute(editingItem.id, {
              code: formData.code,
              name: formData.name,
              unit: formData.extra || "%",
            });
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
      if (err instanceof Error) {
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
        await catalogsEndpoints.deleteCommodity(item.id);
      if (activeTab === "UNITS")
        await catalogsEndpoints.deleteMeasurementUnit(item.id);
      if (activeTab === "SUBSTANCES")
        await catalogsEndpoints.deleteActiveSubstance(item.id);
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
      <div className="p-4 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder={t(
              "catalogs.master.searchPlaceholder",
              "Tìm theo tên hoặc mã code...",
            )}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-base dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
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
                        onClick={() => handleOpenEdit(item)}
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
                          onClick={() => handleDelete(item)}
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
        onClose={() => setIsModalOpen(false)}
        ariaLabel={
          editingItem
            ? t("catalogs.master.modalTitleEdit", "Cập nhật bản ghi danh mục")
            : t("catalogs.master.modalTitleNew", "Thêm mới vào danh mục")
        }
      >
        <div className="w-full max-w-md bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in focus:rounded-lg">
          <div className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-ink-primary">
              {editingItem
                ? t(
                    "catalogs.master.modalTitleEdit",
                    "Cập nhật bản ghi danh mục",
                  )
                : t("catalogs.master.modalTitleNew", "Thêm mới vào danh mục")}
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
              <label className="block font-semibold text-ink-secondary mb-1">
                {t("catalogs.master.lblCode", "Mã Code định danh *")}
              </label>
              <input
                type="text"
                required
                disabled={Boolean(editingItem)}
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value })
                }
                placeholder={t(
                  "catalogs.master.placeholderCode",
                  "VD: PADDY_OM5451, KG, TCZ",
                )}
                className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                {t("catalogs.master.lblName", "Tên hiển thị đầy đủ *")}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder={t(
                  "catalogs.master.placeholderName",
                  "VD: Lúa tươi OM5451, Kilogram, Tricyclazole",
                )}
                className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full"
              />
            </div>

            {(activeTab === "UNITS" || activeTab === "ATTRIBUTES") && (
              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  {t(
                    "catalogs.master.lblExtra",
                    "Loại đại lượng / Ký hiệu đo lường",
                  )}
                </label>
                <input
                  type="text"
                  value={formData.extra}
                  onChange={(e) =>
                    setFormData({ ...formData, extra: e.target.value })
                  }
                  placeholder={t(
                    "catalogs.master.placeholderExtra",
                    "VD: MASS, AREA, %",
                  )}
                  className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full font-mono"
                />
              </div>
            )}

            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary"
              >
                {t("catalogs.master.btnCancel", "Huỷ")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60"
              >
                {submitting
                  ? t("catalogs.master.saving", "Đang lưu...")
                  : t("catalogs.master.btnSave", "Lưu bản ghi")}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
