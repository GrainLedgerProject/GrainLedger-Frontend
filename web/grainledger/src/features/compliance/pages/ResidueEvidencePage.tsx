import { useId, useState, type FormEvent } from "react";
import { LabResidueReview } from "../components/LabResidueReview";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ArrowsClockwise,
  ArrowSquareOut,
  CaretLeft,
  CaretRight,
  CheckCircle,
  Eye,
  FileText,
  Flask,
  FolderSimple,
  LockSimple,
  MagnifyingGlass,
  ShieldCheck,
  Stack,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import { ApiError } from "@/api/client";
import { catalogsEndpoints } from "@/api/catalogs";
import { labReportEndpoints, type LabReportResponse } from "@/api/compliance";
import { collectPages } from "@/api/query";
import {
  residueEndpoints,
  type ResidueReportSelection,
  type ResidueSourceGroupVersion,
} from "@/api/residue";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { compliancePaths, labResultPath } from "../paths";

type Publication = ResidueReportSelection | ResidueSourceGroupVersion;
const uuid = /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i;

export function ResidueEvidencePage() {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const [params] = useSearchParams();
  const [tab, setTab] = useState<"group" | "selection">(params.has("report") ? "selection" : "group");
  const [searchQuery, setSearchQuery] = useState("");
  const user = useAuthStore((state) => state.user);
  const company = user?.organizationId;
  const scope = ["residue-evidence", user?.id, company];
  const groups = useQuery({
    queryKey: [...scope, "groups"],
    queryFn: residueEndpoints.getSourceGroups,
    enabled: Boolean(company) && tab === "group",
  });
  const selections = useQuery({
    queryKey: [...scope, "selections"],
    queryFn: residueEndpoints.getReportSelections,
    enabled: Boolean(company) && tab === "selection",
  });

  const activeQuery = tab === "group" ? groups : selections;
  const visible = (tab === "group" ? groups.data?.items : selections.data?.items)?.filter(
    (item) => item.companyId === company,
  );
  const queryText = searchQuery.trim().toLowerCase();
  const filteredVisible = visible?.filter((record) => {
    if (!queryText) return true;
    const title = "code" in record ? `${record.code} v${record.versionNo}` : record.profileCode;
    const summary =
      "code" in record
        ? `${record.lower} ${record.upper} ${record.unit}`
        : `${record.residueDefinition} ${record.selectedResultId}`;
    return `${title} ${summary} ${record.reviewedBy} ${record.reviewAuthority} ${record.evidenceRef}`
      .toLowerCase()
      .includes(queryText);
  });

  const groupCount = groups.data?.items.filter((item) => item.companyId === company).length;
  const selectionCount = selections.data?.items.filter((item) => item.companyId === company).length;

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-4 border-b border-ink-tertiary/15 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {text("QUẢN TRỊ CHỨNG CỨ DƯ LƯỢNG MRL", "MRL RESIDUE EVIDENCE GOVERNANCE")}
          </span>
          <h1 className="mt-1 font-display text-2xl font-bold text-ink-primary">
            {t("workflows.residue.title")}
          </h1>
          <p data-ui-detail="secondary" className="mt-0.5 text-xs text-ink-secondary">
            {t("workflows.residue.description")}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Link
            to={compliancePaths.results}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <Flask size={15} aria-hidden="true" />
            <span>{t("nav.compliance.labResults")}</span>
          </Link>
          <Link
            to={compliancePaths.profiles}
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary dark:bg-surface-raised dark:hover:bg-surface-overlay"
          >
            <ShieldCheck size={15} aria-hidden="true" />
            <span>{t("nav.compliance.residueProfiles")}</span>
          </Link>
          {company && (
            <button
              type="button"
              onClick={() => void activeQuery.refetch()}
              disabled={activeQuery.isFetching}
              aria-label={t("common.reload")}
              title={t("common.reload")}
              className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-ink-tertiary/20 bg-surface-base text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:opacity-50 dark:bg-surface-raised dark:hover:bg-surface-overlay"
            >
              <ArrowsClockwise
                size={16}
                aria-hidden="true"
                className={activeQuery.isFetching ? "motion-safe:animate-spin text-accent-primary" : undefined}
              />
            </button>
          )}
        </div>
      </header>

      {!company ? (
        <section className="record-card p-6">
          <div className="flex items-start gap-3">
            <span className="record-icon-tile" aria-hidden="true">
              <LockSimple size={20} weight="bold" />
            </span>
            <div className="space-y-1">
              <h2 className="font-display text-base font-bold text-ink-primary">
                {text("Thiếu thông tin doanh nghiệp", "Organization scope missing")}
              </h2>
              <p role="alert" className="text-sm text-ink-secondary">
                {t("workflows.residue.companyMissing")}
              </p>
            </div>
          </div>
        </section>
      ) : (
        <>
          <nav
            className="grid grid-cols-1 gap-4 sm:grid-cols-2"
            aria-label={t("workflows.residue.title")}
          >
            {(["group", "selection"] as const).map((mode) => {
              const active = mode === tab;
              const Icon = mode === "group" ? Stack : Flask;
              const count = mode === "group" ? groupCount : selectionCount;
              return (
                <button
                  key={mode}
                  type="button"
                  aria-pressed={active}
                  onClick={() => {
                    setTab(mode);
                    setSearchQuery("");
                  }}
                  className={`group flex flex-col justify-between gap-2 rounded-2xl border p-4 text-start shadow-xs transition-all ${
                    active
                      ? "border-accent-primary bg-accent-primary/5 ring-2 ring-accent-primary/15 dark:bg-accent-primary/10"
                      : "border-ink-tertiary/20 bg-surface-base hover:border-accent-primary/40 hover:bg-surface-raised dark:bg-surface-raised dark:hover:bg-surface-overlay"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-sm font-display font-bold ${
                        active ? "text-accent-primary" : "text-ink-primary"
                      }`}
                    >
                      {t(`workflows.residue.${mode}`)}
                    </span>
                    <span
                      className={`inline-grid size-9 shrink-0 place-items-center rounded-xl transition-colors ${
                        active ? "bg-accent-primary text-white" : "bg-accent-primary/10 text-accent-primary"
                      }`}
                    >
                      <Icon size={18} weight="bold" aria-hidden="true" />
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-display text-2xl font-bold text-ink-primary">
                      {count !== undefined ? count : "—"}
                    </span>
                    {active && (
                      <span className="rounded-full bg-accent-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-accent-primary">
                        {text("Đang xem", "Viewing")}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-ink-tertiary">
                    {mode === "group"
                      ? text(
                          "Nhóm nguồn thu mua gộp kèm dải dư lượng và mức độ ưu tiên",
                          "Aggregated procurement source groups with MRL bounds & precedence",
                        )
                      : text(
                          "Liên kết kết quả kiểm nghiệm phòng lab đã xác nhận vào từng lô",
                          "Confirmed lab result bindings and superseded report selections",
                        )}
                  </p>
                </button>
              );
            })}
          </nav>

          <section className="record-card">
            <div className="record-card-header">
              <div className="flex min-w-0 items-center gap-3">
                <span className="record-icon-tile" aria-hidden="true">
                  <FolderSimple size={20} weight="bold" />
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-bold text-ink-primary">
                      {t("workflows.residue.published")}
                    </h2>
                    <StatusBadge
                      status="ACTIVE"
                      size="sm"
                      label={`${filteredVisible?.length ?? 0}`}
                    />
                  </div>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {text(
                      "Danh sách chứng cứ dư lượng đã công bố trong phạm vi doanh nghiệp.",
                      "Published residue evidence records scoped to your organization.",
                    )}
                  </p>
                </div>
              </div>

              <div className="relative w-full sm:w-64">
                <MagnifyingGlass
                  size={15}
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-ink-tertiary"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={text("Tìm kiếm chứng cứ đã công bố", "Search published evidence")}
                  placeholder={text("Tìm theo mã, người duyệt...", "Search code, reviewer...")}
                  className="min-h-10 w-full rounded-full border border-ink-tertiary/20 bg-surface-raised py-1.5 pr-9 pl-9 text-xs text-ink-primary placeholder:text-ink-tertiary focus:border-accent-primary focus:outline-none dark:bg-surface-overlay"
                />
                {searchQuery && (
                  <button
                    type="button"
                    aria-label={text("Xóa tìm kiếm", "Clear search")}
                    onClick={() => setSearchQuery("")}
                    className="absolute top-1/2 right-2.5 -translate-y-1/2 rounded-full p-1 text-ink-tertiary hover:bg-surface-overlay hover:text-ink-primary"
                  >
                    <X size={13} aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-4 sm:p-6">
              {activeQuery.error && (
                <div
                  role="alert"
                  className="mb-4 flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
                >
                  <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
                  <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
                    <Feedback error={activeQuery.error} />
                  </div>
                </div>
              )}

              {activeQuery.isPending ? (
                <div className="flex justify-center py-12">
                  <GrainLoader
                    label={text("Đang tải chứng cứ dư lượng đã công bố...", "Loading published residue evidence...")}
                  />
                </div>
              ) : filteredVisible && filteredVisible.length > 0 ? (
                <ul className="grid gap-4 sm:grid-cols-2">
                  {filteredVisible.map((record) => (
                    <li
                      key={record.id}
                      className="flex flex-col justify-between gap-3 rounded-2xl border border-ink-tertiary/20 bg-surface-raised/40 p-4 [overflow-wrap:anywhere] dark:bg-surface-overlay/25"
                    >
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="font-display text-sm font-bold text-ink-primary">
                            {"code" in record ? `${record.code} · v${record.versionNo}` : record.profileCode}
                          </span>
                          <StatusBadge
                            status="COMPLIANT"
                            size="sm"
                            label={text("Đã công bố", "Published")}
                          />
                        </div>

                        <p className="rounded-lg border border-ink-tertiary/15 bg-surface-base px-3 py-2 font-mono text-xs font-semibold text-ink-primary dark:bg-surface-raised">
                          {"code" in record
                            ? `${record.lower} – ${record.upper} ${record.unit} · ${record.sourceIds.length}`
                            : `${record.residueDefinition} · ${record.selectedResultId}`}
                        </p>

                        <p className="text-xs text-ink-secondary">
                          {record.reviewedBy} · {record.reviewAuthority}
                        </p>
                      </div>

                      <details className="rounded-xl border border-ink-tertiary/15 bg-surface-base p-3 text-xs dark:bg-surface-raised">
                        <summary className="cursor-pointer font-semibold text-accent-primary">
                          {t("workflows.residue.evidenceDetails")}
                        </summary>
                        <div className="mt-2.5 space-y-1.5 border-t border-ink-tertiary/10 pt-2.5 text-ink-secondary">
                          <p className="text-ink-primary">{record.evidenceRef}</p>
                          <p>{record.applicabilityStatement}</p>
                          <p className="font-mono text-[11px] text-ink-tertiary">{record.id}</p>
                        </div>
                      </details>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="record-empty">
                  <span aria-hidden="true" className="text-ink-tertiary opacity-60">
                    <FileText size={32} />
                  </span>
                  <p className="font-semibold text-ink-primary">
                    {visible?.length === 0
                      ? t("workflows.empty")
                      : text("Không tìm thấy chứng cứ phù hợp.", "No matching residue evidence.")}
                  </p>
                  {Boolean(visible?.length) && searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="record-button mt-2 rounded-full"
                    >
                      {text("Xóa bộ lọc tìm kiếm", "Clear search filter")}
                    </button>
                  )}
                </div>
              )}
            </div>
          </section>

          <section className="record-card">
            <div className="record-card-header">
              <div className="flex min-w-0 items-center gap-3">
                <span className="record-icon-tile" aria-hidden="true">
                  <ShieldCheck size={20} weight="bold" />
                </span>
                <div className="min-w-0">
                  <h2 className="font-display text-base font-bold text-ink-primary">
                    {t(tab === "group" ? "workflows.residue.publishGroup" : "workflows.residue.publishSelection")}
                  </h2>
                  <p className="mt-0.5 text-xs text-ink-secondary">
                    {tab === "group"
                      ? text(
                          "Điền thông tin nhóm nguồn, khoảng dư lượng và người thẩm định để công bố.",
                          "Specify source group parameters, residue bounds, and reviewer metadata to publish.",
                        )
                      : text(
                          "Chọn báo cáo phòng lab đã xác nhận, xem trước tính toán và công bố liên kết.",
                          "Select a confirmed laboratory report, preview bounds, and publish result selection.",
                        )}
                  </p>
                </div>
              </div>
              <StatusBadge status="ACTIVE" size="sm" label={t(`workflows.residue.${tab}`)} />
            </div>

            <div className="space-y-5 p-4 sm:p-6">
              <PublicationEditor
                key={`${company}:${tab}`}
                mode={tab}
                companyId={company}
                userId={user?.id}
                initialReport={params.get("report") ?? ""}
                existing={visible ?? []}
              />
            </div>
          </section>
        </>
      )}
    </div>
  );
}

function PublicationEditor({
  mode,
  companyId,
  userId,
  initialReport,
  existing,
}: {
  mode: "group" | "selection";
  companyId: string;
  userId?: string;
  initialReport: string;
  existing: Publication[];
}) {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const uid = useId();
  const cache = useQueryClient();
  const [id, setId] = useState(() => crypto.randomUUID());
  const [page, setPage] = useState(1);
  const [reportId, setReport] = useState(initialReport);
  const [resultId, setResult] = useState("");
  const [validation, setValidation] = useState("");
  const [saved, setSaved] = useState(false);
  const scope = ["residue-evidence", userId, companyId];
  const reports = useQuery({
    queryKey: [...scope, "reports", page],
    queryFn: () => labReportEndpoints.getLabReports({ page, pageSize: 20 }),
    enabled: mode === "selection",
  });
  const report = useQuery({
    queryKey: [...scope, "report", reportId],
    queryFn: () => labReportEndpoints.getLabReport(reportId),
    enabled: mode === "selection" && uuid.test(reportId),
  });
  const substances = useQuery({
    queryKey: ["residue-evidence-substances"],
    queryFn: () => collectPages(catalogsEndpoints.getActiveSubstances),
    enabled: mode === "group",
  });
  const rows = confirmedRows(report.data);
  const selected = rows.find((row) => row.id === resultId);
  const candidates = useQuery({
    queryKey: [...scope, "candidates", selected?.sourceId],
    enabled: mode === "selection" && Boolean(selected?.sourceId),
    queryFn: () =>
      collectPages(async (query) => {
        const response = await labReportEndpoints.getLabReports({
          ...query,
          sourceLotId: selected!.sourceId,
        });
        return response;
      }),
  });
  const preview = useMutation({ mutationFn: residueEndpoints.previewReportSelection });
  const publication = useMutation({
    mutationFn: async ({ body, retry }: { body: Publication; retry?: boolean }) => {
      if (retry) {
        try {
          return await ("code" in body
            ? residueEndpoints.getSourceGroup(body.id)
            : residueEndpoints.getReportSelection(body.id));
        } catch (error) {
          if (!(error instanceof ApiError && error.status === 404)) throw error;
        }
      }
      return "code" in body
        ? residueEndpoints.createSourceGroup(body)
        : residueEndpoints.createReportSelection(body);
    },
    onSuccess: async () => {
      setSaved(true);
      setId(crypto.randomUUID());
      setResult("");
      preview.reset();
      await cache.invalidateQueries({ queryKey: scope });
    },
  });
  const uncertain = publicationUncertain(publication.error);
  const editable = !publication.isPending && !preview.isPending && !uncertain;
  const options = (reports.data?.items ?? []).filter(
    (item) => item.status === "CONFIRMED" && item.companyId === companyId,
  );
  const prior =
    mode === "group"
      ? existing
      : existing.filter(
          (item) =>
            "sourceId" in item &&
            item.sourceId === selected?.sourceId &&
            item.substanceId === selected?.substanceId,
        );

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editable) return;
    setValidation("");
    setSaved(false);
    const form = new FormData(event.currentTarget);
    const value = (keyName: string) => String(form.get(keyName) ?? "").trim();
    const ids = (keyName: string) => value(keyName).split(/[\s,]+/).filter(Boolean);
    const common = {
      id,
      companyId,
      schemaVersion: 2,
      asReceivedConfirmed: form.has("asReceived"),
      profileCode: value("profileCode"),
      residueDefinition: value("residueDefinition"),
      effectiveFrom: new Date(value("effectiveFrom")).toISOString(),
      effectiveTo: value("effectiveTo") ? new Date(value("effectiveTo")).toISOString() : null,
      supersedesId: value("supersedesId") || null,
      evidenceRef: value("evidenceRef"),
      applicabilityStatement: value("applicabilityStatement"),
      reviewedBy: value("reviewedBy"),
      reviewAuthority: value("reviewAuthority"),
      reviewedAt: new Date(value("reviewedAt")).toISOString(),
    };
    const sourceIds = ids("sourceIds");
    const supportingResultIds = ids("supportingResultIds");
    if (
      (common.effectiveTo && common.effectiveTo <= common.effectiveFrom) ||
      [...sourceIds, ...supportingResultIds].some((val) => !uuid.test(val))
    ) {
      setValidation(t("workflows.residue.invalid"));
      return;
    }
    if (mode === "group") {
      publication.mutate({
        body: {
          ...common,
          code: value("code"),
          versionNo: Number(value("versionNo")),
          substanceId: value("substanceId"),
          sourceIds,
          supportingResultIds,
          productStage: "RAW_PADDY",
          productIdentity: "RAW_PADDY",
          lower: value("lower"),
          upper: value("upper"),
          unit: "mg/kg",
          decimalPlaces: Number(value("decimalPlaces")),
          precedence: value("precedence"),
        },
      });
    }
    if (mode === "selection" && selected) {
      const body: ResidueReportSelection = {
        ...common,
        sourceId: selected.sourceId,
        substanceId: selected.substanceId,
        selectedResultId: selected.id,
        supersededResultIds: form.getAll("supersededResultIds").map(String),
        absoluteUncertainty: value("absoluteUncertainty") || null,
        reportingThreshold: value("reportingThreshold") || null,
      };
      if ((event.nativeEvent as SubmitEvent).submitter?.getAttribute("value") === "preview") {
        preview.mutate(body);
      } else {
        publication.mutate({ body });
      }
    }
  }

  const catalogError =
    mode === "group" ? substances.error : reports.error ?? report.error ?? candidates.error;
  const catalogPending =
    mode === "group"
      ? substances.isPending
      : reports.isFetching || report.isFetching || candidates.isFetching;

  return (
    <div className="space-y-5">
      {mode === "selection" && (
        <div className="space-y-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 p-4 dark:bg-surface-overlay/25">
          <div className="record-form">
            <label htmlFor={`${uid}-report`}>
              <span>{t("workflows.residue.report")}</span>
              <select
                id={`${uid}-report`}
                value={reportId}
                disabled={!editable || reports.isPending}
                onChange={(event) => {
                  setReport(event.target.value);
                  setResult("");
                  preview.reset();
                }}
              >
                <option value="">{t("workflows.choose")}</option>
                {reportId && !options.some((item) => item.id === reportId) && (
                  <option value={reportId}>{report.data?.reportNumber ?? reportId}</option>
                )}
                {options.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.reportNumber} · {item.laboratoryName}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={page === 1 || reports.isFetching}
                onClick={() => setPage(page - 1)}
                className="record-button rounded-full"
              >
                <CaretLeft size={14} aria-hidden="true" />
                <span>{t("field.seasons.prev")}</span>
              </button>
              <button
                type="button"
                disabled={!reports.data?.hasMore || reports.isFetching}
                onClick={() => setPage(page + 1)}
                className="record-button rounded-full"
              >
                <span>{t("field.seasons.next")}</span>
                <CaretRight size={14} aria-hidden="true" />
              </button>
            </div>

            {report.data && (
              <Link
                to={labResultPath(report.data.id)}
                className="inline-flex items-center gap-1.5 rounded-full border border-ink-tertiary/20 bg-surface-base px-3.5 py-1.5 text-xs font-semibold text-accent-primary transition-colors hover:bg-surface-raised dark:bg-surface-raised"
              >
                <span>{t("workflows.residue.viewReport")}</span>
                <ArrowSquareOut size={14} aria-hidden="true" />
              </Link>
            )}
          </div>

          {report.data?.status === "CONFIRMED" && report.data.companyId === companyId && (
            <LabResidueReview key={report.data.id} report={report.data} companyId={companyId} />
          )}
        </div>
      )}

      {catalogError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
        >
          <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
          <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
            <Feedback error={catalogError} />
          </div>
        </div>
      )}

      {catalogPending && (
        <div className="flex justify-center py-4">
          <GrainLoader
            size="sm"
            label={text("Đang tải danh mục hoạt chất và báo cáo kiểm nghiệm...", "Loading substances and lab reports...")}
          />
        </div>
      )}

      <form
        method="post"
        onSubmit={submit}
        onChange={() => {
          if (preview.data || preview.error) preview.reset();
          setSaved(false);
        }}
        className="record-form space-y-5"
      >
        <fieldset disabled={!editable} className="grid gap-4 sm:grid-cols-2">
          <legend className="sr-only">{t(`workflows.residue.${mode}`)}</legend>
          {mode === "group" ? (
            <>
              <EvidenceInput uid={uid} name="code" maxLength={100} required />
              <EvidenceInput uid={uid} name="versionNo" type="number" min={1} step={1} required />
              <label htmlFor={`${uid}-substance`}>
                <span>{t("workflows.residue.substanceId")}</span>
                <select name="substanceId" id={`${uid}-substance`} required>
                  <option value="">{t("workflows.choose")}</option>
                  {substances.data?.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.code} · {item.name}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor={`${uid}-precedence`}>
                <span>{t("workflows.residue.precedence")}</span>
                <select name="precedence" id={`${uid}-precedence`} required>
                  <option value="">{t("workflows.choose")}</option>
                  {["DIRECT_FIRST", "GROUP_FIRST", "UNTESTED_ONLY"].map((value) => (
                    <option key={value} value={value}>
                      {t(`workflows.residue.priority.${value}`)}
                    </option>
                  ))}
                </select>
              </label>
              <label htmlFor={`${uid}-sources`} className="sm:col-span-2">
                <span>{t("workflows.residue.sourceIds")}</span>
                <textarea name="sourceIds" id={`${uid}-sources`} rows={2} required className="font-mono text-sm" />
              </label>
              <label htmlFor={`${uid}-support`} className="sm:col-span-2">
                <span>{t("workflows.residue.supportingResultIds")}</span>
                <textarea name="supportingResultIds" id={`${uid}-support`} rows={2} className="font-mono text-sm" />
              </label>
              <EvidenceInput uid={uid} name="lower" inputMode="decimal" required />
              <EvidenceInput uid={uid} name="upper" inputMode="decimal" required />
              <EvidenceInput uid={uid} name="decimalPlaces" type="number" min={0} max={18} step={1} required />
            </>
          ) : (
            <>
              <label htmlFor={`${uid}-result`} className="sm:col-span-2">
                <span>{t("workflows.residue.result")}</span>
                <select
                  id={`${uid}-result`}
                  value={resultId}
                  required
                  onChange={(event) => setResult(event.target.value)}
                >
                  <option value="">{t("workflows.choose")}</option>
                  {rows.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.testLabel} · {row.originalResultText} · {row.sourceId}
                    </option>
                  ))}
                </select>
              </label>
              {selected && (
                <p className="rounded-xl border border-ink-tertiary/15 bg-surface-raised px-3.5 py-2.5 text-xs text-ink-secondary [overflow-wrap:anywhere] sm:col-span-2 dark:bg-surface-overlay">
                  {t("workflows.residue.original", {
                    source: selected.sourceId,
                    unit: selected.unit ?? "—",
                    uncertainty: selected.uncertainty ?? "—",
                  })}
                </p>
              )}
              {selected?.resultKind === "NUMERIC" && selected.uncertainty && (
                <EvidenceInput uid={uid} name="absoluteUncertainty" inputMode="decimal" />
              )}
              {selected?.resultKind === "NOT_DETECTED" && (
                <EvidenceInput uid={uid} name="reportingThreshold" inputMode="decimal" />
              )}
              {selected && (
                <label htmlFor={`${uid}-superseded`} className="sm:col-span-2">
                  <span>{t("workflows.residue.supersededResultIds")}</span>
                  <select key={resultId} name="supersededResultIds" id={`${uid}-superseded`} multiple size={4}>
                    {candidates.data?.flatMap((item) =>
                      confirmedRows(item)
                        .filter(
                          (row) =>
                            row.id !== selected.id &&
                            row.sourceId === selected.sourceId &&
                            row.substanceId === selected.substanceId,
                        )
                        .map((row) => (
                          <option key={row.id} value={row.id}>
                            {item.reportNumber} · {row.testLabel} · {row.originalResultText}
                          </option>
                        )),
                    )}
                  </select>
                </label>
              )}
            </>
          )}
          <EvidenceInput uid={uid} name="profileCode" required />
          <EvidenceInput uid={uid} name="residueDefinition" required />
          <EvidenceInput uid={uid} name="effectiveFrom" type="datetime-local" required />
          <EvidenceInput uid={uid} name="effectiveTo" type="datetime-local" />
          <label htmlFor={`${uid}-prior`}>
            <span>{t("workflows.residue.supersedesId")}</span>
            <select name="supersedesId" id={`${uid}-prior`} key={mode === "selection" ? resultId : mode}>
              <option value="">{t("workflows.none")}</option>
              {prior.map((item) => (
                <option key={item.id} value={item.id}>
                  {"code" in item ? `${item.code} · v${item.versionNo}` : `${item.profileCode} · ${item.selectedResultId}`}
                </option>
              ))}
            </select>
          </label>
          <EvidenceInput uid={uid} name="evidenceRef" required />
          <EvidenceInput uid={uid} name="reviewedBy" required />
          <EvidenceInput uid={uid} name="reviewAuthority" required />
          <EvidenceInput uid={uid} name="reviewedAt" type="datetime-local" required />
          <label htmlFor={`${uid}-statement`} className="sm:col-span-2">
            <span>{t("workflows.residue.applicabilityStatement")}</span>
            <textarea id={`${uid}-statement`} name="applicabilityStatement" required rows={3} />
          </label>
          <label
            htmlFor={`${uid}-received`}
            className="!flex-row cursor-pointer items-center gap-2.5 rounded-lg border border-ink-tertiary/20 bg-surface-raised/50 p-3 text-xs font-medium text-ink-primary sm:col-span-2 dark:bg-surface-overlay/30"
          >
            <input
              id={`${uid}-received`}
              name="asReceived"
              type="checkbox"
              required
              className="size-4 shrink-0 accent-accent-primary"
            />
            <span>{t("workflows.residue.asReceived")}</span>
          </label>
        </fieldset>

        {(publication.error ?? preview.error ?? (validation ? new Error(validation) : null)) && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-xl border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger"
          >
            <WarningCircle size={18} weight="fill" className="mt-0.5 shrink-0" aria-hidden="true" />
            <div className="min-w-0 flex-1 [&>div]:bg-transparent [&>div]:p-0">
              <Feedback error={publication.error ?? preview.error ?? new Error(validation)} />
            </div>
          </div>
        )}

        {(publication.isPending || preview.isPending) && (
          <div className="flex justify-center py-2">
            <GrainLoader
              size="sm"
              label={text("Đang xử lý công bố chứng cứ...", "Processing evidence publication...")}
            />
          </div>
        )}

        {saved && (
          <div role="status" className="record-success">
            <CheckCircle size={18} weight="fill" className="shrink-0" aria-hidden="true" />
            <span>{t("workflows.residue.saved")}</span>
          </div>
        )}

        {preview.data && (
          <div
            className="space-y-1.5 rounded-xl border border-accent-primary/25 bg-accent-primary/5 p-4 text-xs"
            role="status"
          >
            <strong className="font-display text-sm text-accent-primary">{t("workflows.residue.preview")}</strong>
            <p className="font-mono text-sm font-bold text-ink-primary">
              {preview.data.lower ?? "—"} – {preview.data.upper ?? "—"} {preview.data.unit}
            </p>
            {preview.data.reasons?.map((reason, index) => (
              <p key={index} className="text-ink-secondary">
                {reason}
              </p>
            ))}
          </div>
        )}

        <div className="record-form-footer items-center">
          {uncertain && (
            <button
              type="button"
              onClick={() => {
                if (publication.variables) {
                  publication.mutate({ body: publication.variables.body, retry: true });
                }
              }}
              className="record-button mr-auto rounded-full"
            >
              {t("field.seasons.retry")}
            </button>
          )}
          {mode === "selection" && (
            <button
              type="submit"
              value="preview"
              disabled={!editable}
              className="record-button rounded-full"
            >
              <Eye size={15} aria-hidden="true" />
              <span>{t("workflows.residue.preview")}</span>
            </button>
          )}
          <button
            type="submit"
            value="publish"
            disabled={!editable}
            className="record-button record-primary rounded-full px-6"
          >
            <CheckCircle size={16} weight="bold" aria-hidden="true" />
            <span>{t("workflows.residue.publish")}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

function EvidenceInput({
  uid,
  name,
  ...props
}: { uid: string; name: string } & React.ComponentPropsWithoutRef<"input">) {
  const { t } = useTranslation();
  return (
    <label htmlFor={`${uid}-${name}`}>
      <span>{t(`workflows.residue.${name}`)}</span>
      <input id={`${uid}-${name}`} name={name} {...props} />
    </label>
  );
}

function confirmedRows(report?: LabReportResponse) {
  return report?.status === "CONFIRMED"
    ? report.resultSets.flatMap((section) =>
        section.sourceLotId
          ? section.results.flatMap((row) =>
              row.substanceId
                ? [{ ...row, sourceId: section.sourceLotId!, substanceId: row.substanceId }]
                : [],
            )
          : [],
      )
    : [];
}

function publicationUncertain(error: unknown) {
  return error instanceof ApiError && (error.status === 0 || error.status === 408 || error.status >= 500);
}
