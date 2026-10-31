import { create } from 'zustand';
import { HoldRecord, HoldAction } from '../types/risk';
import { storage } from '../services/storage';
import { api } from '../services/api';
import { useOfflineStore } from './offlineStore';

const RISK_DATA_KEY = 'grainledger_risk_data';

function generateUuid(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

const DEFAULT_HOLDS: HoldRecord[] = [
  {
    id: 'hold-01',
    targetType: 'LOT',
    targetId: 'lot-raw-02',
    targetCode: 'RAW-TG-2026-002',
    reason: 'Phát hiện hoạt chất Hexaconazole vượt cận an toàn 15% theo chuẩn Nhật Bản',
    reasonCategory: 'MRL_EXCEEDANCE',
    evidenceReference: 'LAB-REP-26019',
    issuedBy: 'Đỗ Thị Lan (Quản lý Tuân thủ)',
    issuedAt: '2026-10-30 10:15',
    status: 'ACTIVE_HOLD',
  },
  {
    id: 'hold-02',
    targetType: 'SILO',
    targetId: 'loc-iso-01',
    targetCode: 'Silo Cách ly K-01',
    reason: 'Nghi ngờ độ ẩm chưa đạt chuẩn (17.5% > 14.0%) trước khi đóng bao',
    reasonCategory: 'MOISTURE_DEVIATION',
    evidenceReference: 'MEAS-2026-88',
    issuedBy: 'Nguyễn Văn B (Vận hành Nhà máy)',
    issuedAt: '2026-10-27 16:45',
    status: 'RESOLVED_RELEASED',
    resolutionNotes: 'Đã sấy lại đạt chuẩn 13.8%, kiểm định đạt chuẩn và đã giải phóng khoang.',
    resolvedAt: '2026-10-28 11:20',
    resolvedBy: 'Trần Văn Hoàng (Quản đốc)',
  },
];

interface RiskState {
  holds: HoldRecord[];
  isLoading: boolean;
  error: string | null;

  initRiskData: () => Promise<void>;
  fetchHolds: () => Promise<void>;
  issueHold: (data: Omit<HoldRecord, 'id' | 'issuedAt' | 'status'>) => Promise<HoldRecord>;
  respondToHold: (holdId: string, action: HoldAction, notes: string) => Promise<void>;
}

export const useRiskStore = create<RiskState>((set, get) => ({
  holds: DEFAULT_HOLDS,
  isLoading: false,
  error: null,

  initRiskData: async () => {
    const cached = await storage.get<{ holds: HoldRecord[] }>(RISK_DATA_KEY);
    if (cached?.holds && cached.holds.length > 0) {
      set({ holds: cached.holds });
    }
    await get().fetchHolds();
  },

  fetchHolds: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.ledger.getHolds();
      if (res.data?.items && res.data.items.length > 0) {
        set({ holds: res.data.items, isLoading: false });
        await storage.set(RISK_DATA_KEY, { holds: res.data.items });
      } else {
        set({ isLoading: false });
      }
    } catch (err: any) {
      set({
        isLoading: false,
        error: err?.message || 'Không thể đồng bộ danh sách lệnh HOLD',
      });
    }
  },

  issueHold: async (data) => {
    const id = generateUuid();
    const newHold: HoldRecord = {
      ...data,
      id,
      issuedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
      status: 'ACTIVE_HOLD',
    };

    const updated = [newHold, ...get().holds];
    set({ holds: updated });
    await storage.set(RISK_DATA_KEY, { holds: updated });

    try {
      const res = await api.ledger.issueHold({
        lotId: data.targetType === 'LOT' ? data.targetId : undefined,
        reason: data.reason,
        evidenceReference: data.evidenceReference,
      });

      if (!res.isMock && res.data) {
        return newHold;
      }
    } catch {
      // Offline fallback
    }

    await useOfflineStore.getState().enqueue({
      actionType: 'QUARANTINE_HOLD',
      title: `Lệnh Cách ly HOLD: ${newHold.targetCode}`,
      summary: `${newHold.reasonCategory}: ${newHold.reason}`,
      payload: newHold,
    });

    return newHold;
  },

  respondToHold: async (holdId: string, action: HoldAction, notes: string) => {
    const statusMap = {
      RELEASE: 'RESOLVED_RELEASED' as const,
      CONDITIONAL_RELEASE: 'RESOLVED_RELEASED' as const,
      DESTROY: 'RESOLVED_DESTROYED' as const,
      QUARANTINE: 'ACTIVE_HOLD' as const,
    };

    const newStatus = statusMap[action];
    const updated = get().holds.map((h) =>
      h.id === holdId
        ? {
            ...h,
            status: newStatus,
            resolutionNotes: notes,
            resolvedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
            resolvedBy: 'Quản đốc Nhà máy',
          }
        : h
    );

    set({ holds: updated });
    await storage.set(RISK_DATA_KEY, { holds: updated });

    try {
      await api.ledger.respondHold(holdId, {
        action,
        notes,
      });
    } catch {
      // Offline
    }
  },
}));

