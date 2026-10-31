import React from 'react';

import { GlassBadge, type GlassBadgeStatus } from './GlassBadge';

interface StatusBadgeProps {
  status: string;
  size?: 'small' | 'medium';
}

const labels: Record<string, string> = {
  COMMITTED: 'Đã xác nhận',
  SYNCED: 'Đã đồng bộ',
  AVAILABLE: 'Khả dụng',
  COMPLIANT: 'Đạt chuẩn',
  CONFIRMED: 'Hoàn thành',
  SUCCESS: 'Hoàn thành',
  PASS: 'Đạt chuẩn',
  PENDING: 'Chờ xử lý',
  PENDING_WEIGH: 'Chờ cân',
  PENDING_APPROVAL: 'Chờ xử lý',
  WEIGHED: 'Đã cân',
  IN_PROCESS: 'Đang xử lý',
  SYNCING: 'Đang xử lý',
  HOLD: 'Lệnh HOLD',
  QUARANTINED: 'Cách ly',
  FAILED: 'Cách ly',
  FAIL: 'Không đạt',
  REJECTED: 'Từ chối',
  BREACH: 'Vượt ngưỡng',
  UNLOADED: 'Đã vào Silo',
};

function normalizedStatus(status: string): GlassBadgeStatus | string {
  const upper = status.toUpperCase();
  if (['COMMITTED', 'SYNCED', 'AVAILABLE', 'PASS'].includes(upper)) return upper;
  if (['PENDING', 'PENDING_WEIGH', 'PENDING_APPROVAL'].includes(upper)) return 'PENDING';
  if (['WEIGHED', 'IN_PROCESS', 'SYNCING', 'UNLOADED'].includes(upper)) return 'IN_PROCESS';
  if (['HOLD', 'QUARANTINED', 'FAILED', 'FAIL', 'REJECTED', 'BREACH'].includes(upper)) {
    return 'FAIL';
  }
  if (['COMPLIANT', 'CONFIRMED', 'SUCCESS'].includes(upper)) return 'COMPLETED';
  return status;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, size = 'small' }) => {
  const upper = status.toUpperCase();
  return (
    <GlassBadge status={normalizedStatus(status)} label={labels[upper] ?? status} size={size} />
  );
};
