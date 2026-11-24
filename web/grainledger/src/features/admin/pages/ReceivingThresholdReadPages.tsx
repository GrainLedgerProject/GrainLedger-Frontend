import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { adminEndpoints } from "@/api/admin";
import { ledgerEndpoints, type ReceivingThresholdScope } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { Feedback, Panel, Workflow } from "@/shared/ui/Workflow";
import { adminPaths } from "../paths";

export function OwnReceivingThresholdPage() {
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const query = useQuery({ queryKey: ["own-receiving-threshold", user?.id, user?.organizationId], queryFn: ledgerEndpoints.getOwnCompanyReceivingThreshold });
  return <Workflow title={t("receivingThreshold.own")} description={t("receivingThreshold.applies")}>
    <Panel title={user?.organizationName || t("receivingThreshold.own")}>
      <Feedback error={query.error} pending={query.isPending} />
      {query.data && <dl className="space-y-3">
        <div className="flex flex-wrap items-center gap-3"><dt>{t("receivingThreshold.effective")}</dt><dd className="font-display text-4xl font-bold text-accent-primary tabular-nums">{query.data.percentage}%</dd></div>
        <div><dt className="text-ink-secondary">{t("receivingThreshold.source")}</dt><dd>{t(`receivingThreshold.scope.${query.data.source}`)}</dd></div>
        <div><dt className="text-ink-secondary">{t("receivingThreshold.revision")}</dt><dd className="break-all font-mono text-sm">{query.data.revision}</dd></div>
      </dl>}
    </Panel>
  </Workflow>;
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
      <search className="grid gap-3 sm:grid-cols-2">
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
