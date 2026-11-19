import { Modal } from "@/shared/ui/Modal";
import { Broom, CheckCircle, Info, X } from "@phosphor-icons/react";
import type { FacilityConfigModel } from "../hooks/useFacilityConfig";

export function LocationClearanceDialog(props: FacilityConfigModel["clearance"]) {
  const {
    clearanceError,
    clearanceTarget,
    setClearanceTarget,
    clearanceReason,
    setClearanceReason,
    clearanceEvidenceId,
    setClearanceEvidenceId,
    submittingClearance,
    handleConfirmClearance,
  } = props;
  return (
    <Modal
      isOpen={Boolean(clearanceTarget)}
      onClose={() => !submittingClearance && setClearanceTarget(null)}
      ariaLabel="Xác nhận vệ sinh & giải phóng mặt bằng Silo"
    >
      <div className="w-full max-w-md bg-surface-base border border-ink-tertiary/20 rounded-2xl shadow-2xl overflow-hidden animate-ledger-in">
        <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
              <Broom size={18} weight="bold" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-ink-primary">
                Vệ sinh & Giải phóng Silo
              </h2>
              <p className="text-[11px] text-ink-secondary">
                Xác nhận mặt bằng sạch trước khi nạp mẻ mới
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setClearanceTarget(null)}
            disabled={submittingClearance}
            className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>

        <form
          onSubmit={handleConfirmClearance}
          className="p-5 space-y-4 text-xs"
        >
          {clearanceError && <p role="alert" className="text-accent-danger">{clearanceError}</p>}
          <div className="p-3 rounded-xl bg-accent-primary/5 border border-accent-primary/20 space-y-1">
            <div className="flex items-center gap-1.5 font-semibold text-ink-primary text-xs">
              <Info size={15} className="text-accent-primary" />
              <span>Vị trí xác nhận: {clearanceTarget?.name}</span>
            </div>
            <p className="text-[11px] text-ink-secondary">
              Mã định danh:{" "}
              <span className="font-mono text-ink-primary">
                {clearanceTarget?.id}
              </span>
            </p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="clearance-reason-input"
              className="block font-semibold text-ink-primary"
            >
              Lý do & Biên bản nghiệm thu vệ sinh *
            </label>
            <textarea
              id="clearance-reason-input"
              required
              rows={3}
              value={clearanceReason}
              onChange={(e) => setClearanceReason(e.target.value)}
              placeholder="VD: Đã xuất hết toàn bộ tồn kho và quét hút bụi đáy silo sạch sẽ..."
              className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary text-xs focus:border-accent-primary focus:outline-none resize-none"
            />
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="clearance-evidence-input"
              className="block font-semibold text-ink-primary"
            >
              Mã bằng chứng nghiệm thu (Evidence ID) *
            </label>
            <input
              id="clearance-evidence-input"
              required
              type="text"
              value={clearanceEvidenceId}
              onChange={(e) => setClearanceEvidenceId(e.target.value)}
              placeholder="VD: e2dcea67-87e8-4db4-a399-d81eb1e90730"
              className="w-full px-3 py-2 rounded-lg bg-surface-raised border border-ink-tertiary/20 text-ink-primary font-mono text-xs focus:border-accent-primary focus:outline-none"
            />
            <p className="text-[11px] text-ink-tertiary">
              Nhập UUID biên bản kiểm tra vệ sinh mặt bằng đã đăng ký
              trong sổ cái.
            </p>
          </div>

          <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setClearanceTarget(null)}
              disabled={submittingClearance}
              className="px-4 py-2 rounded-lg border border-ink-tertiary/20 text-ink-secondary hover:text-ink-primary hover:bg-surface-raised font-semibold transition-colors disabled:opacity-50"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submittingClearance || !clearanceReason.trim() || !clearanceEvidenceId.trim()}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-50 shadow-xs"
            >
              {submittingClearance ? (
                <span>Đang xử lý...</span>
              ) : (
                <>
                  <CheckCircle size={15} weight="bold" />
                  <span>Xác nhận Vệ sinh Silo</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
