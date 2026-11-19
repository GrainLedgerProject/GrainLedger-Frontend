import { adminEndpoints, type OrganizationDto } from "@/api/admin";
import { ledgerEndpoints } from "@/api/ledger";
import { confirmAction, toast } from "@/app/store/feedbackStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { Modal } from "@/shared/ui/Modal";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import {
  ArrowsClockwise,
  Buildings,
  FloppyDisk,
  PencilSimple,
  Plus,
  Sliders,
  Trash,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

interface ThresholdValue {
  percentage: string;
  version: string;
}
interface CompanyThreshold extends ThresholdValue {
  companyId: string;
  companyName: string;
}
interface ThresholdSettings {
  systemDefault: ThresholdValue;
  companyOverrides: CompanyThreshold[];
}

function parseSettings(value: unknown): ThresholdSettings {
  if (!value || typeof value !== "object")
    throw new Error("Dữ liệu ngưỡng tiếp nhận không hợp lệ.");
  const data = value as Partial<ThresholdSettings>;
  if (
    !data.systemDefault ||
    typeof data.systemDefault.percentage !== "string" ||
    typeof data.systemDefault.version !== "string" ||
    !Array.isArray(data.companyOverrides)
  ) {
    throw new Error("Dữ liệu ngưỡng tiếp nhận không hợp lệ.");
  }
  return data as ThresholdSettings;
}

