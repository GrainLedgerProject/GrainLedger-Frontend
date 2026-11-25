import { useRef, useState, type FormEvent } from "react";
import { useIsFetching, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDots, LinkSimpleBreak, MagnifyingGlass, MapPin, PencilSimple, Plus, SprayBottle, Trash } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { adminEndpoints } from "@/api/admin";
import { procurementEndpoints as procurement, type PlotSeasonReference } from "@/api/procurement";
import { useAuthStore } from "@/app/store/authStore";
import { RecordEmpty, RecordFeedback, RecordPagination, RecordRefresh, RecordSuccess, RecordTable, RecordWorkspace } from "@/shared/ui/RecordWorkspace";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { SeasonEditor, type SeasonAction } from "../components/SeasonEditor";
import { SprayHistoryModal } from "../components/SprayHistoryModal";

const pageSize = 15;

export function CropSeasonsPage() {
  const { t } = useTranslation();
  const text = useWorkflowText();
  const client = useQueryClient();
  const user = useAuthStore(state => state.user);
  const canConfigure = user?.permissions.includes("platform.configure") ?? false;
  const canLink = user?.permissions.includes("farms.write") ?? false;
  const canReadLinks = !canConfigure && (canLink || (user?.permissions.includes("farms.read") ?? false));
  const [companyId, setCompanyId] = useState("");
  const [editor, setEditor] = useState<{ scope: string; action: SeasonAction } | null>(null);
  const companies = useQuery({
    queryKey: ["season-companies", user?.id],
    queryFn: async () => (await adminEndpoints.getOrganizations()).filter(company => company.kind === "Customer"),
    enabled: canConfigure,
  });
  const scopedCompanyId = canConfigure ? companyId || undefined : undefined;
  const scope = ["crop-seasons", user?.id ?? "", scopedCompanyId ?? "current-company"];
  const scopeKey = JSON.stringify([user?.id, user?.organizationId, scopedCompanyId, canConfigure, canLink]);
  const showSeasons = user && (canConfigure ? Boolean(scopedCompanyId) : canReadLinks);
  const fetchingSeasons = useIsFetching({ queryKey: scope, type: "active" });

  function setAction(action: SeasonAction | null) {
    setEditor(action ? { scope: scopeKey, action } : null);
  }

  return <RecordWorkspace section={text("Lịch canh tác", "Crop calendar")}
    title={t("field.seasons.title")} description={t(canConfigure ? "field.seasons.adminIntro" : "field.seasons.fieldIntro")}
    actions={(showSeasons || canConfigure) && <>
      <RecordRefresh pending={showSeasons ? fetchingSeasons > 0 : companies.isFetching} onRefresh={() => {
        if (showSeasons) void client.refetchQueries({ queryKey: scope, type: "active" });
        else void companies.refetch();
      }} />
      {scopedCompanyId && <button type="button" className="record-button record-primary rounded-full" onClick={() => setAction({ type: "createSeason", companyId: scopedCompanyId })}>
        <Plus aria-hidden="true" size={16} weight="bold" />
        {t("field.seasons.createSeason")}
      </button>}
    </>}>
    {canConfigure && <div className="record-card record-filter flex flex-wrap items-end gap-3 p-4">
      <label htmlFor="season-company" className="flex w-full max-w-sm flex-col gap-1.5 text-sm font-semibold text-ink-secondary">{t("field.seasons.company")}
        <select id="season-company" name="companyId" value={companyId} onChange={event => {
          setCompanyId(event.target.value);
          setAction(null);
        }} disabled={companies.isPending}>
          <option value="">{t("field.seasons.chooseCompany")}</option>
          {companies.data?.map(company => <option key={company.id} value={company.id}>{company.name}</option>)}
        </select>
      </label>
      <Feedback error={companies.error} pending={companies.isPending} />
      {companies.data?.length === 0 && <p className="text-sm text-ink-secondary">{t("field.seasons.noCompanies")}</p>}
    </div>}
    {!canConfigure && !canReadLinks && <p role="alert" className="rounded-lg border border-functional-rejected-border bg-functional-rejected-bg p-3.5 text-xs text-accent-danger">{t("field.seasons.forbidden")}</p>}
    {user && showSeasons && <CompanySeasons
      key={scopeKey}
      userId={user.id} companyId={scopedCompanyId} scope={scope}
      canConfigure={canConfigure} canReadLinks={canReadLinks} canLink={canLink && canReadLinks}
      action={editor?.scope === scopeKey ? editor.action : null} setAction={setAction}
    />}
  </RecordWorkspace>;
}

