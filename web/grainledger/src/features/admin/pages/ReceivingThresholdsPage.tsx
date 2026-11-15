import { adminEndpoints, type OrganizationDto } from "@/api/admin";
import { ledgerEndpoints } from "@/api/ledger";
import { confirmAction, toast } from "@/app/store/feedbackStore";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { Modal } from "@/components/Modal";
import { ArrowsClockwise, PencilSimple, Plus, Sliders, Trash, X } from "@phosphor-icons/react";
import { useCallback, useEffect, useState, type FormEvent } from "react";

interface ThresholdValue { percentage: string; version: string }
interface CompanyThreshold extends ThresholdValue { companyId: string; companyName: string }
interface ThresholdSettings { systemDefault: ThresholdValue; companyOverrides: CompanyThreshold[] }

function parseSettings(value: unknown): ThresholdSettings {
  if (!value || typeof value !== "object") throw new Error("Dữ liệu ngưỡng tiếp nhận không hợp lệ.");
  const data = value as Partial<ThresholdSettings>;
  if (!data.systemDefault || typeof data.systemDefault.percentage !== "string" ||
    typeof data.systemDefault.version !== "string" || !Array.isArray(data.companyOverrides)) {
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
  const [editing, setEditing] = useState<"default" | "new" | CompanyThreshold | null>(null);
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

  const availableOrganizations = organizations.filter((org) =>
    !settings?.companyOverrides.some((item) => item.companyId === org.id));

  const openEditor = (target: "default" | "new" | CompanyThreshold) => {
    setEditing(target);
    setCompanyId(target === "new" ? availableOrganizations[0]?.id || "" :
      target === "default" ? "" : target.companyId);
    setPercentage(target === "new" || target === "default" ?
      settings?.systemDefault.percentage || "" : target.percentage);
    setReason("");
    setError(null);
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!settings || !editing) return;
    if (!/^\d+(\.\d{1,6})?$/.test(percentage) || Number(percentage) >= 100 || !reason.trim()) {
      setError("Nhập tỷ lệ từ 0 đến dưới 100% (tối đa 6 chữ số thập phân) và lý do.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const payload = { percentage, reason: reason.trim() };
      if (editing === "default") {
        await ledgerEndpoints.updateDefaultReceivingThreshold({ ...payload, version: settings.systemDefault.version });
      } else if (editing === "new") {
        if (!companyId) throw new Error("Cần chọn doanh nghiệp.");
        await ledgerEndpoints.createCompanyReceivingThreshold(companyId, payload);
      } else {
        await ledgerEndpoints.updateCompanyReceivingThreshold(editing.companyId,
          { ...payload, version: editing.version });
      }
      setEditing(null);
      toast.success("Đã lưu ngưỡng tiếp nhận.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể lưu ngưỡng tiếp nhận.");
    } finally {
      setSaving(false);
    }
  };

  const removeCompany = async (item: CompanyThreshold) => {
    if (!await confirmAction({ title: "Xóa ngưỡng riêng",
      description: `Áp dụng ngưỡng mặc định cho ${item.companyName}?`,
      confirmLabel: "Xóa ngưỡng", variant: "danger" })) return;
    setError(null);
    try {
      await ledgerEndpoints.deleteCompanyReceivingThreshold(item.companyId, {
        version: item.version, reason: "Xóa ngưỡng riêng theo yêu cầu quản trị viên",
      });
      toast.success("Đã xóa ngưỡng riêng.");
      await loadData();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Không thể xóa ngưỡng riêng.");
    }
  };

  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
      <div>
        <h1 className="text-2xl font-display font-bold text-ink-primary">Ngưỡng hao hụt khi tiếp nhận</h1>
        <p className="mt-1 text-sm text-ink-secondary">Tỷ lệ hao hụt vận chuyển mặc định và ngưỡng riêng theo doanh nghiệp.</p>
      </div>
      <button type="button" onClick={() => void loadData()} disabled={loading}
        className="inline-flex items-center gap-2 rounded-xl border border-ink-tertiary/20 px-3 py-2 text-sm text-ink-primary disabled:opacity-50">
        <ArrowsClockwise size={16} /> Tải lại
      </button>
    </header>
    {error && <p role="alert" className="rounded-xl border border-accent-danger/30 bg-functional-rejected-bg p-3 text-sm text-accent-danger">{error}</p>}
    {loading && <GrainLoader label="Đang tải ngưỡng tiếp nhận" />}
    {settings && !loading && <>
      <section className="rounded-2xl border border-accent-primary/25 bg-surface-base p-5">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-display font-bold text-ink-primary">Ngưỡng mặc định toàn hệ thống</h2>
            <p className="mt-2 text-2xl font-mono font-bold text-accent-primary">{settings.systemDefault.percentage}%</p>
          </div>
          <button type="button" onClick={() => openEditor("default")}
            className="inline-flex items-center gap-2 rounded-xl border border-ink-tertiary/20 px-3 py-2 text-sm text-ink-primary">
            <PencilSimple size={16} /> Chỉnh sửa
          </button>
        </div>
      </section>
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-display font-bold text-ink-primary">Ngưỡng riêng theo doanh nghiệp</h2>
          <button type="button" onClick={() => openEditor("new")} disabled={availableOrganizations.length === 0}
            className="inline-flex items-center gap-2 rounded-xl bg-accent-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
            <Plus size={16} /> Thêm ngưỡng riêng
          </button>
        </div>
        {settings.companyOverrides.length === 0 &&
          <p className="rounded-2xl border border-ink-tertiary/15 bg-surface-base p-6 text-sm text-ink-secondary">
            Chưa có ngưỡng riêng. Mọi doanh nghiệp dùng ngưỡng mặc định.
          </p>}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {settings.companyOverrides.map((item) => <article key={item.companyId}
            className="rounded-2xl border border-ink-tertiary/20 bg-surface-base p-5">
            <h3 className="font-semibold text-ink-primary">{item.companyName}</h3>
            <p className="mt-2 text-xl font-mono font-bold text-accent-primary">{item.percentage}%</p>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={() => openEditor(item)}
                className="rounded-lg border border-ink-tertiary/20 px-3 py-1.5 text-sm text-ink-primary">Chỉnh sửa</button>
              <button type="button" onClick={() => void removeCompany(item)}
                className="inline-flex items-center gap-1 rounded-lg border border-accent-danger/30 px-3 py-1.5 text-sm text-accent-danger">
                <Trash size={14} /> Xóa
              </button>
            </div>
          </article>)}
        </div>
      </section>
    </>}
    <Modal isOpen={editing !== null} onClose={() => setEditing(null)} ariaLabel="Cấu hình ngưỡng tiếp nhận">
      <div className="w-full max-w-md bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
        <header className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between bg-surface-raised">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-accent-primary/10 text-accent-primary flex items-center justify-center shrink-0">
              <Sliders size={18} weight="bold" />
            </div>
            <div>
              <h2 className="font-display font-bold text-base text-ink-primary">
                {editing === "default" ? "Sửa ngưỡng mặc định" : editing === "new" ? "Thêm ngưỡng riêng" : "Sửa ngưỡng riêng"}
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
            className="p-1 rounded-md text-ink-tertiary hover:text-ink-primary transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </header>

        <form onSubmit={(event) => void submit(event)} className="p-5 space-y-4 text-xs">
          {editing === "new" && (
            <div>
              <label className="block font-semibold text-ink-secondary mb-1">Doanh nghiệp *</label>
              <select required value={companyId} onChange={(event) => setCompanyId(event.target.value)}
                className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full">
                <option value="">Chọn doanh nghiệp</option>
                {availableOrganizations.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
              </select>
            </div>
          )}
          <div>
            <label className="block font-semibold text-ink-secondary mb-1">Tỷ lệ hao hụt (%) *</label>
            <input required type="number" min="0" max="99.999999" step="0.000001" value={percentage}
              onChange={(event) => setPercentage(event.target.value)}
              className="w-full px-3 py-2 rounded-full bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none focus:rounded-full" />
          </div>
          <div>
            <label className="block font-semibold text-ink-secondary mb-1">Lý do thay đổi *</label>
            <textarea required maxLength={4000} rows={3} value={reason} onChange={(event) => setReason(event.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none" />
          </div>
          <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} disabled={saving}
              className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary text-xs transition-colors">
              Hủy
            </button>
            <button type="submit" disabled={saving}
              className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60 text-xs shadow-xs">
              {saving ? "Đang lưu..." : "Lưu ngưỡng"}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  </div>;
};
