import { useDeferredValue, useId, useRef, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDots, MagnifyingGlass, Warning } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { ApiError } from "@/api/client";
import {
  procurementEndpoints as procurement,
  type CropSeasonReference,
  type PlotSeasonReference,
  type RegisterPlotSeasonRequest,
} from "@/api/procurement";
import { RecordDialog } from "@/shared/ui/RecordWorkspace";
import { Feedback } from "@/shared/ui/Workflow";

export type SeasonAction =
  | { type: "createSeason"; companyId: string }
  | { type: "editSeason" | "deleteSeason"; season: CropSeasonReference }
  | { type: "createLink"; season: CropSeasonReference }
  | { type: "editLink"; season: CropSeasonReference; link: PlotSeasonReference }
  | { type: "deleteLink"; link: PlotSeasonReference };

export function SeasonEditor({ action, userId, queryScope, onSaved, onClose }: {
  action: SeasonAction;
  userId: string;
  queryScope: string[];
  onSaved: (id?: string) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const cache = useQueryClient();
  const id = useId();
  const season = "season" in action ? action.season : undefined;
  const link = "link" in action ? action.link : undefined;
  const linkForm = action.type === "createLink" || action.type === "editLink";
  const removing = action.type === "deleteSeason" || action.type === "deleteLink";
  const [startsOn, setStartsOn] = useState(season?.startsOn ?? "");
  const [endsOn, setEndsOn] = useState(season?.endsOn ?? "");
  const pendingLink = useRef<RegisterPlotSeasonRequest | null>(null);
  const title = t(`field.seasons.${action.type === "createLink" ? "addPlot" : action.type}`);
  const refresh = () => cache.invalidateQueries({ queryKey: queryScope });
  const mutation = useMutation({
    mutationFn: async (form: FormData | RegisterPlotSeasonRequest) => {
      if (!(form instanceof FormData)) return (await procurement.createPlotSeason(form)).id;
      switch (action.type) {
        case "createSeason":
        case "editSeason": {
          const body = { name: String(form.get("name") ?? "").trim(), startsOn, endsOn };
          if (action.type === "createSeason") return (await procurement.createCropSeason({ ...body, companyId: action.companyId })).id;
          await procurement.updateCropSeason(action.season.id, { ...body, companyId: action.season.companyId, expectedVersion: action.season.version });
          return action.season.id;
        }
        case "createLink":
        case "editLink": {
          const body = { plotId: String(form.get("plotId") ?? ""), seasonId: action.season.id, riceVariety: String(form.get("riceVariety") ?? "").trim() };
          if (action.type === "editLink") {
            await procurement.updatePlotSeason(action.link.id, { ...body, expectedVersion: action.link.version });
            return action.link.id;
          }
          const prior = pendingLink.current?.payload;
          if (!prior || prior.plotId !== body.plotId || prior.riceVariety !== body.riceVariety) {
            pendingLink.current = {
              deviceId: "grainledger-web", clientOperationId: crypto.randomUUID(), capturedAt: new Date().toISOString(),
              payloadSchemaVersion: 1, payload: { entityId: crypto.randomUUID(), ...body },
            };
          }
          return (await procurement.createPlotSeason(pendingLink.current!)).id;
        }
        case "deleteSeason":
          await procurement.deleteCropSeason(action.season.id, { version: action.season.version });
          break;
        case "deleteLink":
          await procurement.deletePlotSeason(action.link.id, { version: action.link.version });
          break;
      }
    },
    onSuccess: savedId => { onSaved(savedId); void refresh(); },
    onError: error => {
      if (error instanceof ApiError && (error.status >= 500 || [0, 404, 408, 409, 412].includes(error.status))) void refresh();
    },
  });
  const error = mutation.error instanceof ApiError ? mutation.error : null;
  const uncertain = Boolean(error && (error.status === 0 || error.status === 408 || error.status >= 500));
  const stale = error?.status === 412 || error?.problem?.code === "REFERENCE_IN_USE";
  const canRetryLink = uncertain && action.type === "createLink";
  const blocked = mutation.isPending || stale || uncertain;
  const message = stale ? t(error?.status === 412 ? "field.seasons.stale" : "field.seasons.inUse")
    : error?.problem?.code === "PLOT_SEASON_EXISTS" ? t("field.seasons.duplicate")
    : uncertain ? t(action.type === "createLink" ? "field.seasons.retryLink" : "field.seasons.uncertain")
    : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (blocked) return;
    const form = event.currentTarget;
    const body = new FormData(form);
    const textName = linkForm ? "riceVariety" : "name";
    const textField = form.elements.namedItem(textName);
    if (textField instanceof HTMLInputElement && !String(body.get(textName) ?? "").trim()) {
      textField.setCustomValidity(t("field.seasons.required"));
      textField.reportValidity();
      return;
    }
    mutation.mutate(body);
  }

  return <RecordDialog title={title} titleId={`${id}-title`} subtitle={linkForm ? season?.name : undefined}
    icon={removing ? <Warning size={22} className="text-accent-danger" /> : <CalendarDots size={22} />}
    onClose={onClose} busy={mutation.isPending}>
      <form method="post" aria-labelledby={`${id}-title`} onSubmit={submit} className="space-y-4">
        {removing ? <p className="text-sm [overflow-wrap:anywhere]">{t(`field.seasons.confirm.${action.type}`, { name: link?.plotCode ?? season?.name })}</p>
          : <fieldset disabled={blocked} className="min-w-0 space-y-4">
            <legend className="sr-only">{title}</legend>
            {linkForm ? <>
              <PlotPicker userId={userId} initial={link && { id: link.plotId, code: link.plotCode }} />
              <div>
                <label htmlFor={`${id}-variety`}>{t("field.seasons.variety")}</label>
                <input id={`${id}-variety`} name="riceVariety" required defaultValue={link?.riceVariety} onInput={event => event.currentTarget.setCustomValidity("")} className="mt-1.5" />
              </div>
            </> : <>
              <div>
                <label htmlFor={`${id}-name`}>{t("field.seasons.name")}</label>
                <input id={`${id}-name`} name="name" required defaultValue={season?.name} onInput={event => event.currentTarget.setCustomValidity("")} className="mt-1.5" />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="min-w-0">
                  <label htmlFor={`${id}-start`}>{t("field.seasons.startsOn")}</label>
                  <input id={`${id}-start`} name="startsOn" type="date" required min="0001-01-02" max={endsOn || "9999-12-31"} value={startsOn} onChange={event => setStartsOn(event.target.value)} className="mt-1.5" />
                </div>
                <div className="min-w-0">
                  <label htmlFor={`${id}-end`}>{t("field.seasons.endsOn")}</label>
                  <input id={`${id}-end`} name="endsOn" type="date" required min={startsOn || "0001-01-02"} max="9999-12-31" value={endsOn} onChange={event => setEndsOn(event.target.value)} className="mt-1.5" />
                </div>
              </div>
            </>}
          </fieldset>}
        {message ? <Feedback error={new Error(message)} /> : <Feedback error={mutation.error} pending={mutation.isPending} />}
        <footer className="record-form-footer">
          <button type="button" className="record-button" disabled={mutation.isPending} onClick={onClose}>{t(blocked && !mutation.isPending ? "field.seasons.close" : "field.seasons.cancel")}</button>
          {canRetryLink
            ? <button type="button" className="record-button record-primary" onClick={() => { if (pendingLink.current) mutation.mutate(pendingLink.current); }}>{t("field.seasons.retry")}</button>
            : <button type="submit" disabled={blocked} className={`record-button ${removing ? "border-accent-danger bg-accent-danger text-white hover:bg-accent-danger/90 dark:hover:bg-accent-danger/90" : "record-primary"}`}>{t(removing ? `field.seasons.${action.type}` : "field.seasons.save")}</button>}
        </footer>
      </form>
  </RecordDialog>;
}

