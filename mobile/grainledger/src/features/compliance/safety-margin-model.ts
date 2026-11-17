import { Decimal } from 'decimal.js';
import type { AuthUser } from '../auth/contracts';

// Historical demonstration constants from web SafetyMarginPolicyPage. NOT a current regulatory/policy catalog.
export const demoMarkets = ['EU', 'USA', 'JP', 'KR', 'CN', 'VN'] as const;
export type DemoMarket = typeof demoMarkets[number];
export const demoSubstances = [
  { code: 'TRICYCLAZOLE', name: 'Tricyclazole', limits: ['0.01', '0.05', '0.02', '0.01', '0.1', '0.1'], upper95: ['0.0078', '0.038', '0.015', '0.008', '0.075', '0.08'] },
  { code: 'HEXACONAZOLE', name: 'Hexaconazole', limits: ['0.02', '0.1', '0.05', '0.02', '0.05', '0.1'], upper95: ['0.016', '0.078', '0.039', '0.015', '0.04', '0.08'] },
  { code: 'CHLORPYRIFOS', name: 'Chlorpyrifos-ethyl', limits: ['0.01', '0.1', '0.01', '0.01', '0.1', '0.1'], upper95: ['0.007', '0.08', '0.008', '0.0075', '0.08', '0.085'] },
  { code: 'ISOPROTHIOLANE', name: 'Isoprothiolane', limits: ['0.1', '0.5', '0.2', '0.2', '0.5', '1'], upper95: ['0.08', '0.38', '0.15', '0.16', '0.4', '0.78'] },
  { code: 'FENOXANIL', name: 'Fenoxanil', limits: ['0.01', '0.05', '0.05', '0.02', '0.1', '0.2'], upper95: ['0.008', '0.038', '0.04', '0.015', '0.08', '0.15'] },
] as const;
export function canViewSafetyMargin(user: AuthUser | null) {
  return Boolean(user?.isActive && ['CUSTOMER_MANAGER', 'MILL_ADMIN'].includes(user.normalizedRole));
}
export function simulateSafetyMargin(limit: string, buffer: number, measured: string) {
  if (![10, 15, 20, 25, 30].includes(buffer) || !/^\d+(?:[.,]\d+)?$/.test(measured.trim())) return null;
  const mrl = new Decimal(limit); const value = new Decimal(measured.trim().replace(',', '.'));
  if (!mrl.isFinite() || mrl.lte(0) || !value.isFinite() || value.lt(0)) return null;
  const threshold = mrl.times(new Decimal(1).minus(new Decimal(buffer).div(100)));
  return { threshold: threshold.toFixed(4), limit: mrl.toFixed(4), measured: value.toFixed(4),
    verdict: value.lte(threshold) ? 'SAFE_PASS' as const : value.lte(mrl) ? 'WARNING_BUFFER' as const : 'EXCEEDED_MRL' as const };
}
