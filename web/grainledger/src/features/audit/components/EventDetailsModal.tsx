import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Copy, X, ClockCounterClockwise } from '@phosphor-icons/react';
import { Modal } from '@/shared/ui/Modal';
import type { AuditEvent } from '../model/historyEvent';
import { detailLabel, detailValue, eventLabel, readableDecimal, structuredDetails } from '../model/eventPresentation';

function DetailContent({ value, locale, depth = 0 }: { value: unknown; locale: string; depth?: number }) {
  if (depth >= 6) return <pre className="whitespace-pre-wrap break-words text-sm text-ink-primary">{JSON.stringify(value, null, 2)}</pre>;
  if (Array.isArray(value)) {
    if (!value.length) return <p className="text-sm text-ink-secondary">{locale.startsWith('en') ? 'No items' : 'Chưa có mục nào'}</p>;
    return <ol className="space-y-3">{value.map((item, index) => <li key={index} className="rounded-xl border border-ink-tertiary/20 bg-surface-base p-4">
      <p className="mb-3 text-xs font-semibold text-ink-secondary">{locale.startsWith('en') ? 'Item' : 'Mục'} {index + 1}</p>
      <DetailContent value={item} locale={locale} depth={depth + 1} />
    </li>)}</ol>;
  }
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value);
    if (!entries.length) return <p className="text-sm text-ink-secondary">{locale.startsWith('en') ? 'No additional information' : 'Chưa có thông tin bổ sung'}</p>;
    return <dl className="divide-y divide-ink-tertiary/15">{entries.map(([key, item]) => {
      const nested = item !== null && typeof item === 'object';
      return <div key={key} className={nested ? 'space-y-3 py-4 first:pt-0 last:pb-0' : 'grid gap-1 py-3 first:pt-0 last:pb-0 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:gap-6'}>
        <dt className="text-sm text-ink-secondary">{detailLabel(key, locale)}</dt>
        <dd className="min-w-0 break-words text-sm font-medium leading-relaxed text-ink-primary [overflow-wrap:anywhere]">
          {nested ? <DetailContent value={item} locale={locale} depth={depth + 1} /> : detailValue(key, item, locale)}
        </dd>
      </div>;
    })}</dl>;
  }
  return <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-ink-primary">{detailValue('', value, locale)}</p>;
}

