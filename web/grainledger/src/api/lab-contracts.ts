/** Response DTOs from Capture/LabReports/LabReportEndpoints.cs.
 * Input result sets use entityId; responses use id and include identity status.
 */
export interface LabResultResponse {
  id: string;
  testLabel: string;
  substanceId: string | null;
  originalResultText: string;
  resultKind: string;
  numericValue: string | null;
  unit: string | null;
  lod: string | null;
  loq: string | null;
  method: string | null;
  uncertainty: string | null;
  reference: string | null;
}
export interface LabResultSetResponse {
  id: string;
  sampleId: string | null;
  confirmedSampleId: string | null;
  sourceLotId: string | null;
  laboratorySampleReference: string | null;
  statedSampleCode: string | null;
  statedSealCode: string | null;
  sectionReference: string | null;
  identityStatus: string;
  results: LabResultResponse[];
}
export interface LabReportResponse {
  id: string;
  companyId: string;
  laboratoryName: string;
  reportNumber: string;
  issuedOn: string;
  receivedAt: string;
  reportKind: string;
  relatedReportId: string | null;
  relationshipReason: string | null;
  laboratoryConclusion: string | null;
  statedStandard: string | null;
  fileName: string;
  contentType: string;
  fileSize: number;
  sha256: string;
  recordedBy: string;
  capturedAt: string;
  recordedAt: string;
  status: string;
  confirmedBy: string | null;
  confirmedAt: string | null;
  resultSets: LabResultSetResponse[];
  relatedReports: Array<{ id: string; reportKind: string; relationshipReason: string | null }>;
  assessmentStatus: string;
  suggestedMarketCode: string;
  assessmentReasons: string[];
  residueBindings?: Array<{ resultId: string; sourceId: string; published: boolean; reasons: string[] }> | null;
  replacementReportId?: string | null;
}
export interface LabReportListResponse {
  items: LabReportResponse[];
  page: number;
  pageSize: number;
  hasMore: boolean;
}