function CompanySeasons({ userId, companyId, scope, canConfigure, canReadLinks, canLink, action, setAction }: {
  userId: string;
  companyId?: string;
  scope: string[];
  canConfigure: boolean;
  canReadLinks: boolean;
  canLink: boolean;
  action: SeasonAction | null;
  setAction: (action: SeasonAction | null) => void;
}) {
  const { t, i18n } = useTranslation();
  const text = useWorkflowText();
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"name:asc" | "name:desc" | "startsOn:asc" | "startsOn:desc">("startsOn:desc");
  const sortBy = sort.startsWith("name") ? "name" : "startsOn";
  const sortDirection = sort.endsWith(":asc") ? "asc" : "desc";
  const [page, setPage] = useState(1);
  const [linkPage, setLinkPage] = useState(1);
  const [selected, setSelected] = useState(() => new URLSearchParams(window.location.search).get("seasonId") ?? "");
  const [status, setStatus] = useState("");
  const [sprayHistoryLink, setSprayHistoryLink] = useState<PlotSeasonReference | null>(null);
  const detailPanel = useRef<HTMLElement>(null);
  const [list, detail, links] = useQueries({
    queries: [
      { queryKey: [...scope, "list", page, search, sort], queryFn: () => procurement.getCropSeasons({ companyId, search, page, pageSize, sortBy, sortDirection }) },
      { queryKey: [...scope, "detail", selected], queryFn: () => procurement.getCropSeason(selected), enabled: Boolean(selected) },
      { queryKey: [...scope, "links", selected, linkPage], queryFn: () => procurement.getPlotSeasons({ seasonId: selected, page: linkPage, pageSize }), enabled: canReadLinks && Boolean(selected) },
    ]
  });
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

  return <div className="min-w-0 [container-type:inline-size]">
    <RecordSuccess message={status} className="mb-6" />
    <search className="record-card record-filter mb-6 block p-4" aria-label={t("field.seasons.search")}>
      <form className="flex flex-wrap items-center gap-3" onSubmit={filter}>
        <div className="relative w-full min-w-0 sm:w-64">
          <label htmlFor="season-search" className="sr-only">{t("field.seasons.search")}</label>
          <MagnifyingGlass aria-hidden="true" size={16} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
          <input id="season-search" name="search" type="search" enterKeyHint="search" placeholder={t("field.seasons.search")}
            value={searchInput} maxLength={100} onChange={event => setSearchInput(event.target.value)} />
        </div>
        <div className="min-w-0 flex-1 basis-40 sm:flex-none">
          <label htmlFor="season-sort" className="sr-only">{text("Sắp xếp", "Sort by")}</label>
          <select id="season-sort" name="sort" value={sort}
            className="rounded-full font-semibold focus-visible:rounded-full"
            onChange={event => {
              setSort(event.target.value as typeof sort);
              setPage(1);
            }}>
            <option value="startsOn:desc">{text("Ngày bắt đầu mới nhất", "Newest start date")}</option>
            <option value="startsOn:asc">{text("Ngày bắt đầu cũ nhất", "Oldest start date")}</option>
            <option value="name:asc">{text("Tên A–Z", "Name A–Z")}</option>
            <option value="name:desc">{text("Tên Z–A", "Name Z–A")}</option>
          </select>
        </div>
        <button type="submit" className="record-button record-primary shrink-0">{t("field.seasons.find")}</button>
      </form>
    </search>
    <div className="grid min-w-0 grid-cols-1 items-start gap-6 [@container_(min-width:58rem)]:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)]">
      <section className="record-card rounded-xl" aria-labelledby="season-list-title">
        <div className="record-card-header">
          <h2 id="season-list-title" className="record-card-title"><CalendarDots aria-hidden="true" size={20} className="text-accent-primary" />{t("field.seasons.list")}</h2>
        </div>
        <RecordFeedback error={list.error} pending={list.isPending} label={text("Đang tải danh sách vụ mùa…", "Loading crop seasons…")} />
        {list.data && <>
          {list.data.items.length > 0 ? <RecordTable labelledBy="season-list-title">
            <thead><tr>
              <th scope="col">{t("field.seasons.name")}</th>
              <th scope="col">{t("field.seasons.period")}</th>
            </tr></thead>
            <tbody>{list.data.items.map(item => <tr key={item.id} className={selected === item.id ? "bg-accent-primary/10" : undefined}>
              <th scope="row" className="w-1/2 break-words">
                <button type="button" aria-pressed={selected === item.id} onClick={() => {
                  setSelected(item.id);
                  setLinkPage(1);
                  detailPanel.current?.focus({ preventScroll: true });
                  detailPanel.current?.scrollIntoView?.({ block: "nearest" });
                }} className="record-row-action text-start text-accent-primary [overflow-wrap:anywhere]">{item.name}</button>
              </th>
              <td><span className="inline-flex flex-wrap items-center gap-x-1.5">{date(item.startsOn)} <span aria-hidden="true">–</span> <span className="sr-only">{t("field.seasons.to")}</span> {date(item.endsOn)}</span></td>
            </tr>)}</tbody>
          </RecordTable> : <RecordEmpty icon={<CalendarDots size={40} />}>
            {t(search ? "field.seasons.noResults" : "field.seasons.emptySeasons")}
          </RecordEmpty>}
          <RecordPagination page={page} hasMore={list.data.hasMore} count={list.data.totalCount} onPage={setPage} label={t("field.seasons.list")} />
        </>}
      </section>
      <section ref={detailPanel} tabIndex={-1} className="record-card scroll-mt-4 rounded-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary" aria-labelledby="season-detail-title">
        <header className="space-y-3 border-b border-ink-tertiary/15 p-4 sm:px-5">
          <h2 id="season-detail-title" className="record-card-title [overflow-wrap:anywhere]">{season?.name ?? t("field.seasons.detail")}</h2>
          {season && <dl className="record-details grid-cols-2">
            <div><dt>{t("field.seasons.startsOn")}</dt><dd>{date(season.startsOn)}</dd></div>
            <div><dt>{t("field.seasons.endsOn")}</dt><dd>{date(season.endsOn)}</dd></div>
          </dl>}
          {season && canConfigure && (season.canEdit || season.canDelete) && <div className="flex flex-wrap gap-2">
            {season.canEdit && <button type="button" className="record-button" onClick={() => setAction({ type: "editSeason", season })}><PencilSimple aria-hidden="true" size={16} />{t("field.seasons.editSeason")}</button>}
            {season.canDelete && <button type="button" className="record-button text-accent-danger" onClick={() => setAction({ type: "deleteSeason", season })}><Trash aria-hidden="true" size={16} />{t("field.seasons.deleteSeason")}</button>}
          </div>}
        </header>
        {!selected && <RecordEmpty icon={<CalendarDots size={40} />}>{t("field.seasons.chooseSeason")}</RecordEmpty>}
        {selected && <RecordFeedback error={detail.error} pending={detail.isPending} label={text("Đang tải chi tiết vụ mùa…", "Loading crop season details…")} />}
        {season && !detail.error && canReadLinks && <>
          <div className="record-card-header">
            <h3 id="season-links-title" className="record-card-title"><MapPin aria-hidden="true" size={18} className="text-accent-primary" />{t("field.seasons.plots")}</h3>
            {canLink && <button type="button" className="record-button" onClick={() => setAction({ type: "createLink", season })}><Plus aria-hidden="true" size={16} />{t("field.seasons.addPlot")}</button>}
          </div>
          <RecordFeedback error={links.error} pending={links.isPending} label={text("Đang tải thửa ruộng trong vụ…", "Loading linked plots…")} />
          {links.data && <>
            {links.data.items.length > 0 ? <RecordTable labelledBy="season-links-title">
              <thead><tr>
                <th scope="col">{t("field.seasons.plot")}</th>
                <th scope="col">{t("field.seasons.variety")}</th>
                <th scope="col" className="text-end">{t("field.seasons.actions")}</th>
              </tr></thead>
              <tbody>{links.data.items.map(link => <tr key={link.id}>
                <th scope="row" className="font-mono font-bold text-accent-primary [overflow-wrap:anywhere]">{link.plotCode}</th>
                <td className="[overflow-wrap:anywhere]">{link.riceVariety}</td>
                <td><div className="flex flex-wrap items-center justify-end gap-1">
                  <button
                    type="button"
                    className="record-link inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 hover:bg-surface-raised dark:hover:bg-surface-overlay"
                    onClick={() => setSprayHistoryLink(link)}
                  >
                    <SprayBottle aria-hidden="true" size={16} />
                    <span>{text("Lịch sử phun", "Spray history")}</span>
                  </button>
                  {canLink && link.canEdit && <button type="button" title={t("field.seasons.edit")} aria-label={t("field.seasons.editPlotLabel", { name: link.plotCode })} className="record-row-action" onClick={() => setAction({ type: "editLink", season, link })}><PencilSimple aria-hidden="true" size={16} /></button>}
                  {canLink && link.canDelete && <button type="button" title={t("field.seasons.unlink")} aria-label={t("field.seasons.unlinkPlotLabel", { name: link.plotCode })} className="record-row-action text-accent-danger hover:bg-accent-danger/10 hover:text-accent-danger dark:hover:bg-accent-danger/10" onClick={() => setAction({ type: "deleteLink", link })}><LinkSimpleBreak aria-hidden="true" size={16} /></button>}
                  {canLink && !link.canEdit && !link.canDelete && <span className="text-xs text-ink-secondary">{t("field.seasons.readOnly")}</span>}
                </div></td>
              </tr>)}</tbody>
            </RecordTable> : <RecordEmpty icon={<MapPin size={40} />}>{t("field.seasons.emptyPlots")}</RecordEmpty>}
            <RecordPagination page={linkPage} hasMore={links.data.hasMore} count={links.data.totalCount} onPage={setLinkPage} label={t("field.seasons.plots")} />
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
    {sprayHistoryLink && (
      <SprayHistoryModal
        link={sprayHistoryLink}
        seasonName={season?.name}
        onClose={() => setSprayHistoryLink(null)}
      />
    )}
  </div>;
}
