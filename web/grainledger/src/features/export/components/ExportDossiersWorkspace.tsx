import { useId, useState, type ReactNode } from "react";
import { ExportActionLink as Link } from "./ExportActionLink";
import { useMutation, useQuery } from "@tanstack/react-query";
import {
  ArrowRight,
  DownloadSimple,
  FileCode,
  FileText,
  FolderOpen,
  LockSimple,
  Paperclip,
  ShieldCheck,
} from "@phosphor-icons/react";
import { containerExecutionEndpoints } from "@/api/containerExecution";
import type { ExportContainerDto } from "@/api/exports";
import { Feedback } from "@/shared/ui/Workflow";
import { StatusBadge } from "@/shared/ui/StatusBadge";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { useAuthStore } from "@/app/store/authStore";
import { containerPath, exportPaths } from "../paths";
import { massLabel } from "../model/exportPresentation";
import { saveExportFile } from "../model/saveExportFile";
import { ExportEmpty, ExportSearch } from "./ExportWorkspaceUI";

const documentTypes: Record<string, [string, string]> = {
  PACKING_LIST: ["Phiếu đóng gói", "Packing list"],
  BILL_OF_LADING: ["Vận đơn", "Bill of lading"],
  CERTIFICATE_OF_ANALYSIS: ["Chứng nhận phân tích", "Certificate of analysis"],
  CERTIFICATE_OF_ORIGIN: ["Chứng nhận xuất xứ", "Certificate of origin"],
  PHYTOSANITARY: ["Chứng nhận kiểm dịch thực vật", "Phytosanitary certificate"],
};

