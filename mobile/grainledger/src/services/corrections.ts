import { Decimal } from 'decimal.js';
import type { CorrectionRequest } from './endpoints/ledger';
import type { ApiTransport } from './endpoints/transport';

// Fields and status values from web's CorrectionManagementPage.
export interface CorrectionItem {
  id: string;
  operationId: string;
  reason: string;
  reconciliationNotes?: string;
  status: 'PENDING_REVIEW' | 'RECONCILED' | 'COMMITTED' | 'CANCELLED';
  createdAt: string;
}

function isCorrection(value: unknown): value is CorrectionItem {
  if (!value || typeof value !== 'object') return false;
  return 'id' in value && typeof value.id === 'string'
    && 'operationId' in value && typeof value.operationId === 'string'
    && 'reason' in value && typeof value.reason === 'string'
    && 'createdAt' in value && typeof value.createdAt === 'string'
    && 'status' in value && typeof value.status === 'string'
    && ['PENDING_REVIEW', 'RECONCILED', 'COMMITTED', 'CANCELLED'].includes(value.status)
    && (!('reconciliationNotes' in value) || value.reconciliationNotes === undefined || typeof value.reconciliationNotes === 'string');
}

export function parseCorrections(value: unknown): CorrectionItem[] {
  const list: unknown = Array.isArray(value) ? value
    : value && typeof value === 'object' && 'items' in value ? value.items : undefined;
  if (!Array.isArray(list) || !list.every(isCorrection)) {
    throw new Error('Dữ liệu yêu cầu hiệu chỉnh từ máy chủ không đúng định dạng.');
  }
  return list;
}

export function buildCorrectionRequest(operationId: string, reason: string, variance: string, notes: string): CorrectionRequest {
  if (!operationId.trim()) throw new Error('Vui lòng chọn công đoạn cần hiệu chỉnh.');
  if (!reason.trim()) throw new Error('Vui lòng nhập lý do hiệu chỉnh.');
  const normalized = variance.trim().replace(',', '.');
  if (!/^[+-]?\d+(?:\.\d+)?$/.test(normalized)) {
    throw new Error('Khối lượng chênh lệch phải là số thập phân hợp lệ.');
  }
  const mass = new Decimal(normalized);
  if (!mass.isFinite()) throw new Error('Khối lượng chênh lệch không hợp lệ.');
  // The web contract has no variance field. Keep the entered measurement in its notes.
  return {
    operationId: operationId.trim(),
    reason: reason.trim(),
    reconciliationNotes: [`Chênh lệch đề nghị: ${mass.toFixed()} kg`, notes.trim()].filter(Boolean).join('\n'),
  };
}

export async function submitCorrection(request: CorrectionRequest, transport: ApiTransport): Promise<void> {
  const result = await transport<unknown>('/api/ledger/corrections', { method: 'POST', body: JSON.stringify(request) });
  if (result.error || result.isMock) throw new Error(result.error || 'Chưa gửi được yêu cầu tới máy chủ.');
}
