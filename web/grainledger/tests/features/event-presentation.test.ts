import { describe, expect, it } from 'vitest';
import { ledgerHistoryKinds } from '@/api/history';
import { BUSINESS_EVENT_TYPES } from '@/features/audit/model/businessHistory';
import i18n from '@/app/i18n';
import { detailLabel, detailValue, eventLabel, readableDecimal, structuredDetails } from '@/features/audit/model/eventPresentation';

describe('Readable event details', () => {
  it('defines a translation for each backend history kind and business event type in both locales', () => {
    for (const language of ['vi', 'en']) {
      for (const kind of ledgerHistoryKinds) {
        expect(i18n.getResource(language, 'translation', `audit.events.types.${kind}`)).toEqual(expect.any(String));
      }
      for (const { eventType } of BUSINESS_EVENT_TYPES) {
        expect(i18n.exists(`audit.events.types.${eventType}`, { lng: language })).toBe(true);
      }
    }
  });

  it('provides human labels while preserving unknown field names and values', () => {
    expect(eventLabel('MILLING', 'vi')).toBe('Xay xát');
    expect(eventLabel('MILLING', 'en')).toBe('Rice milling');
    expect(eventLabel('FUTURE_KIND', 'vi')).toBe('FUTURE KIND');
    expect(detailValue('kind', 'PROCESSING_COMPENSATION', 'vi')).toBe('Đảo bút toán chế biến');
    expect(detailLabel('declaredLossKg', 'vi')).toBe('Hao hụt khai báo');
    expect(detailLabel('customValue', 'vi')).toBe('Custom Value');
    expect(detailValue('customValue', 'original-value', 'vi')).toBe('original-value');
  });

  it('formats exact ledger decimals with units without floating-point rounding', () => {
    expect(readableDecimal('999999999999999999.123456', 'vi')).toBe('999.999.999.999.999.999,123456');
    expect(detailValue('varianceKg', '-1250.125000', 'vi')).toBe('-1.250,125 kg');
    expect(detailValue('quantityKg', '0.000', 'vi')).toBe('0 kg');
    expect(detailValue('moisturePercent', '24.50', 'vi')).toBe('24,5 %');
    expect(detailValue('quantityKg', '1250.125', 'en')).toBe('1,250.125 kg');
  });

  it('distinguishes absent values from false or zero', () => {
    expect(detailValue('declaredLossKg', null, 'vi')).toBe('Chưa cung cấp');
    expect(detailValue('approved', false, 'vi')).toBe('Không');
    expect(detailValue('approved', true, 'vi')).toBe('Có');
    expect(detailValue('version', 0, 'vi')).toBe('0');
  });

  it('reads structured JSON strings without breaking free-text notes', () => {
    expect(structuredDetails('{"inputs":[{"quantityKg":"2.500"}]}')).toEqual({ inputs: [{ quantityKg: '2.500' }] });
    expect(structuredDetails('Receipt confirmed')).toBe('Receipt confirmed');
    expect(structuredDetails('{incomplete')).toBe('{incomplete');
    expect(detailValue('stage', 'RAW_PADDY', 'vi')).toBe('Lúa tươi');
  });
});
