import { useId, useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowsClockwise,
  CheckCircle,
  GitBranch,
  LockSimple,
  Package,
  ShieldCheck,
  WarningCircle,
} from "@phosphor-icons/react";
import { ApiError } from "@/api/client";
import {
  ledgerEndpoints,
  type ByproductStage,
  type ByproductVarietyPolicyItem,
  type ByproductVarietyPolicyResponse,
} from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { toast } from "@/app/store/feedbackStore";
import { millPaths } from "@/features/mill/paths";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";

type PolicyChoice = "default" | "allow" | "separate";

function choiceFromPolicy(policy: ByproductVarietyPolicyItem): PolicyChoice {
  if (policy.source === "SYSTEM_DEFAULT") return "default";
  return policy.allowCrossVariety ? "allow" : "separate";
}

function allowValueFromChoice(choice: PolicyChoice): boolean | null {
  if (choice === "default") return null;
  return choice === "allow";
}

function stageOrderIndex(stage: ByproductStage): number {
  return stage === "BRAN" ? 0 : 1;
}

export function ByproductVarietyPolicyPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);

  const hasAuthority =
    user?.role === "CUSTOMER_MANAGER" &&
    Boolean(user.organizationId) &&
    user.permissions.includes("byproduct.variety-policy.manage");

  if (!hasAuthority) {
    return (
      <div className="space-y-6 pb-8">
        <header className="border-b border-ink-tertiary/15 pb-4">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t("byproductPolicy.eyebrow")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {t("byproductPolicy.title")}
          </h1>
        </header>
        <section className="rounded-2xl border border-ink-tertiary/20 bg-surface-base p-6 shadow-xs dark:bg-surface-raised">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
              <LockSimple size={20} weight="bold" aria-hidden="true" />
            </span>
            <p role="alert" className="text-sm text-ink-secondary">
              {t("byproductPolicy.denied")}
            </p>
          </div>
        </section>
      </div>
    );
  }

  const scope = [
    user.id,
    user.organizationId,
    user.permissions.toSorted().join("|"),
  ].join(":");

  return <ByproductVarietyPolicyWorkspace key={scope} scope={scope} />;
}

