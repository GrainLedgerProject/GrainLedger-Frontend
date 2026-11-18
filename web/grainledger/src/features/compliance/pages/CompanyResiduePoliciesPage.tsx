import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import {
  ArrowsClockwise,
  Buildings,
  CheckCircle,
  Flask,
  ShieldCheck,
} from "@phosphor-icons/react";
import {
  residueEndpoints,
  type ResiduePolicySettingVersion,
} from "@/api/residue";
import { ApiError } from "@/api/client";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
import {
  choiceFingerprint,
  policyChoices,
  type PolicyMode,
} from "../model/companyPolicies";

const panel =
  "rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs";
const field =
  "block w-full min-h-11 mt-1 rounded-xl border border-ink-tertiary/20 bg-surface-raised px-3 py-2 text-sm text-ink-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/15";
const button =
  "inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-accent-primary text-white font-semibold text-xs hover:bg-accent-primary-dim transition-all shadow-xs";
interface Draft {
  id: string;
  code: string;
  fingerprint: string;
  evidenceRef: string;
  applicabilityStatement: string;
}
const blankReview = {
  effectiveFrom: "",
  effectiveTo: "",
  reviewedBy: "",
  reviewAuthority: "",
  reviewedAt: "",
};

export function CompanyResiduePoliciesPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  if (
    !user?.organizationId ||
    !user.permissions.includes("residue.company-policy.manage")
  )
    return (
      <p
        role="alert"
        className="rounded-xl border border-ink-tertiary/20 bg-surface-base p-6 text-sm text-ink-secondary"
      >
        {t("apiAudit.policy.denied")}
      </p>
    );
  const scope = [
    user.id,
    user.organizationId,
    user.permissions.toSorted().join("|"),
  ].join(":");
  return (
    <CompanyPoliciesWorkspace
      key={scope}
      scope={scope}
      companyId={user.organizationId}
      companyName={user.organizationName || user.organizationId}
    />
  );
}

