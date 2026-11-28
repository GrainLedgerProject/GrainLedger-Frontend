import { Broom, CheckCircle, Copy, PencilSimple, ShieldWarning, Trash, Warehouse, WarningCircle } from "@phosphor-icons/react";
import type { LocationDto } from "@/api/ledger";
import type { FacilityConfigModel } from "../hooks/useFacilityConfig";

export function FacilityLocations({ canConfigure = true, displayLocations, handleOpenEditLocation, handleDeleteLocation, handleOpenClearance, handleCopyId }: {
  canConfigure?: boolean;
  displayLocations: LocationDto[];
  handleOpenEditLocation: FacilityConfigModel["facilities"]["handleOpenEditLocation"];
  handleDeleteLocation: FacilityConfigModel["facilities"]["handleDeleteLocation"];
  handleOpenClearance: FacilityConfigModel["facilities"]["handleOpenClearance"];
  handleCopyId: FacilityConfigModel["facilities"]["handleCopyId"];
}) {
  return (
    <div className="space-y-4">
      {displayLocations.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-surface-raised text-ink-secondary text-xs space-y-2">
          <Warehouse
            size={28}
            className="mx-auto text-ink-tertiary"
          />
          <p>
            Không có vị trí lưu trữ nào phù hợp với bộ lọc hiện
            tại.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayLocations.map((loc) => {
            const isIsolation = loc.kind === "ISOLATION";
            return (
              <div
                key={loc.id}
                className={`p-4 rounded-xl border flex flex-col justify-between transition-all shadow-xs ${
                  isIsolation
                    ? "bg-rose-500/5 border-rose-500/20"
                    : "bg-surface-raised border-ink-tertiary/15"
                }`}
              >
                <div className="space-y-3">
                  {/* Top Title & Badges */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        {isIsolation ? (
                          <ShieldWarning
                            size={16}
                            weight="bold"
                            className="text-rose-600 shrink-0"
                          />
                        ) : (
                          <Warehouse
                            size={16}
                            weight="bold"
                            className="text-accent-primary shrink-0"
                          />
                        )}
                        <span className="font-display font-bold text-sm text-ink-primary">
                          {loc.name}
                        </span>
                      </div>

                      {/* UUID Badge */}
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyId(loc.id, "Vị trí")
                        }
                        className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-tertiary hover:text-ink-primary"
                        title="Bấm để sao chép UUID"
                      >
                        <span>{loc.id.slice(0, 8)}...</span>
                        <Copy size={10} />
                      </button>
                    </div>

                    {/* Kind Badge */}
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border shrink-0 ${
                        isIsolation
                          ? "bg-rose-100 text-rose-800 border-rose-200"
                          : loc.kind === "SILO"
                            ? "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/60 dark:text-sky-300 dark:border-sky-800"
                            : loc.kind === "COMPARTMENT"
                              ? "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800"
                              : "bg-accent-primary/10 text-accent-primary border-accent-primary/20"
                      }`}
                    >
                      {isIsolation
                        ? "CÁCH LY"
                        : loc.kind === "SILO"
                          ? "SILO"
                          : loc.kind === "COMPARTMENT"
                            ? "NGĂN CHỨA"
                            : "KHO CHỨA"}
                    </span>
                  </div>

                  {/* Status attributes */}
                  <div className="space-y-1.5 pt-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-ink-secondary text-[11px]">
                        Trạng thái mặt bằng:
                      </span>
                      {loc.cleared ? (
                        <span className="inline-flex items-center gap-1 text-functional-balanced font-semibold text-[11px]">
                          <CheckCircle size={13} weight="fill" />
                          <span>Đã vệ sinh (Sẵn sàng)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-accent-warning font-semibold text-[11px]">
                          <WarningCircle
                            size={13}
                            weight="fill"
                          />
                          <span>Đang chứa / Chưa vệ sinh</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-ink-secondary text-[11px]">
                        Hình thức lưu trữ:
                      </span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                          loc.mixedBulk
                            ? "bg-amber-500/10 text-amber-700"
                            : "bg-surface-base text-ink-secondary border border-ink-tertiary/15"
                        }`}
                      >
                        {loc.mixedBulk
                          ? "Hỗn hợp (Mixed Bulk)"
                          : "Định danh riêng (Identity Preserved)"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Actions Footer */}
                {canConfigure && (
                  <div className="pt-3 mt-3 border-t border-ink-tertiary/10 flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleOpenClearance(loc)}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-accent-primary hover:underline p-1 rounded hover:bg-surface-base"
                      title="Thực hiện quy trình kiểm tra vệ sinh và giải phóng mặt bằng Silo"
                    >
                      <Broom size={13} />
                      <span>Vệ sinh Silo</span>
                    </button>

                    <div className="flex items-center gap-1">
                      {loc.canEdit !== false && (
                        <button
                          type="button"
                          onClick={() => handleOpenEditLocation(loc)}
                          className="p-1 rounded text-ink-tertiary hover:text-ink-primary hover:bg-surface-base transition-colors"
                          title="Chỉnh sửa vị trí"
                        >
                          <PencilSimple size={14} />
                        </button>
                      )}
                      {loc.canDelete !== false && (
                        <button
                          type="button"
                          onClick={() => handleDeleteLocation(loc)}
                          className="p-1 rounded text-ink-tertiary hover:text-accent-danger hover:bg-surface-base transition-colors"
                          title="Xóa vị trí"
                        >
                          <Trash size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
