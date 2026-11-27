import { useRef, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { catalogsEndpoints, type MrlVersionDto } from "@/api/catalogs";
import { ApiError } from "@/api/client";
import { collectPages } from "@/api/query";
import { confirmAction } from "@/app/store/feedbackStore";
import { mrlDecimal, mrlImportSchema } from "../model/mrlImport";
import { localNow } from "../model/mrlDate";

export function useMrlWorkspace(
  scope: string,
  canManage: boolean,
  canRead = canManage,
) {
  const { t, i18n } = useTranslation();
  const cache = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<"create" | "edit" | null>(null);
  const [importing, setImporting] = useState(false);
  const [rawJson, setRawJson] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const [stale, setStale] = useState(false);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [commodityFilter, setCommodityFilter] = useState("");
  const [lookupOpen, setLookupOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [form, setForm] = useState({
    marketId: "",
    commodityId: "",
    effectiveFrom: "",
    effectiveTo: "",
    sourceRef: "",
  });
  const [limit, setLimit] = useState({ substanceId: "", value: "" });
  const [lookup, setLookup] = useState({
    marketId: "",
    commodityId: "",
    decisionAt: localNow(),
  });
  const [resolved, setResolved] = useState<MrlVersionDto | null>(null);
  const listKey = ["mrl-catalog", scope];
  const detailKey = ["mrl-detail", scope, selectedId];
  const catalogs = useQuery({
    queryKey: listKey,
    enabled: canRead,
    retry: false,
    queryFn: async () => {
      const [versions, markets, commodities, substances] = await Promise.all([
        collectPages(catalogsEndpoints.getMrlVersions),
        collectPages(catalogsEndpoints.getMarkets),
        collectPages(catalogsEndpoints.getCommodities),
        collectPages(catalogsEndpoints.getActiveSubstances),
      ]);
      return { versions, markets, commodities, substances };
    },
  });
  const detail = useQuery({
    queryKey: detailKey,
    enabled: Boolean(canRead && selectedId),
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const resource = await catalogsEndpoints.getMrlVersion(selectedId!);
      const limits = await collectPages((query) =>
        catalogsEndpoints.getMrlLimits(selectedId!, query),
      );
      return { ...resource, limits };
    },
  });
  const data = catalogs.data;
  const selected = detail.data?.data;
  const editable =
    canManage &&
    selected?.status === "DRAFT" &&
    Boolean(detail.data?.etag) &&
    !stale &&
    !detail.isFetching;
  const label = (version: MrlVersionDto) =>
    [
      data?.markets.find((item) => item.id === version.marketId)?.name ||
        version.marketId,
      data?.commodities.find((item) => item.id === version.commodityId)?.name ||
        version.commodityId,
    ].join(" · ");
  const date = (value: string) =>
    new Date(value).toLocaleString(i18n.language === "en" ? "en-GB" : "vi-VN");
  const toLocal = (value: string) => {
    const parsed = new Date(value);
    return new Date(parsed.getTime() - parsed.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 16);
  };
  const reportError = (err: unknown) => {
    if (err instanceof ApiError && err.status === 412) {
      setStale(true);
      setError(t("apiAudit.conflict"));
    } else if (
      err instanceof ApiError &&
      (err.status === 404 || err.status === 405)
    ) {
      setError(
        err.problem?.code === "MRL_VERSION_NOT_AVAILABLE"
          ? t("apiAudit.mrl.notAvailable")
          : t("apiAudit.unavailable"),
      );
    } else {
      const validation =
        err instanceof ApiError
          ? Object.values(err.problem?.errors ?? {})
              .flat()
              .join(" · ")
          : "";
      setError(
        validation ||
          (err instanceof Error ? err.message : t("apiAudit.failed")),
      );
    }
  };
  const run = async (action: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await action();
    } catch (err) {
      reportError(err);
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };
  const refresh = async () => {
    await cache.invalidateQueries({ queryKey: listKey });
    if (selectedId) {
      const result = await detail.refetch();
      if (result.error) throw result.error;
      setStale(false);
    }
  };
  const saveVersion = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      const effectiveFrom = new Date(form.effectiveFrom).toISOString();
      const effectiveTo = form.effectiveTo
        ? new Date(form.effectiveTo).toISOString()
        : null;
      if (effectiveTo && effectiveTo <= effectiveFrom)
        throw new Error(t("apiAudit.invalidInterval"));
      const request = {
        ...form,
        effectiveFrom,
        effectiveTo,
        sourceRef: form.sourceRef.trim(),
      };
      if (editor === "edit") {
        if (!editable || !selected || !selectedId || !detail.data?.etag)
          throw new Error(t("apiAudit.missingEtag"));
        await catalogsEndpoints.updateMrlVersion(
          selectedId,
          {
            sourceRef: request.sourceRef,
            ...(form.effectiveFrom !== toLocal(selected.effectiveFrom)
              ? { effectiveFrom }
              : {}),
            ...(form.effectiveTo !==
            (selected.effectiveTo ? toLocal(selected.effectiveTo) : "")
              ? { effectiveTo }
              : {}),
          },
          detail.data.etag,
        );
      } else await catalogsEndpoints.createMrlVersion(request);
      setEditor(null);
      await refresh();
      setNotice(t("apiAudit.saved"));
    });
  };
  const saveLimit = (event: FormEvent) => {
    event.preventDefault();
    void run(async () => {
      if (!editable || !selectedId || !detail.data?.etag)
        throw new Error(t("apiAudit.missingEtag"));
      if (!mrlDecimal.test(limit.value.trim()))
        throw new Error(t("apiAudit.mrl.invalidLimit"));
      await catalogsEndpoints.upsertMrlLimit(
        selectedId,
        limit.substanceId,
        { limitValue: limit.value.trim(), unit: "mg/kg" },
        detail.data.etag,
      );
      await refresh();
      setNotice(t("apiAudit.saved"));
    });
  };
  const publish = () =>
    void run(async () => {
      if (!editable || !selectedId || !detail.data?.etag) return;
      if (
        !(await confirmAction({
          title: t("apiAudit.mrl.publish"),
          description: t("apiAudit.mrl.publishConfirm"),
          confirmLabel: t("apiAudit.mrl.publish"),
          variant: "warning",
        }))
      )
        return;
      await catalogsEndpoints.publishMrlVersion(selectedId, detail.data.etag);
      await refresh();
      setNotice(t("apiAudit.mrl.publishedNotice"));
    });
  const closeDetail = () => {
    if (!busy) {
      setSelectedId(null);
      setStale(false);
      setError("");
    }
  };
  const versions = data?.versions ?? [];
  const searchTerm = search.trim().toLocaleLowerCase(i18n.language);
  const visible = versions.filter(
    (version) =>
      (!filter || version.status === filter) &&
      (!marketFilter || version.marketId === marketFilter) &&
      (!commodityFilter || version.commodityId === commodityFilter) &&
      (!searchTerm ||
        [label(version), version.sourceRef, `v${version.versionNo}`]
          .join(" ")
          .toLocaleLowerCase(i18n.language)
          .includes(searchTerm)),
  );
  const filtered = Boolean(searchTerm || filter || marketFilter || commodityFilter);
  const clearFilters = () => {
    setSearch("");
    setFilter("");
    setMarketFilter("");
    setCommodityFilter("");
  };
  const openDetail = (version: MrlVersionDto) => {
    setLookupOpen(false);
    setSelectedId(version.id);
    setStale(false);
    setError("");
    setNotice("");
    setLimit({ substanceId: data?.substances[0]?.id || "", value: "" });
  };
  const editVersion = () => {
    if (!selected) return;
    setForm({
      marketId: selected.marketId,
      commodityId: selected.commodityId,
      effectiveFrom: toLocal(selected.effectiveFrom),
      effectiveTo: selected.effectiveTo ? toLocal(selected.effectiveTo) : "",
      sourceRef: selected.sourceRef,
    });
    setEditor("edit");
  };

  const deleteLimit = (substanceId: string) => run(async () => {
    if (
      !selected || !detail.data?.etag ||
      !(await confirmAction({
        title: t("apiAudit.mrl.deleteLimit"),
        description: t(
          "apiAudit.mrl.deleteConfirm",
        ),
        confirmLabel: t("common.delete"),
        variant: "danger",
      }))
    )
      return;
    await catalogsEndpoints.deleteMrlLimit(
      selected.id,
      substanceId,
      detail.data.etag,
    );
    await refresh();
    setNotice(t("apiAudit.saved"));
  });

  const resolveVersion = (event: FormEvent) => {
    event.preventDefault();
    setResolved(null);
    void run(async () => {
      setResolved(
        await catalogsEndpoints.resolveMrlVersion({
          ...lookup,
          decisionAt: new Date(lookup.decisionAt).toISOString(),
        }),
      );
    });
  };

  const importVersion = (spreadsheet?: unknown) => {
    void run(async () => {
      let parsed: unknown;
      try {
        parsed = spreadsheet ?? JSON.parse(rawJson);
      } catch (cause) {
        throw new Error(t("apiAudit.mrl.invalidJson"), { cause });
      }
      const result = mrlImportSchema.safeParse(parsed);
      if (!result.success)
        throw new Error(
          t("apiAudit.mrl.invalidImport") +
            " · " +
            result.error.issues
              .map((issue) => issue.path.join("."))
              .join(", "),
        );
      const created = await catalogsEndpoints.importMrlVersion(result.data);
      setSelectedId(created.id);
      setImporting(false);
      setRawJson("");
      await refresh();
      setNotice(t("apiAudit.saved"));
    });
  };

  return {
    list: {
      t,
      i18n,
      selectedId,
      editor,
      setEditor,
      importing,
      setImporting,
      error,
      setError,
      notice,
      setNotice,
      busy,
      filter,
      setFilter,
      search,
      setSearch,
      marketFilter,
      setMarketFilter,
      commodityFilter,
      setCommodityFilter,
      lookupOpen,
      setLookupOpen,
      viewMode,
      setViewMode,
      setForm,
      catalogs,
      data,
      label,
      date,
      run,
      refresh,
      versions,
      visible,
      filtered,
      clearFilters,
      openDetail,
      canManage,
    },
    detailDialog: {
      t,
      selectedId,
      editor,
      error,
      notice,
      busy,
      setStale,
      limit,
      setLimit,
      detail,
      data,
      selected,
      editable,
      label,
      date,
      run,
      saveLimit,
      publish,
      closeDetail,
      editVersion,
      deleteLimit,
      canManage,
    },
    lookupDialog: {
      t,
      error,
      notice,
      busy,
      lookupOpen,
      setLookupOpen,
      lookup,
      setLookup,
      resolved,
      setResolved,
      data,
      label,
      date,
      openDetail,
      resolveVersion,
    },
    editorDialog: {
      t,
      editor,
      setEditor,
      error,
      notice,
      busy,
      form,
      setForm,
      data,
      editable,
      saveVersion,
    },
    importDialog: {
      t,
      importing,
      setImporting,
      rawJson,
      setRawJson,
      error,
      notice,
      busy,
      importVersion,
      markets: data?.markets ?? [],
      commodities: data?.commodities.filter(item => !item.isArchived) ?? [],
      substances: data?.substances ?? [],
    },
  };
}

export type MrlWorkspaceModel = ReturnType<typeof useMrlWorkspace>;
