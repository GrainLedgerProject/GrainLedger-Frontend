import { confirmAction } from "@/app/store/feedbackStore";
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { pageItems } from "@/api/query";
import { useTranslation } from "react-i18next";
import { procurementEndpoints } from "@/api/procurement";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { MapLocationPicker } from "@/features/field/components/MapLocationPicker";
import {
  MapPin,
  MagnifyingGlass,
  Plus,
  ArrowsClockwise,
  PencilSimple,
  Trash,
  CheckCircle,
  WarningCircle,
  X,
  Polygon,
  User,
  Eye,
} from "@phosphor-icons/react";

interface PlotRecord {
  id: string;
  code: string;
  farmerId: string;
  farmerName?: string;
  areaHa: number;
  geometry?: { coordinates?: unknown };
  version?: number;
  variety?: string;
}

interface FarmerOption {
  id: string;
  name: string;
  code: string;
}

/**
 * Format coordinates for user display (Latitude, Longitude)
 */
function formatDisplayCoord(geometry?: { coordinates?: unknown }): string {
  if (!geometry?.coordinates) return "";
  const coords = geometry.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const p0 = Number(coords[0]);
    const p1 = Number(coords[1]);
    // GeoJSON standard RFC 7946 is [longitude, latitude]
    if (p0 > 50 && p1 < 30) {
      return `${p1.toFixed(6)}, ${p0.toFixed(6)}`;
    }
    return `${p0.toFixed(6)}, ${p1.toFixed(6)}`;
  }
  return "";
}

/**
 * Parse input string into RFC 7946 GeoJSON Point [longitude, latitude]
 */
function parseToGeoJsonPoint(coordStr: string): {
  type: "Point";
  coordinates: [number, number];
} {
  if (!coordStr.trim()) throw new Error("Cần chọn tọa độ thửa ruộng.");

  const parts = coordStr.split(",").map((p) => parseFloat(p.trim()));
  if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
    const [p0, p1] = parts;
    // If user input is "lat, lng" (e.g. 10.3541, 106.0125)
    if (p0 >= -90 && p0 <= 90 && p1 >= -180 && p1 <= 180) {
      return { type: "Point", coordinates: [p1, p0] }; // RFC 7946 requires [longitude, latitude]
    }
    // If user input was already [lng, lat]
    if (p0 >= -180 && p0 <= 180 && p1 >= -90 && p1 <= 90) {
      return { type: "Point", coordinates: [p0, p1] };
    }
  }
  throw new Error("Tọa độ thửa ruộng không hợp lệ.");
}

