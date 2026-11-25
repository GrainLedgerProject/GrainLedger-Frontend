import { Modal } from "@/shared/ui/Modal";
import { Buildings, Warehouse, WarningCircle, Wrench, X } from "@phosphor-icons/react";
import type { FacilityConfigModel } from "../hooks/useFacilityConfig";

export function FacilityEditor(props: FacilityConfigModel["editor"]) {
  const {
    facilities,
    isModalOpen,
    setIsModalOpen,
    modalType,
    isEdit,
    submitting,
    modalError,
    formName,
    setFormName,
    formFacilityId,
    setFormFacilityId,
    formKind,
    setFormKind,
    formMixedBulk,
    setFormMixedBulk,
    handleSubmit,
  } = props;
  return (
    <Modal
      isOpen={isModalOpen}
      onClose={() => !submitting && setIsModalOpen(false)}
      ariaLabel={
        isEdit
          ? "Cập nhật cấu hình"
          : modalType === "FACILITY"
            ? "Thêm Cơ sở Nhà máy Mới"
            : modalType === "LOCATION"
              ? "Thêm Vị trí / Silo Lưu trữ Mới"
              : "Thêm Thiết bị Vận hành Mới"
      }
    >
      <div className="w-full max-w-lg bg-surface-base border border-ink-tertiary/20 rounded-2xl shadow-2xl overflow-hidden animate-ledger-in">
        {/* Header */}
        <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
              {modalType === "FACILITY" ? (
                <Buildings size={18} weight="bold" />
              ) : modalType === "LOCATION" ? (
                <Warehouse size={18} weight="bold" />
              ) : (
                <Wrench size={18} weight="bold" />
              )}
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-ink-primary">
                {isEdit
                  ? `Chỉnh sửa ${
                      modalType === "LOCATION"
                        ? "Vị trí / Silo"
                        : modalType === "EQUIPMENT"
                          ? "Thiết bị"
                          : "Nhà máy"
                    }`
                  : modalType === "LOCATION"
                    ? "Thêm Vị trí / Silo Lưu trữ Mới"
                    : modalType === "EQUIPMENT"
                      ? "Thêm Thiết bị Máy móc Mới"
                      : "Thêm Cơ sở Nhà máy Mới"}
              </h2>
              <p className="text-[11px] text-ink-secondary">
                Cập nhật sổ cái cấu hình cơ sở vật chất chuỗi cung ứng
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsModalOpen(false)}
            disabled={submitting}
            className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs">
          {modalError && (
            <div
              role="alert"
              className="p-3 rounded-xl bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger flex items-center gap-2"
            >
              <WarningCircle size={16} weight="fill" className="shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          {/* Facility Selector for Location / Equipment */}
          {modalType !== "FACILITY" && (
            <div className="space-y-1.5">
              <label
                htmlFor="modal-facility-select"
                className="block font-semibold text-ink-primary"
              >
                Cơ sở Nhà máy trực thuộc *
              </label>
              <select
                id="modal-facility-select"
                required
                value={formFacilityId}
                onChange={(e) => setFormFacilityId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none"
              >
                <option value="">-- Chọn Nhà máy --</option>
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Name Input */}
          <div className="space-y-1.5">
            <label
              htmlFor="modal-name-input"
              className="block font-semibold text-ink-primary"
            >
              {modalType === "FACILITY"
                ? "Tên Cơ sở Nhà máy *"
                : modalType === "LOCATION"
                  ? "Tên Vị trí / Silo Lưu trữ *"
                  : "Tên Thiết bị / Dây chuyền *"}
            </label>
            <input
              id="modal-name-input"
              type="text"
              required
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder={
                modalType === "FACILITY"
                  ? "VD: Nhà máy Xay xát & Đóng gói Long An"
                  : modalType === "LOCATION"
                    ? "VD: Silo Lúa khô S1, Kho Gạo thành phẩm A1, Khu cách ly Q1"
                    : "VD: Lò sấy tháp 50T/mẻ, Dây chuyền xát trắng A"
              }
              className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none"
            />
          </div>

          {/* Additional Fields for Location */}
          {modalType === "LOCATION" && (
            <>
              <div className="space-y-1.5">
                <label
                  htmlFor="modal-kind-select"
                  className="block font-semibold text-ink-primary"
                >
                  Phân loại Vị trí *
                </label>
                <select
                  id="modal-kind-select"
                  required
                  value={formKind}
                  onChange={(e) =>
                    setFormKind(e.target.value as "STORE" | "ISOLATION")
                  }
                  className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none"
                >
                  <option value="STORE">
                    Kho chứa thông thường / Silo lưu trữ (STORE)
                  </option>
                  <option value="ISOLATION">
                    Khu vực cách ly kiểm định / Hàng lỗi (ISOLATION)
                  </option>
                </select>
              </div>

              <div className="p-3 rounded-xl bg-surface-raised border border-ink-tertiary/15 space-y-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formMixedBulk}
                    onChange={(e) => setFormMixedBulk(e.target.checked)}
                    className="rounded border-ink-tertiary/20 text-accent-primary focus:ring-accent-primary"
                  />
                  <span className="font-semibold text-ink-primary text-xs">
                    Cho phép lưu trữ hỗn hợp (Mixed Bulk Pool)
                  </span>
                </label>
                <p className="text-[11px] text-ink-secondary pl-5">
                  Khi bật, vị trí này có thể gộp nhiều mẻ lúa cùng cấp chất
                  lượng và hạch toán tỷ lệ đóng góp khối lượng.
                </p>
              </div>
            </>
          )}

          {/* Modal Actions */}
          <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 rounded-lg border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary hover:bg-surface-raised font-semibold transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || !formName.trim()}
              className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-50 shadow-xs"
            >
              {submitting
                ? "Đang lưu..."
                : isEdit
                  ? "Lưu thay đổi"
                  : "Tạo mới"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
