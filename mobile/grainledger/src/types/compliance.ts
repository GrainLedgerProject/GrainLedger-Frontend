/**
 * Compliance & Lab Test Data Models (matching Web specifications)
 */

export interface ActiveSubstance {
  id: string;
  code: string;
  name: string;
  category?: string;
  safetyIntervalDays?: number;
}

export interface LabResultItem {
  testLabel: string;
  substanceId: string;
  substanceName?: string;
  resultKind: 'NOT_DETECTED' | 'DETECTED_BELOW_LOQ' | 'QUANTIFIED';
  numericValue?: number;
  unit?: string;
  lod?: number;
  loq?: number;
  thresholdLimit?: number;
  status: 'PASS' | 'WARN' | 'FAIL';
  method?: string;
}

export interface LabSample {
  id: string;
  sourceLotId: string;
  sourceLotCode: string;
  sampleCode: string;
  sealCode: string;
  collectedAt: string;
  materialDescription?: string;
  collectionLocation?: string;
  status: 'COLLECTED' | 'HANDED_OVER' | 'TESTING' | 'COMPLETED';
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
}

export interface SampleHandover {
  id: string;
  sampleId: string;
  sampleCode: string;
  fromParty: string;
  toParty: string;
  handedOverAt: string;
  laboratoryName: string;
  laboratoryReference?: string;
  sealCondition: 'INTACT' | 'BROKEN' | 'TAMPERED';
  evidenceRef?: string;
}

export interface LabReport {
  id: string;
  sampleId?: string;
  sampleCode?: string;
  laboratoryName: string;
  reportNumber: string;
  issuedOn: string;
  receivedAt: string;
  overallConclusion: 'PASS' | 'FAIL';
  statedStandard: string; // e.g. "EU Regulation 396/2005", "Codex Alimentarius", "US FDA"
  results: LabResultItem[];
  confirmed: boolean;
}

export interface MrlComplianceRule {
  id: string;
  substanceCode: string;
  substanceName: string;
  marketJurisdiction: 'EU' | 'US' | 'JP' | 'VN' | 'CODEX';
  mrlLimitMgKg: number;
  safetyMarginPercent: number; // e.g. 10%
  effectiveThreshold: number;
}

