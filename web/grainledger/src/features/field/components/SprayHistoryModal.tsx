import { useId, useState } from "react";
import { ArrowLeft, ClipboardText, Eye, SprayBottle } from "@phosphor-icons/react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link, useInRouterContext } from "react-router-dom";
import { catalogsEndpoints } from "@/api/catalogs";
import {
  procurementEndpoints as procurement,
  type PlotSeasonReference,
  type SprayDeclarationSummary,
} from "@/api/procurement";
import { collectPages } from "@/api/query";
import {
  RecordDialog,
  RecordEmpty,
  RecordFeedback,
  RecordPagination,
  RecordTable,
} from "@/shared/ui/RecordWorkspace";
import { useWorkflowText } from "@/shared/ui/useWorkflowText";
import { fieldPaths } from "../paths";

const pageSize = 10;

export function SprayHistoryModal({
  link,
  seasonName,
  onClose,
}: {
  link: PlotSeasonReference;
  seasonName?: string;
  onClose: () => void;
}) {
  const { t, i18n } = useTranslation();
  const text = useWorkflowText();
  const inRouter = useInRouterContext();
  const titleId = useId();
  const tableHeadingId = useId();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<SprayDeclarationSummary | null>(null);

  const list = useQuery({
    queryKey: ["crop-season-spray-history", link.id, page],
    queryFn: () =>
      procurement.getSprayDeclarations({
        plotSeasonId: link.id,
        page,
        pageSize,
      }),
  });

  const detail = useQuery({
    queryKey: ["crop-season-spray-detail", selected?.id],
    queryFn: () => procurement.getSprayDeclaration(selected!.id),
    enabled: Boolean(selected),
  });

  const substances = useQuery({
    queryKey: ["field-spray-substances"],
    queryFn: () => collectPages(catalogsEndpoints.getActiveSubstances),
    enabled: Boolean(selected),
  });

  const appliedOnLabel = text("Ngày phun", "Application date");
  const listLabel = text("Danh sách lần phun", "Spray applications");
  const declarationsHref = `${fieldPaths.declarations}?plotSeasonId=${encodeURIComponent(link.id)}`;
  const dateFormat = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: "medium",
    timeZone: "UTC",
  });
  const formatDate = (value: string) => (
    <time dateTime={value} className="whitespace-nowrap">
      {dateFormat.format(new Date(value))}
    </time>
  );

  return (
    <RecordDialog
      title={text("Lịch sử phun", "Spray history")}
      titleId={titleId}
      subtitle={[link.plotCode, seasonName ?? link.seasonName, link.riceVariety]
        .filter(Boolean)
        .join(" · ")}
      icon={<SprayBottle size={22} />}
      onClose={onClose}
      wide
      dismissOnBackdrop
    >
      {selected ? (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              className="record-button rounded-full"
              onClick={() => setSelected(null)}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>{text("Quay lại danh sách", "Back to list")}</span>
            </button>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-secondary">
              <ClipboardText size={15} className="text-accent-primary" aria-hidden="true" />
              <span>{text("Chi tiết khai báo", "Declaration details")}</span>
            </span>
          </div>

          <RecordFeedback
            error={detail.error}
            pending={detail.isPending}
            label={text("Đang tải chi tiết khai báo…", "Loading declaration details…")}
          />

          {detail.data && (
            <div className="space-y-4">
              <dl className="record-details [overflow-wrap:anywhere] sm:grid-cols-2">
                <div>
                  <dt>{appliedOnLabel}</dt>
                  <dd>{formatDate(detail.data.appliedOn)}</dd>
                </div>
                <div>
                  <dt>{text("Nguồn thông tin", "Information source")}</dt>
                  <dd>{detail.data.informationSource}</dd>
                </div>
                <div>
                  <dt>{text("Tham chiếu chứng cứ", "Evidence reference")}</dt>
                  <dd>{detail.data.evidenceRef || "—"}</dd>
                </div>
                <div>
                  <dt>{text("Ghi nhận lúc", "Recorded at")}</dt>
                  <dd>
                    <time dateTime={detail.data.recordedAt}>
                      {new Date(detail.data.recordedAt).toLocaleString(i18n.language)}
                    </time>
                  </dd>
                </div>
              </dl>

              <div className="space-y-2">
                <h3 className="font-display text-base font-semibold text-ink-primary">
                  {text("Sản phẩm và hoạt chất", "Products and substances")}
                </h3>
                <ul className="divide-y divide-ink-tertiary/15 rounded-xl border border-ink-tertiary/15 bg-surface-base text-sm [overflow-wrap:anywhere] dark:bg-surface-overlay/30">
                  {detail.data.items.map((item) => {
                    const substance =
                      substances.data?.find((row) => row.id === item.substanceId)
                        ?.name ?? item.substanceId;
                    return (
                      <li key={item.id} className="px-4 py-3">
                        {[item.productName, substance].filter(Boolean).join(" · ") || "—"}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          <h3 id={tableHeadingId} className="sr-only">
            {listLabel}
          </h3>
          <RecordFeedback
            error={list.error}
            pending={list.isPending}
            label={text("Đang tải lịch sử phun…", "Loading spray history…")}
          />
          {list.data && (
            <div className="overflow-hidden rounded-xl border border-ink-tertiary/15 bg-surface-base dark:bg-surface-overlay/20">
              {list.data.items.length === 0 ? (
                <RecordEmpty icon={<SprayBottle size={36} />}>
                  {text(
                    "Chưa có khai báo phun thuốc nào cho thửa ruộng và vụ mùa này.",
                    "No spray declarations found for this plot and crop season.",
                  )}
                </RecordEmpty>
              ) : (
                <RecordTable labelledBy={tableHeadingId}>
                  <thead>
                    <tr>
                      <th scope="col" className="whitespace-nowrap">
                        {appliedOnLabel}
                      </th>
                      <th scope="col" className="whitespace-nowrap text-end">
                        {text("Số mục", "Items")}
                      </th>
                      <th scope="col">{text("Ghi nhận lúc", "Recorded at")}</th>
                      <th scope="col" className="text-end">
                        <span className="sr-only sm:not-sr-only">
                          {t("common.details")}
                        </span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {list.data.items.map((row) => (
                      <tr key={row.id}>
                        <td>{formatDate(row.appliedOn)}</td>
                        <td className="text-end tabular-nums">{row.itemCount}</td>
                        <td className="text-ink-secondary">
                          <time dateTime={row.recordedAt}>
                            {new Date(row.recordedAt).toLocaleString(i18n.language)}
                          </time>
                        </td>
                        <td className="text-end">
                          <button
                            type="button"
                            className="record-row-action whitespace-nowrap"
                            onClick={() => setSelected(row)}
                          >
                            <Eye aria-hidden="true" size={16} />
                            <span>{t("common.details")}</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </RecordTable>
              )}
              <RecordPagination
                label={listLabel}
                page={page}
                hasMore={list.data.hasMore}
                onPage={setPage}
              />
            </div>
          )}
        </div>
      )}

      <footer className="record-form-footer justify-between">
        {inRouter ? (
          <Link className="record-button rounded-full" to={declarationsHref}>
            {text("Mở trang khai báo", "Open declarations page")}
          </Link>
        ) : (
          <a className="record-button rounded-full" href={declarationsHref}>
            {text("Mở trang khai báo", "Open declarations page")}
          </a>
        )}
        <button type="button" className="record-button" onClick={onClose}>
          {t("field.seasons.close")}
        </button>
      </footer>
    </RecordDialog>
  );
}
