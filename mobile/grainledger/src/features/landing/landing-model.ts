import { Decimal } from 'decimal.js';
import { MRL_DEMO } from './landing-data';

const DemoDecimal = Decimal.clone({ precision: 28, rounding: Decimal.ROUND_HALF_UP });
export type Market = keyof typeof MRL_DEMO.TCZ.limits;
export type Substance = keyof typeof MRL_DEMO;
export const markets: readonly Market[] = ['EU', 'USA', 'JAPAN', 'KOREA'];
export const substances: readonly Substance[] = ['TCZ', 'IPT', 'HXC'];
export const landingSections = ['problem', 'tech', 'comparison', 'simulators', 'ecosystem'] as const;
export type LandingSectionId = typeof landingSections[number];
export const primaryDestination = (authenticated: boolean): '/home' | '/sign-in' => authenticated ? '/home' : '/sign-in';
export const demoPresets = { balanced: ['100000', '88000', '12000'], rejected: ['100000', '92000', '12000'] } as const;

export type LedgerDemoResult = { status: 'empty' | 'invalid' } |
  { status: 'balanced' | 'rejected'; variance: string; allowed: string; totalOutAndLoss: string };

/** Landing-only illustration: source inclusive 0.5% tolerance, not an operational backend policy. */
export function evaluateLedgerDemo(input: string, output: string, loss: string): LedgerDemoResult {
  const values = [input, output, loss].map((value) => value.trim());
  if (values.some((value) => value === '')) return { status: 'empty' };
  const normalized = values.map((value) => value.replace(',', '.'));
  if (normalized.some((value) => !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value) || !Number.isFinite(Number(value)))) return { status: 'invalid' };
  const [incoming, outgoing, declared] = normalized.map((value) => new DemoDecimal(value));
  const total = outgoing.plus(declared);
  const variance = incoming.minus(total).abs();
  const allowed = incoming.times('0.005');
  return { status: variance.lte(allowed) ? 'balanced' : 'rejected', variance: variance.toString(),
    allowed: allowed.toString(), totalOutAndLoss: total.toString() };
}

export function evaluateMrlDemo(market: Market, substance: Substance) {
  const demo = MRL_DEMO[substance];
  const target = demo.limits[market];
  return { ...target, measured: demo.currentMeasured,
    compliant: new DemoDecimal(demo.currentMeasured).lte(target.safeMargin) };
}

export function formatDemoMass(value: string, locale: 'vi' | 'en') {
  const [whole, fraction] = new DemoDecimal(value).toFixed(3).split('.');
  return `${whole.replace(/\B(?=(\d{3})+(?!\d))/g, locale === 'vi' ? '.' : ',')}${locale === 'vi' ? ',' : '.'}${fraction}`;
}

export const sectionScrollOffset = (sectionY: number, contentTop: number, headerHeight: number) =>
  Math.max(0, contentTop + sectionY - headerHeight - 24);

/** Native equivalent of Navbar's header-relative activation line and bottom-of-page selection. */
export function activeLandingSection(scrollY: number, headerHeight: number, contentTop: number,
  offsets: Partial<Record<LandingSectionId, number>>, viewportHeight: number, contentHeight: number): LandingSectionId | null {
  if (contentHeight > viewportHeight && scrollY + viewportHeight >= contentHeight - 2) {
    const measured = landingSections.filter((id) => offsets[id] !== undefined);
    return measured.length ? measured[measured.length - 1] : null;
  }
  let active: LandingSectionId | null = null;
  for (const id of landingSections) {
    const y = offsets[id];
    if (y !== undefined && contentTop + y <= scrollY + headerHeight + 24) active = id;
  }
  return active;
}
