import {
  ArrowsClockwise,
  ArrowUpRight,
  CalendarBlank,
  CheckCircle,
  Clock,
  Globe,
  Leaf,
  MapPin,
  ShieldCheck,
  WifiHigh,
  WifiSlash,
} from "@phosphor-icons/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useUiStore } from "@/app/store/uiStore";
import { ROLE_DEFINITIONS } from "@/shared/types/roles";
import { useDashboard } from "../model/useDashboard";
import {
  sourceCopy,
  text,
  type Locale,
  type Source,
} from "../model/dashboardConfig";
import {
  chartSource,
  getChart,
  getList,
  getMetrics,
  getPriorities,
  listSource,
  scopeNote,
} from "../model/dashboardData";
import {
  DataWarning,
  DistributionChart,
  EmptyState,
  MetricCard,
  PriorityList,
  RecentList,
  SectionHeading,
  ShortcutList,
} from "../components/DashboardWidgets";
import { dashboardPanel as panel } from "../model/dashboardStyles";

export function RoleHomePage() {
  const { i18n } = useTranslation();
  const locale: Locale = i18n.language.startsWith("en") ? "en" : "vi";
  const dashboard = useDashboard();
  const {
    user,
    role,
    config,
    data,
    states,
    sources,
    needsFacility,
    facilityId,
    facilities,
    facilityError,
    facilityLoading,
    fetching,
    updatedAt,
  } = dashboard;
  const connected = useUiStore((state) => state.isBackendConnected);
  const connectionChecked = useUiStore((state) => state.hasInitialChecked);
  const pending = useUiStore((state) => state.pendingOfflineCount);
  const now = new Date();
  const metrics = getMetrics(role, data, locale, pending, now);
  const bars = getChart(role, data, locale, now);
  const priorities = getPriorities(role, data, locale, pending, now);
  const list = getList(role, data, locale);
  const mainSource = chartSource(role),
    recordsSource = listSource(role);
  const shortcuts = config.shortcuts.filter(
    (shortcut) =>
      !shortcut.permissions ||
      shortcut.permissions.some((permission) =>
        user?.permissions.includes(permission),
      ),
  );
  const errors = sources.filter((source) => states[source]?.error);
  const missingFacility = needsFacility && !facilityId;
  const uncertain =
    missingFacility ||
    errors.length > 0 ||
    fetching ||
    sources.length < config.sources.length;
  const meta = ROLE_DEFINITIONS[role];
  const date = new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(now);
  function unavailable(source: Source): string | undefined {
    if (!sources.includes(source))
      return text(
        ["Chưa có quyền xem dữ liệu này", "Access has not been granted"],
        locale,
      );
    if (missingFacility)
      return text(
        ["Chọn cơ sở để xem dữ liệu", "Select a facility to view data"],
        locale,
      );
    if (states[source]?.error)
      return text(
        [
          "Nguồn dữ liệu chưa cập nhật được",
          "This data source could not be refreshed",
        ],
        locale,
      );
    return undefined;
  }
  const loadingCopy = text(
    ["Đang tổng hợp dữ liệu", "Loading your overview"],
    locale,
  );

  return (
    <div className="mx-auto max-w-screen-2xl space-y-6 pb-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div data-ui-detail="secondary" className="flex flex-wrap items-center gap-2 text-xs text-ink-tertiary">
          <span className="font-semibold text-accent-primary">
            {text(["BÀN ĐIỀU HÀNH", "WORKSPACE OVERVIEW"], locale)}
          </span>
          <span aria-hidden="true">/</span>
          <span>{meta[locale === "vi" ? "labelVi" : "labelEn"]}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-ink-secondary">
          <CalendarBlank size={15} aria-hidden="true" />
          <time dateTime={now.toISOString()} className="capitalize">
            {date}
          </time>
        </div>
      </header>

      <section
        className={`${panel} relative overflow-hidden bg-gradient-to-br from-accent-primary/10 via-surface-base to-surface-base p-6 sm:p-8`}
        aria-labelledby="dashboard-title"
      >
        <div
          aria-hidden="true"
          data-ui-detail="secondary"
          className="pointer-events-none absolute -right-16 -top-24 h-80 w-80 rounded-full border-[40px] border-accent-primary/5"
        />
        <div className="relative flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div className="max-w-2xl">
            <div data-ui-detail="secondary" className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent-primary/15 bg-surface-base/80 px-3 py-1.5 text-xs font-semibold text-accent-primary">
              <Leaf size={15} weight="duotone" aria-hidden="true" />
              {text(config.focus, locale)}
            </div>
            <p data-ui-detail="secondary" className="mb-1 text-sm text-ink-secondary">
              {text(["Xin chào", "Welcome"], locale)},{" "}
              <span className="font-semibold text-ink-primary">
                {user?.displayName || text(["bạn", "there"], locale)}
              </span>
            </p>
            <h1
              id="dashboard-title"
              className="font-display text-3xl font-bold leading-tight tracking-tight text-ink-primary sm:text-4xl"
            >
              {text(config.title, locale)}
            </h1>
            <p data-ui-detail="secondary" className="mt-3 max-w-xl text-sm leading-6 text-ink-secondary">
              {text(config.description, locale)}
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-ink-tertiary">
              <span className="inline-flex items-center gap-1.5">
                <Globe size={14} aria-hidden="true" />
                {user?.organizationName ||
                  text(
                    ["Theo phạm vi tài khoản", "Your account scope"],
                    locale,
                  )}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={14} aria-hidden="true" />
                {text(
                  ["Dữ liệu theo quyền truy cập", "Access-scoped data"],
                  locale,
                )}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 flex-col items-start gap-3 lg:items-end">
            {shortcuts[0] && (
              <Link
                to={shortcuts[0].path}
                className="inline-flex min-h-11 items-center justify-center gap-3 rounded-full bg-accent-primary px-5 py-3 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-accent-primary-dim"
              >
                {text(shortcuts[0].label, locale)}
                <ArrowUpRight size={18} aria-hidden="true" />
              </Link>
            )}
            <span
              className={`inline-flex items-center gap-1.5 text-xs ${connected ? "text-accent-primary" : "text-ink-tertiary"}`}
            >
              {connected ? (
                <WifiHigh size={15} aria-hidden="true" />
              ) : (
                <WifiSlash size={15} aria-hidden="true" />
              )}
              {text(
                !connectionChecked
                  ? ["Đang kiểm tra kết nối", "Checking connection"]
                  : connected
                    ? ["Đã kết nối hệ thống", "System connected"]
                    : ["Chưa kết nối hệ thống", "System not connected"],
                locale,
              )}
            </span>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-sm font-bold text-ink-primary">
            {text(["Tình hình hiện tại", "At a glance"], locale)}
          </h2>
          {needsFacility && (
            <div className="flex items-center gap-2">
              <MapPin
                size={16}
                className="text-accent-primary"
                aria-hidden="true"
              />
              <label className="sr-only" htmlFor="dashboard-facility">
                {text(["Cơ sở vận hành", "Facility"], locale)}
              </label>
              <select
                id="dashboard-facility"
                value={facilityId ?? ""}
                disabled={facilityLoading || !facilities.length}
                onChange={(event) =>
                  dashboard.setSelectedFacility(event.target.value)
                }
                className="min-h-11 max-w-full rounded-full border border-ink-tertiary/20 bg-surface-base px-3 py-2 text-xs text-ink-primary sm:max-w-xs"
              >
                <option value="" disabled>
                  {text(["Chọn cơ sở vận hành", "Select a facility"], locale)}
                </option>
                {facilities.map((facility) => (
                  <option key={facility.id} value={facility.id}>
                    {facility.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-ink-tertiary sm:inline-flex sm:items-center sm:gap-1.5">
            <Clock size={13} aria-hidden="true" />
            {updatedAt
              ? `${text(["Cập nhật", "Updated"], locale)} ${new Intl.DateTimeFormat(locale === "vi" ? "vi-VN" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Ho_Chi_Minh" }).format(updatedAt)}`
              : text(["Chưa cập nhật đầy đủ", "Not fully updated"], locale)}
          </span>
          <button
            type="button"
            onClick={() => void dashboard.refresh()}
            disabled={fetching}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-ink-tertiary/20 bg-surface-base px-4 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised disabled:opacity-50"
          >
            <ArrowsClockwise
              size={16}
              className={fetching ? "motion-safe:animate-spin" : undefined}
              aria-hidden="true"
            />
            {text(
              fetching
                ? ["Đang cập nhật…", "Refreshing…"]
                : ["Làm mới", "Refresh"],
              locale,
            )}
          </button>
        </div>
      </div>
      {missingFacility && !facilityLoading && (
        <DataWarning>
          <span>
            {facilityError
              ? facilityError.message
              : text(
                  [
                    "Chưa có cơ sở vận hành được phân công. Cần chọn hoặc được cấp quyền tại một cơ sở để xem số liệu.",
                    "No assigned facility is available. A facility assignment is required to load operational data.",
                  ],
                  locale,
                )}
          </span>
        </DataWarning>
      )}
      {errors.length > 0 && (
        <details className="rounded-xl border border-accent-warning/25 bg-accent-warning/5 p-4 text-xs text-accent-warning">
          <summary className="cursor-pointer font-semibold">
            {text(
              [
                `${errors.length} nguồn dữ liệu chưa cập nhật được`,
                `${errors.length} data sources could not be refreshed`,
              ],
              locale,
            )}
          </summary>
          <ul className="mt-3 space-y-2">
            {errors.map((source) => (
              <li key={source}>
                <strong>{text(sourceCopy[source], locale)}:</strong>{" "}
                {states[source]?.error?.message}
              </li>
            ))}
          </ul>
        </details>
      )}
      {!connected && connectionChecked && (
        <DataWarning>
          <span>
            {text(
              [
                "Kết nối hệ thống chưa sẵn sàng. Số liệu đã tải có thể chưa phản ánh thay đổi mới nhất.",
                "The system connection is unavailable. Previously loaded figures may not reflect the latest changes.",
              ],
              locale,
            )}
          </span>
        </DataWarning>
      )}

      <section
        aria-label={text(["Chỉ số tổng quan", "Overview metrics"], locale)}
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
      >
        {metrics.map((metric) => (
          <MetricCard
            key={metric.label[0]}
            metric={metric}
            locale={locale}
            loading={Boolean(
              metric.source && states[metric.source]?.pending && fetching,
            )}
            unavailable={metric.source ? unavailable(metric.source) : undefined}
          />
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-12">
        <section className={`${panel} p-5 sm:p-6 xl:col-span-7`}>
          <SectionHeading
            title={text(config.chartTitle, locale)}
            eyebrow={text(["Góc nhìn dữ liệu", "Data perspective"], locale)}
            action={
              <span className="rounded-full bg-surface-raised px-3 py-1.5 text-xs font-medium text-ink-secondary dark:bg-surface-overlay/40">
                {text(sourceCopy[mainSource], locale)}
              </span>
            }
          />
          <p className="mb-6 mt-2 text-xs leading-5 text-ink-tertiary">
            {unavailable(mainSource) ?? scopeNote(data[mainSource], locale)}
            {role === "CUSTOMER_PROCUREMENT_OFFICER" &&
              ` · ${text(["Phân theo ngày nhận, giờ Việt Nam", "Grouped by received date, Vietnam time"], locale)}`}
          </p>
          {!data[mainSource] ? (
            <EmptyState
              title={
                fetching
                  ? loadingCopy
                  : text(
                      ["Chưa có số liệu để hiển thị", "No figures available"],
                      locale,
                    )
              }
              detail={
                unavailable(mainSource) ??
                text(
                  [
                    "Dữ liệu sẽ xuất hiện sau khi tải xong.",
                    "Figures will appear after loading.",
                  ],
                  locale,
                )
              }
              loading={fetching}
            />
          ) : !bars.length ? (
            <EmptyState
              title={text(["Chưa phát sinh dữ liệu", "No records yet"], locale)}
              detail={text(
                [
                  "Biểu đồ được tạo từ các bản ghi thực tế trong phạm vi tài khoản.",
                  "This chart uses actual records within your account scope.",
                ],
                locale,
              )}
            />
          ) : (
            <DistributionChart bars={bars} locale={locale} />
          )}
        </section>
        <section className={`${panel} p-5 sm:p-6 xl:col-span-5`}>
          <SectionHeading
            title={text(["Cần bạn chú ý", "Needs your attention"], locale)}
            eyebrow={text(["Ưu tiên xử lý", "Your priorities"], locale)}
            action={
              <span className="flex h-7 min-w-7 items-center justify-center rounded-full bg-accent-warning/10 px-2 text-xs font-bold text-accent-warning">
                {priorities.length}
              </span>
            }
          />
          <p className="mt-2 text-xs leading-5 text-ink-tertiary">
            {text(
              [
                "Tổng hợp từ dữ liệu đã tải trong phạm vi hiện tại.",
                "Compiled from loaded records in the current scope.",
              ],
              locale,
            )}
          </p>
          <PriorityList
            items={priorities}
            locale={locale}
            uncertain={uncertain}
          />
        </section>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-12">
        <section className={`${panel} min-w-0 overflow-hidden xl:col-span-8`}>
          <div className="p-5 sm:p-6">
            <SectionHeading
              title={text(config.listTitle, locale)}
              eyebrow={text(
                ["Theo dõi nghiệp vụ", "Business activity"],
                locale,
              )}
              action={
                <span className="text-xs text-ink-tertiary">
                  {data[recordsSource]
                    ? scopeNote(data[recordsSource], locale)
                    : "—"}
                </span>
              }
            />
          </div>
          {list.length ? (
            <RecentList
              items={list}
              locale={locale}
              sourceLabel={text(config.listTitle, locale)}
            />
          ) : (
            <EmptyState
              title={
                fetching
                  ? loadingCopy
                  : text(["Chưa có bản ghi", "No records to show"], locale)
              }
              detail={
                unavailable(recordsSource) ??
                text(
                  [
                    "Các bản ghi sẽ xuất hiện tại đây khi có dữ liệu.",
                    "Records will appear here when available.",
                  ],
                  locale,
                )
              }
              loading={fetching}
            />
          )}
          {list.length > 0 && (
            <div className="flex items-center gap-1.5 border-t border-ink-tertiary/10 px-5 py-3 text-xs text-ink-tertiary">
              <CheckCircle
                size={14}
                className="text-accent-primary"
                aria-hidden="true"
              />
              {text(
                [
                  "Hiển thị tối đa 6 bản ghi từ dữ liệu đã tải",
                  "Showing up to 6 records from loaded data",
                ],
                locale,
              )}
            </div>
          )}
        </section>
        <aside
          className={`${panel} p-5 sm:p-6 xl:col-span-4`}
          aria-label={text(["Truy cập nhanh", "Quick access"], locale)}
        >
          <SectionHeading
            title={text(["Bắt đầu công việc", "Start a task"], locale)}
            eyebrow={text(["Truy cập nhanh", "Quick access"], locale)}
          />
          <div className="mt-3 -mx-2">
            {shortcuts.length ? (
              <ShortcutList items={shortcuts} locale={locale} />
            ) : (
              <EmptyState
                title={text(
                  ["Chưa có quyền tác nghiệp", "No task access assigned"],
                  locale,
                )}
                detail={text(
                  [
                    "Liên hệ quản trị viên để được cấp quyền phù hợp.",
                    "Contact an administrator for the appropriate access.",
                  ],
                  locale,
                )}
              />
            )}
          </div>
        </aside>
      </div>
      <footer className="flex flex-wrap items-center justify-between gap-2 px-1 text-xs leading-5 text-ink-tertiary">
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={14} aria-hidden="true" />
          {text(
            [
              "Chỉ hiển thị dữ liệu trong phạm vi được cấp quyền",
              "Only data within your authorized scope is shown",
            ],
            locale,
          )}
        </span>
        <span>
          {text(
            [
              "Khối lượng tính theo kg · Giờ Việt Nam (UTC+7)",
              "Mass in kg · Vietnam time (UTC+7)",
            ],
            locale,
          )}
        </span>
      </footer>
    </div>
  );
}
