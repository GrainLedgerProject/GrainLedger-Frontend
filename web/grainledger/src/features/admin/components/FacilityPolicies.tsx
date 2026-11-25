import { Copy, Scales } from "@phosphor-icons/react";
import type { PolicyDto } from "@/api/ledger";
import type { FacilityConfigModel } from "../hooks/useFacilityConfig";

const POLICY_KIND_LABELS: Record<string, { label: string; color: string }> = {
  DRYING: {
    label: "Sấy lúa tươi (Drying)",
    color: "text-amber-700 bg-amber-500/10 border-amber-500/20",
  },
  MILLING: {
    label: "Xay xát bóc vỏ (Milling)",
    color: "text-blue-700 bg-blue-500/10 border-blue-500/20",
  },
  MERGE: {
    label: "Ghép mẻ đồng nhất (Merge)",
    color: "text-purple-700 bg-purple-500/10 border-purple-500/20",
  },
  BLENDING: {
    label: "Phối trộn cơ học (Blending)",
    color: "text-emerald-700 bg-emerald-500/10 border-emerald-500/20",
  },
  BAGGING: {
    label: "Đóng bao & Container (Bagging)",
    color: "text-indigo-700 bg-indigo-500/10 border-indigo-500/20",
  },
};

export function FacilityPolicies({ facPolicies, handleCopyId }: {
  facPolicies: PolicyDto[];
  handleCopyId: FacilityConfigModel["facilities"]["handleCopyId"];
}) {
  return (
    <div className="space-y-4">
      {facPolicies.length === 0 ? (
        <div className="p-8 text-center rounded-xl bg-surface-raised text-ink-secondary text-xs space-y-2">
          <Scales
            size={28}
            className="mx-auto text-ink-tertiary"
          />
          <p>
            Cơ sở này chưa áp dụng chính sách hao hụt hoặc dung
            sai đặc thù.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-ink-tertiary/15">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-surface-raised border-b border-ink-tertiary/15 text-ink-secondary font-semibold uppercase tracking-wider text-[11px]">
                <th className="py-2.5 px-4">Công đoạn áp dụng</th>
                <th className="py-2.5 px-4">
                  Dung sai định mức (%)
                </th>
                <th className="py-2.5 px-4">
                  Thời điểm hiệu lực
                </th>
                <th className="py-2.5 px-4">
                  Bằng chứng kỹ thuật (Evidence)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ink-tertiary/10 bg-surface-base">
              {facPolicies.map((pol) => {
                const meta = POLICY_KIND_LABELS[pol.kind] || {
                  label: pol.kind,
                  color:
                    "text-ink-secondary bg-surface-raised border-ink-tertiary/20",
                };
                const tolNum = parseFloat(pol.tolerancePercent);
                return (
                  <tr
                    key={pol.id}
                    className="hover:bg-surface-raised/50 transition-colors"
                  >
                    <td className="py-3 px-4 font-semibold text-ink-primary">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-lg text-xs font-semibold border ${meta.color}`}
                      >
                        {meta.label}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-accent-primary text-sm">
                      {tolNum.toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-ink-secondary font-mono">
                      {new Date(pol.effectiveFrom).toLocaleString(
                        "vi-VN",
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <button
                        type="button"
                        onClick={() =>
                          handleCopyId(
                            pol.evidenceId,
                            "Bằng chứng",
                          )
                        }
                        className="inline-flex items-center gap-1 font-mono text-[11px] text-ink-tertiary hover:text-accent-primary transition-colors"
                        title="Bấm để sao chép UUID Evidence"
                      >
                        <span>
                          {pol.evidenceId.slice(0, 16)}...
                        </span>
                        <Copy size={11} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
