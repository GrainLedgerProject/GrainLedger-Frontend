import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  ClockCounterClockwise,
  MagnifyingGlass,
  Package,
  PencilSimple,
  Plus,
  Scales,
  ShieldCheck,
  Trash,
  Truck,
  WarningCircle,
  X,
} from "@phosphor-icons/react";
import {
  containerPreparationEndpoints as preparation,
  type ContainerPreparation,
  type PreparationLine,
} from "@/api/containerPreparation";
import { ledgerEndpoints, type SetupApiResponse } from "@/api/ledger";
import { pageItems } from "@/api/query";
import { useAuthStore } from "@/app/store/authStore";
import { GrainLoader } from "@/shared/ui/GrainLoader";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { Feedback } from "@/shared/ui/Workflow";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { ContainerCommandFeedback } from "../components/ContainerCommandFeedback";
import {
  ExportEmpty,
  ExportIconField,
  ExportPageHeader,
  ExportSearch,
  ExportSection,
  ExportStat,
} from "../components/ExportWorkspaceUI";
import { useContainerCommand } from "../hooks/useContainerCommand";
import { containerStatus, massLabel, sumMass } from "../model/exportPresentation";
import { exportPaths } from "../paths";

const pageSize = 25;
const massPattern = String.raw`[0-9]{1,14}(\.[0-9]{1,6})?`;
const blankLine = (): PreparationLine => ({ lotId: "", locationId: "", quantityKg: "" });

const inputClass =
  "w-full px-3 py-2 text-xs rounded-lg bg-surface-raised dark:bg-surface-base border border-ink-tertiary/20 text-ink-primary focus:border-accent-primary focus:outline-none transition-colors";
const labelClass = "block text-xs font-semibold text-ink-secondary mb-1.5";
const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-accent-primary bg-accent-primary px-4 py-2 text-xs font-semibold text-ink-inverse shadow-xs transition-colors hover:bg-accent-primary-dim disabled:cursor-not-allowed disabled:opacity-50";
const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-ink-tertiary/25 bg-surface-base px-4 py-2 text-xs font-semibold text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary disabled:cursor-not-allowed disabled:opacity-50 dark:bg-surface-raised";

