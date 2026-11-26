import { useState } from "react";
import {
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { BellIcon, ArrowClockwiseIcon } from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Link, useInRouterContext } from "react-router-dom";
import { ledgerEndpoints } from "@/api/ledger";
import { useAuthStore } from "@/app/store/authStore";
import { useUiStore } from "@/app/store/uiStore";
import { millPaths } from "@/features/mill/paths";
import { riskPaths } from "@/features/risk/paths";

export function NotificationCenter({ onOpen }: { onOpen?: () => void }) {
  const { t, i18n } = useTranslation();
  const inRouter = useInRouterContext();
  const user = useAuthStore((s) => s.user);
  const canIsolate =
    user?.role === "MILL_MANAGER" && Boolean(user.permissions.includes("holds.process"));
  const canTrace = Boolean(
    user?.permissions.some((p) => p === "trace.read.tenant" || p === "trace.read.all"),
  );
  const canStock = Boolean(
    user?.permissions.some(
      (p) => p === "lots.read.all" || p === "lots.read.facility" || p === "lots.read.tenant",
    ),
  );
  const open = useUiStore((s) => s.isNotificationsOpen);
  const setOpen = useUiStore((s) => s.setNotificationsOpen);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const cache = useQueryClient();
  const scope = [
    "notifications",
    user?.id,
    user?.organizationId,
    user?.role,
    [...(user?.permissions ?? [])].sort().join("|"),
  ];
  const unread = useQuery({
    queryKey: [...scope, "count"],
    queryFn: ({ signal }) =>
      ledgerEndpoints.getNotifications(
        { status: "UNREAD", pageSize: 1 },
        { signal },
      ),
    enabled: Boolean(user),
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: false,
    gcTime: 0,
  });
  const list = useInfiniteQuery({
    queryKey: [...scope, "list", unreadOnly],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) =>
      ledgerEndpoints.getNotifications(
        {
          page: pageParam,
          pageSize: 20,
          sortBy: "createdAt",
          sortDirection: "desc",
          status: unreadOnly ? "UNREAD" : undefined,
        },
        { signal },
      ),
    getNextPageParam: (last) => (last.hasMore ? last.page + 1 : undefined),
    enabled: Boolean(user) && open,
    staleTime: 0,
    retry: false,
    gcTime: 0,
  });
  const mark = useMutation({
    mutationFn: ledgerEndpoints.readNotification,
    onSuccess: () => cache.invalidateQueries({ queryKey: scope }),
  });
  const count = unread.data?.totalCount;
  const items = list.data?.pages.flatMap((page) => page.items) ?? [];
  const button =
    "rounded-xl px-3 py-2 text-xs font-medium hover:bg-surface-raised focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent-primary disabled:opacity-50";
  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (!open) onOpen?.();
          setOpen(!open);
        }}
        aria-expanded={open}
        aria-controls="notification-panel"
        aria-label={t("notifications.title")}
        className="relative flex h-10 w-10 items-center justify-center rounded-full text-ink-secondary hover:bg-surface-raised"
      >
        <BellIcon size={18} aria-hidden="true" />
        {count !== undefined && count > 0 && (
          <span
            aria-hidden="true"
            className="absolute -top-1 -right-1 rounded-full bg-accent-danger px-1.5 text-[10px] font-bold text-white"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>
      <span className="sr-only" role="status">
        {count !== undefined ? t("notifications.unreadCount", { count }) : ""}
      </span>
      {open && (
        <section
          id="notification-panel"
          aria-label={t("notifications.title")}
          className="fixed left-3 right-3 top-[4.5rem] z-50 rounded-2xl border border-ink-tertiary/20 bg-surface-base p-4 shadow-xl sm:absolute sm:left-auto sm:top-full sm:mt-2 sm:w-96"
        >
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-semibold text-ink-primary">
              {t("notifications.title")}
            </h2>
            <button
              type="button"
              className={button}
              aria-label={t("notifications.refresh")}
              disabled={list.isFetching}
              onClick={() => {
                void list.refetch();
                void unread.refetch();
              }}
            >
              <ArrowClockwiseIcon size={18} />
            </button>
          </div>
          <label className="my-3 flex items-center gap-2 text-sm text-ink-secondary">
            <input
              type="checkbox"
              checked={unreadOnly}
              onChange={(e) => {
                setUnreadOnly(e.target.checked);
                mark.reset();
              }}
            />
            {t("notifications.onlyUnread")}
          </label>
          {(list.isError || unread.isError) && (
            <p role="alert" className="mb-3 text-sm text-accent-danger">
              {t("notifications.loadError")}
            </p>
          )}
          {mark.isError && (
            <p role="alert" className="mb-3 text-sm text-accent-danger">
              {t("notifications.readError")}
            </p>
          )}
          {list.isPending ? (
            <p role="status">{t("notifications.loading")}</p>
          ) : !list.isError && items.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-secondary">
              {t("notifications.empty")}
            </p>
          ) : null}
          <ul className="max-h-[55vh] space-y-2 overflow-y-auto">
            {items.map((item) => (
              <li
                key={item.id}
                className={`rounded-xl border p-3 ${item.readAt ? "border-ink-tertiary/15" : "border-accent-primary/30 bg-accent-primary/5"}`}
              >
                <div className="flex items-center justify-between gap-2 text-xs text-ink-secondary">
                  <span>{item.ownerName}</span>
                  <span>
                    {t(
                      item.readAt
                        ? "notifications.read"
                        : "notifications.unread",
                    )}
                  </span>
                </div>
                <p className="my-2 break-words text-sm text-ink-primary">
                  {item.message}
                </p>
                {inRouter && item.lotId && (canIsolate || canTrace || canStock) && (
                  <div className="mb-2 flex flex-wrap gap-2 text-xs">
                    {canIsolate && (
                      <Link
                        to={`${millPaths.stockTransfer}?lotId=${encodeURIComponent(item.lotId)}${
                          item.holdId ? `&holdId=${encodeURIComponent(item.holdId)}` : ""
                        }`}
                        onClick={() => setOpen(false)}
                        className="font-semibold text-accent-danger hover:underline"
                      >
                        {i18n.language.startsWith("en")
                          ? "Open isolation for affected lot →"
                          : "Mở cách ly đúng lô →"}
                      </Link>
                    )}
                    {canTrace && (
                      <Link
                        to={`${riskPaths.traceback}?lotId=${encodeURIComponent(item.lotId)}&direction=forward`}
                        onClick={() => setOpen(false)}
                        className="font-semibold text-accent-primary hover:underline"
                      >
                        {i18n.language.startsWith("en")
                          ? "Inspect lot in traceback →"
                          : "Mở lô trong truy vết →"}
                      </Link>
                    )}
                    {!canIsolate && !canTrace && canStock && (
                      <Link
                        to={millPaths.lot.replace(":lotId", encodeURIComponent(item.lotId))}
                        onClick={() => setOpen(false)}
                        className="font-semibold text-accent-primary hover:underline"
                      >
                        {i18n.language.startsWith("en")
                          ? "Open affected stock lot →"
                          : "Mở lô tồn kho →"}
                      </Link>
                    )}
                  </div>
                )}
                <time
                  className="text-xs text-ink-tertiary"
                  dateTime={item.createdAt}
                >
                  {Number.isNaN(Date.parse(item.createdAt))
                    ? "—"
                    : new Intl.DateTimeFormat(
                        i18n.language.startsWith("en") ? "en-GB" : "vi-VN",
                        { dateStyle: "short", timeStyle: "short" },
                      ).format(new Date(item.createdAt))}
                </time>
                {!item.readAt && (
                  <button
                    type="button"
                    disabled={mark.isPending}
                    className={`${button} mt-2 block text-accent-primary`}
                    onClick={() => mark.mutate(item.id)}
                  >
                    {mark.isPending && mark.variables === item.id
                      ? t("notifications.saving")
                      : t("notifications.markRead")}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {list.hasNextPage && (
            <button
              type="button"
              className={`${button} mt-3 w-full`}
              disabled={list.isFetchingNextPage}
              onClick={() => void list.fetchNextPage()}
            >
              {t(
                list.isFetchingNextPage
                  ? "notifications.loading"
                  : "notifications.more",
              )}
            </button>
          )}
        </section>
      )}
    </>
  );
}
