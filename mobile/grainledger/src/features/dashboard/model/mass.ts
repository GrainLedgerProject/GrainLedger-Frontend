// Compatible decimal formatting copied from web; ledger mass-balance logic is outside dashboard scope.
import { Decimal } from 'decimal.js';

// Configure Decimal.js with 20 decimal places of precision, matching NUMERIC(20,6)
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type MassInput = Decimal | string | number;

/** Safely convert any mass input to Decimal without floating-point artifacts */
export function toDecimal(val: MassInput | null | undefined): Decimal {
  if (val === null || val === undefined) return new Decimal(0);
  if (val instanceof Decimal) return val;
  if (typeof val === 'number') {
    return new Decimal(val.toString());
  }
  const clean = val.toString().trim().replace(/,/g, '');
  if (!clean || isNaN(Number(clean))) return new Decimal(0);
  return new Decimal(clean);
}

/**
 * Formats a Decimal mass value strictly to fixed decimals.
 * Follows Vietnamese standard number grouping (e.g., 88.000,000 kg) or English (88,000.000 kg)
 * depending on locale.
 */
export function formatMass(
  val: MassInput | null | undefined,
  decimals: 3 | 6 = 3,
  locale: 'vi' | 'en' = 'vi'
): string {
  const d = toDecimal(val);
  const fixedStr = d.toFixed(decimals);
  const [integerPart, fractionPart] = fixedStr.split('.');

  // Add thousand separators
  const separator = locale === 'vi' ? '.' : ',';
  const decimalPoint = locale === 'vi' ? ',' : '.';

  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, separator);
  return fractionPart ? `${formattedInteger}${decimalPoint}${fractionPart}` : formattedInteger;
}

export { Decimal };