export function ContainerPreparationPage() {
  const text = useWorkflowText();
  const locale: "vi" | "en" = text("vi", "en") === "en" ? "en" : "vi";
  const user = useAuthStore((state) => state.user);
  const cache = useQueryClient();
  const canWrite =
    user?.role === "CUSTOMER_EXPORT_OFFICER" &&
    user.permissions.includes("containers.write");
  const canAccessExportContainers =
    user?.role === "CUSTOMER_EXPORT_OFFICER" ||
    user?.role === "CUSTOMER_MANAGER";
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const list = useQuery({
    queryKey: ["container-preparation", user?.id, page, search],
    queryFn: () => preparation.list({ page, pageSize, search: search.trim() }),
  });

  const lookups = useQuery({
    queryKey: ["container-preparation-lookups", user?.id],
    queryFn: async () => (await ledgerEndpoints.getLookups()) as SetupApiResponse,
    enabled: Boolean(canWrite),
  });

  const items = list.data?.items ?? [];
  const totalCount = list.data?.totalCount ?? items.length;
  const pageTargetTotal = sumMass(items.map((item) => item.targetKg));
  const refreshing = list.isFetching || lookups.isFetching;

  return (
    <div className="text-ink-primary [container:workspace/inline-size] space-y-6 pb-8">
      <ExportPageHeader
        eyebrow={text(
          "CHUẨN BỊ CONTAINER & BẢN NHÁP XẾP HÀNG",
          "CONTAINER PREPARATION & LOADING DRAFTS",
        )}
        title={text("Chuẩn bị container", "Container preparation")}
        subtitle={text(
          "Lập và kiểm tra bản nháp chuẩn bị. Thực xếp và đóng niêm được ghi tại quy trình Xuất khẩu đã có phê duyệt.",
          "Prepare and check loading drafts. Record actual loading and closure through approved Export execution.",
        )}
        refresh={() => {
          void list.refetch();
          if (canWrite) void lookups.refetch();
        }}
        refreshing={refreshing}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {canAccessExportContainers && (
              <Link to={exportPaths.containers} className={secondaryButtonClass}>
                <Truck size={15} aria-hidden="true" />
                <span>{text("Container xuất khẩu", "Export containers")}</span>
              </Link>
            )}
            {canWrite && (
              <button
                type="button"
                aria-expanded={createOpen}
                onClick={() => setCreateOpen(!createOpen)}
                className={primaryButtonClass}
              >
                {createOpen ? (
                  <X size={15} aria-hidden="true" />
                ) : (
                  <Plus size={15} weight="bold" aria-hidden="true" />
                )}
                <span>{text("Tạo bản chuẩn bị", "Create preparation")}</span>
              </button>
            )}
          </div>
        }
      />

      {list.data && (
        <div className="grid gap-4 sm:grid-cols-3">
          <ExportStat
            label={text("Bản chuẩn bị", "Preparations")}
            value={totalCount}
            detail={text(
              `Hiển thị ${items.length} mục ở trang ${page}`,
              `Showing ${items.length} entries on page ${page}`,
            )}
            icon={<Package size={18} />}
          />
          <ExportStat
            label={text("Khối lượng mục tiêu (trang)", "Page target mass")}
            value={`${massLabel(pageTargetTotal, locale)} kg`}
            detail={text(
              "Tổng chỉ tiêu của các container đang hiển thị",
              "Sum of target mass for listed containers",
            )}
            icon={<Scales size={18} />}
            accent
          />
          <ExportStat
            label={text("Đang chọn", "Active selection")}
            value={
              items.find((item) => item.id === selected)?.code ??
              (selected ? selected.slice(0, 8) : "—")
            }
            detail={text(
              "Chọn một container ở danh sách để kiểm tra & sửa nháp",
              "Pick a container from the list to inspect & draft loads",
            )}
            icon={<ShieldCheck size={18} />}
          />
        </div>
      )}

      {canWrite && createOpen && (
        <CreatePreparation
          lookups={lookups.data}
          error={lookups.error}
          onClose={() => setCreateOpen(false)}
          onSaved={async (id) => {
            setSelected(id);
            setCreateOpen(false);
            await cache.invalidateQueries({ queryKey: ["container-preparation"] });
          }}
        />
      )}

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(18rem,23rem)_minmax(0,1fr)]">
        <ExportSection
          title={text("Danh sách chuẩn bị", "Preparation list")}
          description={text(
            "Tìm theo mã container hoặc chọn hồ sơ để xem chi tiết.",
            "Search by container code or pick a record to inspect.",
          )}
        >
          <ExportSearch
            label={text("Tìm mã container", "Find container code")}
            value={search}
            onChange={(value) => {
              setSearch(value);
              setPage(1);
            }}
            placeholder={text("Nhập mã container...", "Search container code...")}
          />

          <Feedback error={list.error} />

          {list.isPending ? (
            <div className="flex justify-center py-10">
              <GrainLoader
                label={text("Đang tải danh sách chuẩn bị...", "Loading preparations...")}
              />
            </div>
          ) : items.length === 0 ? (
            <ExportEmpty
              title={text(
                "Không có container trong phạm vi truy cập.",
                "No containers in this scope.",
              )}
              description={text(
                "Thử từ khóa khác hoặc tạo bản chuẩn bị container mới.",
                "Try another search term or create a new preparation record.",
              )}
              action={
                canWrite && !createOpen ? (
                  <button
                    type="button"
                    onClick={() => setCreateOpen(true)}
                    className={primaryButtonClass}
                  >
                    <Plus size={15} weight="bold" aria-hidden="true" />
                    <span>{text("Tạo bản chuẩn bị", "Create preparation")}</span>
                  </button>
                ) : undefined
              }
            />
          ) : (
            <ul className="space-y-2">
              {items.map((item) => {
                const isSelected = selected === item.id;
                const badge = containerStatus(item.status);
                return (
                  <li key={item.id}>
                    <button
                      type="button"
                      aria-pressed={isSelected}
                      onClick={() => setSelected(item.id)}
                      className={`w-full rounded-xl border p-3.5 text-start transition-all ${
                        isSelected
                          ? "border-accent-primary bg-accent-primary/5 ring-1 ring-accent-primary/30"
                          : "border-ink-tertiary/20 bg-surface-raised/40 hover:border-accent-primary/40 hover:bg-surface-raised"
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-ink-primary">
                          {item.code}
                        </span>
                        <StatusBadge
                          status={badge.type}
                          label={text(...badge.label)}
                          size="sm"
                        />
                      </div>
                      <p className="mt-1.5 font-mono text-xs text-ink-secondary">
                        {massLabel(item.targetKg, locale)} kg
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-tertiary/15 pt-3 text-xs text-ink-secondary">
            <span className="font-mono">
              {text("Trang", "Page")} {page}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page === 1 || list.isFetching}
                onClick={() => setPage(page - 1)}
                className={secondaryButtonClass}
              >
                {text("Trang trước", "Previous page")}
              </button>
              <button
                type="button"
                disabled={!list.data?.hasMore || list.isFetching}
                onClick={() => setPage(page + 1)}
                className={secondaryButtonClass}
              >
                {text("Trang sau", "Next page")}
              </button>
            </div>
          </div>
        </ExportSection>

        <div className="min-w-0">
          {selected ? (
            <PreparationDetail
              key={selected}
              id={selected}
              canWrite={Boolean(canWrite)}
            />
          ) : (
            <div className="rounded-2xl border border-ink-tertiary/20 bg-surface-base p-6 shadow-xs dark:bg-surface-raised">
              <ExportEmpty
                title={text(
                  "Chọn container chuẩn bị để xem chi tiết",
                  "Select a container preparation to inspect",
                )}
                description={text(
                  "Chọn một bản chuẩn bị ở danh sách bên cạnh để cập nhật số container/seal, lập bản nháp xếp hàng hoặc chạy kiểm tra trước đóng niêm.",
                  "Choose an item from the list to edit container/seal metadata, manage loading drafts, or run pre-closure readiness checks.",
                )}
                icon={<Truck size={28} />}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreatePreparation({
  lookups,
  error,
  onClose,
  onSaved,
}: {
  lookups?: SetupApiResponse;
  error: Error | null;
  onClose: () => void;
  onSaved: (id: string) => Promise<void>;
}) {
  const text = useWorkflowText();
  const [draftId] = useState(() => crypto.randomUUID());
  const [code, setCode] = useState("");
  const [facility, setFacility] = useState("");
  const [target, setTarget] = useState("");
  const command = useContainerCommand(
    async (
      requestId,
      input: { id: string; code: string; facilityId: string; targetKg: string },
    ) => {
      await preparation.create({ ...input, requestId });
      await onSaved(input.id);
    },
    () => {},
    { persistKey: "container-prep:create" },
  );

  return (
    <ExportSection
      title={text("Tạo bản chuẩn bị container", "Create container preparation")}
      description={text(
        "Khai báo mã nội bộ, cơ sở xếp hàng và khối lượng mục tiêu ban đầu.",
        "Enter the internal code, loading facility, and initial target mass.",
      )}
      actions={
        <button type="button" onClick={onClose} className={secondaryButtonClass}>
          <X size={14} aria-hidden="true" />
          <span>{text("Đóng", "Close")}</span>
        </button>
      }
    >
      <Feedback error={error} pending={!lookups && !error} />
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (code.trim() && /[1-9]/.test(target)) {
            command.submit({
              id: draftId,
              code: code.trim(),
              facilityId: facility,
              targetKg: target,
            });
          }
        }}
        className="space-y-4"
      >
        <fieldset
          className="grid gap-4 sm:grid-cols-3"
          disabled={!lookups || command.isPending || command.uncertain}
        >
          <div>
            <label className={labelClass}>
              {text("Mã nội bộ", "Internal code")}
              <input
                required
                maxLength={80}
                value={code}
                onChange={(event) => setCode(event.target.value)}
                placeholder="VD: CT-PREP-001"
                className={`${inputClass} mt-1 font-mono`}
              />
            </label>
          </div>
          <div>
            <label className={labelClass}>
              {text("Cơ sở xếp hàng", "Loading facility")}
              <select
                required
                value={facility}
                onChange={(event) => setFacility(event.target.value)}
                className={`${inputClass} mt-1`}
              >
                <option value="">{text("Chọn cơ sở", "Select facility")}</option>
                {lookups?.facilities?.map((item) => (
                  <option value={item.id} key={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <label className={labelClass}>
              {text("Khối lượng mục tiêu (kg)", "Target mass (kg)")}
              <input
                inputMode="decimal"
                pattern={massPattern}
                required
                value={target}
                onChange={(event) => setTarget(event.target.value)}
                placeholder="25000"
                className={`${inputClass} mt-1 font-mono`}
              />
            </label>
          </div>
          <div className="sm:col-span-3 flex justify-end border-t border-ink-tertiary/15 pt-3">
            <button
              type="submit"
              disabled={!code.trim() || !/[1-9]/.test(target)}
              className={primaryButtonClass}
            >
              <Plus size={15} weight="bold" aria-hidden="true" />
              <span>
                {command.isPending
                  ? text("Đang tạo...", "Creating...")
                  : text("Tạo", "Create")}
              </span>
            </button>
          </div>
        </fieldset>
      </form>
      <ContainerCommandFeedback
        error={command.error}
        uncertain={command.uncertain}
        retry={command.retry}
        success={command.isSuccess}
        isPending={command.isPending}
        restoredPending={command.restoredPending}
        discardPending={command.discardPending}
      />
    </ExportSection>
  );
}

type PreparationCommand =
  | {
      action: "metadata";
      body: Omit<Parameters<typeof preparation.updateMetadata>[1], "requestId">;
    }
  | {
      action: "draft";
      body: Omit<Parameters<typeof preparation.saveDraft>[1], "requestId">;
    };

function PreparationDetail({ id, canWrite }: { id: string; canWrite: boolean }) {
  const text = useWorkflowText();
  const locale: "vi" | "en" = text("vi", "en") === "en" ? "en" : "vi";
  const cache = useQueryClient();
  const [historyPage, setHistoryPage] = useState(1);
  const [checkKey, setCheckKey] = useState<{
    draftId?: string;
    index: number;
  } | null>(null);

  const current = useQuery({
    queryKey: ["preparation-detail", id],
    queryFn: () => preparation.detail(id),
  });
  const history = useQuery({
    queryKey: ["preparation-history", id, historyPage],
    queryFn: () => preparation.history(id, { page: historyPage, pageSize }),
  });
  const check = useQuery({
    queryKey: ["preparation-check", id, current.data?.version, checkKey],
    queryFn: () =>
      checkKey?.draftId
        ? preparation.checkLoading(id, checkKey.draftId)
        : preparation.checkClosure(id),
    enabled: Boolean(checkKey),
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  const command = useContainerCommand<PreparationCommand>(
    (requestId, input) =>
      input.action === "metadata"
        ? preparation.updateMetadata(id, { ...input.body, requestId })
        : preparation.saveDraft(id, { ...input.body, requestId }),
    async () => {
      setCheckKey(null);
      await Promise.all([
        cache.invalidateQueries({ queryKey: ["container-preparation"] }),
        cache.invalidateQueries({ queryKey: ["preparation-detail", id] }),
        cache.invalidateQueries({ queryKey: ["preparation-history", id] }),
      ]);
    },
    { persistKey: `container-prep:${id}` },
  );

  const data = current.data;
  const runCheck = (draftId?: string) =>
    setCheckKey((previous) => ({
      draftId,
      index: (previous?.index ?? 0) + 1,
    }));
  const blocked = current.isFetching || command.isPending || command.uncertain;
  const badge = data ? containerStatus(data.status) : null;

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-ink-tertiary/20 bg-surface-base p-5 shadow-xs dark:bg-surface-raised space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-ink-tertiary/15 pb-4">
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-primary/10 text-accent-primary">
              <Package size={22} />
            </span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
                {text("Hồ sơ chuẩn bị container", "Preparation record")}
              </p>
              <h2 className="font-display text-lg font-bold text-ink-primary font-mono">
                {data?.code ?? text("Chi tiết chuẩn bị", "Preparation detail")}
              </h2>
            </div>
          </div>

          {data && badge && (
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge
                status={badge.type}
                label={text(...badge.label)}
                size="sm"
              />
              <span className="rounded-full border border-ink-tertiary/20 bg-surface-raised px-2.5 py-0.5 font-mono text-[11px] text-ink-secondary">
                v{data.version}
              </span>
            </div>
          )}
        </div>

        <Feedback error={current.error} />

        {current.isPending && (
          <div className="flex justify-center py-8">
            <GrainLoader label={text("Đang tải chi tiết...", "Loading detail...")} />
          </div>
        )}

        {data && (
          <div className="space-y-5">
            <dl className="grid gap-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/50 p-4 text-xs sm:grid-cols-4">
              <div>
                <dt className="text-[11px] text-ink-secondary">
                  {text("Trạng thái", "Status")}
                </dt>
                <dd className="mt-1 font-semibold text-ink-primary">
                  {data.status}
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink-secondary">
                  {text("Mục tiêu", "Target")}
                </dt>
                <dd className="mt-1 font-mono font-bold text-ink-primary">
                  {massLabel(data.targetKg, locale)} kg
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink-secondary">
                  {text("Đã xếp cam kết", "Committed loaded")}
                </dt>
                <dd className="mt-1 font-mono font-semibold text-ink-primary">
                  {massLabel(data.committedLoadedKg, locale)} kg
                </dd>
              </div>
              <div>
                <dt className="text-[11px] text-ink-secondary">
                  {text("Còn lại", "Remaining")}
                </dt>
                <dd className="mt-1 font-mono font-semibold text-accent-primary">
                  {massLabel(data.remainingKg, locale)} kg
                </dd>
              </div>
            </dl>

            {canWrite && (
              <PreparationForms
                key={data.version}
                data={data}
                disabled={blocked}
                submit={command.submit}
              />
            )}

            <ContainerCommandFeedback
              error={command.error}
              uncertain={command.uncertain}
              retry={command.retry}
              success={command.isSuccess}
              isPending={command.isPending}
              restoredPending={command.restoredPending}
              discardPending={command.discardPending}
            />

            {/* Drafts & Readiness Check Section */}
            <div className="space-y-3 border-t border-ink-tertiary/15 pt-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="flex items-center gap-2 font-display text-sm font-bold text-ink-primary">
                  <ShieldCheck size={18} className="text-accent-primary" />
                  <span>
                    {text(
                      "Danh sách bản nháp & Kiểm tra điều kiện",
                      "Loading drafts & Readiness checks",
                    )}
                  </span>
                </h3>
                <button
                  type="button"
                  disabled={check.isFetching || blocked}
                  onClick={() => runCheck()}
                  className={primaryButtonClass}
                >
                  <ShieldCheck size={15} aria-hidden="true" />
                  <span>
                    {text("Kiểm tra trước đóng niêm", "Check before closure")}
                  </span>
                </button>
              </div>

              {data.drafts.length === 0 ? (
                <p className="rounded-xl border border-dashed border-ink-tertiary/20 py-4 text-center text-xs text-ink-secondary">
                  {text("Chưa có bản nháp xếp hàng nào.", "No loading drafts saved yet.")}
                </p>
              ) : (
                <ul className="space-y-2">
                  {data.drafts.map((item) => (
                    <li
                      key={item.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-ink-tertiary/15 bg-surface-raised/40 px-3.5 py-2.5 text-xs"
                    >
                      <div className="space-y-0.5">
                        <p className="font-mono font-semibold text-ink-primary">
                          {new Date(item.loadedAt).toLocaleString()} ·{" "}
                          {massLabel(item.totalKg, locale)} kg
                        </p>
                        <p className="text-[11px] text-ink-secondary">
                          {item.lines.length}{" "}
                          {text("dòng phân bổ", "allocation lines")}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={check.isFetching || blocked}
                        onClick={() => runCheck(item.id)}
                        className={secondaryButtonClass}
                      >
                        <CheckCircle size={14} aria-hidden="true" />
                        <span>
                          {text("Kiểm tra bản nháp", "Check loading draft")}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              <Feedback error={check.error} pending={check.isFetching} />

              {check.data && (
                <div
                  className={`rounded-xl border p-4 text-xs space-y-2 ${
                    check.data.ready
                      ? "border-functional-balanced-border bg-functional-balanced-bg/40"
                      : "border-functional-stale-border bg-functional-stale-bg/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-semibold text-ink-primary">
                      {check.data.ready ? (
                        <CheckCircle
                          size={16}
                          weight="fill"
                          className="text-accent-primary"
                        />
                      ) : (
                        <WarningCircle
                          size={16}
                          weight="fill"
                          className="text-accent-warning"
                        />
                      )}
                      <span>
                        {check.data.scope === "CLOSURE"
                          ? text("Kết quả kiểm tra trước đóng niêm", "Pre-closure check result")
                          : text("Kết quả kiểm tra bản nháp", "Draft check result")}
                      </span>
                    </div>
                    <StatusBadge
                      status={check.data.ready ? "COMPLIANT" : "STALE"}
                      label={
                        check.data.ready
                          ? text("Sẵn sàng", "Ready")
                          : text("Chưa đạt", "Not ready")
                      }
                      size="sm"
                    />
                  </div>
                  {check.data.findings.length > 0 && (
                    <ul className="list-disc space-y-1 ps-5 text-ink-primary">
                      {check.data.findings.map((finding) => (
                        <li key={finding.code}>{finding.message}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Preparation History */}
        <details className="rounded-xl border border-ink-tertiary/20 bg-surface-raised/30 p-4 text-xs">
          <summary className="flex cursor-pointer items-center gap-2 font-semibold text-ink-primary">
            <ClockCounterClockwise size={16} className="text-accent-primary" />
            <span>{text("Lịch sử chuẩn bị", "Preparation history")}</span>
          </summary>
          <div className="mt-3 space-y-3 border-t border-ink-tertiary/15 pt-3">
            <Feedback error={history.error} pending={history.isPending} />
            {history.data?.items.length === 0 ? (
              <p className="text-ink-secondary">
                {text("Chưa có sự kiện chuẩn bị.", "No history recorded yet.")}
              </p>
            ) : (
              <ul className="divide-y divide-ink-tertiary/15">
                {history.data?.items.map((event) => (
                  <li
                    key={event.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2"
                  >
                    <span className="font-mono font-semibold text-ink-primary">
                      {event.kind}
                    </span>
                    <span className="text-ink-secondary">
                      {new Date(event.recorded_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={historyPage === 1 || history.isFetching}
                onClick={() => setHistoryPage(historyPage - 1)}
                className={secondaryButtonClass}
              >
                {text("Trang trước", "Previous page")}
              </button>
              <button
                type="button"
                disabled={!history.data?.hasMore || history.isFetching}
                onClick={() => setHistoryPage(historyPage + 1)}
                className={secondaryButtonClass}
              >
                {text("Trang sau", "Next page")}
              </button>
            </div>
          </div>
        </details>
      </section>
    </div>
  );
}

function PreparationForms({
  data,
  disabled,
  submit,
}: {
  data: ContainerPreparation;
  disabled: boolean;
  submit: (input: PreparationCommand) => void;
}) {
  const text = useWorkflowText();
  const [number, setNumber] = useState(data.containerNumber ?? "");
  const [seal, setSeal] = useState(data.sealNumber ?? "");
  const [draftId, setDraftId] = useState<string>(() => crypto.randomUUID());
  const [loadedAt, setLoadedAt] = useState("");
  const [lines, setLines] = useState<PreparationLine[]>([blankLine()]);
  const [draftOpen, setDraftOpen] = useState(false);
  const [search, setSearch] = useState("");

  const lots = useQuery({
    queryKey: ["preparation-load-positions", data.facilityId, search],
    queryFn: async () =>
      pageItems<{
        id: string;
        code: string;
        positions: (PreparationLine & {
          facilityId: string;
          availableKg: string;
        })[];
      }>(
        await ledgerEndpoints.getLots({
          facilityId: data.facilityId,
          search: search.trim(),
          pageSize: 50,
          availableOnly: "true",
        }),
      ),
    enabled: draftOpen,
  });

  const positions = (lots.data ?? []).flatMap((lot) =>
    lot.positions
      .filter(
        (position) =>
          position.facilityId === data.facilityId &&
          /[1-9]/.test(position.availableKg),
      )
      .map((position) => ({
        ...position,
        lotId: lot.id,
        code: lot.code,
      })),
  );

  const positionKey = (line: PreparationLine) =>
    line.lotId && line.locationId ? `${line.lotId}:${line.locationId}` : "";
  const changeLine = (index: number, values: Partial<PreparationLine>) =>
    setLines((prev) =>
      prev.map((line, i) => (index === i ? { ...line, ...values } : line)),
    );

  function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (new Set(lines.map(positionKey)).size !== lines.length) return;
    submit({
      action: "draft",
      body: {
        version: data.version,
        draftId,
        loadedAt: new Date(loadedAt).toISOString(),
        lines: lines.map(({ lotId, locationId, quantityKg, poolRevision }) => ({
          lotId,
          locationId,
          quantityKg,
          ...(poolRevision != null && { poolRevision }),
        })),
      },
    });
  }

  return (
    <div className="space-y-4">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          submit({
            action: "metadata",
            body: {
              version: data.version,
              orderId: data.orderId,
              containerNumber: number.trim() || null,
              sealNumber: seal.trim() || null,
            },
          });
        }}
        className="rounded-xl border border-ink-tertiary/20 bg-surface-raised/30 p-4"
      >
        <fieldset className="grid gap-3 sm:grid-cols-2" disabled={disabled}>
          <legend className="mb-2 text-xs font-semibold text-ink-primary">
            {text("Thông tin container & niêm phong", "Container & seal metadata")}
          </legend>
          <div>
            <label className={labelClass}>
              {text("Số container", "Container number")}
              <input
                value={number}
                onChange={(event) => setNumber(event.target.value)}
                placeholder="VD: MSCU1234567"
                className={`${inputClass} mt-1 font-mono`}
              />
            </label>
          </div>
          <div>
            <label className={labelClass}>
              {text("Số chì niêm phong", "Seal number")}
              <input
                value={seal}
                onChange={(event) => setSeal(event.target.value)}
                placeholder="VD: SEAL-VN-001"
                className={`${inputClass} mt-1 font-mono`}
              />
            </label>
          </div>
          <div className="sm:col-span-2 flex justify-end pt-1">
            <button type="submit" className={primaryButtonClass}>
              <ShieldCheck size={14} aria-hidden="true" />
              <span>{text("Lưu thông tin", "Save metadata")}</span>
            </button>
          </div>
        </fieldset>
      </form>

      {data.preparationVersion === 2 && (
        <div className="space-y-3 rounded-xl border border-ink-tertiary/20 bg-surface-raised/30 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={disabled}
              onClick={() => {
                setDraftId(crypto.randomUUID());
                setLoadedAt("");
                setLines([blankLine()]);
                setDraftOpen(true);
              }}
              className={primaryButtonClass}
            >
              <Plus size={14} weight="bold" aria-hidden="true" />
              <span>{text("Thêm bản nháp", "New draft")}</span>
            </button>

            {data.drafts.map((draft, index) => (
              <button
                type="button"
                key={draft.id}
                disabled={disabled}
                onClick={() => {
                  const date = new Date(draft.loadedAt);
                  setDraftId(draft.id);
                  setLoadedAt(
                    new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
                      .toISOString()
                      .slice(0, 19),
                  );
                  setLines(draft.lines);
                  setDraftOpen(true);
                }}
                className={secondaryButtonClass}
              >
                <PencilSimple size={14} aria-hidden="true" />
                <span>
                  {text("Sửa nháp", "Edit draft")} {index + 1}
                </span>
              </button>
            ))}
          </div>

          {draftOpen && (
            <form
              onSubmit={save}
              className="space-y-4 border-t border-ink-tertiary/15 pt-4"
            >
              <fieldset disabled={disabled} className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <legend className="text-xs font-bold text-ink-primary">
                    {text("Bản nháp xếp hàng", "Loading draft")}
                  </legend>
                  <button
                    type="button"
                    onClick={() => setDraftOpen(false)}
                    className="text-xs font-semibold text-ink-secondary hover:text-ink-primary"
                  >
                    {text("Thu gọn", "Collapse")}
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <label className={labelClass}>
                      {text("Thời điểm dự kiến", "Loading time")}
                      <input
                        type="datetime-local"
                        step="1"
                        required
                        value={loadedAt}
                        onChange={(event) => setLoadedAt(event.target.value)}
                        className={`${inputClass} mt-1`}
                      />
                    </label>
                  </div>
                  <div>
                    <label className={labelClass}>
                      {text("Tìm lô khả dụng", "Find available lots")}
                      <div className="mt-1">
                        <ExportIconField icon={MagnifyingGlass}>
                          <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder={text("Nhập mã lô...", "Filter lot code...")}
                            className="filter-control border-ink-tertiary/20 bg-surface-raised ps-10 dark:bg-surface-base"
                          />
                        </ExportIconField>
                      </div>
                    </label>
                  </div>
                </div>

                <Feedback error={lots.error} pending={lots.isFetching} />

                <div className="space-y-2.5">
                  {lines.map((line, index) => (
                    <div
                      key={index}
                      className="grid gap-3 rounded-xl border border-ink-tertiary/15 bg-surface-base p-3 sm:grid-cols-[2fr_1fr_auto]"
                    >
                      <div>
                        <label className={labelClass}>
                          {text("Lô và vị trí", "Lot and location")}
                          <select
                            value={positionKey(line)}
                            required
                            onChange={(event) => {
                              const position = positions.find(
                                (item) => positionKey(item) === event.target.value,
                              );
                              if (position) {
                                changeLine(index, {
                                  lotId: position.lotId,
                                  locationId: position.locationId,
                                  poolRevision: position.poolRevision ?? undefined,
                                });
                              } else {
                                changeLine(index, blankLine());
                              }
                            }}
                            className="filter-control mt-1 border-ink-tertiary/20 bg-surface-raised font-mono dark:bg-surface-base"
                          >
                            <option value="">
                              {text("Chọn vị trí tồn kho", "Select a stock position")}
                            </option>
                            {line.lotId &&
                              !positions.some(
                                (item) => positionKey(item) === positionKey(line),
                              ) && (
                                <option value={positionKey(line)}>
                                  {line.lotId} · {line.locationId}
                                </option>
                              )}
                            {positions.map((item) => (
                              <option
                                key={positionKey(item)}
                                value={positionKey(item)}
                              >
                                {item.code} · {item.locationId} · {item.availableKg} kg
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div>
                        <label className={labelClass}>
                          {text("Khối lượng (kg)", "Mass (kg)")}
                          <input
                            required
                            inputMode="decimal"
                            pattern={massPattern}
                            value={line.quantityKg}
                            onChange={(event) =>
                              changeLine(index, { quantityKg: event.target.value })
                            }
                            className={`${inputClass} mt-1 font-mono`}
                          />
                        </label>
                      </div>

                      <div className="flex items-end">
                        <button
                          type="button"
                          disabled={lines.length === 1}
                          onClick={() =>
                            setLines((prev) => prev.filter((_, i) => i !== index))
                          }
                          className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-functional-rejected-border px-2.5 py-1.5 text-xs font-semibold text-accent-danger hover:bg-functional-rejected-bg disabled:opacity-40"
                        >
                          <Trash size={14} aria-hidden="true" />
                          <span>{text("Bỏ dòng", "Remove line")}</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-ink-tertiary/15 pt-3">
                  <button
                    type="button"
                    disabled={lines.length >= 100}
                    onClick={() => setLines((prev) => [...prev, blankLine()])}
                    className={secondaryButtonClass}
                  >
                    <Plus size={14} aria-hidden="true" />
                    <span>{text("Thêm dòng", "Add line")}</span>
                  </button>
                  <button
                    type="submit"
                    disabled={
                      new Set(lines.map(positionKey)).size !== lines.length ||
                      lines.some((line) => !/[1-9]/.test(line.quantityKg))
                    }
                    className={primaryButtonClass}
                  >
                    <CheckCircle size={15} weight="bold" aria-hidden="true" />
                    <span>{text("Lưu bản nháp", "Save draft")}</span>
                  </button>
                </div>
              </fieldset>
            </form>
          )}
        </div>
      )}
    </div>
  );
}
