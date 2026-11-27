import { Copy, PencilSimple, Power, Trash, Wrench } from "@phosphor-icons/react";
import type { EquipmentDto } from "@/api/ledger";
import type { FacilityConfigModel } from "../hooks/useFacilityConfig";

export function FacilityEquipment({ canConfigure = true, displayEquipment, handleOpenEditEquipment, handleDeleteEquipment, handleRetireEquipment, handleCopyId }: {
  canConfigure?: boolean;
  displayEquipment: EquipmentDto[];
  handleOpenEditEquipment: FacilityConfigModel["facilities"]["handleOpenEditEquipment"];
  handleDeleteEquipment: FacilityConfigModel["facilities"]["handleDeleteEquipment"];
  handleRetireEquipment: FacilityConfigModel["facilities"]["handleRetireEquipment"];
  handleCopyId: FacilityConfigModel["facilities"]["handleCopyId"];
}) {
  return (
    <div className="space-y-4">
      {displayEquipment.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-surface-raised text-ink-secondary text-xs space-y-2">
          <Wrench
            size={28}
            className="mx-auto text-ink-tertiary"
          />
          <p>
            Chưa có thiết bị máy móc nào được đăng ký cho cơ sở
            này.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {displayEquipment.map((eq) => {
            const isActive = eq.canRetire !== false;
            return (
              <div
                key={eq.id}
                className="p-4 rounded-xl bg-surface-raised border border-ink-tertiary/15 flex flex-col justify-between shadow-xs space-y-3"
              >
                <div className="space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-lg bg-surface-base text-accent-primary border border-ink-tertiary/15">
                        <Wrench size={16} />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-ink-primary">
                          {eq.name}
                        </h3>
                        <button
                          type="button"
                          onClick={() =>
                            handleCopyId(eq.id, "Thiết bị")
                          }
                          className="inline-flex items-center gap-1 font-mono text-[10px] text-ink-tertiary hover:text-ink-primary"
                          title="Bấm để sao chép UUID"
                        >
                          <span>{eq.id.slice(0, 8)}...</span>
                          <Copy size={10} />
                        </button>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                        isActive
                          ? "bg-functional-balanced-bg text-functional-balanced border-functional-balanced/30"
                          : "bg-surface-overlay text-ink-tertiary border-ink-tertiary/20"
                      }`}
                    >
                      {isActive
                        ? "ĐANG VẬN HÀNH"
                        : "NGỪNG HOẠT ĐỘNG"}
                    </span>
                  </div>
                </div>

                {/* Equipment Actions Footer */}
                {canConfigure && (
                  <div className="pt-2 border-t border-ink-tertiary/10 flex items-center justify-between text-xs">
                    {isActive && (
                      <button
                        type="button"
                        onClick={() => handleRetireEquipment(eq)}
                        className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 hover:text-amber-800 p-1 rounded hover:bg-amber-50"
                        title="Ngừng vận hành thiết bị"
                      >
                        <Power size={13} />
                        <span>Ngừng vận hành</span>
                      </button>
                    )}
                    {!isActive && <div />}

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditEquipment(eq)}
                        className="p-1 rounded text-ink-tertiary hover:text-ink-primary hover:bg-surface-base transition-colors"
                        title="Sửa thiết bị"
                      >
                        <PencilSimple size={14} />
                      </button>
                      {eq.canDelete !== false && (
                        <button
                          type="button"
                          onClick={() => handleDeleteEquipment(eq)}
                          className="p-1 rounded text-ink-tertiary hover:text-accent-danger hover:bg-surface-base transition-colors"
                          title="Xóa thiết bị"
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
