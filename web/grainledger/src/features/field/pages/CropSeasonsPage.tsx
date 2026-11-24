import { useId, useRef, useState, type FormEvent } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { CalendarDots, CaretLeft, CaretRight, MagnifyingGlass, Plus } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { adminEndpoints } from "@/api/admin";
import { procurementEndpoints as procurement } from "@/api/procurement";
import { useAuthStore } from "@/app/store/authStore";
import { Feedback, Workflow } from "@/shared/ui/Workflow";
import { SeasonEditor, type SeasonAction } from "../components/SeasonEditor";
import "./CropSeasonsPage.css";

const pageSize = 15;

export function CropSeasonsPage() {
  const { t } = useTranslation();
  const user = useAuthStore(state => state.user);
  const canConfigure = user?.permissions.includes("platform.configure") ?? false;
  const canLink = user?.permissions.includes("farms.write") ?? false;
  const canReadLinks = !canConfigure && (canLink || (user?.permissions.includes("farms.read") ?? false));
  const [companyId, setCompanyId] = useState("");
  const companies = useQuery({
    queryKey: ["season-companies", user?.id],
    queryFn: async () => (await adminEndpoints.getOrganizations()).filter(company => company.kind === "Customer"),
    enabled: canConfigure,
  });
  const scopeId = canConfigure ? companyId : user?.organizationId;

  return <Workflow title={t("field.seasons.title")} description={t(canConfigure ? "field.seasons.adminIntro" : "field.seasons.fieldIntro")}>
    {canConfigure && <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 dark:bg-surface-raised">
      <label htmlFor="season-company" className="w-full max-w-sm">{t("field.seasons.company")}
        <select id="season-company" name="companyId" value={companyId} onChange={event => setCompanyId(event.target.value)} disabled={companies.isPending}>
          <option value="">{t("field.seasons.chooseCompany")}</option>
          {companies.data?.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </label>
      <Feedback error={companies.error} pending={companies.isPending} />
      {companies.data?.length === 0 && <p className="text-sm text-ink-secondary">{t("field.seasons.noCompanies")}</p>}
    </div>}
    {!canConfigure && !canReadLinks && <p role="alert">{t("field.seasons.forbidden")}</p>}
    {user && (canConfigure ? Boolean(scopeId) : canReadLinks) && <CompanySeasons
      key={`${user.id}:${scopeId ?? ""}:${canConfigure}:${canLink}`}
      userId={user.id} companyId={canConfigure ? scopeId : undefined}
      canConfigure={canConfigure} canReadLinks={canReadLinks} canLink={canLink && canReadLinks}
    />}
  </Workflow>;
}

function CompanySeasons({ userId, companyId, canConfigure, canReadLinks, canLink }: {
  userId: string;
  companyId?: string;
  canConfigure: boolean;
  canReadLinks: boolean;
  canLink: boolean;
}) {
  const { t, i18n } = useTranslation();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [linkPage, setLinkPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [action, setAction] = useState<SeasonAction | null>(null);
  const [status, setStatus] = useState("");
  const detailPanel = useRef<HTMLElement>(null);
  const scope = ["crop-seasons", userId, companyId ?? "current-company"];
  const [list, detail, links] = useQueries({ queries: [
    { queryKey: [...scope, "list", page, search], queryFn: () => procurement.getCropSeasons({ companyId, search, page, pageSize }) },
    { queryKey: [...scope, "detail", selected], queryFn: () => procurement.getCropSeason(selected), enabled: Boolean(selected) },
    { queryKey: [...scope, "links", selected, linkPage], queryFn: () => procurement.getPlotSeasons({ seasonId: selected, page: linkPage, pageSize }), enabled: canReadLinks && Boolean(selected) },
  ] });
  const season = detail.data;
  const dateFormat = new Intl.DateTimeFormat(i18n.language, { dateStyle: "medium", timeZone: "UTC" });
  function date(value: string) {
    return <time dateTime={value} className="whitespace-nowrap">{dateFormat.format(new Date(value))}</time>;
  }

  function filter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(searchInput.trim());
    setPage(1);
  }

  return <div className="crop-seasons min-w-0 space-y-4">
    <div role="status" className={status ? "rounded-xl bg-accent-success/10 px-4 py-3 text-sm font-semibold text-ink-primary" : "sr-only"}>{status}</div>
    <div className="crop-seasons-grid grid min-w-0 items-start gap-5">
      <section className="min-w-0 overflow-hidden rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised" aria-labelledby="season-list-title">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-tertiary/15 p-4 sm:p-5">
          <h2 id="season-list-title" className="flex items-center gap-2 font-display text-lg font-semibold"><CalendarDots aria-hidden="true" size={22} className="text-accent-primary" />{t("field.seasons.list")}</h2>
          {canConfigure && companyId && <button type="button" onClick={() => setAction({ type: "createSeason", companyId })} className="inline-flex items-center gap-2 !border-accent-primary !bg-accent-primary !text-white hover:!bg-accent-primary-dim"><Plus aria-hidden="true" size={16} />{t("field.seasons.createSeason")}</button>}
        </div>
        <search className="block border-b border-ink-tertiary/15 p-4 sm:px-5">
          <form className="flex flex-wrap items-end gap-2" onSubmit={filter}>
            <div className="min-w-0 flex-1 basis-44">
              <label htmlFor="season-search">{t("field.seasons.search")}</label>
              <div className="relative mt-1.5">
                <MagnifyingGlass aria-hidden="true" size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
                <input id="season-search" name="search" type="search" value={searchInput} maxLength={100} onChange={event => setSearchInput(event.target.value)} className="!ps-10" />
              </div>
            </div>
            <button type="submit" className="!min-h-12">{t("field.seasons.find")}</button>
          </form>
        </search>
        {(list.error || list.isPending) && <div className="p-4"><Feedback error={list.error} pending={list.isPending} /></div>}
        {list.data && <>
          {list.data.items.length > 0 ? <div tabIndex={0} role="region" aria-labelledby="season-list-title" className="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-primary">
            <table>
              <thead className="bg-surface-overlay text-ink-secondary"><tr>
                <th scope="col">{t("field.seasons.name")}</th>
                <th scope="col">{t("field.seasons.period")}</th>
              </tr></thead>
              <tbody>{list.data.items.map(item => <tr key={item.id} className={selected === item.id ? "bg-accent-primary/10" : "hover:bg-surface-overlay/60"}>
                <th scope="row" className="w-1/2 break-words">
                  <button type="button" aria-pressed={selected === item.id} onClick={() => {
                    setSelected(item.id);
                    setLinkPage(1);
                    detailPanel.current?.focus({ preventScroll: true });
                    detailPanel.current?.scrollIntoView?.({ block: "nearest" });
                  }} className="!border-transparent !px-2 text-start !text-accent-primary [overflow-wrap:anywhere]">{item.name}</button>
                </th>
                <td><span className="inline-flex flex-wrap items-center gap-x-1.5">{date(item.startsOn)} <span aria-hidden="true">–</span> <span className="sr-only">{t("field.seasons.to")}</span> {date(item.endsOn)}</span></td>
              </tr>)}</tbody>
            </table>
          </div> : <p className="p-5 text-sm text-ink-secondary">{t(search ? "field.seasons.noResults" : "field.seasons.emptySeasons")}</p>}
          <SeasonPagination page={page} hasMore={list.data.hasMore} count={list.data.totalCount} onPage={setPage} label={t("field.seasons.list")} />
        </>}
      </section>
      <section ref={detailPanel} tabIndex={-1} className="min-w-0 scroll-mt-4 rounded-2xl border border-ink-tertiary/20 bg-surface-base focus-visible:outline-2 focus-visible:outline-accent-primary dark:bg-surface-raised" aria-labelledby="season-detail-title">
        <header className="space-y-3 rounded-t-2xl border-b border-accent-primary/15 bg-accent-primary/5 p-4 sm:p-5">
          <h2 id="season-detail-title" className="font-display text-xl font-semibold [overflow-wrap:anywhere]">{season?.name ?? t("field.seasons.detail")}</h2>
          {season && <dl className="grid grid-cols-2 gap-3 text-sm">
            <div><dt className="text-ink-secondary">{t("field.seasons.startsOn")}</dt><dd className="mt-1 font-semibold">{date(season.startsOn)}</dd></div>
            <div><dt className="text-ink-secondary">{t("field.seasons.endsOn")}</dt><dd className="mt-1 font-semibold">{date(season.endsOn)}</dd></div>
          </dl>}
          {season && canConfigure && (season.canEdit || season.canDelete) && <div className="flex flex-wrap gap-2">
            {season.canEdit && <button type="button" onClick={() => setAction({ type: "editSeason", season })}>{t("field.seasons.editSeason")}</button>}
            {season.canDelete && <button type="button" onClick={() => setAction({ type: "deleteSeason", season })} className="!text-accent-danger">{t("field.seasons.deleteSeason")}</button>}
          </div>}
        </header>
        {!selected && <p className="p-5 text-sm text-ink-secondary">{t("field.seasons.chooseSeason")}</p>}
        {selected && (detail.error || detail.isPending) && <div className="p-4"><Feedback error={detail.error} pending={detail.isPending} /></div>}
        {season && !detail.error && canReadLinks && <>
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 sm:px-5">
            <h3 id="season-links-title" className="font-semibold">{t("field.seasons.plots")}</h3>
            {canLink && <button type="button" className="inline-flex items-center gap-2" onClick={() => setAction({ type: "createLink", season })}><Plus aria-hidden="true" size={16} />{t("field.seasons.addPlot")}</button>}
          </div>
          {(links.error || links.isPending) && <div className="px-4 pb-4"><Feedback error={links.error} pending={links.isPending} /></div>}
          {links.data && <>
            {links.data.items.length > 0 ? <div tabIndex={0} role="region" aria-labelledby="season-links-title" className="max-w-full overflow-x-auto focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-accent-primary">
              <table>
                <thead className="bg-surface-overlay text-ink-secondary"><tr>
                  <th scope="col">{t("field.seasons.plot")}</th>
                  <th scope="col">{t("field.seasons.variety")}</th>
                  {canLink && <th scope="col">{t("field.seasons.actions")}</th>}
                </tr></thead>
                <tbody>{links.data.items.map(link => <tr key={link.id}>
                  <th scope="row" className="[overflow-wrap:anywhere]">{link.plotCode}</th>
                  <td className="[overflow-wrap:anywhere]">{link.riceVariety}</td>
                  {canLink && <td><div className="flex flex-wrap gap-1">
                    {link.canEdit && <button type="button" aria-label={t("field.seasons.editPlotLabel", { name: link.plotCode })} className="!px-2" onClick={() => setAction({ type: "editLink", season, link })}>{t("field.seasons.edit")}</button>}
                    {link.canDelete && <button type="button" aria-label={t("field.seasons.unlinkPlotLabel", { name: link.plotCode })} className="!px-2 !text-accent-danger" onClick={() => setAction({ type: "deleteLink", link })}>{t("field.seasons.unlink")}</button>}
                    {!link.canEdit && !link.canDelete && <span className="text-xs text-ink-secondary">{t("field.seasons.readOnly")}</span>}
                  </div></td>}
                </tr>)}</tbody>
              </table>
            </div> : <p className="px-5 pb-4 text-sm text-ink-secondary">{t("field.seasons.emptyPlots")}</p>}
            <SeasonPagination page={linkPage} hasMore={links.data.hasMore} count={links.data.totalCount} onPage={setLinkPage} label={t("field.seasons.plots")} />
          </>}
        </>}
      </section>
    </div>
    {action && <SeasonEditor action={action} userId={userId} queryScope={scope} onClose={() => setAction(null)} onSaved={id => {
      if (action.type === "createSeason" && id) setSelected(id);
      if (action.type === "deleteSeason") {
        setSelected("");
        if (list.data?.items.length === 1) setPage(previous => Math.max(1, previous - 1));
      }
      if (action.type === "deleteLink" && links.data?.items.length === 1) setLinkPage(previous => Math.max(1, previous - 1));
      if (action.type === "createLink") setLinkPage(1);
      setStatus(t(`field.seasons.saved.${action.type}`));
      setAction(null);
    }} />}
  </div>;
}

function SeasonPagination({ label, page, count, hasMore, onPage }: {
  label: string; page: number; count: number; hasMore: boolean; onPage: (page: number) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  return <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-tertiary/15 p-3 sm:px-5">
    <p id={id} className="text-sm text-ink-secondary">{t("field.seasons.pageStatus", { page, count })}</p>
    <div className="flex gap-2">
      <button type="button" aria-label={t("field.seasons.prev")} aria-describedby={id} disabled={page === 1} onClick={() => onPage(page - 1)} className="!px-3"><CaretLeft aria-hidden="true" size={16} /></button>
      <button type="button" aria-label={t("field.seasons.next")} aria-describedby={id} disabled={!hasMore} onClick={() => onPage(page + 1)} className="!px-3"><CaretRight aria-hidden="true" size={16} /></button>
    </div>
  </nav>;
}
