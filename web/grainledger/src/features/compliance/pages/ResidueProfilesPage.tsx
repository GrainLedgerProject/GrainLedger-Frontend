import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { residueEndpoints } from '@/api/residue';
import type { ResidueProfileVersion } from '@/api/generated/schemas';
import { useAuthStore } from '@/app/store/authStore';
import { Modal } from '@/components/Modal/Modal';
import { StatusBadge } from '@/components/StatusBadge/StatusBadge';
import { ArrowsClockwise, MagnifyingGlass, X } from '@phosphor-icons/react';

const button = 'inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-ink-tertiary/20 px-4 py-2 text-sm font-semibold hover:bg-surface-raised disabled:cursor-not-allowed disabled:opacity-50';
const field = 'min-h-11 w-full rounded-lg border border-ink-tertiary/25 bg-surface-base px-3 py-2 text-ink-primary';

export function ResidueProfilesPage() {
  const user = useAuthStore(state => state.user);
  const cache = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [retiring, setRetiring] = useState(false);
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const profiles = useQuery({ queryKey: ['residue-profiles'], queryFn: residueEndpoints.getRules, staleTime: 0, refetchOnWindowFocus: true });
  const detail = useQuery({ queryKey: ['residue-profile', selectedId], queryFn: () => residueEndpoints.getRule(selectedId!), enabled: Boolean(selectedId), staleTime: 0, refetchOnWindowFocus: true });
  const selected = detail.data;
  const mayRetire = selected && !selected.retirement && (selected.companyId == null
    ? user?.permissions.includes('residue.policy.manage')
    : user?.organizationId === selected.companyId && user.permissions.includes('residue.company-policy.manage'));
  const mutation = useMutation({
    mutationFn: () => {
      if (!selectedId || !reason.trim()) throw new Error('Vui lòng nhập lý do ngừng sử dụng.');
      return residueEndpoints.retireRule(selectedId, { reason: reason.trim() });
    },
    onSuccess: retirement => {
      // Retirement affects the whole profile series within its owning scope.
      cache.setQueryData<{ items: ResidueProfileVersion[] }>(['residue-profiles'], current => current && ({ items: current.items.map(profile => profile.code === retirement.code && (profile.companyId ?? null) === retirement.companyId ? { ...profile, retirement } : profile) }));
      cache.setQueryData<ResidueProfileVersion>(['residue-profile', selectedId], current => current && ({ ...current, retirement }));
      setNotice(`Đã ngừng sử dụng hồ sơ ${retirement.code}.`);
      setRetiring(false);
      setReason('');
      void cache.invalidateQueries({ queryKey: ['residue-profiles'] });
      void cache.invalidateQueries({ queryKey: ['residue-profile'] });
    },
  });
  function close() {
    if (mutation.isPending) return;
    setSelectedId(null);
    setRetiring(false);
    mutation.reset();
  }
  const visible = profiles.data?.items.filter(profile => `${profile.code} ${profile.residueDefinition}`.toLowerCase().includes(search.trim().toLowerCase())) ?? [];
  return <div className="space-y-6 pb-12">
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-tertiary/15 pb-4">
      <div><p className="text-xs font-semibold uppercase tracking-wider text-accent-primary">Chính sách dư lượng</p><h2 className="mt-1 text-2xl font-display font-bold">Hồ sơ dư lượng</h2><p className="mt-2 max-w-2xl text-sm text-ink-secondary">Tra cứu phiên bản đã công bố, phương pháp xét nghiệm và hệ số xử lý. Ngừng sử dụng áp dụng cho cả chuỗi phiên bản trong cùng phạm vi.</p></div>
      <button className={button} disabled={profiles.isFetching} onClick={() => void profiles.refetch()}><ArrowsClockwise size={18} />{profiles.isFetching ? 'Đang tải…' : 'Tải lại'}</button>
    </header>
    {notice && <p role="status" className="rounded-lg bg-accent-primary/10 p-4 text-accent-primary">{notice}</p>}
    {profiles.error && <p role="alert" className="rounded-lg bg-accent-danger/10 p-4 text-accent-danger">{profiles.error.message}</p>}
    <div className="max-w-xl"><label htmlFor="residue-search" className="mb-2 block text-sm font-semibold">Tìm hồ sơ</label><div className="flex items-center gap-3"><MagnifyingGlass size={20} aria-hidden="true" /><input id="residue-search" className={field} value={search} onChange={event => setSearch(event.target.value)} placeholder="Mã hoặc định nghĩa dư lượng" /></div></div>
    {profiles.isPending && <p role="status">Đang tải hồ sơ dư lượng…</p>}
    {profiles.isSuccess && visible.length === 0 && <p className="rounded-xl border border-ink-tertiary/15 p-6 text-ink-secondary">Không có hồ sơ phù hợp trong phạm vi được phép xem.</p>}
    <div className="grid gap-4 lg:grid-cols-2">{visible.map(profile => <button key={profile.id} className="rounded-xl border border-ink-tertiary/15 bg-surface-base p-5 text-left transition-colors hover:bg-surface-raised" onClick={() => { setSelectedId(profile.id); setRetiring(false); setReason(''); mutation.reset(); }}>
      <div className="flex flex-wrap items-center justify-between gap-3"><h3 className="font-bold">{profile.code} · v{profile.versionNo}</h3><StatusBadge status={profile.retirement ? 'CLOSED' : 'ACTIVE'} label={profile.retirement ? 'Đã ngừng sử dụng' : 'Đã công bố'} /></div>
      <p className="mt-3 text-sm">{profile.residueDefinition} · {profile.unit}</p><p className="mt-2 text-sm text-ink-secondary">{profile.companyId ? 'Phạm vi công ty' : 'Phạm vi hệ thống'} · Hiệu lực từ {new Date(profile.effectiveFrom).toLocaleDateString('vi-VN')}</p>
      <span className="mt-4 inline-block text-sm font-semibold text-accent-primary">Xem hồ sơ →</span>
    </button>)}</div>
    <Modal isOpen={Boolean(selectedId)} onClose={close} ariaLabel="Chi tiết hồ sơ dư lượng" className="w-full max-w-3xl p-6" closeOnBackdrop={!mutation.isPending}>
      <div className="space-y-5">
        <div className="flex items-center justify-between gap-4"><h3 className="text-xl font-bold">{selected ? `${selected.code} · v${selected.versionNo}` : 'Chi tiết hồ sơ'}</h3><button type="button" className={button} aria-label="Đóng" disabled={mutation.isPending} onClick={close}><X size={18} /></button></div>
        {detail.isFetching && <p role="status">Đang tải thông tin…</p>}
        {detail.error && <p role="alert" className="text-accent-danger">{detail.error.message}</p>}
        {selected && <>
          <dl className="grid gap-4 rounded-lg bg-surface-raised p-4 text-sm sm:grid-cols-2">
            <div><dt className="text-ink-secondary">Định nghĩa dư lượng</dt><dd className="mt-1 font-semibold">{selected.residueDefinition}</dd></div>
            <div><dt className="text-ink-secondary">Đơn vị / độ chính xác</dt><dd className="mt-1">{selected.unit} / {selected.decimalPlaces} chữ số</dd></div>
            <div><dt className="text-ink-secondary">Căn cứ áp dụng</dt><dd className="mt-1 break-words">{selected.applicabilityStatement}</dd></div>
            <div><dt className="text-ink-secondary">Tài liệu tham chiếu</dt><dd className="mt-1 break-words">{selected.evidenceRef}</dd></div>
            <div><dt className="text-ink-secondary">Người / đơn vị thẩm định</dt><dd className="mt-1">{selected.reviewedBy} · {selected.reviewAuthority}</dd></div>
            <div><dt className="text-ink-secondary">Cơ sở mẫu nguyên trạng</dt><dd className="mt-1">{selected.asReceivedConfirmed ? 'Đã xác nhận' : 'Chưa xác nhận'}</dd></div>
          </dl>
          <section><h4 className="mb-3 font-semibold">Phương pháp xét nghiệm</h4>{selected.laboratory.length ? <ul className="space-y-2">{selected.laboratory.map((lab, index) => <li key={index} className="rounded-lg border border-ink-tertiary/15 p-3 text-sm">{lab.analyticalMethod}<span className="ml-2 text-ink-secondary">{lab.numericInterpretationKind ?? 'Không diễn giải giá trị số'}{lab.relativeUncertaintyPercent !== null ? ` · Độ không đảm bảo tương đối ${lab.relativeUncertaintyPercent}%` : ''}</span></li>)}</ul> : <p className="text-sm text-ink-secondary">Không có phương pháp xét nghiệm trong hồ sơ.</p>}</section>
          <section><h4 className="mb-3 font-semibold">Bước xử lý</h4>{selected.steps.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr><th className="p-2">Quy trình</th><th className="p-2">Giai đoạn</th><th className="p-2">Hệ số dưới / trên</th></tr></thead><tbody>{selected.steps.map(step => <tr key={step.id} className="border-t border-ink-tertiary/15"><td className="p-2">{step.process}</td><td className="p-2">{step.inputStage} → {step.outputStage}</td><td className="p-2 font-mono">{step.factorLower} / {step.factorUpper}</td></tr>)}</tbody></table></div> : <p className="text-sm text-ink-secondary">Không có bước xử lý trong hồ sơ.</p>}</section>
          {selected.retirement && <p className="rounded-lg bg-surface-raised p-4 text-sm">Đã ngừng sử dụng ngày {new Date(selected.retirement.retiredAt).toLocaleString('vi-VN')}. Lý do: {selected.retirement.reason}</p>}
          {mutation.error && <p role="alert" className="rounded-lg bg-accent-danger/10 p-3 text-accent-danger">{mutation.error.message}</p>}
          {mayRetire && !retiring && <button className={`${button} text-accent-danger`} disabled={detail.isFetching} onClick={() => setRetiring(true)}>Ngừng sử dụng hồ sơ</button>}
          {mayRetire && retiring && <form className="space-y-4 border-t border-ink-tertiary/15 pt-4" onSubmit={event => { event.preventDefault(); mutation.mutate(); }}>
            <p className="text-sm text-ink-secondary">Cả chuỗi hồ sơ {selected.code} sẽ ngừng được dùng cho đánh giá mới. Lịch sử đã ghi nhận được giữ lại.</p>
            <label htmlFor="retirement-reason" className="block text-sm font-semibold">Lý do ngừng sử dụng (bắt buộc)</label><textarea id="retirement-reason" className={field} rows={3} required maxLength={1000} value={reason} disabled={mutation.isPending} onChange={event => setReason(event.target.value)} />
            <div className="flex flex-wrap gap-3"><button className={`${button} bg-accent-danger text-white`} disabled={!reason.trim() || mutation.isPending}>{mutation.isPending ? 'Đang ghi nhận…' : 'Xác nhận ngừng sử dụng'}</button><button type="button" className={button} disabled={mutation.isPending} onClick={() => setRetiring(false)}>Hủy</button></div>
          </form>}
        </>}
      </div>
    </Modal>
  </div>;
}
