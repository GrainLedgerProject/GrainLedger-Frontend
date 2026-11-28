import { useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowUpRight,
  CaretDown,
  ClockCounterClockwise,
  Eye,
  Flask,
  FloppyDisk,
  MagnifyingGlass,
  X,
} from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/client";
import { catalogsEndpoints } from "@/api/catalogs";
import { ledgerEndpoints, type ResidueEvaluation } from "@/api/ledger";
import { collectPages } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge, type StatusType } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { riskPaths } from "../paths";

function mapResidueStatus(status: string): StatusType {
  const upper = status.toUpperCase();
  if (
    upper === "COMPLETE" ||
    upper === "COMPLETED" ||
    upper.includes("PASS") ||
    upper.includes("COMPLIANT") ||
    upper === "OK" ||
    upper === "WITHIN_MRL"
  ) {
    return "COMPLIANT";
  }
  if (
    upper.includes("FAIL") ||
    upper.includes("EXCEED") ||
    upper.includes("BLOCK") ||
    upper === "HOLD"
  ) {
    return "HOLD";
  }
  if (upper.includes("STALE")) {
    return "STALE";
  }
  return "PENDING";
}

export function ResidueBounds({
  lotId,
  lotLabel,
}: {
  lotId: string;
  lotLabel?: string;
}) {
  const text = useWorkflowText();
  const allowed = useAuthStore((state) =>
    state.user?.permissions.includes("residue.evaluate"),
  );
  const [opened, setOpened] = useState(false);
  if (!allowed) return null;

  return (
    <details
      className="group record-card overflow-hidden rounded-2xl"
      onToggle={(event) => {
        if (
          event.target === event.currentTarget &&
          event.currentTarget.open
        ) {
          setOpened(true);
        }
      }}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3.5 transition-colors hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile shrink-0" aria-hidden="true">
            <Flask size={18} weight="bold" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-display text-sm font-bold text-ink-primary">
                {text(
                  "Khoảng dư lượng và lịch sử đánh giá",
                  "Residue bounds and evaluation history",
                )}
              </span>
              {lotLabel && (
                <span className="rounded-md border border-ink-tertiary/20 bg-surface-raised px-2 py-0.5 font-mono text-[11px] font-semibold text-accent-primary dark:bg-surface-overlay">
                  {lotLabel}
                </span>
              )}
            </div>
            <span className="block text-[11px] text-ink-secondary">
              {text(
                "Xem trước hoặc lưu kết quả tính toán cận dư lượng MRL và truy vết nguồn lab.",
                "Preview or save MRL residue bound evaluations and inspect lab provenance.",
              )}
            </span>
          </div>
        </div>
        <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary transition-transform duration-200 group-open:rotate-180 dark:bg-surface-overlay">
          <CaretDown size={14} weight="bold" aria-hidden="true" />
        </span>
      </summary>

      {opened && (
        <div className="border-t border-ink-tertiary/15 p-4 sm:p-5">
          <ResidueEvaluationPanel key={lotId} lotId={lotId} />
        </div>
      )}
    </details>
  );
}

