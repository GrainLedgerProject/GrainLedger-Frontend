import { logger } from "@/shared/utils/logger";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
import { ledgerHistoryKinds } from "@/api/history";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { eventLabel } from "../model/eventPresentation";
import {
  BUSINESS_CATEGORIES,
  fetchBusinessHistory,
  type BusinessCategory,
  type BusinessHistoryPageResult,
} from "../model/businessHistory";
import { toAuditEvent, type AuditEvent } from "../model/historyEvent";
import { EventDetailsModal } from "../components/EventDetailsModal";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import {
  Calendar,
  ClockCounterClockwise,
  Cube,
  Eye,
  Funnel,
  HandCoins,
  LockSimple,
  MagnifyingGlass,
  Scales,
  Truck,
  WarningCircle,
  X,
  ArrowsClockwise,
  SortAscendingIcon,
} from "@phosphor-icons/react";

export const EventHistoryPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { t, i18n } = useTranslation();
  const text = useWorkflowText();
  const user = useAuthStore((s) => s.user);
  const entityFilterId = React.useId();
  const eventTypeFilterId = React.useId();
  const [historyMode, setHistoryMode] = useState<"ledger" | "business">(() =>
    user?.role === "MILL_ADMIN" ? "business" : "ledger",
  );
  const [businessCategory, setBusinessCategory] =
    useState<BusinessCategory>("ALL");
  const [businessEventType, setBusinessEventType] = useState("");
  const [businessRef, setBusinessRef] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [businessPage, setBusinessPage] = useState(1);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(() => user?.role !== "MILL_ADMIN");
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [reload, setReload] = useState(0);
  const [ledgerFacilityId, setLedgerFacilityId] = useState("");
  const [ledgerLotId, setLedgerLotId] = useState("");
  const [ledgerSortBy, setLedgerSortBy] = useState<
    "occurredAt" | "kind" | "quantity"
  >("occurredAt");
  const [ledgerSortDirection, setLedgerSortDirection] = useState<
    "asc" | "desc"
  >("desc");
  const [ledgerFacilities, setLedgerFacilities] = useState<
    { id: string; name: string }[]
  >([]);
  const [ledgerLots, setLedgerLots] = useState<{ id: string; code: string }[]>(
    [],
  );

  // Filters apply to the displayed page.
  const searchTerm = searchParams.get("search") ?? "";
  const [searchInput, setSearchInput] = useState(searchTerm);
  const [prevSearchTerm, setPrevSearchTerm] = useState(searchTerm);
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");

  // Synchronize searchInput during render when URL search param changes externally (e.g. Back/Forward)
  if (searchTerm !== prevSearchTerm) {
    setPrevSearchTerm(searchTerm);
    setSearchInput(searchTerm);
  }

  // Debounce search input: wait 400ms after user stops typing before triggering search query and API call
  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed === searchTerm) {
      return;
    }
    const timer = setTimeout(() => {
      setPage(1);
      setSearchParams(trimmed ? { search: trimmed } : {}, { replace: true });
    }, 400);

    return () => clearTimeout(timer);
  }, [searchInput, searchTerm, setSearchParams]);

  const handleClearSearch = () => {
    setSearchInput("");
    setPage(1);
    setSearchParams({}, { replace: true });
  };

  const handleKeyDownSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const trimmed = searchInput.trim();
      const currentParam = searchParams.get("search") ?? "";
      if (trimmed !== currentParam) {
        setPage(1);
        setSearchParams(trimmed ? { search: trimmed } : {}, { replace: true });
      }
    }
  };

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);
  const trimmedBusinessRef = businessRef.trim();
  const trimmedBusinessEventType = businessEventType.trim();
  const currentBusinessKey = `${businessCategory}:${trimmedBusinessEventType}:${trimmedBusinessRef}:${fromDate}:${toDate}:${businessPage}:${reload}`;
  const [businessState, setBusinessState] = useState<{
    key: string;
    data?: BusinessHistoryPageResult;
    error?: string;
  } | null>(null);
  const businessError =
    businessState?.key === currentBusinessKey
      ? (businessState.error ?? null)
      : null;
  const businessPending =
    historyMode === "business" && businessState?.key !== currentBusinessKey;

  useEffect(() => {
    if (historyMode !== "business") return;
    const controller = new AbortController();
    void fetchBusinessHistory(
      {
        category: businessCategory === "ALL" ? undefined : businessCategory,
        eventType: trimmedBusinessEventType || undefined,
        search: trimmedBusinessRef || undefined,
        from: fromDate || undefined,
        to: toDate || undefined,
        page: businessPage,
        pageSize: 25,
      },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) {
          setBusinessState({ key: currentBusinessKey, data });
        }
      })
      .catch((err: unknown) => {
        if (controller.signal.aborted) return;
        logger.error(err);
        setBusinessState({
          key: currentBusinessKey,
          error:
            err instanceof Error
              ? err.message
              : text(
                  "Không thể tải lịch sử nghiệp vụ.",
                  "Unable to load business history.",
                ),
        });
      });
    return () => controller.abort();
  }, [
    historyMode,
    businessCategory,
    trimmedBusinessEventType,
    trimmedBusinessRef,
    fromDate,
    toDate,
    businessPage,
    currentBusinessKey,
    // `text` is excluded: it is only used in the catch branch for error message
    // formatting and must not trigger a re-fetch on every render.
  ]);

  const businessItems =
    businessState?.key === currentBusinessKey
      ? (businessState.data?.items ?? [])
      : [];
  const businessTotalCount =
    businessState?.key === currentBusinessKey
      ? (businessState.data?.totalCount ?? 0)
      : 0;
  const businessHasMore =
    businessState?.key === currentBusinessKey
      ? Boolean(businessState.data?.hasMore)
      : false;

  const toModalAuditEvent = (
    item: BusinessHistoryPageResult["items"][number],
  ): AuditEvent => ({
    rowKey: item.id,
    id: item.referenceCode || item.id,
    kind: item.eventType || item.category,
    eventType: item.eventType || item.category,
    entityType: "Event",
    entityId: item.referenceCode,
    actorId: item.actorName,
    postingId: null,
    lotId: null,
    operationId: null,
    locationId: null,
    ownerId: null,
    ownerName: item.actorName,
    quantityKg: null,
    reversesPostingId: null,
    occurredAt: item.timestamp,
    timestamp: item.timestamp,
    payload: item.details,
    details: item.details,
  });

  const fetchEvents = () => {
    setLoading(true);
    setError(null);
    setReload((value) => value + 1);
  };

  const changePage = (next: number) => {
    setLoading(true);
    setError(null);
    setSelectedEvent(null);
    setPage(next);
  };

  useEffect(() => {
    if (historyMode !== "ledger") return;
    const controller = new AbortController();
    void Promise.all([
      typeof ledgerEndpoints.getLookups === "function"
        ? ledgerEndpoints.getLookups().catch(() => null)
        : Promise.resolve(null),
      typeof ledgerEndpoints.getLots === "function"
        ? ledgerEndpoints.getLots({ pageSize: 50 }).catch(() => null)
        : Promise.resolve(null),
    ]).then(([lookupRes, lotRes]) => {
      if (controller.signal.aborted) return;
      const setup = lookupRes as SetupApiResponse | null;
      if (setup?.facilities) setLedgerFacilities(setup.facilities);
      const lotItems = Array.isArray(lotRes)
        ? (lotRes as { id: string; code: string }[])
        : ((lotRes as { items?: { id: string; code: string }[] } | null)
            ?.items ?? []);
      setLedgerLots(lotItems);
    });
    return () => controller.abort();
  }, [historyMode]);

  useEffect(() => {
    if (historyMode !== "ledger") return;
    const controller = new AbortController();
    async function loadEvents() {
      try {
        const result = await ledgerEndpoints.getHistory(
          {
            page,
            pageSize: 25,
            search: searchTerm || undefined,
            ...(ledgerLotId.trim() ? { lotId: ledgerLotId.trim() } : {}),
            ...(ledgerFacilityId ? { facilityId: ledgerFacilityId } : {}),
            ...(eventTypeFilter !== "ALL" ? { kind: eventTypeFilter } : {}),
            sortBy: ledgerSortBy,
            sortDirection: ledgerSortDirection,
          },
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setEvents(result.items.map(toAuditEvent));
        setTotalCount(result.totalCount);
        setHasMore(result.hasMore);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        logger.error(err);
        setEvents([]);
        setHasMore(false);
        setError(
          err instanceof Error
            ? err.message
            : t("audit.events.errorLoad", "Không thể tải lịch sử sự kiện."),
        );
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void loadEvents();
    return () => controller.abort();
  }, [
    historyMode,
    page,
    reload,
    searchTerm,
    ledgerLotId,
    ledgerFacilityId,
    eventTypeFilter,
    ledgerSortBy,
    ledgerSortDirection,
    t,
  ]);

  const entityLabels: Record<AuditEvent["entityType"], string> = {
    Lot: t("audit.events.filterLot", "Lô hàng"),
    Operation: t("audit.events.filterOperation", "Công đoạn chế biến"),
    Event: t("audit.events.otherEvent", "Sự kiện khác"),
  };

  const filteredEvents = events.filter((evt) => {
    const matchesEntity =
      entityFilter === "ALL" || evt.entityType === entityFilter;
    const matchesEventType =
      eventTypeFilter === "ALL" || evt.eventType === eventTypeFilter;

    return matchesEntity && matchesEventType;
  });

  const getEntityIcon = (entityType: string) => {
    switch (entityType?.toLowerCase()) {
      case "lot":
        return <Cube className="text-accent-warning" size={16} weight="bold" />;
      case "operation":
        return (
          <Scales className="text-accent-primary" size={16} weight="bold" />
        );
      case "receivingtask":
      case "receiving":
        return <Truck className="text-sky-500" size={16} weight="bold" />;
      case "hold":
        return (
          <LockSimple className="text-accent-danger" size={16} weight="bold" />
        );
      case "procurement":
        return <HandCoins className="text-teal-500" size={16} weight="bold" />;
      default:
        return (
          <ClockCounterClockwise
            className="text-ink-tertiary"
            size={16}
            weight="bold"
          />
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header - Synchronized with CustomerOrganizationsPage */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
        <div>
          <span
            data-ui-detail="secondary"
            className="text-xs font-semibold uppercase tracking-wider text-accent-primary"
          >
            {t("audit.events.tag", "NHẬT KÝ ĐỐI SOÁT & BẰNG CHỨNG BẤT BIẾN")}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("audit.events.title", "Nhật ký Sự kiện Bất biến")}
          </h2>
          <p
            data-ui-detail="secondary"
            className="text-xs text-ink-secondary mt-0.5"
          >
            {t(
              "audit.events.ledgerSubtitle",
              "Tra cứu bút toán, thời gian ghi nhận, tài khoản thực hiện và dữ liệu chi tiết trong sổ cái.",
            )}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-xl border border-ink-tertiary/20 bg-surface-raised p-0.5 text-xs">
            <button
              type="button"
              onClick={() => setHistoryMode("ledger")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                historyMode === "ledger"
                  ? "bg-accent-primary text-white"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {text("Nhật ký sổ cái", "Ledger audit")}
            </button>
            <button
              type="button"
              onClick={() => setHistoryMode("business")}
              className={`rounded-lg px-3 py-1.5 font-semibold transition-colors ${
                historyMode === "business"
                  ? "bg-accent-primary text-white"
                  : "text-ink-secondary hover:text-ink-primary"
              }`}
            >
              {text("Lịch sử nghiệp vụ", "Business history")}
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (historyMode === "business") {
                setReload((value) => value + 1);
              } else {
                fetchEvents();
              }
            }}
            disabled={loading || businessPending}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={t("audit.events.btnRefresh", "Làm mới danh sách")}
          >
            <ArrowsClockwise
              size={16}
              className={
                loading || businessPending
                  ? "motion-safe:animate-spin"
                  : undefined
              }
            />
          </button>
        </div>
      </div>

      {historyMode === "business" ? (
        <div className="space-y-4">
          {businessError && (
            <div className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2">
              <WarningCircle size={18} weight="fill" className="shrink-0" />
              <span>{businessError}</span>
            </div>
          )}
          <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
              <label className="space-y-1">
                <span className="font-semibold text-ink-secondary">
                  {text("Nhóm nghiệp vụ", "Business group")}
                </span>
                <select
                  aria-label={text("Nhóm nghiệp vụ", "Business group")}
                  value={businessCategory}
                  onChange={(e) => {
                    setBusinessCategory(e.target.value as BusinessCategory);
                    setBusinessPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                >
                  <option value="ALL">
                    {text("Tất cả nhóm nghiệp vụ", "All categories")}
                  </option>
                  {BUSINESS_CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="font-semibold text-ink-secondary">
                  {text("Loại sự kiện", "Event type")}
                </span>
                <input
                  type="text"
                  list="business-event-type-options"
                  aria-label={text("Loại sự kiện", "Event type")}
                  placeholder={text(
                    "VD: TRACEBACK, CLOSE...",
                    "e.g. TRACEBACK, CLOSE...",
                  )}
                  value={businessEventType}
                  onChange={(e) => {
                    setBusinessEventType(e.target.value);
                    setBusinessPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                />
                <datalist id="business-event-type-options">
                  <option value="TRACEBACK" />
                  <option value="CLOSE" />
                  <option value="HOLD_PLACED" />
                  <option value="HOLD_ISOLATED" />
                  <option value="HOLD_RELEASED" />
                  <option value="OPERATION_COMMITTED" />
                  <option value="CORRECTION_APPROVED" />
                  <option value="LAB_REPORT_RECORDED" />
                </datalist>
              </label>

              <label className="space-y-1">
                <span className="font-semibold text-ink-secondary">
                  {text("Mã tham chiếu", "Reference code")}
                </span>
                <input
                  type="search"
                  aria-label={text("Mã tham chiếu", "Reference code")}
                  placeholder={text(
                    "Mã phiếu, mẫu, báo cáo, container...",
                    "Receipt, sample, report, order code...",
                  )}
                  value={businessRef}
                  onChange={(e) => {
                    setBusinessRef(e.target.value);
                    setBusinessPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                />
              </label>

              <label className="space-y-1">
                <span className="font-semibold text-ink-secondary">
                  {text("Từ ngày", "From date")}
                </span>
                <input
                  type="date"
                  aria-label={text("Từ ngày", "From date")}
                  value={fromDate}
                  onChange={(e) => {
                    setFromDate(e.target.value);
                    setBusinessPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                />
              </label>

              <label className="space-y-1">
                <span className="font-semibold text-ink-secondary">
                  {text("Đến ngày", "To date")}
                </span>
                <input
                  type="date"
                  aria-label={text("Đến ngày", "To date")}
                  value={toDate}
                  onChange={(e) => {
                    setToDate(e.target.value);
                    setBusinessPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                />
              </label>
            </div>
            <p className="text-xs text-ink-secondary border-t border-ink-tertiary/10 pt-2">
              {text(
                `Hiển thị ${businessItems.length} / ${businessTotalCount} bản ghi nghiệp vụ theo quyền truy cập hiện tại.`,
                `Showing ${businessItems.length} / ${businessTotalCount} business records within your authorized scope.`,
              )}
            </p>
          </div>

          {businessPending ? (
            <div className="py-16 flex justify-center">
              <GrainLoader
                label={text(
                  "Đang tải lịch sử nghiệp vụ...",
                  "Loading business history...",
                )}
              />
            </div>
          ) : businessItems.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-ink-tertiary/15 rounded-2xl bg-surface-base dark:bg-surface-raised">
              <ClockCounterClockwise
                size={40}
                className="mx-auto text-ink-tertiary mb-3 opacity-60"
              />
              <p className="text-sm font-semibold text-ink-primary">
                {text(
                  "Chưa có sự kiện nghiệp vụ khớp bộ lọc.",
                  "No matching business records.",
                )}
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/15 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                      <th className="py-3.5 px-4">
                        {text("Thời gian", "Time")}
                      </th>
                      <th className="py-3.5 px-4">
                        {text("Nhóm", "Category")}
                      </th>
                      <th className="py-3.5 px-4">
                        {text("Mã tham chiếu", "Reference")}
                      </th>
                      <th className="py-3.5 px-4">
                        {text("Loại & Tác nhân", "Event & Actor")}
                      </th>
                      <th className="py-3.5 px-4">
                        {text("Sự kiện", "Event")}
                      </th>
                      <th className="py-3.5 px-4 text-right">
                        {text("Chi tiết", "Details")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-tertiary/10">
                    {businessItems.map((item) => (
                      <tr
                        key={item.id}
                        className="hover:bg-surface-raised/60 transition-colors"
                      >
                        <td className="py-3.5 px-4 font-mono text-ink-secondary whitespace-nowrap">
                          {new Date(item.timestamp).toLocaleString(
                            i18n.language.startsWith("en") ? "en-US" : "vi-VN",
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-ink-primary">
                          {item.category}
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-accent-primary">
                          {item.referenceCode}
                        </td>
                        <td className="py-3.5 px-4 text-ink-primary">
                          <div className="font-medium">{item.actorName}</div>
                          {item.subjectId && (
                            <div className="text-[11px] font-mono text-ink-secondary">
                              {item.subjectId}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <StatusBadge
                            status="PENDING"
                            label={item.eventType}
                            size="sm"
                          />
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              setSelectedEvent(toModalAuditEvent(item))
                            }
                            className="px-2.5 py-1 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-primary font-semibold text-xs inline-flex items-center gap-1.5"
                          >
                            <Eye size={14} />
                            <span>{text("Xem", "View")}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 text-xs text-ink-secondary">
            <span>
              {t("audit.events.pageNumber", "Trang {{page}}", {
                page: businessPage,
              })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={businessPending || businessPage <= 1}
                onClick={() => setBusinessPage((p) => Math.max(1, p - 1))}
                className="px-3 py-2 rounded-lg border border-ink-tertiary/20 disabled:opacity-40"
              >
                {t("common.previousPage", "Trang trước")}
              </button>
              <button
                type="button"
                disabled={businessPending || !businessHasMore}
                onClick={() => setBusinessPage((p) => p + 1)}
                className="px-3 py-2 rounded-lg border border-ink-tertiary/20 disabled:opacity-40"
              >
                {t("common.nextPage", "Trang sau")}
              </button>
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* Alerts */}
          {error && (
            <div className="p-3.5 rounded-lg bg-functional-rejected-bg border border-functional-rejected-border text-accent-danger text-xs flex items-center gap-2">
              <WarningCircle size={18} weight="fill" className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Filter and Search Card */}
          <div className="p-4 rounded-2xl bg-surface-base dark:bg-surface-raised border border-ink-tertiary/20 shadow-xs space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2 relative">
                <MagnifyingGlass
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
                  size={16}
                />
                <input
                  type="text"
                  placeholder={t(
                    "audit.events.searchCurrentPage",
                    "Tìm trong trang hiện tại: mã sự kiện, mã lô, người ghi...",
                  )}
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onKeyDown={handleKeyDownSearch}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised pe-9 ps-10 placeholder:text-ink-tertiary dark:bg-surface-overlay"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-ink-tertiary hover:text-ink-primary transition-colors"
                    title="Xóa tìm kiếm"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="relative items-center gap-2">
                <label htmlFor={entityFilterId} className="sr-only">
                  {t("audit.events.thEntity", "Đối tượng")}
                </label>
                <SortAscendingIcon
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
                  size={16}
                />
                <select
                  id={entityFilterId}
                  value={entityFilter}
                  onChange={(e) => setEntityFilter(e.target.value)}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised ps-10 font-semibold dark:bg-surface-overlay"
                >
                  <option value="ALL">
                    {t("audit.events.filterAllEntities", "Tất cả đối tượng")}
                  </option>
                  {Object.entries(entityLabels).map(([type, label]) => (
                    <option key={type} value={type}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative items-center gap-2">
                <label htmlFor={eventTypeFilterId} className="sr-only">
                  {t("audit.events.thEventType", "Loại sự kiện")}
                </label>
                <Funnel
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-ink-tertiary"
                  size={16}
                />
                <select
                  id={eventTypeFilterId}
                  value={eventTypeFilter}
                  onChange={(e) => {
                    setEventTypeFilter(e.target.value);
                    setPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised ps-10 font-semibold dark:bg-surface-overlay"
                >
                  <option value="ALL">
                    {t("audit.events.filterAllTypes", "Tất cả loại sự kiện")}
                  </option>
                  {ledgerHistoryKinds.map((kind) => (
                    <option key={kind} value={kind}>
                      {eventLabel(kind, i18n.language)}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-2 border-t border-ink-tertiary/10">
              <label className="space-y-1">
                <span className="font-semibold text-ink-secondary">
                  {text("Cơ sở nhà máy", "Facility")}
                </span>
                <select
                  aria-label={text("Lọc theo cơ sở", "Filter by facility")}
                  value={ledgerFacilityId}
                  onChange={(e) => {
                    setLedgerFacilityId(e.target.value);
                    setPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                >
                  <option value="">
                    {text("Tất cả cơ sở", "All facilities")}
                  </option>
                  {ledgerFacilities.map((fac) => (
                    <option key={fac.id} value={fac.id}>
                      {fac.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="font-semibold text-ink-secondary">
                  {text("Lô hàng (Lot)", "Lot")}
                </span>
                <select
                  aria-label={text("Lọc theo lô hàng", "Filter by lot")}
                  value={ledgerLotId}
                  onChange={(e) => {
                    setLedgerLotId(e.target.value);
                    setPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay font-mono"
                >
                  <option value="">{text("Tất cả lô hàng", "All lots")}</option>
                  {ledgerLots.map((lot) => (
                    <option key={lot.id} value={lot.id}>
                      {lot.code}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1">
                <span className="font-semibold text-ink-secondary">
                  {text("Sắp xếp theo", "Sort by")}
                </span>
                <select
                  aria-label={text(
                    "Sắp xếp lịch sử sổ cái",
                    "Sort ledger history",
                  )}
                  value={ledgerSortBy}
                  onChange={(e) => {
                    setLedgerSortBy(e.target.value as typeof ledgerSortBy);
                    setPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                >
                  <option value="occurredAt">
                    {text("Thời gian ghi nhận", "Occurred at")}
                  </option>
                  <option value="kind">{text("Loại sự kiện", "Kind")}</option>
                  <option value="quantity">
                    {text("Khối lượng", "Quantity")}
                  </option>
                </select>
              </label>

              <label className="space-y-1">
                <span className="font-semibold text-ink-secondary">
                  {text("Chiều sắp xếp", "Direction")}
                </span>
                <select
                  aria-label={text("Chiều sắp xếp", "Sort direction")}
                  value={ledgerSortDirection}
                  onChange={(e) => {
                    setLedgerSortDirection(
                      e.target.value as typeof ledgerSortDirection,
                    );
                    setPage(1);
                  }}
                  className="filter-control border-ink-tertiary/20 bg-surface-raised dark:bg-surface-overlay"
                >
                  <option value="desc">
                    {text("Mới / Giảm dần", "Descending")}
                  </option>
                  <option value="asc">
                    {text("Cũ / Tăng dần", "Ascending")}
                  </option>
                </select>
              </label>
            </div>

            <div className="text-xs text-ink-secondary flex items-center justify-between pt-2.5 border-t border-ink-tertiary/10">
              <span>
                {t(
                  "audit.events.showingPageCount",
                  "Trang hiện tại: {{count}} dòng hiển thị · Tổng cộng {{total}} dòng",
                  {
                    count: filteredEvents.length,
                    total: totalCount,
                  },
                )}
              </span>
              <span className="font-mono text-xs text-accent-primary font-bold">
                {t(
                  "audit.events.accessScope",
                  "Dữ liệu được giới hạn theo quyền truy cập",
                )}
              </span>
            </div>
          </div>

          {/* Events Table */}
          {loading ? (
            <div className="py-16 flex justify-center">
              <GrainLoader
                label={t(
                  "audit.events.loading",
                  "Đang tải chuỗi sự kiện đối soát bất biến...",
                )}
              />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="py-16 text-center border-2 border-dashed border-ink-tertiary/15 rounded-2xl bg-surface-base dark:bg-surface-raised">
              <ClockCounterClockwise
                size={40}
                className="mx-auto text-ink-tertiary mb-3 opacity-60"
              />
              <p className="text-sm font-semibold text-ink-primary">
                {t(
                  "audit.events.noEvents",
                  "Không tìm thấy sự kiện nào phù hợp với bộ lọc.",
                )}
              </p>
              <p className="text-xs text-ink-secondary mt-1">
                Vui lòng thử điều chỉnh lại từ khóa tìm kiếm hoặc loại đối
                tượng.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/15 text-ink-secondary font-semibold uppercase tracking-wider text-xs">
                      <th className="py-3.5 px-4">
                        {t("audit.events.thTime", "Thời gian")}
                      </th>
                      <th className="py-3.5 px-4">
                        {t("audit.events.thEventId", "Mã sự kiện")}
                      </th>
                      <th className="py-3.5 px-4">
                        {t("audit.events.thEntity", "Đối tượng")}
                      </th>
                      <th className="py-3.5 px-4">
                        {t("audit.events.thEventType", "Loại sự kiện")}
                      </th>
                      <th className="py-3.5 px-4">
                        {t("audit.events.thActor", "Tài khoản ghi")}
                      </th>
                      <th className="py-3.5 px-4">
                        {t("audit.events.thQuantity", "Khối lượng (kg)")}
                      </th>
                      <th className="py-3.5 px-4 text-right">
                        {t("audit.events.thDetails", "Chi tiết")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink-tertiary/10 font-sans">
                    {filteredEvents.map((evt) => (
                      <tr
                        key={evt.rowKey}
                        className="hover:bg-surface-raised/60 dark:hover:bg-surface-overlay/40 transition-colors"
                      >
                        <td className="py-3.5 px-4 text-ink-secondary whitespace-nowrap">
                          <div className="flex items-center gap-1.5 font-mono text-xs">
                            <Calendar size={13} className="text-ink-tertiary" />
                            <span>
                              {new Date(evt.timestamp).toLocaleString(
                                i18n.language.startsWith("en")
                                  ? "en-US"
                                  : "vi-VN",
                              )}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-xs font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-md inline-block">
                            {evt.id}
                          </span>
                          {evt.kind === "TRACEBACK" && (
                            <span className="mt-1 block font-mono text-[11px] text-ink-secondary">
                              Trace ID: {evt.id}
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {getEntityIcon(evt.entityType)}
                            <span className="font-semibold text-ink-primary text-xs">
                              {entityLabels[evt.entityType]}:
                            </span>
                            <span className="font-mono text-xs text-accent-primary bg-functional-balanced-bg border border-accent-primary/20 px-1.5 py-0.5 rounded-lg">
                              {evt.entityId}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary">
                            {eventLabel(evt.eventType, i18n.language)}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-ink-secondary truncate max-w-[150px] font-mono text-xs">
                          {evt.actorId}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-ink-tertiary">
                          {evt.quantityKg ?? "—"}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => setSelectedEvent(evt)}
                            className="px-2.5 py-1 rounded-lg border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-primary font-semibold text-xs inline-flex items-center gap-1.5 transition-colors shadow-xs"
                          >
                            <Eye size={14} />
                            <span>{t("audit.events.btnView", "Xem")}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 text-xs text-ink-secondary">
            <span>
              {t("audit.events.pageNumber", "Trang {{page}}", { page })}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={loading || page <= 1}
                onClick={() => changePage(page - 1)}
                className="px-3 py-2 rounded-lg border border-ink-tertiary/20 disabled:opacity-40"
              >
                {t("common.previousPage", "Trang trước")}
              </button>
              <button
                type="button"
                disabled={loading || !hasMore}
                onClick={() => changePage(page + 1)}
                className="px-3 py-2 rounded-lg border border-ink-tertiary/20 disabled:opacity-40"
              >
                {t("common.nextPage", "Trang sau")}
              </button>
            </div>
          </div>
        </>
      )}

      {selectedEvent && (
        <EventDetailsModal
          key={selectedEvent.rowKey}
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
        />
      )}
    </div>
  );
};
