import { useUiStore } from "@/app/store/uiStore";
import { FunnelSimpleIcon } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";

export function MinimalModeToggle({ compact = false }: { compact?: boolean }) {
  const enabled = useUiStore((state) => state.isMinimalMode);
  const setMinimalMode = useUiStore((state) => state.setMinimalMode);
  const { t } = useTranslation();
  const label = t("header.minimalMode", "Chế độ tối giản");

  return (
    <button
      type="button"
      role="switch"
      aria-checked={enabled}
      aria-label={label}
      title={enabled ? t("header.disableMinimalMode", "Tắt chế độ tối giản") : t("header.enableMinimalMode", "Bật chế độ tối giản")}
      onClick={() => setMinimalMode(!enabled)}
      className={compact
        ? `hidden sm:inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border transition-colors ${enabled ? "bg-accent-primary/10 border-accent-primary/40 text-accent-primary" : "border-transparent text-ink-secondary hover:bg-surface-raised hover:text-ink-primary"}`
        : "flex min-h-11 w-full items-center gap-2.5 rounded-2xl px-3 py-2.5 text-left text-ink-primary hover:bg-surface-raised transition-colors"}
    >
      <FunnelSimpleIcon size={18} weight={enabled ? "fill" : "regular"} aria-hidden="true" className="shrink-0" />
      {!compact && <>
        <span className="flex-1 font-medium">{label}</span>
        <span aria-hidden="true" className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${enabled ? "bg-accent-primary" : "bg-ink-tertiary"}`}>
          <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow-xs transition-transform ${enabled ? "translate-x-4" : "translate-x-0"}`} />
        </span>
      </>}
    </button>
  );
}
