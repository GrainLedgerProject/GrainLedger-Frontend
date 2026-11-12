import { logger } from "@/shared/utils/logger";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ledgerEndpoints } from "@/api/ledger";
import { toAuditEvent, type AuditEvent } from "../model/historyEvent";
import { EventDetailsModal } from "../components/EventDetailsModal";
import { GrainLoader } from "@/components/GrainLoader/GrainLoader";
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
  ArrowsClockwise,
} from "@phosphor-icons/react";

export const EventHistoryPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [reload, setReload] = useState(0);

  // Filters apply to the displayed page.
  const [searchTerm, setSearchTerm] = useState("");
  const [entityFilter, setEntityFilter] = useState("ALL");
  const [eventTypeFilter, setEventTypeFilter] = useState("ALL");

  // Selected event for detail modal
  const [selectedEvent, setSelectedEvent] = useState<AuditEvent | null>(null);

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
    const controller = new AbortController();
    async function loadEvents() {
      try {
        const result = await ledgerEndpoints.getHistory(
          { page, pageSize: 25, sortBy: "occurredAt", sortDirection: "desc" },
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
  }, [page, reload, t]);

  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      searchTerm === "" ||
      evt.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.entityId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.eventType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      evt.actorId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (JSON.stringify(evt.payload) ?? "")
        .toLowerCase()
        .includes(searchTerm.toLowerCase());

    const matchesEntity =
      entityFilter === "ALL" || evt.entityType === entityFilter;
    const matchesEventType =
      eventTypeFilter === "ALL" || evt.eventType === eventTypeFilter;

    return matchesSearch && matchesEntity && matchesEventType;
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
          <span data-ui-detail="secondary" className="text-xs font-mono font-bold text-accent-primary uppercase tracking-wider block">
            {t(
              "audit.events.tag",
              "NHẬT KÝ ĐỐI SOÁT & BẰNG CHỨNG BẤT BIẾN (AUDIT TRAIL)",
            )}
          </span>
          <h2 className="text-2xl font-display font-bold text-ink-primary">
            {t("audit.events.title", "Nhật ký Sự kiện Nghiệp vụ Bất biến")}
          </h2>
          <p data-ui-detail="secondary" className="text-xs text-ink-secondary mt-0.5">
            {t(
              "audit.events.ledgerSubtitle",
              "Tra cứu bút toán, thời gian ghi nhận, tài khoản thực hiện và dữ liệu chi tiết trong sổ cái.",
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchEvents}
            disabled={loading}
            className="p-2.5 rounded-full border border-ink-tertiary/20 bg-surface-base hover:bg-surface-raised text-ink-secondary hover:text-ink-primary transition-colors"
            title={t("audit.events.btnRefresh", "Làm mới danh sách")}
          >
            <ArrowsClockwise
              size={16}
              className={loading ? "motion-safe:animate-spin" : undefined}
            />
          </button>
        </div>
      </div>

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
              className="absolute left-3 top-2.5 text-ink-tertiary"
              size={16}
            />
            <input
              type="text"
              placeholder={t(
                "audit.events.searchCurrentPage",
                "Tìm trong trang hiện tại: mã sự kiện, mã lô, người ghi...",
              )}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary placeholder:text-ink-tertiary focus:border-accent-primary focus:outline-none focus:rounded-lg transition-colors"
            />
          </div>

          <div>
            <select
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-full py-2 px-3 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none focus:rounded-lg transition-colors"
            >
              <option value="ALL">
                {t(
                  "audit.events.filterAllEntities",
                  "Tất cả đối tượng (All Entities)",
                )}
              </option>
              <option value="Lot">
                {t("audit.events.filterLot", "Lô hàng (Lot)")}
              </option>
              <option value="Operation">
                {t(
                  "audit.events.filterOperation",
                  "Công đoạn chế biến (Operation)",
                )}
              </option>
              <option value="Event">
                {t("audit.events.otherEvent", "Sự kiện khác")}
              </option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Funnel className="text-ink-tertiary shrink-0" size={16} />
            <select
              value={eventTypeFilter}
              onChange={(e) => setEventTypeFilter(e.target.value)}
              className="min-w-0 flex-1 w-full py-2 px-3 text-xs rounded-lg bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none focus:rounded-lg transition-colors"
            >
              <option value="ALL">
                {t("audit.events.filterAllTypes", "Tất cả loại sự kiện")}
              </option>
              {[
                "PROCUREMENT_COMMITTED",
                "DRYING",
                "MILLING",
                "MERGE",
                "BLENDING",
                "BAGGING",
                "HOLD",
                "HOLD_RESPONSE",
                "VARIANCE_CONFIRMATION",
                "CORRECTION_REQUEST",
                "CORRECTION",
              ].map((kind) => (
                <option key={kind} value={kind}>
                  {kind}
                </option>
              ))}
            </select>
          </div>
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
          <span className="font-mono text-[11px] text-accent-primary font-bold">
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
            Vui lòng thử điều chỉnh lại từ khóa tìm kiếm hoặc loại đối tượng.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base dark:bg-surface-raised shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-raised dark:bg-surface-overlay border-b border-ink-tertiary/15 text-ink-secondary font-semibold uppercase tracking-wider text-[11px]">
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
                      <div className="flex items-center gap-1.5 font-mono text-[11px]">
                        <Calendar size={13} className="text-ink-tertiary" />
                        <span>
                          {new Date(evt.timestamp).toLocaleString(
                            i18n.language.startsWith("en") ? "en-US" : "vi-VN",
                          )}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono text-xs font-bold text-accent-primary bg-accent-primary/10 px-2 py-0.5 rounded-md inline-block">
                        {evt.id}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-1.5">
                        {getEntityIcon(evt.entityType)}
                        <span className="font-semibold text-ink-primary text-xs">
                          {evt.entityType}:
                        </span>
                        <span className="font-mono text-[11px] text-accent-primary bg-functional-balanced-bg border border-accent-primary/20 px-1.5 py-0.5 rounded">
                          {evt.entityId}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-surface-raised dark:bg-surface-overlay border border-ink-tertiary/20 text-ink-primary">
                        {evt.eventType}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-ink-secondary truncate max-w-[150px] font-mono text-[11px]">
                      {evt.actorId}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-ink-tertiary">
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
        <span>{t("audit.events.pageNumber", "Trang {{page}}", { page })}</span>
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