export const PlotRegistrationPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFarmerId, setSelectedFarmerId] = useState<string>("");
  const [actionError, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State for Create/Edit
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlot, setEditingPlot] = useState<PlotRecord | null>(null);
  const [formData, setFormData] = useState({
    code: "",
    farmerId: "",
    areaHa: 1.5,
    coordinates: "",
  });
  const [submitting, setSubmitting] = useState(false);

  // Modal State for Viewing Plot Map
  const [viewingMapPlot, setViewingMapPlot] = useState<PlotRecord | null>(null);

  const plotsQuery = useQuery({
    queryKey: ["field-plots", searchQuery, selectedFarmerId, i18n.language],
    queryFn: async () => {
      const plotParams: Record<string, string | number> = { pageSize: 50 };
      if (searchQuery) plotParams.search = searchQuery;
      if (selectedFarmerId) plotParams.farmerId = selectedFarmerId;

      const [plotsRes, farmersRes] = await Promise.all([
        procurementEndpoints.getPlots(plotParams),
        procurementEndpoints.getFarmers({ pageSize: 100 }),
      ]);

      const plotItems = pageItems<PlotRecord>(plotsRes);
      const farmerItems = pageItems<FarmerOption>(farmersRes);

      // Map farmer names to plots
      const farmerMap = new Map(farmerItems.map((f) => [f.id, f.name]));
      const enrichedPlots = plotItems.map((p) => ({
        ...p,
        farmerName:
          farmerMap.get(p.farmerId) ||
          t("field.plot.unknownFarmer", "Nông hộ chưa rõ"),
      }));
      return { plots: enrichedPlots, farmers: farmerItems };
    },
  });
  const { plots = [], farmers = [] } = plotsQuery.data ?? {};
  const loading = plotsQuery.isFetching;
  const error = actionError ?? plotsQuery.error?.message;
  const loadData = () => { setError(null); return plotsQuery.refetch(); };

  const handleOpenCreate = () => {
    setEditingPlot(null);
    setFormData({
      code: "",
      farmerId: farmers[0]?.id || "",
      areaHa: 0,
      coordinates: "",
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plot: PlotRecord) => {
    setEditingPlot(plot);
    setFormData({
      code: plot.code || "",
      farmerId: plot.farmerId || "",
      areaHa: plot.areaHa || 1.0,
      coordinates: formatDisplayCoord(plot.geometry),
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.farmerId) {
      setError(
        t(
          "field.plot.errSelectFarmer",
          "Vui lòng chọn Nông hộ sở hữu thửa ruộng.",
        ),
      );
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const geometryObj = parseToGeoJsonPoint(formData.coordinates);

      if (editingPlot) {
        // Update
        await procurementEndpoints.updatePlot(editingPlot.id, {
          farmerId: formData.farmerId,
          code: formData.code.trim(),
          areaHa: Number(formData.areaHa),
          geometry: geometryObj,
          expectedVersion: editingPlot.version || 1,
        });
        setSuccessMsg(
          t("field.plot.updatedSuccess", "Đã cập nhật thửa ruộng {{code}}", {
            code: formData.code,
          }),
        );
      } else {
        // Create
        const entityId = crypto.randomUUID();
        const clientOperationId = crypto.randomUUID();
        await procurementEndpoints.createPlot({
          deviceId: "grainledger-web",
          clientOperationId,
          capturedAt: new Date().toISOString(),
          payloadSchemaVersion: 2,
          payload: {
            entityId,
            farmerId: formData.farmerId,
            code: formData.code.trim(),
            areaHa: Number(formData.areaHa),
            geometry: geometryObj,
          },
        });
        setSuccessMsg(
          t(
            "field.plot.createdSuccess",
            "Đã đăng ký thành công thửa ruộng {{code}}",
            {
              code: formData.code,
            },
          ),
        );
      }

      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("field.plot.errAction", "Thao tác không thành công."));
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (plot: PlotRecord) => {
    const confirmed = await confirmAction({
      title: t("field.plot.confirmDeleteTitle", "Xác nhận xóa thửa ruộng"),
      description: t(
        "field.plot.confirmDelete",
        'Bạn có chắc muốn xoá thửa ruộng "{{code}}"?',
        {
          code: plot.code,
        },
      ),
      confirmLabel: t("common.delete", "Xóa"),
      variant: "danger",
    });
    if (!confirmed) return;

    try {
      await procurementEndpoints.deletePlot(plot.id, {
        version: plot.version || 1,
      });
      setSuccessMsg(
        t("field.plot.deletedSuccess", "Đã xoá thửa ruộng {{code}}", {
          code: plot.code,
        }),
      );
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("field.plot.errDelete", "Không thể xoá thửa ruộng."));
      }
    }
  };

  const totalHectares = plots.reduce(
    (acc, p) => acc + (Number(p.areaHa) || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t("field.plot.badge", "ĐĂNG KÝ THỬA RUỘNG & BẢN ĐỒ GIS")}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("field.plot.pageTitle", "Quản lý Thửa đất & Vùng trồng Lúa")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {t(
              "field.plot.pageSubtitle",
              "Định vị toạ độ thửa đất nông hộ trên bản đồ tương tác phục vụ truy xuất nguồn gốc ISO 22095.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
            title={t("common.refresh", "Tải lại dữ liệu")}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "motion-safe:animate-spin" : undefined}
            />
          </button>
          <button
            type="button"
            onClick={handleOpenCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs cursor-pointer"
          >
            <Plus size={16} weight="bold" />
            <span>{t("field.plot.btnAddPlot", "Thêm Thửa ruộng mới")}</span>
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

      {/* Controls & Filter Bar */}
      <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-3">
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder={t(
                "field.plot.searchPlaceholder",
                "Tìm theo mã thửa đất...",
              )}
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); }}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-lg"
            />
            <MagnifyingGlass
              size={16}
              className="absolute left-3 top-2.5 text-ink-tertiary"
            />
          </div>

          <select
            value={selectedFarmerId}
            onChange={(e) => { setSelectedFarmerId(e.target.value); }}
            className="px-3 py-2 text-xs rounded-lg bg-surface-base dark:bg-surface-base border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none font-semibold text-ink-primary focus:rounded-lg"
          >
            <option value="">
              {t("field.plot.allFarmers", "Tất cả Nông hộ")}
            </option>
            {farmers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name} ({f.code})
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 text-xs text-ink-secondary">
          <div>
            {t("field.plot.totalPlots", "Số thửa ruộng:")}{" "}
            <strong className="font-mono text-ink-primary font-bold">
              {plots.length}
            </strong>
          </div>
          <div>
            {t("field.plot.totalArea", "Tổng diện tích:")}{" "}
            <strong className="font-mono text-accent-primary font-bold">
              {totalHectares.toFixed(2)} ha
            </strong>
          </div>
        </div>
      </div>

      {/* Plots Table */}
      <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex justify-center">
            <GrainLoader
              label={t("field.plot.loading", "Đang tải danh sách thửa đất...")}
            />
          </div>
        ) : plots.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Polygon
              size={40}
              className="mx-auto text-ink-tertiary opacity-60"
            />
            <p className="text-sm font-semibold text-ink-primary">
              {t("field.plot.emptyTitle", "Chưa có thửa ruộng nào")}
            </p>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">
              {t(
                "field.plot.emptyDesc",
                'Nhấn "Thêm Thửa ruộng mới" để định danh toạ độ thửa đất của nông hộ.',
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/20 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                <tr>
                  <th className="py-3 px-4">
                    {t("field.plot.thCode", "Mã thửa")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.plot.thFarmer", "Nông hộ chủ quản")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.plot.thArea", "Diện tích (ha)")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.plot.thGps", "Toạ độ GPS / Bản đồ")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.plot.thStatus", "Trạng thái hồ sơ")}
                  </th>
                  <th className="py-3 px-4 text-right">
                    {t("field.plot.thActions", "Thao tác")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10">
                {plots.map((plot) => (
                  <tr
                    key={plot.id}
                    className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-accent-primary">
                      {plot.code || "PLOT-N/A"}
                    </td>
                    <td className="py-3 px-4 font-medium text-ink-primary">
                      <span className="inline-flex items-center gap-1.5">
                        <User size={13} className="text-ink-tertiary" />
                        <span>{plot.farmerName}</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-ink-primary">
                      {Number(plot.areaHa).toFixed(2)} ha
                    </td>
                    <td className="py-3 px-4 font-mono text-xs">
                      <button
                        type="button"
                        onClick={() => setViewingMapPlot(plot)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-surface-raised hover:bg-surface-overlay text-ink-primary hover:text-accent-primary border border-ink-tertiary/20 transition-all group cursor-pointer"
                        title={t(
                          "field.plot.clickToViewMap",
                          "Xem vị trí trên bản đồ",
                        )}
                      >
                        <MapPin
                          size={13}
                          className="text-accent-primary shrink-0 group-hover:scale-110 transition-transform"
                          weight="fill"
                        />
                        <span className="font-mono text-xs truncate max-w-[150px]">
                          {formatDisplayCoord(plot.geometry)}
                        </span>
                        <Eye
                          size={13}
                          className="text-ink-tertiary group-hover:text-accent-primary shrink-0 ml-0.5"
                        />
                      </button>
                    </td>
                    <td className="py-3 px-4">
                      <StatusBadge
                        status="BALANCED"
                        label={t("field.plot.statusValidGps", "Toạ độ hợp lệ")}
                      />
                    </td>
                    <td className="py-3 px-4 text-right space-x-1">
                      <button
                        type="button"
                        onClick={() => setViewingMapPlot(plot)}
                        className="p-1.5 rounded hover:bg-surface-overlay text-ink-secondary hover:text-accent-primary transition-colors cursor-pointer"
                        title={t("field.plot.viewMap", "Xem trên bản đồ")}
                      >
                        <Eye size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(plot)}
                        className="p-1.5 rounded hover:bg-surface-overlay text-ink-secondary hover:text-ink-primary transition-colors cursor-pointer"
                        title={t("field.plot.editPlot", "Chỉnh sửa thửa ruộng")}
                      >
                        <PencilSimple size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(plot)}
                        className="p-1.5 rounded hover:bg-accent-danger/10 text-accent-danger transition-colors cursor-pointer"
                        title={t("field.plot.deletePlot", "Xoá thửa ruộng")}
                      >
                        <Trash size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Plot Modal with Interactive Map Picker */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ariaLabel={
          editingPlot
            ? t("field.plot.modalEdit", "Cập nhật thửa ruộng")
            : t("field.plot.modalNew", "Đăng ký thửa ruộng")
        }
      >
        <div className="w-full max-w-xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
          <div className="p-4 border-b border-ink-tertiary/15 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-mono text-accent-primary font-bold uppercase tracking-wider block">
                {editingPlot ? "CHỈNH SỬA THỬA RUỘNG" : "ĐĂNG KÝ MỚI"}
              </span>
              <h3 className="font-display font-bold text-base text-ink-primary">
                {editingPlot
                  ? t(
                      "field.plot.modalEditTitle",
                      "Cập nhật Thửa ruộng & Toạ độ",
                    )
                  : t(
                      "field.plot.modalAddTitle",
                      "Đăng ký Thửa ruộng & Chọn Vị trí",
                    )}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  {t("field.plot.plotCodeLabel", "Mã Thửa ruộng *")}
                </label>
                <input
                  type="text"
                  required
                  value={formData.code}
                  onChange={(e) =>
                    setFormData({ ...formData, code: e.target.value })
                  }
                  placeholder="VD: PLOT-CAIBE-01"
                  className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-ink-secondary mb-1">
                  {t("field.plot.farmerOwnerLabel", "Nông hộ chủ sở hữu *")}
                </label>
                <select
                  required
                  value={formData.farmerId}
                  onChange={(e) =>
                    setFormData({ ...formData, farmerId: e.target.value })
                  }
                  className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full"
                >
                  <option value="">
                    {t("field.plot.selectFarmerOption", "-- Chọn Nông hộ --")}
                  </option>
                  {farmers.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} ({f.code})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                {t("field.plot.areaLabel", "Diện tích canh tác (Hecta) *")}
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  value={formData.areaHa}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      areaHa: parseFloat(e.target.value) || 0,
                    })
                  }
                  className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full font-mono"
                />
                <span className="absolute right-3 top-2 text-ink-tertiary">
                  ha
                </span>
              </div>
            </div>

            {/* Interactive Map Picker Section */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <label className="block font-semibold text-ink-secondary">
                  {t(
                    "field.plot.gpsMapLabel",
                    "Chọn Vị trí Thửa đất trên Bản đồ *",
                  )}
                </label>
                <span className="text-[10px] text-ink-tertiary">
                  Nhấp hoặc kéo ghim để định vị
                </span>
              </div>

              <MapLocationPicker
                value={formData.coordinates}
                onChange={(point) =>
                  setFormData((prev) => ({
                    ...prev,
                    coordinates: point.formatted,
                  }))
                }
                height={260}
              />

              <span className="text-[10px] text-ink-tertiary mt-1 block">
                {t(
                  "field.plot.gpsHelper",
                  "Toạ độ được chuẩn hoá tự động theo chuẩn OpenGIS / GeoJSON RFC 7946 khi lưu trữ.",
                )}
              </span>
            </div>

            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary cursor-pointer"
              >
                {t("common.cancel", "Huỷ")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60 cursor-pointer"
              >
                {submitting
                  ? t("common.saving", "Đang lưu...")
                  : editingPlot
                    ? t("common.saveChanges", "Lưu thay đổi")
                    : t("field.plot.btnRegisterPlot", "Đăng ký thửa")}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Map Preview Modal */}
      <Modal
        isOpen={Boolean(viewingMapPlot)}
        onClose={() => setViewingMapPlot(null)}
        ariaLabel={t("field.plot.previewTitle", "Xem vị trí thửa ruộng")}
      >
        {viewingMapPlot && (
          <div className="w-full max-w-xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
            <div className="p-4 border-b border-ink-tertiary/15 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-mono text-accent-primary font-bold uppercase tracking-wider block">
                  {t("field.plot.previewBadge", "ĐỊNH VỊ GIS")}
                </span>
                <h3 className="font-display font-bold text-base text-ink-primary">
                  {viewingMapPlot.code} - {viewingMapPlot.farmerName}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingMapPlot(null)}
                className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 space-y-3">
              <MapLocationPicker
                value={formatDisplayCoord(viewingMapPlot.geometry)}
                onChange={() => {}}
                disabled={true}
                height={320}
              />

              <div className="grid grid-cols-2 gap-3 text-xs bg-surface-raised dark:bg-surface-overlay p-3 rounded-lg border border-ink-tertiary/15">
                <div>
                  <span className="text-ink-tertiary block text-[10px] font-medium">
                    Diện tích canh tác:
                  </span>
                  <span className="font-mono font-bold text-ink-primary text-sm">
                    {Number(viewingMapPlot.areaHa).toFixed(2)} ha
                  </span>
                </div>
                <div>
                  <span className="text-ink-tertiary block text-[10px] font-medium">
                    Toạ độ GPS (Vĩ độ, Kinh độ):
                  </span>
                  <span className="font-mono font-bold text-accent-primary text-sm">
                    {formatDisplayCoord(viewingMapPlot.geometry)}
                  </span>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const plotToEdit = viewingMapPlot;
                    setViewingMapPlot(null);
                    handleOpenEdit(plotToEdit);
                  }}
                  className="px-4 py-2 rounded-lg bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-colors cursor-pointer inline-flex items-center gap-1.5"
                >
                  <PencilSimple size={14} />
                  <span>{t("field.plot.editPlot", "Chỉnh sửa thửa này")}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
export default PlotRegistrationPage;