function ResidueEvaluationPanel({ lotId }: { lotId: string }) {
  const text = useWorkflowText();
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [result, setResult] = useState<ResidueEvaluation | null>(null);
  const requestId = useRef<{ scope: string; id: string } | null>(null);
  const historyKey = ["lot-residue-history", lotId];
  const history = useQuery({
    queryKey: historyKey,
    queryFn: () => ledgerEndpoints.getResidueEvaluations(lotId),
  });
  const substances = useQuery({
    queryKey: ["field-spray-substances"],
    queryFn: () => collectPages(catalogsEndpoints.getActiveSubstances),
  });
  const evaluation = useMutation({
    mutationFn: (command: () => Promise<ResidueEvaluation>) => command(),
    onSuccess: (record) => setResult(record),
  });

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected.length || evaluation.isPending) return;
    if (
      (event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") ===
      "save"
    ) {
      const scope = [...selected].sort().join(",");
      if (requestId.current?.scope !== scope) {
        requestId.current = { scope, id: crypto.randomUUID() };
      }
      const id = requestId.current.id;
      evaluation.mutate(
        () =>
          ledgerEndpoints.createResidueEvaluation(lotId, {
            id,
            substanceIds: selected,
          }),
        {
          onSuccess: () => {
            requestId.current = null;
            void client.invalidateQueries({ queryKey: historyKey });
          },
          onError: (err) => {
            if (err instanceof ApiError && err.status < 500) {
              requestId.current = null;
            }
          },
        },
      );
    } else {
      evaluation.mutate(() =>
        ledgerEndpoints.getResiduePreview(lotId, {
          substanceIds: selected.join(","),
        }),
      );
    }
  }

  const normalizedSearch = search.trim().toLocaleLowerCase();
  const filteredSubstances =
    substances.data?.filter(
      (row) =>
        selected.includes(row.id) ||
        `${row.code} ${row.name}`
          .toLocaleLowerCase()
          .includes(normalizedSearch),
    ) ?? [];

  return (
    <div className="space-y-5">
      <form method="post" onSubmit={submit} className="space-y-4">
        <fieldset className="space-y-3" disabled={evaluation.isPending}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <legend className="text-xs font-semibold text-ink-primary">
              {text(
                "Hoạt chất cần đánh giá (tối đa 200)",
                "Active substances to evaluate (up to 200)",
              )}
            </legend>
            <div className="flex items-center gap-2">
              <StatusBadge
                status={selected.length > 0 ? "ACTIVE" : "PENDING"}
                size="sm"
                label={`${selected.length} / 200`}
              />
              {selected.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelected([])}
                  className="inline-flex items-center gap-1 rounded-full border border-ink-tertiary/20 bg-surface-base px-2.5 py-1 text-[11px] font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-overlay"
                >
                  <X size={12} aria-hidden="true" />
                  <span>{text("Bỏ chọn", "Clear")}</span>
                </button>
              )}
            </div>
          </div>

          <div className="relative">
            <MagnifyingGlass
              size={15}
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
            />
            <input
              aria-label={text("Tìm hoạt chất", "Find a substance")}
              name="search"
              type="search"
              value={search}
              placeholder={text(
                "Lọc theo mã hoặc tên hoạt chất...",
                "Filter by substance code or name...",
              )}
              onChange={(e) => setSearch(e.target.value)}
              className="filter-control border-ink-tertiary/20 bg-surface-raised pe-9 ps-9 dark:bg-surface-overlay"
            />
            {search && (
              <button
                type="button"
                aria-label={text("Xóa tìm kiếm hoạt chất", "Clear substance search")}
                onClick={() => setSearch("")}
                className="absolute end-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-ink-tertiary hover:bg-surface-base hover:text-ink-primary"
              >
                <X size={13} aria-hidden="true" />
              </button>
            )}
          </div>

          <div className="max-h-52 space-y-1 overflow-y-auto rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 p-2 dark:bg-surface-overlay/25">
            {filteredSubstances.length > 0 ? (
              filteredSubstances.map((row) => {
                const isChecked = selected.includes(row.id);
                const limitReached = selected.length === 200 && !isChecked;
                return (
                  <label
                    key={row.id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                      isChecked
                        ? "bg-accent-primary/10 font-semibold text-ink-primary"
                        : "text-ink-secondary hover:bg-surface-base hover:text-ink-primary dark:hover:bg-surface-overlay"
                    } ${limitReached ? "cursor-not-allowed opacity-50" : ""}`}
                  >
                    <input
                      name="substances"
                      type="checkbox"
                      checked={isChecked}
                      disabled={limitReached}
                      onChange={(e) =>
                        setSelected((ids) =>
                          e.target.checked
                            ? [...ids, row.id]
                            : ids.filter((id) => id !== row.id),
                        )
                      }
                      className="size-4 rounded border-ink-tertiary/30 accent-accent-primary"
                    />
                    <span className="font-mono font-bold text-accent-primary">
                      {row.code}
                    </span>
                    <span className="min-w-0 truncate">{row.name}</span>
                  </label>
                );
              })
            ) : (
              <p className="py-4 text-center text-xs text-ink-tertiary">
                {substances.isPending
                  ? text("Đang tải danh sách hoạt chất...", "Loading active substances...")
                  : text("Không tìm thấy hoạt chất phù hợp.", "No matching active substances.")}
              </p>
            )}
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            value="preview"
            disabled={evaluation.isPending || !selected.length}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-ink-tertiary/25 bg-surface-base px-4 py-2 text-xs font-semibold text-ink-primary transition-colors hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-overlay dark:hover:bg-surface-raised"
          >
            <Eye size={14} weight="bold" aria-hidden="true" />
            <span>{text("Xem trước", "Preview")}</span>
          </button>
          <button
            type="submit"
            value="save"
            disabled={evaluation.isPending || !selected.length}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full bg-accent-primary px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-accent-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <FloppyDisk size={14} weight="bold" aria-hidden="true" />
            <span>{text("Lưu đánh giá", "Save evaluation")}</span>
          </button>
        </div>
      </form>

      {(history.isPending || substances.isPending || evaluation.isPending) && (
        <div className="flex justify-center py-4">
          <GrainLoader
            size="sm"
            label={text(
              "Đang tải dữ liệu đánh giá dư lượng...",
              "Loading residue evaluation data...",
            )}
          />
        </div>
      )}

      {(history.error || substances.error || evaluation.error) && (
        <div className="text-xs">
          <Feedback error={history.error ?? substances.error ?? evaluation.error} />
        </div>
      )}

      {history.data?.items.length ? (
        <section className="space-y-2.5 rounded-xl border border-ink-tertiary/20 bg-surface-raised/40 p-3.5 dark:bg-surface-overlay/25">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <ClockCounterClockwise
                size={15}
                weight="bold"
                className="text-accent-primary"
                aria-hidden="true"
              />
              <h3 className="text-xs font-semibold text-ink-primary">
                {text("Đánh giá đã lưu", "Saved evaluations")}
              </h3>
            </div>
            <StatusBadge
              status="ACTIVE"
              size="sm"
              label={`${history.data.items.length}`}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {history.data.items.map((row) => {
              const isSelected = result?.id === row.id;
              return (
                <button
                  key={row.id}
                  type="button"
                  aria-pressed={isSelected}
                  disabled={evaluation.isPending}
                  onClick={() =>
                    evaluation.mutate(() =>
                      ledgerEndpoints.getResidueEvaluation(lotId, row.id),
                    )
                  }
                  className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 font-mono text-[11px] font-semibold transition-colors disabled:opacity-50 ${
                    isSelected
                      ? "border-accent-primary bg-accent-primary text-white shadow-xs"
                      : "border-ink-tertiary/20 bg-surface-base text-ink-primary hover:border-accent-primary/40 hover:bg-surface-raised dark:bg-surface-overlay"
                  }`}
                >
                  <span>{new Date(row.snapshotAt).toLocaleString()}</span>
                </button>
              );
            })}
          </div>
        </section>
      ) : null}

      {result && (
        <section className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-raised/35 p-3.5 dark:bg-surface-overlay/20">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-ink-tertiary/15 pb-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={result.id ? "COMPLIANT" : "PENDING"}
                size="sm"
                label={
                  result.id
                    ? text("Kết quả đã lưu", "Saved result")
                    : text("Kết quả xem trước", "Preview result")
                }
              />
              <span className="font-mono text-xs text-ink-secondary">
                {new Date(result.snapshotAt).toLocaleString()}
              </span>
            </div>
            <span className="rounded-full border border-ink-tertiary/20 bg-surface-base px-2.5 py-0.5 font-mono text-[11px] font-semibold text-ink-secondary dark:bg-surface-overlay">
              {result.engineVersion}
            </span>
          </div>

          <div className="space-y-2">
            {result.results.map((row) => {
              const label =
                substances.data?.find((item) => item.id === row.substanceId)
                  ?.name ?? row.substanceId;
              return (
                <details
                  key={row.substanceId}
                  className="rounded-xl border border-ink-tertiary/20 bg-surface-base p-3 text-xs dark:bg-surface-overlay"
                >
                  <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <span className="font-semibold text-ink-primary">
                        {label}
                      </span>
                      <span className="block font-mono text-[11px] text-ink-secondary">
                        {row.lower ?? "—"} – {row.upper ?? "—"}
                        {row.unit ? ` ${row.unit}` : ""}
                      </span>
                    </div>
                    <StatusBadge
                      status={mapResidueStatus(row.status)}
                      size="sm"
                      label={row.status}
                    />
                  </summary>

                  <div className="mt-3 space-y-2.5 border-t border-ink-tertiary/15 pt-2.5 text-[11px] text-ink-secondary">
                    {row.reasons.length > 0 && (
                      <div>
                        <span className="font-semibold text-ink-primary">
                          {text("Diễn giải:", "Reasons:")}
                        </span>
                        <ul className="mt-1 list-disc space-y-0.5 ps-5">
                          {row.reasons.map((reason) => (
                            <li key={reason}>{reason}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {row.provenance.length > 0 && (
                      <div>
                        <span className="font-semibold text-ink-primary">
                          {text("Nguồn dữ liệu:", "Provenance:")}
                        </span>
                        <ul className="mt-1 list-disc space-y-1 ps-5">
                          {row.provenance.map((source, index) => (
                            <li key={index} className="font-mono">
                              {source.kind} · {source.sourceLotId}
                              {source.groupVersionId || source.selectionId
                                ? ` ${source.groupVersionId ?? source.selectionId}`
                                : ""}
                              {source.reportId && source.resultId && (
                                <>
                                  {" · "}
                                  <Link
                                    to={`${riskPaths.traceback}?${new URLSearchParams({
                                      reportId: source.reportId,
                                      resultId: source.resultId,
                                    })}`}
                                    className="inline-flex items-center gap-0.5 font-sans font-semibold text-accent-primary hover:underline"
                                  >
                                    <span>
                                      {text(
                                        "Truy vết kết quả lab",
                                        "Trace lab result",
                                      )}
                                    </span>
                                    <ArrowUpRight size={12} aria-hidden="true" />
                                  </Link>
                                </>
                              )}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {row.rules.length > 0 && (
                      <div>
                        <span className="font-semibold text-ink-primary">
                          {text("Quy tắc áp dụng:", "Applied rules:")}
                        </span>
                        <ul className="mt-1 flex flex-wrap gap-1.5">
                          {row.rules.map((rule) => (
                            <li
                              key={`${rule.id}:${rule.kind}`}
                              className="rounded-md border border-ink-tertiary/20 bg-surface-raised px-2 py-0.5 font-mono text-[11px] text-ink-secondary dark:bg-surface-base"
                            >
                              {rule.kind} · v{rule.version} ·{" "}
                              {rule.evidenceReference}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </details>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
