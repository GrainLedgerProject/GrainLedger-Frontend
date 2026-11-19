import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { EventHistoryPage } from '@/features/audit/pages/EventHistoryPage';
import { ledgerEndpoints } from '@/api/ledger';
import type { LedgerHistoryEntry } from '@/api/history';
import { MemoryRouter } from 'react-router-dom';

vi.mock('@/api/ledger', () => ({ ledgerEndpoints: { getHistory: vi.fn() } }));
vi.mock('@/shared/ui/GrainLoader', () => ({ GrainLoader: () => null }));
vi.mock('react-i18next', () => {
  const t = (_key: string, fallback: string, values?: Record<string, unknown>) =>
    fallback.replace(/\{\{(\w+)\}\}/g, (_, key: string) => String(values?.[key] ?? key));
  return { useTranslation: () => ({ t, i18n: { language: 'vi' } }) };
});

afterEach(cleanup);

const entry: LedgerHistoryEntry = {
  id: 'event-1', postingId: 'posting-1', kind: 'MILLING', occurredAt: '2026-11-12T03:00:00Z',
  actorId: 'actual-actor', operationId: 'operation-1', lotId: 'lot-1', locationId: 'location-1',
  ownerId: 'owner-1', ownerName: 'Customer', quantityKg: '-100.000', reversesPostingId: null,
  details: { declaredLossKg: '2.500' },
};

describe('History page', () => {
  it('renders real ledger fields, shows details and fetches subsequent pages', async () => {
    vi.mocked(ledgerEndpoints.getHistory)
      .mockResolvedValueOnce({ items: [entry, { ...entry, postingId: 'posting-2', quantityKg: '97.500' }], page: 1, pageSize: 25, totalCount: 26, hasMore: true })
      .mockResolvedValueOnce({ items: [{ ...entry, id: 'event-2' }], page: 2, pageSize: 25, totalCount: 26, hasMore: false });
    const view = render(<MemoryRouter><EventHistoryPage /></MemoryRouter>);
    await screen.findByText('-100.000');
    expect(screen.getByText('97.500')).toBeTruthy();
    expect(within(screen.getByRole('table')).getAllByRole('row')).toHaveLength(3);
    expect(screen.getAllByText('actual-actor')).toHaveLength(2);
    expect(view.container.textContent).not.toContain('Invalid Date');
    expect(view.container.textContent).not.toContain('SHA-256');

    fireEvent.click(screen.getAllByRole('button', { name: 'Xem' })[0]);
    const dialog = await screen.findByRole('dialog', { name: 'Chi tiết sự kiện' });
    expect(within(dialog).getByRole('heading', { name: 'Xay xát' })).toBeTruthy();
    expect(within(dialog).getByText('Hao hụt khai báo')).toBeTruthy();
    expect(within(dialog).getByText('2,5 kg')).toBeTruthy();
    expect(within(dialog).getByText('Khối lượng giảm')).toBeTruthy();
    const rawData = within(dialog).getByText('Dữ liệu gốc (JSON)').closest('details') as HTMLDetailsElement;
    expect(rawData.open).toBe(false);
    fireEvent.click(within(dialog).getByText('Dữ liệu gốc (JSON)'));
    expect(within(dialog).getByText(/"declaredLossKg": "2.500"/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Đóng' }));

    fireEvent.click(screen.getByRole('button', { name: 'Trang sau' }));
    await waitFor(() => expect(ledgerEndpoints.getHistory).toHaveBeenLastCalledWith(
      { page: 2, pageSize: 25, search: undefined, sortBy: 'occurredAt', sortDirection: 'desc' },
      { signal: expect.any(AbortSignal) },
    ));
    await screen.findByText('event-2');
    expect((screen.getByRole('button', { name: 'Trang sau' }) as HTMLButtonElement).disabled).toBe(true);
    const signal = vi.mocked(ledgerEndpoints.getHistory).mock.calls.at(-1)?.[1]?.signal;
    view.unmount();
    expect(signal?.aborted).toBe(true);
  });
});