function ByproductVarietyPolicyWorkspace({ scope }: { scope: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [reloadGeneration, setReloadGeneration] = useState(0);
  const [conflictMessage, setConflictMessage] = useState("");
  const [savedNotice, setSavedNotice] = useState<
    Partial<Record<ByproductStage, string>>
  >({});

  const queryKey = ["byproduct-variety-policy", scope] as const;

  const policyQuery = useQuery({
    queryKey,
    queryFn: () => ledgerEndpoints.getByproductVarietyPolicy(),
    retry: false,
    refetchOnWindowFocus: false,
  });

  const sortedItems: ByproductVarietyPolicyItem[] = [
    ...(policyQuery.data?.items ?? []),
  ].sort((a, b) => stageOrderIndex(a.stage) - stageOrderIndex(b.stage));

  const handleReload = () => {
    setConflictMessage("");
    setSavedNotice({});
    setReloadGeneration((current) => current + 1);
    void policyQuery.refetch();
  };

  const handleSaved = (updated: ByproductVarietyPolicyItem) => {
    setConflictMessage("");
    queryClient.setQueryData<ByproductVarietyPolicyResponse>(
      queryKey,
      (previous) => {
        if (!previous) return previous;
        return {
          ...previous,
          items: previous.items.map((item) =>
            item.stage === updated.stage ? updated : item,
          ),
        };
      },
    );
    const stageLabel =
      updated.stage === "BRAN"
        ? t("byproductPolicy.stages.BRAN.name")
        : t("byproductPolicy.stages.HUSK.name");
    const statusText = updated.allowCrossVariety
      ? t("byproductPolicy.effectiveAllow")
      : t("byproductPolicy.effectiveSeparate");
    const sourceText =
      updated.source === "SYSTEM_DEFAULT"
        ? t("byproductPolicy.sourceDefault")
        : t("byproductPolicy.sourceOverride");
    const message = t("byproductPolicy.savedStage", {
      stage: stageLabel,
      status: statusText,
      source: sourceText,
    });
    setSavedNotice((current) => ({ ...current, [updated.stage]: message }));
    toast.success(message);
  };

  const handleConflict = (stage: ByproductStage) => {
    const stageLabel =
      stage === "BRAN"
        ? t("byproductPolicy.stages.BRAN.name")
        : t("byproductPolicy.stages.HUSK.name");
    setSavedNotice((current) => {
      const next = { ...current };
      delete next[stage];
      return next;
    });
    setConflictMessage(t("byproductPolicy.conflictReloaded", { stage: stageLabel }));
    setReloadGeneration((current) => current + 1);
    void policyQuery.refetch();
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t("byproductPolicy.eyebrow")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {t("byproductPolicy.title")}
          </h1>
          <p data-ui-detail="secondary" className="mt-1 text-xs text-ink-secondary">
            {t("byproductPolicy.subtitle")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={millPaths.stock}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-4 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Package size={15} aria-hidden="true" />
            <span>{t("nav.stock.ledger", "Tồn kho sổ cái")}</span>
          </Link>
          <button
            type="button"
            onClick={handleReload}
            disabled={policyQuery.isFetching}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-tertiary/20 bg-surface-base px-4 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50 dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <ArrowsClockwise
              size={15}
              aria-hidden="true"
              className={
                policyQuery.isFetching
                  ? "motion-safe:animate-spin text-accent-primary"
                  : undefined
              }
            />
            <span>{t("byproductPolicy.reload")}</span>
          </button>
        </div>
      </header>

      <aside className="flex items-start gap-3 rounded-2xl border border-ink-tertiary/20 bg-surface-raised/60 p-4 text-xs text-ink-secondary dark:bg-surface-raised">
        <GitBranch
          size={18}
          weight="bold"
          className="mt-0.5 shrink-0 text-accent-primary"
          aria-hidden="true"
        />
        <p className="leading-relaxed">{t("byproductPolicy.scopeNote")}</p>
      </aside>

      {conflictMessage && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-4 text-xs font-medium text-accent-danger"
        >
          <WarningCircle
            size={18}
            weight="fill"
            className="mt-0.5 shrink-0"
            aria-hidden="true"
          />
          <span>{conflictMessage}</span>
        </div>
      )}

      {policyQuery.error && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-4 text-xs text-accent-danger"
        >
          <div className="flex items-center gap-2">
            <WarningCircle size={18} weight="fill" aria-hidden="true" />
            <span>
              {policyQuery.error instanceof Error
                ? policyQuery.error.message
                : t("apiAudit.failed")}
            </span>
          </div>
          <button
            type="button"
            onClick={handleReload}
            className="inline-flex min-h-10 items-center rounded-full border border-accent-danger/30 px-3 py-1.5 font-semibold text-accent-danger hover:bg-accent-danger/10"
          >
            {t("byproductPolicy.reload")}
          </button>
        </div>
      )}

      {policyQuery.isPending && (
        <div className="flex justify-center py-16">
          <GrainLoader label={t("byproductPolicy.loading")} />
        </div>
      )}

      {!policyQuery.isPending && sortedItems.length > 0 && (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {sortedItems.map((item) => (
            <PolicyStageCard
              key={`${item.stage}:${item.revision ?? "default"}:${reloadGeneration}`}
              policy={item}
              savedMessage={savedNotice[item.stage]}
              onClearSavedNotice={() =>
                setSavedNotice((current) => {
                  if (!current[item.stage]) return current;
                  const next = { ...current };
                  delete next[item.stage];
                  return next;
                })
              }
              onSaved={handleSaved}
              onConflict={handleConflict}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PolicyStageCardProps {
  policy: ByproductVarietyPolicyItem;
  savedMessage?: string;
  onClearSavedNotice: () => void;
  onSaved: (updated: ByproductVarietyPolicyItem) => void;
  onConflict: (stage: ByproductStage) => void;
}

function PolicyStageCard({
  policy,
  savedMessage,
  onClearSavedNotice,
  onSaved,
  onConflict,
}: PolicyStageCardProps) {
  const { t } = useTranslation();
  const baseId = useId();
  const headingId = `${baseId}-heading`;
  const reasonId = `${baseId}-reason`;
  const hintId = `${baseId}-reason-hint`;
  const reasonErrorId = `${baseId}-reason-error`;
  const reasonRef = useRef<HTMLTextAreaElement>(null);

  const [selected, setSelected] = useState<PolicyChoice>(() =>
    choiceFromPolicy(policy),
  );
  const [reason, setReason] = useState("");
  const [reasonEdited, setReasonEdited] = useState(false);
  const [reasonBlurred, setReasonBlurred] = useState(false);
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const trimmedReason = reason.trim();
  const reasonMissing = trimmedReason.length === 0 || trimmedReason.length > 500;
  const reasonInvalid =
    ((reasonEdited && reasonBlurred) || submitAttempted) && reasonMissing;

  const stageName =
    policy.stage === "BRAN"
      ? t("byproductPolicy.stages.BRAN.name")
      : t("byproductPolicy.stages.HUSK.name");
  const stageDescription =
    policy.stage === "BRAN"
      ? t("byproductPolicy.stages.BRAN.description")
      : t("byproductPolicy.stages.HUSK.description");

  const effectiveLabel = policy.allowCrossVariety
    ? t("byproductPolicy.effectiveAllow")
    : t("byproductPolicy.effectiveSeparate");
  const sourceLabel =
    policy.source === "SYSTEM_DEFAULT"
      ? t("byproductPolicy.sourceDefault")
      : t("byproductPolicy.sourceOverride");

  const choices: Array<{
    value: PolicyChoice;
    title: string;
    detail: string;
  }> = [
    {
      value: "default",
      title: t("byproductPolicy.choices.defaultTitle"),
      detail: t("byproductPolicy.choices.defaultDetail"),
    },
    {
      value: "allow",
      title: t("byproductPolicy.choices.allowTitle"),
      detail: t("byproductPolicy.choices.allowDetail"),
    },
    {
      value: "separate",
      title: t("byproductPolicy.choices.separateTitle"),
      detail: t("byproductPolicy.choices.separateDetail"),
    },
  ];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;

    setSubmitAttempted(true);
    setSubmitError("");
    onClearSavedNotice();

    if (reasonMissing) {
      reasonRef.current?.focus();
      return;
    }

    setSaving(true);
    try {
      const updated = await ledgerEndpoints.updateByproductVarietyPolicy(
        policy.stage,
        {
          allowCrossVariety: allowValueFromChoice(selected),
          expectedRevision: policy.revision,
          reason: trimmedReason,
        },
      );
      onSaved(updated);
      setReason("");
      setReasonEdited(false);
      setReasonBlurred(false);
      setSubmitAttempted(false);
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) {
        onConflict(policy.stage);
      } else {
        setSubmitError(
          error instanceof Error ? error.message : t("apiAudit.failed"),
        );
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="flex flex-col justify-between rounded-2xl border border-ink-tertiary/20 bg-surface-base p-5 shadow-xs dark:bg-surface-raised sm:p-6">
      <div className="space-y-4">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-ink-tertiary/15 pb-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary">
              <ShieldCheck size={22} weight="bold" aria-hidden="true" />
            </div>
            <div>
              <h2
                id={headingId}
                className="font-display text-lg font-bold text-ink-primary"
              >
                {stageName}
              </h2>
              <p className="mt-0.5 text-xs text-ink-secondary">
                {stageDescription}
              </p>
            </div>
          </div>

          <StatusBadge
            status={policy.allowCrossVariety ? "ACTIVE" : "COMPLIANT"}
            label={effectiveLabel}
          />
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-surface-raised/80 px-3.5 py-2.5 text-xs dark:bg-surface-overlay/50">
          <div>
            <span className="text-ink-tertiary">
              {t("byproductPolicy.currentSource")}{" "}
            </span>
            <span className="font-semibold text-ink-primary">
              {sourceLabel}
            </span>
          </div>
          <span className="font-mono text-[11px] text-ink-tertiary">
            {policy.revision
              ? `${t("byproductPolicy.revisionLabel")}: ${policy.revision.slice(0, 8)}`
              : t("byproductPolicy.noOverrideRevision")}
          </span>
        </div>

        <form
          aria-labelledby={headingId}
          onSubmit={handleSubmit}
          noValidate
          className="space-y-5"
        >
          <fieldset className="space-y-2.5" disabled={saving}>
            <legend className="text-xs font-semibold text-ink-secondary">
              {t("byproductPolicy.policyModeLegend", { stage: stageName })}
            </legend>

            <div className="space-y-2">
              {choices.map((option) => {
                const optionId = `${baseId}-choice-${option.value}`;
                const checked = selected === option.value;
                return (
                  <label
                    key={option.value}
                    htmlFor={optionId}
                    className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-primary ${
                      checked
                        ? "border-accent-primary bg-accent-primary/8"
                        : "border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised dark:bg-surface-overlay/30 dark:hover:bg-surface-overlay/60"
                    }`}
                  >
                    <input
                      id={optionId}
                      type="radio"
                      name={`${policy.stage}-policy-choice`}
                      value={option.value}
                      checked={checked}
                      onChange={() => {
                        setSelected(option.value);
                        setSubmitError("");
                      }}
                      className="mt-1 h-4 w-4 shrink-0 accent-accent-primary"
                    />
                    <span className="min-w-0 space-y-0.5">
                      <span className="block text-sm font-semibold text-ink-primary">
                        {option.title}
                      </span>
                      <span className="block text-xs text-ink-secondary">
                        {option.detail}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div className="space-y-1.5">
            <div className="flex items-baseline justify-between gap-2">
              <label
                htmlFor={reasonId}
                className="text-xs font-semibold text-ink-secondary"
              >
                {t("byproductPolicy.reasonLabel")}{" "}
                <span aria-hidden="true" className="text-accent-danger">
                  *
                </span>
              </label>
              <span className="font-mono text-[11px] text-ink-tertiary">
                {trimmedReason.length}/500
              </span>
            </div>

            <p id={hintId} className="text-[11px] text-ink-tertiary">
              {t("byproductPolicy.reasonHint")}
            </p>

            <textarea
              ref={reasonRef}
              id={reasonId}
              name="reason"
              rows={3}
              required
              maxLength={500}
              disabled={saving}
              value={reason}
              aria-invalid={reasonInvalid ? "true" : "false"}
              aria-describedby={
                reasonInvalid ? `${hintId} ${reasonErrorId}` : hintId
              }
              onChange={(event) => {
                const nextValue = event.target.value;
                setReason(nextValue);
                setReasonEdited(true);
                setSubmitError("");
              }}
              onBlur={() => {
                if (reasonEdited) setReasonBlurred(true);
              }}
              placeholder={t("byproductPolicy.reasonPlaceholder")}
              className={`min-h-20 w-full rounded-xl border px-3 py-2 text-sm text-ink-primary transition-colors focus:outline-none focus:ring-2 disabled:opacity-60 ${
                reasonInvalid
                  ? "border-accent-danger bg-functional-rejected-bg/40 focus:border-accent-danger focus:ring-accent-danger/20"
                  : "border-ink-tertiary/25 bg-surface-raised focus:border-accent-primary focus:ring-accent-primary/20 dark:bg-surface-overlay"
              }`}
            />

            {reasonInvalid && (
              <div
                id={reasonErrorId}
                role="alert"
                className="flex items-center gap-1.5 text-xs font-medium text-accent-danger"
              >
                <WarningCircle size={15} weight="fill" aria-hidden="true" />
                <span>
                  {trimmedReason.length > 500
                    ? t("byproductPolicy.reasonTooLong")
                    : t("byproductPolicy.reasonRequired")}
                </span>
              </div>
            )}
          </div>

          {submitError && (
            <div
              role="alert"
              className="flex items-start gap-2 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3 text-xs text-accent-danger"
            >
              <WarningCircle
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>{submitError}</span>
            </div>
          )}

          {savedMessage && (
            <div
              role="status"
              className="flex items-start gap-2 rounded-xl border border-functional-balanced-border bg-functional-balanced-bg p-3 text-xs font-medium text-accent-primary"
            >
              <CheckCircle
                size={16}
                weight="fill"
                className="mt-0.5 shrink-0"
                aria-hidden="true"
              />
              <span>{savedMessage}</span>
            </div>
          )}

          <div className="flex items-center justify-end border-t border-ink-tertiary/15 pt-4">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-accent-primary px-5 py-2.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-accent-primary-dim disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving && (
                <ArrowsClockwise
                  size={15}
                  aria-hidden="true"
                  className="motion-safe:animate-spin"
                />
              )}
              <span>
                {saving
                  ? t("common.saving", "Đang lưu...")
                  : t("byproductPolicy.saveStage", { stage: stageName })}
              </span>
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