export function EventDetailsModal({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  const { i18n } = useTranslation();
  const locale = i18n.language;
  const en = locale.startsWith('en');
  const text = (vi: string, english: string) => en ? english : vi;
  const [copyState, setCopyState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const title = eventLabel(event.kind, locale);
  const details = structuredDetails(event.details);
  const traceId =
    event.kind === "TRACEBACK"
      ? event.id
      : details &&
          typeof details === "object" &&
          "traceId" in details &&
          typeof (details as Record<string, unknown>).traceId === "string"
        ? ((details as Record<string, unknown>).traceId as string)
        : null;
  const references = [
    ...(traceId ? [[text("Mã truy vết (Trace ID)", "Trace ID"), traceId]] : []),
    [text('Mã sự kiện', 'Event ID'), event.id], [text('Mã bút toán', 'Posting ID'), event.postingId],
    [text('Mã lô hàng', 'Lot ID'), event.lotId], [text('Mã công đoạn', 'Operation ID'), event.operationId],
    [text('Mã vị trí lưu trữ', 'Location ID'), event.locationId], [text('Mã đơn vị sở hữu', 'Owner ID'), event.ownerId],
    [text('Mã người thực hiện', 'Actor ID'), event.actorId], [text('Bút toán được đảo', 'Reversed posting ID'), event.reversesPostingId],
  ].filter((pair): pair is [string, string] => typeof pair[1] === 'string');
  const quantity = event.quantityKg;
  const negative = quantity !== null && /^-/.test(quantity) && /[1-9]/.test(quantity);
  const nonzero = quantity !== null && /[1-9]/.test(quantity);
  const massLabel = quantity === null ? text('Khối lượng bút toán', 'Posting mass')
    : negative ? text('Khối lượng giảm', 'Mass decrease')
    : nonzero ? text('Khối lượng tăng', 'Mass increase') : text('Không thay đổi khối lượng', 'No mass change');

  async function copyEventId() {
    try {
      await navigator.clipboard.writeText(event.id);
      setCopyState('copied');
    } catch { setCopyState('failed'); }
  }

  return <Modal isOpen onClose={onClose} ariaLabel={text('Chi tiết sự kiện', 'Event details')}>
    <div className="flex max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-3xl flex-col overflow-hidden rounded-2xl border border-ink-tertiary/25 bg-surface-base shadow-xl">
      <header className="flex shrink-0 items-start justify-between gap-4 border-b border-ink-tertiary/20 px-5 py-5 sm:px-6">
        <div className="flex min-w-0 gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent-primary/10 text-accent-primary"><ClockCounterClockwise size={23} aria-hidden="true" /></div>
          <div className="min-w-0"><p className="mb-1 text-xs font-medium text-ink-secondary">{text('Chi tiết sự kiện', 'Event details')}</p>
            <h2 className="text-xl font-bold leading-tight text-ink-primary sm:text-2xl">{title}</h2>
            <p className="mt-2 text-sm text-ink-secondary">{new Date(event.occurredAt).toLocaleString(en ? 'en-US' : 'vi-VN')}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} aria-label={text('Đóng chi tiết sự kiện', 'Close event details')} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-ink-secondary transition-colors hover:bg-surface-raised hover:text-ink-primary"><X size={20} aria-hidden="true" /></button>
      </header>

      <div className="min-h-0 space-y-6 overflow-y-auto overscroll-contain p-5 sm:p-6">
        <section aria-label={text('Tóm tắt sự kiện', 'Event summary')} className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-accent-primary/25 bg-accent-primary/5 p-4">
            <p className="text-sm text-ink-secondary">{massLabel}</p>
            <p className="mt-2 break-words text-2xl font-bold tabular-nums text-ink-primary">{quantity === null ? text('Không ghi nhận', 'Not recorded') : `${readableDecimal(quantity, locale)} kg`}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{text('Số liệu của bút toán đang xem.', 'Values for the selected posting.')}</p>
          </div>
          <div className="rounded-xl border border-ink-tertiary/20 bg-surface-raised p-4">
            <p className="text-sm text-ink-secondary">{text('Đơn vị sở hữu', 'Owner')}</p>
            <p className="mt-2 break-words text-base font-semibold text-ink-primary">{event.ownerName || text('Chưa có tên đơn vị', 'Owner name unavailable')}</p>
            <p className="mt-2 text-xs leading-relaxed text-ink-secondary">{event.lotId ? text('Liên quan đến lô hàng.', 'Associated with a lot.') : event.operationId ? text('Liên quan đến công đoạn sản xuất.', 'Associated with a production operation.') : text('Sự kiện trong sổ cái.', 'Ledger event.')}</p>
          </div>
        </section>

        <section aria-labelledby="event-business-details">
          <h3 id="event-business-details" className="mb-3 text-base font-semibold text-ink-primary">{text('Nội dung ghi nhận', 'Recorded information')}</h3>
          <div className="rounded-xl border border-ink-tertiary/20 bg-surface-raised p-4 sm:p-5">
            {details === null || details === undefined ? <p className="text-sm text-ink-secondary">{text('Sự kiện này chưa có thông tin bổ sung.', 'This event has no additional information.')}</p> : <DetailContent value={details} locale={locale} />}
          </div>
        </section>

        <details className="group rounded-xl border border-ink-tertiary/20">
          <summary className="cursor-pointer rounded-xl p-4 text-sm font-semibold text-ink-primary focus-visible:outline-offset-2">{text('Mã tham chiếu', 'Reference IDs')} <span className="ml-1 font-normal text-ink-secondary">({references.length})</span></summary>
          <dl className="space-y-4 border-t border-ink-tertiary/15 p-4">{references.map(([label, value]) => <div key={label} className="space-y-1"><dt className="text-xs text-ink-secondary">{label}</dt><dd className="select-all break-all font-mono text-sm text-ink-primary">{value}</dd></div>)}</dl>
        </details>

        <details className="rounded-xl border border-ink-tertiary/20">
          <summary className="cursor-pointer rounded-xl p-4 text-sm font-semibold text-ink-secondary">{text('Dữ liệu gốc (JSON)', 'Original data (JSON)')}</summary>
          <div className="border-t border-ink-tertiary/15 p-4">
            <p className="mb-3 text-xs text-ink-secondary">{text('Dành cho tra cứu kỹ thuật khi cần đối chiếu.', 'For technical reference when a comparison is needed.')}</p>
            <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-surface-raised p-3 font-mono text-xs leading-relaxed text-ink-primary">{JSON.stringify(event.details, null, 2) ?? 'null'}</pre>
          </div>
        </details>
      </div>

      <footer className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-ink-tertiary/20 bg-surface-base px-5 py-4 sm:px-6">
        <div className="min-w-0"><button type="button" onClick={() => void copyEventId()} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-ink-tertiary/25 px-3 text-sm font-medium text-ink-primary hover:bg-surface-raised"><Copy size={17} aria-hidden="true" />{text('Sao chép mã sự kiện', 'Copy event ID')}</button>
          <p role="status" className="mt-1 text-xs text-ink-secondary">{copyState === 'copied' ? text('Đã sao chép mã sự kiện.', 'Event ID copied.') : copyState === 'failed' ? text('Chưa sao chép được. Bạn có thể chọn mã trong mục Mã tham chiếu.', 'Unable to copy. You can select the ID under Reference IDs.') : ''}</p>
        </div>
        <button type="button" onClick={onClose} className="min-h-11 rounded-xl bg-ink-primary px-5 text-sm font-semibold text-ink-inverse hover:opacity-90">{text('Đóng', 'Close')}</button>
      </footer>
    </div>
  </Modal>;
}