function CompanyPoliciesWorkspace({
  scope,
  companyId,
  companyName,
}: {
  scope: string;
  companyId: string;
  companyName: string;
}) {
  const { t, i18n } = useTranslation();
  const cache = useQueryClient();
  const [mode, setMode] = useState<PolicyMode>("SYSTEM_DEFAULT");
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [review, setReview] = useState(blankReview);
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [sourceChanged, setSourceChanged] = useState(false);
  const saving = useRef(false);
  const queryKey = ["company-residue-policies", scope];
  const load = async () => {
    const [rules, settings] = await Promise.all([
      residueEndpoints.getRules(),
      residueEndpoints.getPolicySettings(),
    ]);
    return {
      rules: rules.items,
      settings: settings.items.filter((item) => item.companyId === companyId),
    };
  };
  const query = useQuery({
    queryKey,
    queryFn: load,
    retry: false,
    refetchOnWindowFocus: false,
  });
  const choices = policyChoices(
    query.data?.rules ?? [],
    query.data?.settings ?? [],
    companyId,
    mode,
  );
  const date = (value: string) =>
    new Date(value).toLocaleString(i18n.language === "en" ? "en-GB" : "vi-VN");
  const choose = (code: string, checked: boolean) => {
    setConfirmed(false);
    setError("");
    setNotice("");
    if (!checked) {
      setDrafts((current) => current.filter((item) => item.code !== code));
      return;
    }
    const choice = choices.find((item) => item.code === code);
    if (!choice?.source) return;
    setDrafts((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        code,
        fingerprint: choiceFingerprint(choice),
        evidenceRef: choice.source!.evidenceRef,
        applicabilityStatement: choice.source!.applicabilityStatement,
      },
    ]);
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (saving.current || !confirmed || !drafts.length || sourceChanged) return;
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const effectiveFrom = new Date(review.effectiveFrom).toISOString();
      const effectiveTo = review.effectiveTo
        ? new Date(review.effectiveTo).toISOString()
        : null;
      const reviewedAt = new Date(review.reviewedAt).toISOString();
      if (
        (effectiveTo && effectiveTo <= effectiveFrom) ||
        Date.parse(reviewedAt) > Date.now()
      )
        throw new Error(t("apiAudit.invalidInterval"));
      // Preserve draft IDs for safe retries; re-read the scientific source and adoption history before publishing.
      const latest = await load();
      const currentChoices = policyChoices(
        latest.rules,
        latest.settings,
        companyId,
        mode,
      );
      if (
        drafts.some((draft) => {
          const current = currentChoices.find(
            (item) => item.code === draft.code,
          );
          return (
            !current?.source || choiceFingerprint(current) !== draft.fingerprint
          );
        })
      ) {
        cache.setQueryData(queryKey, latest);
        setSourceChanged(true);
        setConfirmed(false);
        throw new Error(t("apiAudit.policy.sourceChanged"));
      }
      const items: ResiduePolicySettingVersion[] = drafts.map((draft) => {
        const choice = currentChoices.find((item) => item.code === draft.code)!;
        return {
          id: draft.id,
          companyId,
          ruleCode: draft.code,
          mode,
          versionNo: choice.previous
            ? Number(choice.previous.versionNo) + 1
            : 1,
          supersedesId: choice.previous?.id ?? null,
          effectiveFrom,
          effectiveTo,
          evidenceRef: draft.evidenceRef.trim(),
          applicabilityStatement: draft.applicabilityStatement.trim(),
          reviewedBy: review.reviewedBy.trim(),
          reviewAuthority: review.reviewAuthority.trim(),
          reviewedAt,
        };
      });
      await residueEndpoints.batchPolicySettings({ items });
      setDrafts([]);
      setReview(blankReview);
      setConfirmed(false);
      setNotice(t("apiAudit.policy.saved"));
      await cache.invalidateQueries({ queryKey });
    } catch (err) {
      const validation =
        err instanceof ApiError
          ? Object.values(err.problem?.errors ?? {})
              .flat()
              .join(" · ")
          : "";
      setError(
        validation ||
          (err instanceof ApiError && [404, 405].includes(err.status)
            ? t("apiAudit.unavailable")
            : err instanceof Error
              ? err.message
              : t("apiAudit.failed")),
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const reset = () => {
    setDrafts([]);
    setConfirmed(false);
    setSourceChanged(false);
    setError("");
    setReview(blankReview);
  };

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">
            {t("apiAudit.policy.tag")}
          </p>
          <h2 className="font-display text-2xl font-bold text-ink-primary">
            {t("apiAudit.policy.title")}
          </h2>
          <p className="mt-1 text-xs text-ink-secondary">
            {t("apiAudit.policy.subtitle")}
          </p>
        </div>
        <div className="flex gap-2">
          <Link className={button} to="/compliance/residue-profiles">
            <Flask size={16} />
            {t("nav.compliance.residueProfiles")}
          </Link>
          <button
            type="button"
            className={button}
            disabled={busy || query.isFetching}
            aria-label={t("common.reload")}
            onClick={() => {
              void query.refetch();
            }}
          >
            <ArrowsClockwise size={16} />
          </button>
        </div>
      </header>
      <p className="flex items-center gap-2 text-xs text-ink-secondary">
        <Buildings size={16} className="text-accent-primary" />
        {companyName}
      </p>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-4 text-xs text-accent-danger"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="flex items-center gap-2 rounded-xl bg-functional-balanced-bg p-4 text-xs text-accent-primary"
        >
          <CheckCircle size={16} />
          {notice}
        </p>
      )}
      {query.isPending ? (
        <GrainLoader />
      ) : query.isError ? (
        <p role="alert" className="text-sm text-accent-danger">
          {query.error.message}
        </p>
      ) : (
        <>
          <form
            onSubmit={(event) => void submit(event)}
            className={panel + " p-5 sm:p-6 space-y-5"}
          >
            <fieldset disabled={busy || query.isFetching} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="flex items-center gap-2 font-display font-bold text-ink-primary">
                  <ShieldCheck size={20} className="text-accent-primary" />
                  {t("apiAudit.policy.adopt")}
                </h3>
                <label className="text-xs text-ink-secondary">
                  {t("apiAudit.policy.mode")}
                  <select
                    className={field}
                    value={mode}
                    disabled={drafts.length > 0}
                    onChange={(event) => {
                      reset();
                      setMode(event.target.value as PolicyMode);
                    }}
                  >
                    <option value="SYSTEM_DEFAULT">
                      {t("apiAudit.policy.system")}
                    </option>
                    <option value="COMPANY_OVERRIDE">
                      {t("apiAudit.policy.override")}
                    </option>
                  </select>
                </label>
              </div>
              <p className="text-xs leading-relaxed text-ink-secondary">
                {t("apiAudit.policy.explanation")}
              </p>
              <div className="grid gap-3 lg:grid-cols-2">
                {choices.map((choice) => (
                  <div
                    key={choice.code}
                    className="rounded-xl border border-ink-tertiary/20 p-4 space-y-3"
                  >
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1 accent-accent-primary"
                        checked={drafts.some(
                          (item) => item.code === choice.code,
                        )}
                        disabled={
                          !choice.source ||
                          sourceChanged ||
                          (!drafts.some((item) => item.code === choice.code) &&
                            drafts.length >= 100)
                        }
                        onChange={(event) =>
                          choose(choice.code, event.target.checked)
                        }
                      />
                      <span className="min-w-0">
                        <strong className="font-mono text-xs text-ink-primary">
                          {choice.code}
                        </strong>
                        <span className="block mt-1 text-xs text-ink-secondary">
                          {choice.source
                            ? choice.source.residueDefinition +
                              " · v" +
                              choice.source.versionNo +
                              " · " +
                              choice.source.unit
                            : t("apiAudit.policy.unavailableSource")}
                        </span>
                      </span>
                    </label>
                    {choice.source && (
                      <details className="text-xs text-ink-secondary">
                        <summary className="cursor-pointer font-semibold">
                          {t("apiAudit.policy.science")}
                        </summary>
                        <dl className="mt-3 space-y-2 break-words">
                          <div>
                            <dt className="font-semibold">
                              {t("apiAudit.policy.reviewer")}
                            </dt>
                            <dd>
                              {choice.source.reviewedBy} ·{" "}
                              {choice.source.reviewAuthority} ·{" "}
                              {date(choice.source.reviewedAt)}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold">
                              {t("apiAudit.policy.evidence")}
                            </dt>
                            <dd>{choice.source.evidenceRef}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">
                              {t("apiAudit.policy.applicability")}
                            </dt>
                            <dd>{choice.source.applicabilityStatement}</dd>
                          </div>
                          <div>
                            <dt className="font-semibold">
                              {t("apiAudit.mrl.period")}
                            </dt>
                            <dd>
                              {date(choice.source.effectiveFrom)} —{" "}
                              {choice.source.effectiveTo
                                ? date(choice.source.effectiveTo)
                                : t("apiAudit.noEnd")}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold">
                              {t("apiAudit.policy.methods")}
                            </dt>
                            <dd>
                              {choice.source.laboratory
                                .map((item) => item.analyticalMethod)
                                .join(", ") || "—"}
                            </dd>
                          </div>
                          <div>
                            <dt className="font-semibold">
                              {t("apiAudit.policy.steps")}
                            </dt>
                            <dd>
                              {choice.source.steps
                                .map((step) =>
                                  [
                                    step.process,
                                    step.inputStage + " → " + step.outputStage,
                                    step.outputFraction,
                                    step.factorLower + "–" + step.factorUpper,
                                    step.factorSemantics,
                                    step.conditions,
                                  ].join(" · "),
                                )
                                .join("; ") || "—"}
                            </dd>
                          </div>
                        </dl>
                      </details>
                    )}
                  </div>
                ))}
              </div>
              {!choices.length && (
                <p className="rounded-xl bg-surface-raised p-8 text-center text-sm text-ink-secondary">
                  {t("apiAudit.policy.empty")}
                </p>
              )}
              {drafts.length > 0 && (
                <>
                  {drafts.map((draft) => (
                    <section
                      key={draft.id}
                      className="rounded-xl bg-surface-raised p-4 space-y-3"
                    >
                      <h4 className="font-mono text-xs font-bold text-accent-primary">
                        {draft.code}
                      </h4>
                      <label className="block text-xs text-ink-secondary">
                        {t("apiAudit.policy.evidence")}
                        <input
                          className={field}
                          required
                          value={draft.evidenceRef}
                          onChange={(event) => {
                            setConfirmed(false);
                            setDrafts((current) =>
                              current.map((item) =>
                                item.id === draft.id
                                  ? { ...item, evidenceRef: event.target.value }
                                  : item,
                              ),
                            );
                          }}
                        />
                      </label>
                      <label className="block text-xs text-ink-secondary">
                        {t("apiAudit.policy.applicability")}
                        <textarea
                          className={field}
                          required
                          rows={2}
                          value={draft.applicabilityStatement}
                          onChange={(event) => {
                            setConfirmed(false);
                            setDrafts((current) =>
                              current.map((item) =>
                                item.id === draft.id
                                  ? {
                                      ...item,
                                      applicabilityStatement:
                                        event.target.value,
                                    }
                                  : item,
                              ),
                            );
                          }}
                        />
                      </label>
                    </section>
                  ))}
                  <fieldset className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-ink-tertiary/15 pt-5">
                    <legend className="font-semibold text-sm text-ink-primary">
                      {t("apiAudit.policy.review")}
                    </legend>
                    <label className="text-xs text-ink-secondary">
                      {t("apiAudit.from")}
                      <input
                        type="datetime-local"
                        required
                        className={field}
                        value={review.effectiveFrom}
                        onChange={(event) => {
                          setConfirmed(false);
                          setReview({
                            ...review,
                            effectiveFrom: event.target.value,
                          });
                        }}
                      />
                    </label>
                    <label className="text-xs text-ink-secondary">
                      {t("apiAudit.until")}
                      <input
                        type="datetime-local"
                        className={field}
                        value={review.effectiveTo}
                        onChange={(event) => {
                          setConfirmed(false);
                          setReview({
                            ...review,
                            effectiveTo: event.target.value,
                          });
                        }}
                      />
                    </label>
                    <label className="text-xs text-ink-secondary">
                      {t("apiAudit.policy.reviewer")}
                      <input
                        required
                        className={field}
                        value={review.reviewedBy}
                        onChange={(event) => {
                          setConfirmed(false);
                          setReview({
                            ...review,
                            reviewedBy: event.target.value,
                          });
                        }}
                      />
                    </label>
                    <label className="text-xs text-ink-secondary">
                      {t("apiAudit.policy.authority")}
                      <input
                        required
                        className={field}
                        value={review.reviewAuthority}
                        onChange={(event) => {
                          setConfirmed(false);
                          setReview({
                            ...review,
                            reviewAuthority: event.target.value,
                          });
                        }}
                      />
                    </label>
                    <label className="text-xs text-ink-secondary">
                      {t("apiAudit.policy.reviewedAt")}
                      <input
                        type="datetime-local"
                        required
                        className={field}
                        value={review.reviewedAt}
                        onChange={(event) => {
                          setConfirmed(false);
                          setReview({
                            ...review,
                            reviewedAt: event.target.value,
                          });
                        }}
                      />
                    </label>
                  </fieldset>
                  <label className="flex items-start gap-3 text-xs leading-relaxed text-ink-secondary">
                    <input
                      className="mt-1 accent-accent-primary"
                      type="checkbox"
                      required
                      checked={confirmed}
                      disabled={sourceChanged}
                      onChange={(event) => setConfirmed(event.target.checked)}
                    />
                    {t("apiAudit.policy.confirm")}
                  </label>
                  <div className="flex flex-wrap justify-end gap-2">
                    <button type="button" className={button} onClick={reset}>
                      {t("apiAudit.policy.reset")}
                    </button>
                    <button
                      className={
                        button +
                        " bg-accent-primary text-white hover:bg-accent-primary-dim"
                      }
                      disabled={!confirmed || sourceChanged || busy}
                    >
                      {busy ? t("common.saving") : t("apiAudit.policy.publish")}
                    </button>
                  </div>
                </>
              )}
            </fieldset>
          </form>
          <section className={panel + " overflow-hidden"}>
            <h3 className="p-5 font-display font-bold text-ink-primary">
              {t("apiAudit.policy.history")}
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-surface-raised text-ink-secondary">
                  <tr>
                    {[
                      t("apiAudit.policy.profile"),
                      t("apiAudit.policy.mode"),
                      t("apiAudit.mrl.period"),
                      t("apiAudit.policy.review"),
                    ].map((heading) => (
                      <th key={heading} scope="col" className="px-5 py-3">
                        {heading}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-ink-tertiary/10">
                  {query.data?.settings
                    .toSorted(
                      (left, right) =>
                        left.ruleCode.localeCompare(right.ruleCode) ||
                        Number(right.versionNo) - Number(left.versionNo),
                    )
                    .map((setting) => (
                      <tr key={setting.id}>
                        <td className="px-5 py-4 font-mono font-bold text-ink-primary">
                          {setting.ruleCode} · v{setting.versionNo}
                        </td>
                        <td className="px-5 py-4 text-ink-secondary">
                          {setting.mode === "SYSTEM_DEFAULT"
                            ? t("apiAudit.policy.system")
                            : t("apiAudit.policy.override")}
                        </td>
                        <td className="px-5 py-4 whitespace-nowrap text-ink-secondary">
                          {date(setting.effectiveFrom)}
                          <p className="mt-1">
                            {setting.effectiveTo
                              ? date(setting.effectiveTo)
                              : t("apiAudit.noEnd")}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-ink-secondary">
                          <p>
                            {setting.reviewedBy} · {setting.reviewAuthority}
                          </p>
                          <p className="mt-1">{date(setting.reviewedAt)}</p>
                          <details className="mt-2">
                            <summary className="cursor-pointer">
                              {t("apiAudit.policy.evidence")}
                            </summary>
                            <p className="mt-2 break-words">
                              {setting.evidenceRef} ·{" "}
                              {setting.applicabilityStatement}
                            </p>
                          </details>
                        </td>
                      </tr>
                    ))}
                  {!query.data?.settings.length && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-8 text-center text-ink-secondary"
                      >
                        {t("apiAudit.policy.noHistory")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