export function ExportDossiersWorkspace({
  containers,
  orderId,
  params,
  setParams,
  scope,
}: {
  containers: ExportContainerDto[];
  orderId: string;
  params: URLSearchParams;
  setParams: (params: URLSearchParams) => void;
  scope: ReactNode;
}) {
  const text = useWorkflowText();
  const [search, setSearch] = useState("");
  const closed = containers.filter((c) => c.status === "CLOSED");
  const rows = closed.filter((c) =>
    c.internalCode.toLowerCase().includes(search.trim().toLowerCase()),
  );
  const requested = params.get("container");
  const selected =
    requested === null ? rows[0] : rows.find((c) => c.id === requested);
  return (
    <div className="export-dossiers-layout">
      <aside
        className="export-surface self-start"
        aria-label={text("Kho hồ sơ", "Dossier archive")}
      >
        <div className="space-y-4 border-b border-ink-tertiary/15 p-5">
          <div className="flex items-center gap-2">
            <FolderOpen
              size={20}
              aria-hidden="true"
              className="text-accent-primary"
            />
            <h2 className="font-display text-sm font-bold">
              {text("Kho hồ sơ", "Dossier archive")}
            </h2>
            <span className="ml-auto font-mono text-xs text-ink-secondary">
              {search.trim() ? `${rows.length} / ${closed.length}` : closed.length}
            </span>
          </div>
          {scope}
          <ExportSearch
            label={text("Tìm mã container", "Search container code")}
            value={search}
            onChange={(value) => {
              setSearch(value);
              if (params.has("container")) {
                const next = new URLSearchParams(params);
                next.delete("container");
                setParams(next);
              }
            }}
          />
        </div>
        {rows.length ? (
          <ul
            className="export-record-index"
            aria-label={text(
              "Container có hồ sơ đóng niêm",
              "Closed-container records",
            )}
          >
            {rows.map((c) => (
              <li key={c.id}>
                <button
                  type="button"
                  aria-pressed={selected?.id === c.id}
                  className="export-record-choice"
                  onClick={() => {
                    const next = new URLSearchParams(params);
                    next.set("container", c.id);
                    setParams(next);
                  }}
                >
                  <FileText size={22} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-all font-mono text-xs font-bold">
                      {c.internalCode}
                    </span>
                    <span className="mt-1 block text-[11px] text-ink-secondary">
                      {massLabel(c.targetMassKg, text("vi", "en"))} kg ·{" "}
                      {text("Đã niêm phong", "Closed")}
                    </span>
                  </span>
                  <ArrowRight size={15} aria-hidden="true" />
                  <span className="sr-only">
                    {text("Xem hồ sơ", "View dossier")}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-4">
            <ExportEmpty
              title={
                closed.length
                  ? text(
                      "Không có container phù hợp.",
                      "No matching containers.",
                    )
                  : text(
                      "Chưa có container đã đóng niêm.",
                      "No closed containers yet.",
                    )
              }
              action={closed.length > 0 && <button type="button" className="export-button" onClick={() => setSearch("")}>{text("Xóa tìm kiếm", "Clear search")}</button>}
              description={closed.length ? text("Thử mã container khác hoặc xóa tìm kiếm.", "Try another container code or clear the search.") : text(
                "Hồ sơ xuất hiện sau khi hoàn tất thực xếp và đóng niêm.",
                "Records appear after actual loading and closure.",
              )}
              icon={<FolderOpen size={24} />}
            />
          </div>
        )}
        <div className="border-t border-ink-tertiary/15 p-4">
          <p className="text-[11px] leading-relaxed text-ink-secondary">
            {containers.length - closed.length}{" "}
            {text(
              "container chưa đóng niêm, chưa có trong kho hồ sơ.",
              "containers are awaiting closure and excluded from this archive.",
            )}
          </p>
          <Link
            className="export-quiet-link mt-2"
            to={`${exportPaths.containers}?order=${encodeURIComponent(orderId)}`}
          >
            {text("Theo dõi container", "Track containers")}
            <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </aside>
      {selected ? (
        <DossierPreview key={selected.id} container={selected} />
      ) : rows.length > 0 ? (
        <div className="export-surface grid min-h-80 place-items-center p-6">
          <ExportEmpty
            title={
              closed.length && requested
                ? text(
                    "Chọn hồ sơ trong danh sách.",
                    "Select a record from the list.",
                  )
                : text("Chưa có hồ sơ để xem trước.", "No dossier to preview.")
            }
            description={text(
              "Chọn một container đã niêm phong để xem snapshot và tải chứng từ.",
              "Choose a closed container to inspect its snapshot and download documents.",
            )}
            icon={<FileText size={28} />}
          />
        </div>
      ) : null}
    </div>
  );
}

function DossierPreview({ container }: { container: ExportContainerDto }) {
  const text = useWorkflowText();
  const canAttach = useAuthStore(({ user }) =>
    user?.role === "CUSTOMER_EXPORT_OFFICER" && user.permissions.includes("containers.write"),
  );
  const typeLabel = (value: string) =>
    documentTypes[value] ? text(...documentTypes[value]) : value;
  const id = useId();
  const [allVersions, setAllVersions] = useState(false);
  const [type, setType] = useState("ALL");
  const dossier = useQuery({
    queryKey: ["container-dossier", container.id],
    queryFn: () => containerExecutionEndpoints.getDossier(container.id),
  });
  const workflow = useQuery({
    queryKey: ["container-workflow", container.id],
    queryFn: () => containerExecutionEndpoints.getWorkflow(container.id),
  });
  const download = useMutation({
    mutationFn: async (file: { id?: string; filename: string }) => {
      const blob = file.id
        ? await containerExecutionEndpoints.downloadDocument(
            container.id,
            file.id,
          )
        : await containerExecutionEndpoints.downloadDossier(container.id);
      saveExportFile(blob, file.filename);
    },
  });
  const documents = workflow.data?.documents ?? [];
  const latest = new Map<string, number>();
  for (const document of documents)
    latest.set(
      document.documentType,
      Math.max(latest.get(document.documentType) ?? 0, document.version),
    );
  const visible = documents
    .filter(
      (d) =>
        (type === "ALL" || d.documentType === type) &&
        (allVersions || d.version === latest.get(d.documentType)),
    )
    .slice()
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
  const d = dossier.data;
  return (
    <section
      className="export-surface export-dossier-preview min-w-0 self-start"
      aria-label={text("Xem trước hồ sơ", "Dossier preview")}
    >
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-ink-tertiary/15 px-5 py-5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent-primary/10 text-accent-primary">
            <FileText size={26} aria-hidden="true" />
          </span>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-ink-secondary">
              {text("Hồ sơ đóng niêm", "Closure dossier")}
            </p>
            <h2 className="mt-1 break-all font-display text-lg font-bold">
              {container.internalCode}
            </h2>
          </div>
        </div>
        <Link
          className="export-button export-button-primary"
          to={containerPath(exportPaths.dossier, container.id)}
        >
          {text("Chi tiết & chứng từ", "Details & documents")}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      </header>
      <div className="space-y-6 p-5 sm:p-6">
        <Feedback
          error={dossier.error ?? download.error}
          pending={dossier.isPending}
        />
        {dossier.isError && (
          <button
            type="button"
            className="export-button"
            disabled={dossier.isFetching}
            onClick={() => void dossier.refetch()}
          >
            {text("Tải lại hồ sơ", "Reload dossier")}
          </button>
        )}
        {d && (
          <>
            <div className="export-dossier-summary">
              <div>
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <LockSimple
                    size={16}
                    className="text-accent-primary"
                    aria-hidden="true"
                  />
                  <span className="text-xs font-semibold">
                    {text("Snapshot đã phát hành", "Issued snapshot")}
                  </span>
                  <StatusBadge
                    size="sm"
                    status={
                      d.assessment.assessmentStatus === "PASS"
                        ? "COMPLIANT"
                        : "HOLD"
                    }
                    label={
                      d.assessment.assessmentStatus === "PASS"
                        ? text("Đạt khi đóng niêm", "Passed at closure")
                        : d.assessment.assessmentStatus
                    }
                  />
                </div>
                <dl className="grid gap-4 text-xs sm:grid-cols-2">
                  <div>
                    <dt className="text-ink-secondary">
                      {text("Số container", "Container number")}
                    </dt>
                    <dd className="mt-1 break-all font-mono font-semibold">
                      {d.containerNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-secondary">
                      {text("Số niêm phong", "Seal number")}
                    </dt>
                    <dd className="mt-1 break-all font-mono font-semibold">
                      {d.sealNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-secondary">
                      {text("Khối lượng mục tiêu", "Target mass")}
                    </dt>
                    <dd className="mt-1 font-mono font-semibold">
                      {massLabel(d.targetKg, text("vi", "en"))} kg
                    </dd>
                  </div>
                  <div>
                    <dt className="text-ink-secondary">
                      {text("Đóng niêm lúc", "Closed at")}
                    </dt>
                    <dd className="mt-1">
                      {new Date(d.closedAt).toLocaleString(
                        text("vi-VN", "en-GB"),
                      )}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="export-snapshot-download">
                <FileCode
                  size={30}
                  className="text-accent-primary"
                  aria-hidden="true"
                />
                <p className="text-xs font-semibold">
                  {text("Snapshot JSON", "JSON snapshot")}
                </p>
                <p className="text-[11px] leading-relaxed text-ink-secondary">
                  {text(
                    "Tải bản gốc do máy chủ phát hành.",
                    "Download the original server-issued file.",
                  )}
                </p>
                <button
                  type="button"
                  className="export-button w-full"
                  disabled={download.isPending}
                  onClick={() =>
                    download.mutate({
                      filename: `${container.internalCode}-dossier.json`,
                    })
                  }
                >
                  <DownloadSimple size={15} aria-hidden="true" />
                  {text("Tải snapshot", "Download snapshot")}
                </button>
              </div>
            </div>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed text-ink-secondary">
              <ShieldCheck
                size={16}
                className="shrink-0 text-accent-primary"
                aria-hidden="true"
              />
              {d.redacted
                ? text(
                    "Nội dung hồ sơ được hiển thị theo phạm vi quyền của tài khoản.",
                    "Dossier contents are scoped to your account permissions.",
                  )
                : text(
                    "Đánh giá này được lưu tại thời điểm đóng niêm container.",
                    "This assessment was recorded when the container was closed.",
                  )}
            </p>
          </>
        )}
        <section
          className="space-y-4 border-t border-ink-tertiary/15 pt-5"
          aria-label={text("Chứng từ đính kèm", "Attached documents")}
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="flex items-center gap-2 font-display text-sm font-bold">
              <Paperclip
                size={18}
                className="text-accent-primary"
                aria-hidden="true"
              />
              {text("Chứng từ đính kèm", "Attached documents")}
            </h3>
            <span className="text-xs text-ink-secondary">
              {visible.length} {text("tệp hiển thị", "files shown")}
            </span>
          </div>
          <Feedback error={workflow.error} pending={workflow.isPending} />
          {workflow.isError && (
            <button
              type="button"
              className="export-button"
              disabled={workflow.isFetching}
              onClick={() => void workflow.refetch()}
            >
              {text("Tải lại chứng từ", "Reload documents")}
            </button>
          )}
          {workflow.data && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <div className="w-full sm:w-56">
                  <label htmlFor={id} className="sr-only">
                    {text("Loại chứng từ", "Document type")}
                  </label>
                  <select
                    id={id}
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                  >
                    <option value="ALL">
                      {text("Tất cả loại chứng từ", "All document types")}
                    </option>
                    {Array.from(latest.keys())
                      .sort()
                      .map((t) => (
                        <option key={t} value={t}>
                          {typeLabel(t)}
                        </option>
                      ))}
                  </select>
                </div>
                <label className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={allVersions}
                    onChange={(e) => setAllVersions(e.target.checked)}
                  />
                  <span>
                    {text("Hiện tất cả phiên bản", "Show all versions")}
                  </span>
                </label>
              </div>
              {visible.length ? (
                <ul className="divide-y divide-ink-tertiary/15">
                  {visible.map((file) => (
                    <li
                      key={file.id}
                      className="flex flex-wrap items-center gap-3 py-4"
                    >
                      <FileText
                        size={22}
                        className="shrink-0 text-ink-secondary"
                        aria-hidden="true"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="break-all text-xs font-semibold">
                          {file.filename}
                        </p>
                        <p className="mt-1 text-[11px] text-ink-secondary">
                          {typeLabel(file.documentType)} · v{file.version} ·{" "}
                          {new Date(file.recordedAt).toLocaleDateString(
                            text("vi-VN", "en-GB"),
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="export-button export-button-icon"
                        aria-label={`${text("Tải", "Download")} ${file.filename} v${file.version}`}
                        disabled={download.isPending}
                        onClick={() =>
                          download.mutate({
                            id: file.id,
                            filename: file.filename,
                          })
                        }
                      >
                        <DownloadSimple size={17} aria-hidden="true" />
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="rounded-xl border border-dashed border-ink-tertiary/25 p-5 text-center text-xs text-ink-secondary">
                  {documents.length
                    ? text(
                        "Không có chứng từ phù hợp.",
                        "No matching documents.",
                      )
                    : canAttach ? text(
                        "Chưa có chứng từ đính kèm. Mở hồ sơ chi tiết để bổ sung.",
                        "No attached documents. Open the full dossier to add them.",
                      ) : text("Chưa có chứng từ đính kèm.", "No attached documents.")}
                </p>
              )}
            </>
          )}
        </section>
        {download.isPending && (
          <p role="status" className="text-xs text-ink-secondary">
            {text("Đang tải tệp…", "Downloading file…")}
          </p>
        )}
      </div>
    </section>
  );
}
