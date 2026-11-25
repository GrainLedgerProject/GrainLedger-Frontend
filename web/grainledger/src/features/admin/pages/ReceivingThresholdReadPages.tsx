import { useState } from "react";
import { Scales } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { adminEndpoints } from "@/api/admin";
import { ledgerEndpoints, type ReceivingThresholdScope } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { RecordFeedback, RecordRefresh, RecordWorkspace } from "@/shared/ui/RecordWorkspace";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { adminPaths } from "../paths";

export function OwnReceivingThresholdPage() {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const user = useAuthStore(state => state.user);
  const query = useQuery({ queryKey: ["own-receiving-threshold", user?.id, user?.organizationId], queryFn: ledgerEndpoints.getOwnCompanyReceivingThreshold });
  return <RecordWorkspace section={text("Chính sách tiếp nhận nguyên liệu", "Material receiving policy")}
    title={t("receivingThreshold.own")} description={t("receivingThreshold.applies")}
    actions={<RecordRefresh pending={query.isFetching} onRefresh={() => { void query.refetch(); }} />}>
    <section aria-labelledby="company-threshold-title" className="record-card rounded-xl">
      <header className="record-card-header">
        <div className="flex min-w-0 items-center gap-3">
          <span className="record-icon-tile"><Scales aria-hidden="true" size={22} weight="bold" /></span>
          <div className="min-w-0 break-words">
            <h2 id="company-threshold-title" className="record-card-title">{t("receivingThreshold.effective")}</h2>
            {user?.organizationName && <p className="mt-0.5 text-xs text-ink-secondary">{user.organizationName}</p>}
          </div>
        </div>
        {query.data && <StatusBadge status="ACTIVE" label={t(`receivingThreshold.scope.${query.data.source}`)} />}
      </header>
      <RecordFeedback error={query.error} pending={query.isPending} label={text("Đang tải ngưỡng tiếp nhận…", "Loading the receiving threshold…")} />
      {query.data && <dl className="flex flex-wrap items-start justify-between gap-4 p-4 sm:p-5">
        <div>
          <dt className="text-xs text-ink-secondary">{text("Tỷ lệ hao hụt cho phép", "Allowed loss percentage")}</dt>
          <dd className="mt-1 font-mono text-3xl font-bold tabular-nums text-accent-primary [overflow-wrap:anywhere]">{query.data.percentage}%</dd>
        </div>
        <div className="min-w-0">
          <dt className="text-xs text-ink-secondary">{t("receivingThreshold.revision")}</dt>
          <dd className="mt-1 break-all font-mono text-sm">{query.data.revision}</dd>
        </div>
      </dl>}
    </section>
  </RecordWorkspace>;
}

export function ReceivingThresholdHistoryPage() {
  const { t, i18n } = useTranslation();
  const userId = useAuthStore(state => state.user?.id);
  const [page, setPage] = useState(1);
  const [companyId, setCompany] = useState("");
  const [scope, setScope] = useState<ReceivingThresholdScope | "">("");
  const organizations = useQuery({ queryKey: ["threshold-history-companies", userId], queryFn: async () => (await adminEndpoints.getOrganizations()).filter(org => org.kind === "Customer") });
  const history = useQuery({ queryKey: ["threshold-history", userId, page, scope, companyId], queryFn: () => ledgerEndpoints.getReceivingThresholdHistory({ page, pageSize: 20, scope: scope || undefined, companyId: companyId || undefined }), staleTime: 0 });
  const date = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeStyle: "short" });
  const percentage = (value: string | null) => value == null ? "—" : `${value}%`;
  return <Workflow title={t("receivingThreshold.history")} actions={<Link to={adminPaths.receivingThresholds}>{t("nav.admin.receivingThresholds")}</Link>}>
    <Panel title={t("receivingThreshold.changes")}>
      <search className="record-filter grid gap-3 sm:grid-cols-2">
        <label htmlFor="threshold-history-scope">{t("receivingThreshold.source")}<select id="threshold-history-scope" value={scope} onChange={event => { setScope(event.target.value as typeof scope); setCompany(""); setPage(1); }}>
          <option value="">{t("receivingThreshold.all")}</option>
          <option value="SYSTEM_DEFAULT">{t("receivingThreshold.scope.SYSTEM_DEFAULT")}</option>
          <option value="COMPANY_OVERRIDE">{t("receivingThreshold.scope.COMPANY_OVERRIDE")}</option>
        </select></label>
        <label htmlFor="threshold-history-company">{t("field.seasons.company")}<select id="threshold-history-company" value={companyId} disabled={scope === "SYSTEM_DEFAULT" || organizations.isPending} onChange={event => { setCompany(event.target.value); setPage(1); }}>
          <option value="">{t("receivingThreshold.all")}</option>{organizations.data?.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}
        </select></label>
      </search>
      <Feedback error={history.error ?? organizations.error} pending={history.isPending} />
      {history.data?.items.length === 0 && <p>{t("receivingThreshold.empty")}</p>}
      {!!history.data?.items.length && <div className="overflow-x-auto" tabIndex={0} role="region" aria-label={t("receivingThreshold.changes")}><table>
        <thead><tr>{["time", "source", "before", "after", "actor", "reason"].map(key => <th scope="col" key={key}>{t(`receivingThreshold.${key}`)}</th>)}</tr></thead>
        <tbody>{history.data.items.map(item => <tr key={item.revision}><td>{date.format(new Date(item.recordedAt))}</td><th scope="row">{item.companyName ?? t(`receivingThreshold.scope.${item.scope}`)}<span className="block text-xs font-normal">{t(`receivingThreshold.action.${item.action}`, { defaultValue: item.action })}</span></th><td>{percentage(item.oldPercentage)}</td><td>{percentage(item.newPercentage)}</td><td>{item.actorName ?? "—"}</td><td className="min-w-36 [overflow-wrap:anywhere]">{item.reason || "—"}</td></tr>)}</tbody>
      </table></div>}
      <nav className="flex flex-wrap items-center gap-2" aria-label={t("receivingThreshold.history")}>
        <button type="button" disabled={page === 1 || history.isFetching} onClick={() => setPage(page - 1)}>{t("field.seasons.prev")}</button>
        <button type="button" disabled={!history.data?.hasMore || history.isFetching} onClick={() => setPage(page + 1)}>{t("field.seasons.next")}</button>
        {history.data && <p>{t("field.seasons.pageStatus", { page, count: history.data.totalCount })}</p>}
      </nav>
    </Panel>
  </Workflow>;
}