function PlotPicker({ userId, initial }: { userId: string; initial?: { id: string; code: string } }) {
  const { t } = useTranslation();
  const id = useId();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(initial);
  const term = useDeferredValue(search.trim());
  const plots = useQuery({
    queryKey: ["season-plot-options", userId, term, page],
    queryFn: () => procurement.getPlots({ page, pageSize: 30, search: term }),
  });
  const options = Array.isArray(plots.data) ? plots.data : plots.data?.items ?? [];
  const hasMore = !Array.isArray(plots.data) && plots.data?.hasMore;
  return <div className="record-filter space-y-2">
    <label htmlFor={`${id}-search`}>{t("field.seasons.searchPlots")}</label>
    <div className="relative">
      <MagnifyingGlass aria-hidden="true" size={18} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary" />
      <input id={`${id}-search`} type="search" name="plotSearch" value={search} maxLength={100} onChange={event => { setSearch(event.target.value); setPage(1); }} onKeyDown={event => {
        if (event.key === "Enter" && !event.nativeEvent.isComposing) event.preventDefault();
      }} />
    </div>
    <label htmlFor={`${id}-plot`}>{t("field.seasons.plot")}</label>
    <select id={`${id}-plot`} required name="plotId" value={selected?.id ?? ""} onChange={event => setSelected(options.find(plot => plot.id === event.target.value))}>
      <option value="">{t("field.seasons.choosePlot")}</option>
      {selected && !options.some(plot => plot.id === selected.id) && <option value={selected.id}>{selected.code}</option>}
      {options.map(plot => <option key={plot.id} value={plot.id}>{plot.code}</option>)}
    </select>
    <Feedback pending={plots.isPending} error={plots.error} />
    {plots.data && options.length === 0 && <p className="text-sm text-ink-secondary">{t("field.seasons.noPlotsFound")}</p>}
    {(page > 1 || hasMore) && <div className="flex flex-wrap gap-2">
      <button type="button" className="record-button" disabled={page === 1 || plots.isFetching || term !== search.trim()} onClick={() => setPage(page - 1)}>{t("field.seasons.prev")}</button>
      <button type="button" className="record-button" disabled={!hasMore || plots.isFetching || term !== search.trim()} onClick={() => setPage(page + 1)}>{t("field.seasons.next")}</button>
    </div>}
  </div>;
}
