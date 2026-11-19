import { ArrowsClockwise, Buildings, CheckCircle, MagnifyingGlass, Warehouse, WarningCircle, Wrench } from "@phosphor-icons/react";
import type { FacilityConfigModel } from "../hooks/useFacilityConfig";

export function FacilityOverview(props: FacilityConfigModel["overview"]) {
  const {
    t,
    facilities,
    loading,
    error,
    selectedFacilityId,
    setSelectedFacilityId,
    searchQuery,
    setSearchQuery,
    loadData,
    stats,
    handleOpenAdd,
  } = props;
  return (
    <>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
            {t(
              "admin.facility.tag",
              "CẤU HÌNH NHÀ MÁY, SILO & THIẾT BỊ VẬN HÀNH",
            )}
          </span>
          <h1 className="text-2xl font-display font-bold text-ink-primary mt-1">
            {t("admin.facility.title", "Cơ sở Vật chất & Vị trí Lưu trữ Silo")}
          </h1>
          <p className="text-xs text-ink-secondary mt-0.5">
            {t(
              "admin.facility.subtitle",
              "Sơ đồ cấu hình cơ sở chế biến, danh sách Silo kho lưu trữ và dây chuyền thiết bị hạch toán dòng chảy cân bằng khối lượng (Mass Balance).",
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors disabled:opacity-50"
            title={t("common.reload", "Tải lại dữ liệu từ máy chủ")}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "animate-spin text-accent-primary" : ""}
            />
          </button>
          <button
            type="button"
            onClick={() => handleOpenAdd("FACILITY")}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs disabled:opacity-50"
          >
            <Buildings size={15} />
            <span>Thêm Nhà máy</span>
          </button>
          {/* <button
            type="button"
            onClick={() => handleOpenAdd("LOCATION")}
            disabled={facilities.length === 0}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs disabled:opacity-50"
          >
            <Plus size={15} weight="bold" />
            <span>Thêm Silo / Kho chứa</span>
          </button> */}
        </div>
      </div>

      {/* Global Alerts */}
      {error && (
        <div
          role="alert"
          className="p-3.5 rounded-xl bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2"
        >
          <WarningCircle size={18} weight="fill" className="shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-surface-base border border-ink-tertiary/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Cơ sở Nhà máy</span>
            <Buildings size={16} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-display font-bold text-ink-primary">
            {stats.totalFacilities}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            Đang được kích hoạt trên hệ thống
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base border border-ink-tertiary/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Vị trí & Silo kho</span>
            <Warehouse size={16} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-display font-bold text-ink-primary">
            {stats.totalLocations}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {stats.storeCount} Kho/Silo · {stats.isolationCount} Khu cách ly
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base border border-ink-tertiary/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Mặt bằng sẵn sàng</span>
            <CheckCircle size={16} className="text-functional-balanced" />
          </div>
          <div className="text-2xl font-display font-bold text-functional-balanced font-mono">
            {stats.clearanceRate}%
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {stats.clearedLocations}/{stats.totalLocations} vị trí đã vệ sinh
            sạch
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-surface-base border border-ink-tertiary/15 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-ink-secondary">
            <span className="text-xs font-medium">Máy móc & Thiết bị</span>
            <Wrench size={16} className="text-accent-primary" />
          </div>
          <div className="text-2xl font-display font-bold text-ink-primary">
            {stats.totalEquipment}
          </div>
          <p className="text-[11px] text-ink-tertiary">
            {stats.activeEquipment} thiết bị đang vận hành
          </p>
        </div>
      </div>

      {/* Control Bar: Facility Selector + Search */}
      <div className="p-3.5 rounded-2xl bg-surface-base border border-ink-tertiary/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-ink-secondary shrink-0">
            Xem theo cơ sở:
          </span>
          <button
            type="button"
            onClick={() => setSelectedFacilityId("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              selectedFacilityId === "ALL"
                ? "bg-accent-primary text-white"
                : "bg-surface-raised text-ink-secondary hover:text-ink-primary border border-ink-tertiary/15"
            }`}
          >
            Tất cả ({facilities.length})
          </button>
          {facilities.map((fac) => (
            <button
              key={fac.id}
              type="button"
              onClick={() => setSelectedFacilityId(fac.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedFacilityId === fac.id
                  ? "bg-accent-primary text-white"
                  : "bg-surface-raised text-ink-secondary hover:text-ink-primary border border-ink-tertiary/15"
              }`}
            >
              {fac.name}
            </button>
          ))}
        </div>

        <div className="relative min-w-[240px]">
          <MagnifyingGlass
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
          />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Tìm tên Silo, kho hoặc thiết bị..."
            className="w-full pl-8 pr-3 py-1.5 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none placeholder:text-ink-tertiary focus:rounded-full"
          />
        </div>
      </div>
    </>
  );
}