export const ReceivingThresholdsPage = () => {
  const [settings, setSettings] = useState<ThresholdSettings | null>(null);
  const [organizations, setOrganizations] = useState<OrganizationDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<
    "default" | "new" | CompanyThreshold | null
  >(null);
  const [companyId, setCompanyId] = useState("");
  const [percentage, setPercentage] = useState("");
  const [reason, setReason] = useState("");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rawSettings, rawOrganizations] = await Promise.all([
        ledgerEndpoints.getReceivingThresholds(),
        adminEndpoints.getOrganizations(),
      ]);
      setSettings(parseSettings(rawSettings));
      setOrganizations(
        Array.isArray(rawOrganizations)
          ? (rawOrganizations as OrganizationDto[]).filter(
              (org) => org.kind === "Customer",
            )
          : [],
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể tải ngưỡng tiếp nhận.",
      );
      setSettings(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    async function initData() {
      try {
        const [rawSettings, rawOrganizations] = await Promise.all([
          ledgerEndpoints.getReceivingThresholds(),
          adminEndpoints.getOrganizations(),
        ]);
        if (!active) return;
        setSettings(parseSettings(rawSettings));
        setOrganizations(
          Array.isArray(rawOrganizations)
            ? (rawOrganizations as OrganizationDto[]).filter(
                (org) => org.kind === "Customer",
              )
            : [],
        );
      } catch (cause) {
        if (!active) return;
        setError(
          cause instanceof Error
            ? cause.message
            : "Không thể tải ngưỡng tiếp nhận.",
        );
        setSettings(null);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void initData();

    return () => {
      active = false;
    };
  }, []);

  const availableOrganizations = organizations.filter(
    (org) =>
      !settings?.companyOverrides.some((item) => item.companyId === org.id),
  );

  const openEditor = (target: "default" | "new" | CompanyThreshold) => {
    setEditing(target);
    setCompanyId(
      target === "new"
        ? availableOrganizations[0]?.id || ""
        : target === "default"
          ? ""
          : target.companyId,
    );
    setPercentage(
      target === "new" || target === "default"
        ? settings?.systemDefault.percentage || ""
        : target.percentage,
    );
    setReason("");
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings || !editing) return;
    if (
      !/^\d+(\.\d{1,6})?$/.test(percentage) ||
      Number(percentage) >= 100 ||
      !reason.trim()
    ) {
      setError(
        "Nhập tỷ lệ từ 0 đến dưới 100% (tối đa 6 chữ số thập phân) và lý do.",
      );
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { percentage, reason: reason.trim() };
      if (editing === "default") {
        await ledgerEndpoints.updateDefaultReceivingThreshold({
          ...payload,
          version: settings.systemDefault.version,
        });
      } else if (editing === "new") {
        if (!companyId) throw new Error("Cần chọn doanh nghiệp.");
        await ledgerEndpoints.createCompanyReceivingThreshold(
          companyId,
          payload,
        );
      } else {
        await ledgerEndpoints.updateCompanyReceivingThreshold(
          editing.companyId,
          { ...payload, version: editing.version },
        );
      }
      setEditing(null);
      toast.success("Đã lưu ngưỡng tiếp nhận.");
      await loadData();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Không thể lưu ngưỡng tiếp nhận.",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeCompany = async (item: CompanyThreshold) => {
    if (
      !(await confirmAction({
        title: "Xóa ngưỡng riêng",
        description: `Áp dụng ngưỡng mặc định cho ${item.companyName}?`,
        confirmLabel: "Xóa ngưỡng",
        variant: "danger",
      }))
    )
      return;
    setError(null);
    try {
      await ledgerEndpoints.deleteCompanyReceivingThreshold(item.companyId, {
        version: item.version,
        reason: "Xóa ngưỡng riêng theo yêu cầu quản trị viên",
      });
      toast.success("Đã xóa ngưỡng riêng.");
      await loadData();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Không thể xóa ngưỡng riêng.",
      );
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            CHÍNH SÁCH TIẾP NHẬN NGUYÊN LIỆU
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            Ngưỡng hao hụt khi tiếp nhận
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            Tỷ lệ hao hụt vận chuyển mặc định và ngưỡng riêng theo doanh nghiệp.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => void loadData()}
            disabled={loading}
            aria-label="Tải lại danh sách"
            title="Tải lại danh sách"
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors disabled:opacity-50"
          >
            <ArrowsClockwise
              size={16}
              aria-hidden="true"
              className={loading ? "motion-safe:animate-spin" : undefined}
            />
          </button>
          <button
            type="button"
            onClick={() => openEditor("new")}
            disabled={
              loading || !settings || availableOrganizations.length === 0
            }
            className="inline-flex min-h-11 items-center gap-2 px-4 py-2.5 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-colors shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} weight="bold" aria-hidden="true" />
            <span>Thêm ngưỡng riêng</span>
          </button>
        </div>
      </header>
      {error && !editing && (
        <div
          role="alert"
          className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2"
        >
          <WarningCircle
            size={18}
            weight="fill"
            className="shrink-0"
            aria-hidden="true"
          />
          <span>{error}</span>
        </div>
      )}
      {loading && (
        <div className="py-16 flex justify-center">
          <GrainLoader label="Đang tải ngưỡng tiếp nhận" />
        </div>
      )}
      {settings && !loading && (
        <>
          <section className="p-5 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                  <Sliders size={22} weight="bold" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-display font-bold text-base text-ink-primary">
                    Ngưỡng mặc định toàn hệ thống
                  </h3>
                  <p className="text-xs text-ink-secondary mt-0.5">
                    Áp dụng cho doanh nghiệp chưa có ngưỡng riêng.
                  </p>
                </div>
              </div>
              <StatusBadge status="ACTIVE" label="Mặc định hệ thống" />
            </div>
            <div className="flex flex-wrap items-end justify-between gap-4 pt-4 border-t border-ink-tertiary/15">
              <div>
                <p className="text-xs text-ink-secondary">
                  Tỷ lệ hao hụt cho phép
                </p>
                <p className="mt-1 text-3xl font-mono font-bold text-accent-primary">
                  {settings.systemDefault.percentage}
                  <span className="ml-1 text-lg">%</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => openEditor("default")}
                className="inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-primary font-semibold text-xs transition-colors shadow-xs"
              >
                <PencilSimple size={16} aria-hidden="true" /> Chỉnh sửa mặc định
              </button>
            </div>
          </section>
          <section className="space-y-4">
            <div className="flex items-center gap-2 border-b border-ink-tertiary/15 pb-3">
              <Buildings
                size={18}
                className="text-accent-primary"
                aria-hidden="true"
              />
              <h3 className="text-sm font-display font-bold text-ink-primary">
                Ngưỡng riêng theo doanh nghiệp
              </h3>
              <span className="px-2 py-0.5 rounded-full text-xs bg-accent-primary/10 text-accent-primary font-mono font-bold">
                {settings.companyOverrides.length}
              </span>
            </div>
            {settings.companyOverrides.length === 0 && (
              <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised py-12 px-5 flex flex-col items-center text-center shadow-xs">
                <div className="w-12 h-12 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center mb-4">
                  <Buildings size={24} aria-hidden="true" />
                </div>
                <p className="font-display font-bold text-sm text-ink-primary">
                  Chưa có ngưỡng riêng
                </p>
                <p className="mt-1 text-xs text-ink-secondary">
                  Mọi doanh nghiệp hiện dùng ngưỡng mặc định của hệ thống.
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {settings.companyOverrides.map((item) => (
                <article
                  key={item.companyId}
                  className="p-5 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs hover:shadow-md transition-shadow space-y-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-10 h-10 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                      <Buildings size={22} weight="bold" aria-hidden="true" />
                    </div>
                    <StatusBadge status="ACTIVE" label="Ngưỡng riêng" />
                  </div>
                  <h4 className="font-display font-bold text-base text-ink-primary break-words">
                    {item.companyName}
                  </h4>
                  <div>
                    <p className="text-xs text-ink-secondary">
                      Tỷ lệ hao hụt cho phép
                    </p>
                    <p className="mt-1 text-2xl font-mono font-bold text-accent-primary">
                      {item.percentage}
                      <span className="ml-1 text-base">%</span>
                    </p>
                  </div>
                  <div className="pt-3 border-t border-ink-tertiary/15 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => openEditor(item)}
                      className="inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised text-xs font-semibold text-ink-primary transition-colors"
                    >
                      <PencilSimple size={14} aria-hidden="true" /> Chỉnh sửa
                    </button>
                    <button
                      type="button"
                      onClick={() => void removeCompany(item)}
                      className="inline-flex min-h-11 items-center gap-1.5 px-3 py-2 rounded-lg border border-accent-danger/30 hover:bg-accent-danger/10 text-xs font-semibold text-accent-danger transition-colors"
                    >
                      <Trash size={14} aria-hidden="true" /> Xóa
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      )}
      <Modal
        isOpen={editing !== null}
        onClose={() => {
          if (!saving) setEditing(null);
        }}
        ariaLabel="Cấu hình ngưỡng tiếp nhận"
        closeOnBackdrop={!saving}
      >
        <div className="w-full max-w-md bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in focus:rounded-lg">
          <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
                <Sliders size={18} weight="bold" aria-hidden="true" />
              </div>
              <div>
                <h2 className="font-display font-bold text-base text-ink-primary">
                  {editing === "default"
                    ? "Sửa ngưỡng mặc định"
                    : editing === "new"
                      ? "Thêm ngưỡng riêng"
                      : "Sửa ngưỡng riêng"}
                </h2>
                <p className="text-[11px] text-ink-secondary">
                  Cấu hình sai số hao hụt tiếp nhận nguyên liệu tại trạm
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setEditing(null)}
              disabled={saving}
              aria-label="Đóng hộp thoại"
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-ink-tertiary hover:text-ink-primary hover:bg-surface-overlay/50 transition-colors disabled:opacity-50"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </header>

          <form
            onSubmit={(event) => void submit(event)}
            className="p-5 space-y-4 text-xs"
          >
            {error && (
              <div
                role="alert"
                className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2"
              >
                <WarningCircle
                  size={18}
                  weight="fill"
                  className="shrink-0"
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}
            {editing === "new" && (
              <div>
                <label
                  htmlFor="threshold-company"
                  className="block font-semibold text-ink-secondary mb-1"
                >
                  Doanh nghiệp *
                </label>
                <select
                  id="threshold-company"
                  required
                  disabled={saving}
                  value={companyId}
                  onChange={(event) => setCompanyId(event.target.value)}
                  className="w-full min-h-11 px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none disabled:opacity-60"
                >
                  <option value="">Chọn doanh nghiệp</option>
                  {availableOrganizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            <div>
              <label
                htmlFor="threshold-percentage"
                className="block font-semibold text-ink-secondary mb-1"
              >
                Tỷ lệ hao hụt (%) *
              </label>
              <input
                id="threshold-percentage"
                required
                disabled={saving}
                type="number"
                min="0"
                max="99.999999"
                step="0.000001"
                value={percentage}
                onChange={(event) => setPercentage(event.target.value)}
                aria-describedby="threshold-percentage-hint"
                className="w-full min-h-11 px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none disabled:opacity-60"
              />
              <p
                id="threshold-percentage-hint"
                className="mt-1.5 text-xs text-ink-tertiary"
              >
                Từ 0 đến dưới 100%, tối đa 6 chữ số thập phân.
              </p>
            </div>
            <div>
              <label
                htmlFor="threshold-reason"
                className="block font-semibold text-ink-secondary mb-1"
              >
                Lý do thay đổi *
              </label>
              <textarea
                id="threshold-reason"
                required
                disabled={saving}
                maxLength={4000}
                rows={3}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="w-full px-3 py-2 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none disabled:opacity-60"
              />
            </div>
            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                disabled={saving}
                className="min-h-11 px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary text-xs transition-colors disabled:opacity-60"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-11 items-center justify-center gap-2 px-5 py-2 rounded-full bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60 text-xs shadow-xs"
              >
                {saving ? (
                  <ArrowsClockwise
                    size={16}
                    className="motion-safe:animate-spin"
                    aria-hidden="true"
                  />
                ) : (
                  <FloppyDisk size={16} aria-hidden="true" />
                )}
                {saving ? "Đang lưu..." : "Lưu ngưỡng"}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
