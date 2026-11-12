import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { procurementEndpoints } from "@/api/procurement";
import { catalogsEndpoints, type ActiveSubstanceDto } from "@/api/catalogs";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import { Modal } from "@/components/Modal";
import { StatusBadge } from "@/components/StatusBadge/StatusBadge";
import {
  Plant,
  Plus,
  ArrowsClockwise,
  MagnifyingGlass,
  CheckCircle,
  WarningCircle,
  X,
  Calendar,
  Flask,
  ShieldWarning,
} from "@phosphor-icons/react";

interface SprayRecord {
  id: string;
  plotSeasonId: string;
  appliedOn: string;
  informationSource?: string;
  evidenceRef?: string;
  items?: Array<{
    productName: string;
    substanceId: string;
  }>;
}

export const PesticideDeclarationPage: React.FC = () => {
  const { t } = useTranslation();
  const [declarations, setDeclarations] = useState<SprayRecord[]>([]);
  const [substances, setSubstances] = useState<ActiveSubstanceDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    plotSeasonId: "",
    appliedOn: new Date().toISOString().split("T")[0],
    productName: "Beam 75WP (Tricyclazole)",
    substanceId: "",
    informationSource: "Khai báo nhật ký đồng ruộng của nông dân",
  });
  const [submitting, setSubmitting] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sprayRes, subRes] = await Promise.all([
        procurementEndpoints.getSprayDeclarations().catch(() => []),
        catalogsEndpoints.getActiveSubstances({ pageSize: 50 }).catch(() => []),
      ]);

      const sprayItems = Array.isArray(sprayRes)
        ? sprayRes
        : (sprayRes as any)?.items || [];
      const subItems = Array.isArray(subRes)
        ? subRes
        : (subRes as any)?.items || [];

      setDeclarations(sprayItems);
      setSubstances(subItems);
      if (subItems.length > 0 && !formData.substanceId) {
        setFormData((prev) => ({ ...prev, substanceId: subItems[0].id }));
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t(
            "field.pesticide.errorLoad",
            "Không thể tải lịch sử khai báo phun thuốc.",
          ),
        );
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleOpenCreate = () => {
    setFormData({
      plotSeasonId: crypto.randomUUID(),
      appliedOn: new Date().toISOString().split("T")[0],
      productName: "Beam 75WP (Tricyclazole)",
      substanceId: substances[0]?.id || crypto.randomUUID(),
      informationSource: "Khai báo nhật ký đồng ruộng của nông dân",
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const entityId = crypto.randomUUID();
      const clientOperationId = crypto.randomUUID();

      await procurementEndpoints.recordSprayDeclaration({
        deviceId: "grainledger-web",
        clientOperationId,
        capturedAt: new Date().toISOString(),
        payloadSchemaVersion: 1,
        payload: {
          entityId,
          plotSeasonId: formData.plotSeasonId || crypto.randomUUID(),
          appliedOn: formData.appliedOn,
          informationSource: formData.informationSource,
          evidenceRef: "EVD-DIARY-2026-001",
          items: [
            {
              productName: formData.productName,
              substanceId: formData.substanceId || crypto.randomUUID(),
            },
          ],
        },
      });

      setSuccessMsg(
        t(
          "field.pesticide.successRecord",
          "Đã ghi nhận khai báo phun thuốc {{name}}",
          {
            name: formData.productName,
          },
        ),
      );
      setIsModalOpen(false);
      await loadData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(
          t(
            "field.pesticide.errorRecord",
            "Không thể ghi nhận khai báo phun thuốc.",
          ),
        );
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span className="text-xs font-mono font-bold text-accent-primary uppercase tracking-wider block">
            {t("field.pesticide.tag", "KHAI BÁO PHUN THUỐC BVTV THEO THỬA")}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t(
              "field.pesticide.title",
              "Nhật ký Phun thuốc & Cảnh báo Dư lượng MRL",
            )}
          </h2>
          <p className="text-xs text-ink-secondary mt-0.5">
            {t(
              "field.pesticide.subtitle",
              "Thu thập thông tin hoạt chất, ngày phun và liều lượng từ nông dân làm cơ sở gán cận bảo thủ 95% MRL.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={t("common.reload", "Tải lại dữ liệu")}
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
            <span>
              {t("field.pesticide.createBtn", "Khai báo Phun thuốc mới")}
            </span>
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

      {/* Table */}
      <div className="rounded-xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-16 flex justify-center">
            <GrainLoader
              label={t(
                "field.pesticide.loading",
                "Đang tải lịch sử khai báo...",
              )}
            />
          </div>
        ) : declarations.length === 0 ? (
          <div className="py-16 text-center space-y-2">
            <Plant size={40} className="mx-auto text-ink-tertiary opacity-60" />
            <p className="text-sm font-semibold text-ink-primary">
              {t(
                "field.pesticide.emptyTitle",
                "Chưa có khai báo phun thuốc nào",
              )}
            </p>
            <p className="text-xs text-ink-secondary max-w-sm mx-auto">
              {t(
                "field.pesticide.emptyDesc",
                'Nhấn "Khai báo Phun thuốc mới" để nhập thông tin thuốc bảo vệ thực vật đã phun trên thửa ruộng.',
              )}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/20 text-ink-secondary font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-4">
                    {t("field.pesticide.appliedOn", "Ngày áp dụng")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.pesticide.productName", "Tên thương phẩm")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.pesticide.source", "Nguồn thông tin")}
                  </th>
                  <th className="py-3 px-4">
                    {t("field.pesticide.riskAssessment", "Đánh giá rủi ro")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink-tertiary/10">
                {declarations.map((d) => {
                  const item = d.items?.[0];
                  return (
                    <tr
                      key={d.id}
                      className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-ink-primary">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar size={13} className="text-accent-primary" />
                          <span>{d.appliedOn}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 font-semibold text-ink-primary">
                        {item?.productName ||
                          t(
                            "field.pesticide.defaultProduct",
                            "Thuốc bảo vệ thực vật",
                          )}
                      </td>
                      <td className="py-3 px-4 text-ink-secondary text-[11px]">
                        {d.informationSource ||
                          t(
                            "field.pesticide.defaultSource",
                            "Nhật ký đồng ruộng",
                          )}
                      </td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          status="STALE"
                          label={t(
                            "field.pesticide.pendingLab",
                            "Chờ mẫu Lab đối chứng",
                          )}
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        ariaLabel={t("field.pesticide.modalTitle", "Khai báo phun thuốc")}
      >
        <div className="w-full max-w-md bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 rounded-2xl shadow-xl overflow-hidden animate-ledger-in">
          <div className="p-5 border-b border-ink-tertiary/15 flex items-center justify-between">
            <h3 className="font-display font-bold text-base text-ink-primary">
              {t(
                "field.pesticide.modalTitle",
                "Ghi nhận Khai báo Phun thuốc BVTV",
              )}
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
                {t("field.pesticide.appliedDateLabel", "Ngày phun thuốc *")}
              </label>
              <input
                type="date"
                required
                value={formData.appliedOn}
                onChange={(e) =>
                  setFormData({ ...formData, appliedOn: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                {t(
                  "field.pesticide.productNameLabel",
                  "Tên thương phẩm thuốc BVTV *",
                )}
              </label>
              <input
                type="text"
                required
                value={formData.productName}
                onChange={(e) =>
                  setFormData({ ...formData, productName: e.target.value })
                }
                placeholder={t(
                  "field.pesticide.productNamePlaceholder",
                  "VD: Beam 75WP, Anvil 5SC",
                )}
                className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-ink-secondary mb-1">
                {t(
                  "field.pesticide.substanceLabel",
                  "Hoạt chất chính trong danh mục *",
                )}
              </label>
              <select
                required
                value={formData.substanceId}
                onChange={(e) =>
                  setFormData({ ...formData, substanceId: e.target.value })
                }
                className="w-full px-3 py-2 rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 focus:border-accent-primary focus:outline-none"
              >
                {substances.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
                {substances.length === 0 && (
                  <option value="TCZ001">Tricyclazole (TCZ001)</option>
                )}
              </select>
            </div>

            <div className="pt-3 border-t border-ink-tertiary/15 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-ink-tertiary/20 hover:bg-surface-raised font-semibold text-ink-secondary"
              >
                {t("common.cancel", "Huỷ")}
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-accent-primary text-white font-semibold hover:bg-accent-primary-dim transition-colors disabled:opacity-60"
              >
                {submitting
                  ? t("common.saving", "Đang lưu...")
                  : t("field.pesticide.submitBtn", "Ghi nhận")}
              </button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
};
