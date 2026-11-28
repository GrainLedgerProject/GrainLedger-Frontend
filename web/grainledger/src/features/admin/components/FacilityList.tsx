import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Buildings, Copy, PencilSimple, Plus, Scales, Trash, Warehouse, Wrench } from "@phosphor-icons/react";
import { FacilityLocations } from "./FacilityLocations";
import { FacilityEquipment } from "./FacilityEquipment";
import { FacilityPolicies } from "./FacilityPolicies";
import type { FacilityConfigModel } from "../hooks/useFacilityConfig";

export function FacilityList(props: FacilityConfigModel["facilities"]) {
  const {
    canConfigure,
    locations,
    equipment,
    policies,
    loading,
    searchQuery,
    activeTab,
    setActiveTab,
    locationKindFilter,
    setLocationKindFilter,
    filteredFacilities,
    handleOpenAdd,
    handleOpenEditFacility,
    handleOpenEditLocation,
    handleOpenEditEquipment,
    handleDeleteFacility,
    handleDeleteLocation,
    handleDeleteEquipment,
    handleRetireEquipment,
    handleOpenClearance,
    handleCopyId,
  } = props;
  return (
    <>
      {loading ? (
        <div className="py-20 flex justify-center">
          <GrainLoader label="Đang kiểm tra sơ đồ cơ sở & vị trí lưu trữ từ sổ cái..." />
        </div>
      ) : filteredFacilities.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-surface-base border border-dashed border-ink-tertiary/25 text-ink-secondary text-sm space-y-3">
          <Buildings size={36} className="mx-auto text-ink-tertiary" />
          <p className="font-semibold text-ink-primary">
            Chưa có cơ sở nhà máy nào được ghi nhận
          </p>
          <p className="text-xs max-w-md mx-auto">
            {canConfigure
              ? "Hệ thống chưa tìm thấy cơ sở nhà máy nào trong cấu hình sổ cái. Bấm nút \"Thêm Nhà máy\" phía trên để bắt đầu thiết lập."
              : "Hệ thống chưa tìm thấy cơ sở nhà máy nào trong cấu hình sổ cái."}
          </p>
          {canConfigure && (
            <button
              type="button"
              onClick={() => handleOpenAdd("FACILITY")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-accent-primary text-white text-xs font-semibold hover:bg-accent-primary-dim transition-colors"
            >
              <Plus size={14} weight="bold" />
              <span>Thêm Nhà máy Đầu tiên</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {filteredFacilities.map((fac) => {
            // Associated records for this facility
            const facLocations = locations.filter(
              (l) => l.facilityId === fac.id,
            );
            const facEquipment = equipment.filter(
              (e) => e.facilityId === fac.id,
            );
            const facPolicies = policies.filter((p) => p.facilityId === fac.id);

            // Filter by search query and kind
            const displayLocations = facLocations.filter((l) => {
              const matchesSearch =
                !searchQuery.trim() ||
                l.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                l.id.toLowerCase().includes(searchQuery.toLowerCase());
              const matchesKind =
                locationKindFilter === "ALL" || l.kind === locationKindFilter;
              return matchesSearch && matchesKind;
            });

            const displayEquipment = facEquipment.filter((e) => {
              return (
                !searchQuery.trim() ||
                e.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                e.id.toLowerCase().includes(searchQuery.toLowerCase())
              );
            });

            return (
              <div
                key={fac.id}
                className="p-6 rounded-2xl bg-surface-base border border-ink-tertiary/20 shadow-xs space-y-6"
              >
                {/* Facility Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-5">
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                        <Buildings size={20} weight="bold" />
                      </div>
                      <h2 className="font-display font-bold text-xl text-ink-primary">
                        {fac.name}
                      </h2>
                      <button
                        type="button"
                        onClick={() => handleCopyId(fac.id, "Nhà máy")}
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-tertiary hover:text-ink-primary bg-surface-raised px-2 py-0.5 rounded border border-ink-tertiary/15 transition-colors"
                        title="Bấm để sao chép UUID"
                      >
                        <span>{fac.id.slice(0, 13)}...</span>
                        <Copy size={11} />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-ink-secondary pl-11">
                      <span className="flex items-center gap-1 font-medium">
                        <Warehouse size={14} className="text-accent-primary" />
                        <span>{facLocations.length} Vị trí lưu trữ</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium">
                        <Wrench size={14} className="text-accent-primary" />
                        <span>{facEquipment.length} Thiết bị vận hành</span>
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-medium">
                        <Scales size={14} className="text-accent-primary" />
                        <span>{facPolicies.length} Chính sách công đoạn</span>
                      </span>
                    </div>
                  </div>

                  {/* Facility Quick Actions */}
                  {canConfigure && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleOpenAdd("LOCATION", fac.id)}
                        className="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-ink-primary border border-ink-tertiary/20 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <Plus size={13} weight="bold" />
                        <span>Thêm Silo/Kho</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenAdd("EQUIPMENT", fac.id)}
                        className="px-3 py-1.5 rounded-lg bg-surface-raised hover:bg-surface-overlay text-ink-primary border border-ink-tertiary/20 text-xs font-medium inline-flex items-center gap-1 transition-colors"
                      >
                        <Plus size={13} weight="bold" />
                        <span>Thêm Thiết bị</span>
                      </button>
                      {fac.canEdit !== false && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditFacility(fac)}
                          className="p-1.5 rounded-lg hover:bg-surface-raised text-ink-secondary hover:text-accent-primary transition-colors text-xs inline-flex items-center gap-1 border border-ink-tertiary/15"
                          title="Sửa tên cơ sở nhà máy"
                        >
                          <PencilSimple size={14} />
                          <span className="hidden sm:inline">Sửa</span>
                        </button>
                      )}
                      {fac.canDelete !== false && (
                        <button
                          type="button"
                          onClick={() => handleDeleteFacility(fac)}
                          className="p-1.5 rounded-lg hover:bg-surface-raised text-ink-secondary hover:text-accent-danger transition-colors text-xs inline-flex items-center gap-1 border border-ink-tertiary/15"
                          title="Xóa nhà máy nếu chưa phát sinh giao dịch"
                        >
                          <Trash size={14} />
                          <span className="hidden sm:inline">Xóa</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Inner Facility Navigation Tabs */}
                <div className="flex items-center justify-between border-b border-ink-tertiary/15 pb-2">
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setActiveTab("locations")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeTab === "locations"
                          ? "bg-accent-primary text-white"
                          : "text-ink-secondary hover:text-ink-primary hover:bg-surface-raised"
                      }`}
                    >
                      <Warehouse size={15} />
                      <span>Vị trí Lưu trữ & Silo</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          activeTab === "locations"
                            ? "bg-white/20 text-white"
                            : "bg-surface-raised text-ink-tertiary"
                        }`}
                      >
                        {facLocations.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("equipment")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeTab === "equipment"
                          ? "bg-accent-primary text-white"
                          : "text-ink-secondary hover:text-ink-primary hover:bg-surface-raised"
                      }`}
                    >
                      <Wrench size={15} />
                      <span>Thiết bị Máy móc</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          activeTab === "equipment"
                            ? "bg-white/20 text-white"
                            : "bg-surface-raised text-ink-tertiary"
                        }`}
                      >
                        {facEquipment.length}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveTab("policies")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                        activeTab === "policies"
                          ? "bg-accent-primary text-white"
                          : "text-ink-secondary hover:text-ink-primary hover:bg-surface-raised"
                      }`}
                    >
                      <Scales size={15} />
                      <span>Chính sách Dung sai</span>
                      <span
                        className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                          activeTab === "policies"
                            ? "bg-white/20 text-white"
                            : "bg-surface-raised text-ink-tertiary"
                        }`}
                      >
                        {facPolicies.length}
                      </span>
                    </button>
                  </div>

                  {/* Filter for locations when tab is active */}
                  {activeTab === "locations" && (
                    <div className="flex items-center gap-1 text-[11px]">
                      <span className="text-ink-tertiary hidden md:inline">
                        Loại:
                      </span>
                      <button
                        type="button"
                        onClick={() => setLocationKindFilter("ALL")}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          locationKindFilter === "ALL"
                            ? "font-bold text-accent-primary underline"
                            : "text-ink-secondary hover:text-ink-primary"
                        }`}
                      >
                        Tất cả
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationKindFilter("STORE")}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          locationKindFilter === "STORE"
                            ? "font-bold text-accent-primary underline"
                            : "text-ink-secondary hover:text-ink-primary"
                        }`}
                      >
                        Kho chứa
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationKindFilter("SILO")}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          locationKindFilter === "SILO"
                            ? "font-bold text-accent-primary underline"
                            : "text-ink-secondary hover:text-ink-primary"
                        }`}
                      >
                        Silo
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationKindFilter("COMPARTMENT")}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          locationKindFilter === "COMPARTMENT"
                            ? "font-bold text-accent-primary underline"
                            : "text-ink-secondary hover:text-ink-primary"
                        }`}
                      >
                        Ngăn chứa
                      </button>
                      <button
                        type="button"
                        onClick={() => setLocationKindFilter("ISOLATION")}
                        className={`px-2 py-0.5 rounded transition-colors ${
                          locationKindFilter === "ISOLATION"
                            ? "font-bold text-accent-primary underline"
                            : "text-ink-secondary hover:text-ink-primary"
                        }`}
                      >
                        Cách ly
                      </button>
                    </div>
                  )}
                </div>

                {/* TAB 1: LOCATIONS */}
                {activeTab === "locations" && (
                  <FacilityLocations canConfigure={canConfigure} displayLocations={displayLocations} handleOpenEditLocation={handleOpenEditLocation} handleDeleteLocation={handleDeleteLocation} handleOpenClearance={handleOpenClearance} handleCopyId={handleCopyId} />
                )}

                {/* TAB 2: EQUIPMENT */}
                {activeTab === "equipment" && (
                  <FacilityEquipment canConfigure={canConfigure} displayEquipment={displayEquipment} handleOpenEditEquipment={handleOpenEditEquipment} handleDeleteEquipment={handleDeleteEquipment} handleRetireEquipment={handleRetireEquipment} handleCopyId={handleCopyId} />
                )}

                {/* TAB 3: POLICIES */}
                {activeTab === "policies" && (
                  <FacilityPolicies facPolicies={facPolicies} handleCopyId={handleCopyId} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
