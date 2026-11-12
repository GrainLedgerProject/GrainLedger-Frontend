// Generated from openapi/v1.json by npm run api:generate. Do not edit.

export interface AddExportContainersRequest {
  /** format: "uuid" */
  "operationId": string;
  "containers": null | Array<ExportContainerInput>;
}

export interface AddExportSpecificationRequest {
  /** format: "uuid" */
  "operationId": string;
  "limits": null | Array<ExportLimitInput>;
}

export interface CancelBlendPlanDraftRequest {
  /** format: "uuid" */
  "operationId": string;
}

export interface CaptureLabReportRequest {
  "deviceId": null | string;
  /** format: "uuid" */
  "clientOperationId": string;
  /** format: "date-time" */
  "capturedAt": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "payloadSchemaVersion": number | string;
  "payload": (null) | (LabReportInput);
}

export interface CaptureSampleRequest {
  "deviceId": null | string;
  /** format: "uuid" */
  "clientOperationId": string;
  /** format: "date-time" */
  "capturedAt": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "payloadSchemaVersion": number | string;
  "payload": (null) | (SampleInput);
}

export interface ConfirmLabReportInput {
  "identityChecked": boolean;
  "transcriptionChecked": boolean;
  "matches": null | Array<LabReportMatchInput>;
}

export interface ConfirmLabReportRequest {
  "deviceId": null | string;
  /** format: "uuid" */
  "clientOperationId": string;
  /** format: "date-time" */
  "capturedAt": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "payloadSchemaVersion": number | string;
  "payload": (null) | (ConfirmLabReportInput);
}

export interface CreateActiveSubstanceRequest {
  "code": null | string;
  "name": null | string;
}

export interface CreateBlendPlanDraftRequest {
  /** format: "uuid" */
  "operationId": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "orderVersion": number | string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "containerVersion": number | string;
  "targetProductIdentity": null | string;
}

export interface CreateCommodityRequest {
  "code": null | string;
  "name": null | string;
}

export interface CreateCropSeasonRequest {
  /** format: "uuid" */
  "companyId": string;
  "name": null | string;
  /** format: "date" */
  "startsOn": string;
  /** format: "date" */
  "endsOn": string;
}

export interface CreateExportOrderRequest {
  /** format: "uuid" */
  "operationId": string;
  /** format: "uuid" */
  "marketId": string;
  /** format: "uuid" */
  "commodityId": string;
  "requiredMass": null | string;
  "unit": null | string;
  /** format: "date" */
  "shippingFrom": string;
  /** format: "date" */
  "shippingTo": string;
  "limits": null | Array<ExportLimitInput>;
  "containers": null | Array<ExportContainerInput>;
}

export interface CreateMarketRequest {
  "code": null | string;
  "name": null | string;
}

export interface CreateMeasurementUnitRequest {
  "code": null | string;
  "name": null | string;
  "quantityKind": null | string;
}

export interface CreateMrlVersionRequest {
  /** format: "uuid" */
  "marketId": string;
  /** format: "uuid" */
  "commodityId": string;
  /** format: "date-time" */
  "effectiveFrom": null | string;
  /** format: "date-time" */
  "effectiveTo": null | string;
  "sourceRef": null | string;
}

export interface CreateOrganizationRequest {
  /** minLength: 1; maxLength: 160 */
  "name": string;
  "kind": OrganizationKind;
}

export interface CreateQualityAttributeRequest {
  "code": null | string;
  "name": null | string;
  "unit": null | string;
}

export interface CreateRiceVarietyRequest {
  "code": null | string;
  "name": null | string;
}

export interface DeleteCropSeasonRequest {
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "version": number | string;
}

export interface DeleteLabReportRequest {
  "deviceId": null | string;
  /** format: "uuid" */
  "clientOperationId": string;
  /** format: "date-time" */
  "capturedAt": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "payloadSchemaVersion": number | string;
}

export interface DeletePlotSeasonRequest {
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "version": number | string;
}

export interface DeleteReferenceRequest {
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "version": number | string;
}

export interface EvidenceRequest {
  /** format: "uuid" */
  "id": string;
  /** format: "uuid" */
  "ownerId": string;
  /** format: "uuid" */
  "facilityId": string;
  "fileName": string;
  "contentType": string;
  "contentBase64": string;
}

export interface ExportContainerInput {
  "targetMass": null | string;
  "unit": null | string;
}

export interface ExportLimitInput {
  /** format: "uuid" */
  "attributeId": string;
  "minValue": null | string;
  "maxValue": null | string;
}

export interface FarmerDuplicateRequest {
  "name": null | string;
  "contact": null | string;
  /** format: "uuid" */
  "excludeId": null | string;
}

export interface FarmerInput {
  /** format: "uuid" */
  "entityId": string;
  "code": null | string;
  "name": null | string;
  "contact": null | string;
}

export interface ForgotPasswordRequest {
  "email": string;
}

export interface ImportMrlLimitRequest {
  "substanceCode": null | string;
  "limitValue": null | string;
  "unit": null | string;
}

export interface ImportMrlVersionRequest {
  /** format: "uuid" */
  "marketId": string;
  /** format: "uuid" */
  "commodityId": string;
  /** format: "date-time" */
  "effectiveFrom": null | string;
  /** format: "date-time" */
  "effectiveTo": null | string;
  "sourceRef": null | string;
  "limits": null | Array<ImportMrlLimitRequest>;
}

export interface IssuedTokens {
  "accessToken": string;
  "refreshToken": string;
  "tokenType": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "expiresIn": number | string;
  "user": SessionUserDto;
}

export type JsonElement = unknown;

export type JsonObject = object;

export interface LabReportInput {
  /** format: "uuid" */
  "entityId": string;
  "laboratoryName": null | string;
  "reportNumber": null | string;
  /** format: "date" */
  "issuedOn": string;
  /** format: "date-time" */
  "receivedAt": string;
  "reportKind": null | string;
  /** format: "uuid" */
  "relatedReportId": null | string;
  "relationshipReason": null | string;
  "fileName": null | string;
  "contentType": null | string;
  "contentBase64": null | string;
  "companyOnlyConfirmed": boolean;
  "laboratoryConclusion": null | string;
  "statedStandard": null | string;
  "resultSets": null | Array<LabResultSetInput>;
}

export interface LabReportMatchInput {
  /** format: "uuid" */
  "resultSetId": string;
  /** format: "uuid" */
  "sampleId": string;
  "identityBasis": null | string;
  "evidenceRef"?: null | string;
}

export interface LabResultInput {
  "testLabel": null | string;
  "substanceId": null | string;
  "originalResultText": null | string;
  "resultKind": null | string;
  "numericValue"?: null | string;
  "unit"?: null | string;
  "lod"?: null | string;
  "loq"?: null | string;
  "method"?: null | string;
  "uncertainty"?: null | string;
  "reference"?: null | string;
}

export interface LabResultSetInput {
  /** format: "uuid" */
  "entityId": string;
  /** format: "uuid" */
  "sampleId": null | string;
  "laboratorySampleReference": null | string;
  "statedSampleCode": null | string;
  "statedSealCode": null | string;
  "sectionReference": null | string;
  "results": null | Array<LabResultInput>;
}

export interface LabTraceRequest {
  /** format: "uuid" */
  "reportId": string;
  /** format: "uuid" */
  "resultId": string;
  /** default: "current" */
  "view"?: string;
}

export interface LoginRequest {
  "email": string;
  "password": string;
}

export interface LotTraceRequest {
  /** format: "uuid" */
  "lotId": string;
  /** default: "forward" */
  "direction"?: string;
  /** default: "current" */
  "view"?: string;
}

export type OrganizationKind = "Mill" | "Customer";

export interface PlanResiduePosition {
  /** format: "uuid" */
  "lotId": string;
  /** format: "uuid" */
  "locationId": string;
  "quantityKg": string;
  "candidateRevision": string;
}

export interface PlanResiduePreviewRequest {
  /** format: "uuid" */
  "facilityId": string;
  "scopeRevision": string;
  "mode": string;
  /** format: "uuid" */
  "compatibilityPolicyId": null | string;
  "selected": Array<PlanResiduePosition>;
  "substanceIds": Array<string>;
}

export interface PlotDuplicateRequest {
  "geometry": JsonElement;
  /** format: "uuid" */
  "excludeId": null | string;
}

export interface PlotInput {
  /** format: "uuid" */
  "entityId": string;
  /** format: "uuid" */
  "farmerId": string;
  "code": null | string;
  "geometry": JsonElement;
  /** format: "double"; pattern: "^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?$" */
  "areaHa": number | string;
}

export interface PlotSeasonInput {
  /** format: "uuid" */
  "entityId": string;
  /** format: "uuid" */
  "plotId": string;
  /** format: "uuid" */
  "seasonId": string;
  "riceVariety": null | string;
}

export interface PreviewBlendPlanRequest {
  /** format: "uuid" */
  "facilityId": string;
  "scopeRevision": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$"; default: 32 */
  "maxIterations"?: number | string;
}

export interface ProblemDetails {
  "type"?: null | string;
  "title"?: null | string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "status"?: null | number | string;
  "detail"?: null | string;
  "instance"?: null | string;
}

export interface ProcurementInput {
  /** format: "uuid" */
  "entityId": string;
  /** format: "uuid" */
  "farmerId": string;
  /** format: "uuid" */
  "collectionSiteId": string;
  /** format: "uuid" */
  "receivingLocationId": string;
  /** format: "uuid" */
  "commodityId": string;
  /** format: "date-time" */
  "receivedAt": string;
  "items": null | Array<ProcurementLineInput>;
}

export interface ProcurementLineInput {
  /** format: "uuid" */
  "itemId": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "lineNo": number | string;
  /** format: "uuid" */
  "plotSeasonId": string;
  "measuredValue": null | string;
  "measuredUnit": null | string;
  "moisturePercent": null | string;
  /** format: "uuid" */
  "lotId": string;
  /** format: "uuid" */
  "sourceLotId": string;
}

export interface ProposeBlendPlanRequest {
  /** format: "uuid" */
  "operationId": string;
  /** format: "uuid" */
  "previewReference": string;
}

export interface PublishBlendAssessmentPolicyRequest {
  /** format: "uuid" */
  "id": string;
  /** format: "uuid" */
  "marketId": string;
  /** format: "uuid" */
  "commodityId": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "versionNo": number | string;
  /** format: "date-time" */
  "effectiveFrom": string;
  /** format: "date-time" */
  "effectiveTo": null | string;
  "requiredSubstanceIds": Array<string>;
  "mrlMarginFraction": string;
  "residueBasis": string;
  "qualityRules": Array<PublishedQualityPropagationRule>;
  "evidenceReference": string;
  "reviewedBy": string;
  "reviewAuthority": string;
  /** format: "date-time" */
  "reviewedAt": string;
}

export interface PublishedQualityPropagationRule {
  /** format: "uuid" */
  "attributeId": string;
  "unit": string;
  "calculation": string;
}

export interface RecordSampleHandoverRequest {
  "deviceId": null | string;
  /** format: "uuid" */
  "clientOperationId": string;
  /** format: "date-time" */
  "capturedAt": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "payloadSchemaVersion": number | string;
  "payload": (null) | (SampleHandoverInput);
}

export interface RecordSprayDeclarationRequest {
  "deviceId": null | string;
  /** format: "uuid" */
  "clientOperationId": string;
  /** format: "date-time" */
  "capturedAt": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "payloadSchemaVersion": number | string;
  "payload": (null) | (SprayDeclarationInput);
}

export interface RefreshRequest {
  "refreshToken": string;
}

export interface RegisterFarmerRequest {
  "deviceId": null | string;
  /** format: "uuid" */
  "clientOperationId": string;
  /** format: "date-time" */
  "capturedAt": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "payloadSchemaVersion": number | string;
  "payload": (null) | (FarmerInput);
}

export interface RegisterPlotRequest {
  "deviceId": null | string;
  /** format: "uuid" */
  "clientOperationId": string;
  /** format: "date-time" */
  "capturedAt": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "payloadSchemaVersion": number | string;
  "payload": (null) | (PlotInput);
}

export interface RegisterPlotSeasonRequest {
  "deviceId": null | string;
  /** format: "uuid" */
  "clientOperationId": string;
  /** format: "date-time" */
  "capturedAt": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "payloadSchemaVersion": number | string;
  "payload": (null) | (PlotSeasonInput);
}

export interface RegisterProcurementRequest {
  "deviceId": null | string;
  /** format: "uuid" */
  "clientOperationId": string;
  /** format: "date-time" */
  "capturedAt": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "payloadSchemaVersion": number | string;
  "payload": (null) | (ProcurementInput);
}

export interface RegisterRequest {
  /** minLength: 0; maxLength: 320 */
  "email": string;
  /** minLength: 0; maxLength: 128 */
  "password": string;
  /** minLength: 1; maxLength: 120 */
  "displayName": string;
}

export interface RegistrationPendingDto {
  /** format: "uuid" */
  "registrationId": string;
  "email": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "expiresIn": number | string;
}

export interface ResendVerificationRequest {
  "email": string;
  /** format: "uuid" */
  "registrationId": string;
}

export interface ResetPasswordRequest {
  "email": string;
  /** pattern: "^[0-9]{6}$" */
  "otp": string;
  "newPassword": string;
}

export interface ResidueEvaluationRequest {
  /** format: "uuid" */
  "id": string;
  "substanceIds": Array<string>;
}

export interface ResidueMatrixPublication {
  /** format: "uuid" */
  "companyId": null | string;
  "rules": Array<ResidueMatrixRuleChange>;
  "settings": Array<ResidueMatrixSettingChange>;
  /** format: "date-time" */
  "effectiveFrom": string;
  /** format: "date-time" */
  "effectiveTo": null | string;
  "reviewedBy": string;
  "reviewAuthority": string;
  /** format: "date-time" */
  "reviewedAt": string;
}

export interface ResidueMatrixRuleChange {
  /** format: "uuid" */
  "baseId": null | string;
  /** format: "uuid" */
  "sourceId": string;
  "rule": ResidueRuleVersion;
}

export interface ResidueMatrixSettingChange {
  "ruleCode": string;
  /** format: "uuid" */
  "baseId": null | string;
  "mode": string;
  "evidenceRef": string;
  "applicabilityStatement": string;
}

export interface ResiduePolicySettingBatch {
  "items": Array<ResiduePolicySettingVersion>;
}

export interface ResiduePolicySettingVersion {
  /** format: "uuid" */
  "id": string;
  /** format: "uuid" */
  "companyId": string;
  "ruleCode": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "versionNo": number | string;
  "mode": string;
  /** format: "date-time" */
  "effectiveFrom": string;
  /** format: "date-time" */
  "effectiveTo": null | string;
  /** format: "uuid" */
  "supersedesId": null | string;
  "evidenceRef": string;
  "applicabilityStatement": string;
  "reviewedBy": string;
  "reviewAuthority": string;
  /** format: "date-time" */
  "reviewedAt": string;
  /** format: "uuid" */
  "publishedBy"?: null | string;
  /** format: "date-time" */
  "publishedAt"?: null | string;
}

export interface ResidueReportReviewRequest {
  /** format: "uuid" */
  "companyId": string;
  /** format: "date-time" */
  "effectiveFrom": null | string;
  "rows": Array<ResidueReportReviewRow>;
}

export interface ResidueReportReviewRow {
  /** format: "uuid" */
  "id": string;
  /** format: "uuid" */
  "resultId": string;
  /** format: "uuid" */
  "sourceId": string;
  "absoluteUncertainty"?: null | string;
  "reportingThreshold"?: null | string;
  "supersededResultIds"?: null | Array<string>;
  /** format: "uuid" */
  "supersedesId"?: null | string;
  "note"?: null | string;
  "previewFingerprint"?: null | string;
}

export interface ResidueReportSelection {
  /** format: "uuid" */
  "id": string;
  /** format: "uuid" */
  "companyId": string;
  /** format: "uuid" */
  "sourceId": string;
  /** format: "uuid" */
  "substanceId": string;
  /** format: "uuid" */
  "selectedResultId": string;
  "supersededResultIds": Array<string>;
  "materialBasis": string;
  "residueDefinition": string;
  "absoluteUncertainty": null | string;
  "reportingThreshold": null | string;
  /** format: "date-time" */
  "effectiveFrom": string;
  /** format: "date-time" */
  "effectiveTo": null | string;
  /** format: "uuid" */
  "supersedesId": null | string;
  "evidenceRef": string;
  "applicabilityStatement": string;
  "reviewedBy": string;
  "reviewAuthority": string;
  /** format: "date-time" */
  "reviewedAt": string;
  /** format: "uuid" */
  "publishedBy"?: null | string;
  /** format: "date-time" */
  "publishedAt"?: null | string;
  /** format: "uuid" */
  "bindingReportId"?: null | string;
  /** format: "uuid" */
  "profileRuleId"?: null | string;
  /** format: "uuid" */
  "profileSettingId"?: null | string;
  "bindingRequest"?: null | string;
  "bindingFingerprint"?: null | string;
  "bindingNote"?: null | string;
}

export interface ResidueRuleVersion {
  /** format: "uuid" */
  "id": string;
  "code": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "versionNo": number | string;
  "kind": string;
  /** format: "uuid" */
  "substanceId": string;
  "residueDefinition": string;
  "inputStage": string;
  "outputStage": string;
  "inputBasis": string;
  "outputBasis": string;
  "outputFraction": string;
  "process": string;
  "conditions": string;
  "unit": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "decimalPlaces": number | string;
  "interpretationKind": null | string;
  "ndThresholdKind": null | string;
  "factorLower": null | string;
  "factorUpper": null | string;
  "factorSemantics": null | string;
  "homogeneousMixing": boolean;
  /** format: "date-time" */
  "effectiveFrom": string;
  /** format: "date-time" */
  "effectiveTo": null | string;
  /** format: "uuid" */
  "supersedesId": null | string;
  "evidenceRef": string;
  "applicabilityStatement": string;
  "reviewedBy": string;
  "reviewAuthority": string;
  /** format: "date-time" */
  "reviewedAt": string;
  /** format: "uuid" */
  "publishedBy"?: null | string;
  /** format: "date-time" */
  "publishedAt"?: null | string;
  /** format: "uuid" */
  "commodityId"?: null | string;
  /** default: "" */
  "analyticalMethod"?: string;
  /** format: "uuid" */
  "companyId"?: null | string;
  "relativeUncertaintyPercent"?: null | string;
  /** default: false */
  "relativeUncertaintyAtZero"?: boolean;
}

export interface ResidueSourceGroupVersion {
  /** format: "uuid" */
  "id": string;
  /** format: "uuid" */
  "companyId": string;
  "code": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "versionNo": number | string;
  /** format: "uuid" */
  "substanceId": string;
  "sourceIds": Array<string>;
  "productStage": string;
  "productIdentity": string;
  "materialBasis": string;
  "residueDefinition": string;
  "lower": string;
  "upper": string;
  "unit": string;
  "precedence": string;
  "supportingResultIds": Array<string>;
  /** format: "date-time" */
  "effectiveFrom": string;
  /** format: "date-time" */
  "effectiveTo": null | string;
  /** format: "uuid" */
  "supersedesId": null | string;
  "evidenceRef": string;
  "applicabilityStatement": string;
  "reviewedBy": string;
  "reviewAuthority": string;
  /** format: "date-time" */
  "reviewedAt": string;
  /** format: "uuid" */
  "publishedBy"?: null | string;
  /** format: "date-time" */
  "publishedAt"?: null | string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$"; default: -1 */
  "decimalPlaces"?: number | string;
}

export interface SampleHandoverInput {
  /** format: "uuid" */
  "entityId": string;
  "fromParty": null | string;
  "toParty": null | string;
  /** format: "date-time" */
  "handedOverAt": string;
  "sealCondition": null | string;
  "evidenceRef": null | string;
  "handoverKind"?: null | string;
  "laboratoryName"?: null | string;
  "laboratoryReference"?: null | string;
  "laboratorySampleReference"?: null | string;
}

export interface SampleInput {
  /** format: "uuid" */
  "entityId": string;
  /** format: "uuid" */
  "sourceLotId": string;
  "code": null | string;
  "sealCode": null | string;
  /** format: "date-time" */
  "collectedAt": string;
  "materialDescription"?: null | string;
}

export interface SessionUserDto {
  /** format: "uuid" */
  "id": string;
  "email": string;
  "displayName": string;
  "phoneNumber": null | string;
  "role": null | string;
  /** format: "uuid" */
  "organizationId": null | string;
  "organizationName": null | string;
  "isActive": boolean;
  "permissions": Array<string>;
}

export interface SprayDeclarationInput {
  /** format: "uuid" */
  "entityId": string;
  /** format: "uuid" */
  "plotSeasonId": string;
  /** format: "date" */
  "appliedOn": string;
  "informationSource": null | string;
  "evidenceRef": null | string;
  "items": null | Array<SprayItemInput>;
}

export interface SprayItemInput {
  "productName": null | string;
  /** format: "uuid" */
  "substanceId": null | string;
}

export interface UpdateAccessRequest {
  "role": null | string;
  /** format: "uuid" */
  "organizationId": null | string;
  "isActive": boolean;
}

export interface UpdateActiveSubstanceRequest {
  "name": null | string;
}

export interface UpdateCommodityRequest {
  "name": null | string;
}

export interface UpdateCropSeasonRequest {
  /** format: "uuid" */
  "companyId": string;
  "name": null | string;
  /** format: "date" */
  "startsOn": string;
  /** format: "date" */
  "endsOn": string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "expectedVersion": number | string;
}

export interface UpdateExportContainerRequest {
  /** format: "uuid" */
  "operationId": string;
  "targetMass": null | string;
  "unit": null | string;
}

export interface UpdateExportOrderRequest {
  /** format: "uuid" */
  "operationId": string;
  /** format: "uuid" */
  "marketId": string;
  /** format: "uuid" */
  "commodityId": string;
  "requiredMass": null | string;
  "unit": null | string;
  /** format: "date" */
  "shippingFrom": string;
  /** format: "date" */
  "shippingTo": string;
}

export interface UpdateFarmerRequest {
  "code": null | string;
  "name": null | string;
  "contact": null | string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "expectedVersion": number | string;
}

export interface UpdateMarketRequest {
  "name": null | string;
}

export interface UpdateMeasurementUnitRequest {
  "name": null | string;
  "code": null | string;
  "quantityKind": null | string;
}

export interface UpdatePlotRequest {
  /** format: "uuid" */
  "farmerId": string;
  "code": null | string;
  "geometry": JsonElement;
  /** format: "double"; pattern: "^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?$" */
  "areaHa": number | string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "expectedVersion": number | string;
}

export interface UpdatePlotSeasonRequest {
  /** format: "uuid" */
  "plotId": string;
  /** format: "uuid" */
  "seasonId": string;
  "riceVariety": null | string;
  /** format: "int32"; pattern: "^-?(?:0|[1-9]\\d*)$" */
  "expectedVersion": number | string;
}

export interface UpdateProfileRequest {
  /** minLength: 1; maxLength: 120 */
  "displayName": string;
  /** minLength: 0; maxLength: 32 */
  "phoneNumber": null | string;
}

export interface UpdateQualityAttributeRequest {
  "name": null | string;
  "code": null | string;
  "unit": null | string;
}

export interface UpdateRiceVarietyRequest {
  "name": null | string;
}

export interface UpsertMrlLimitRequest {
  /** format: "double"; pattern: "^-?(?:0|[1-9]\\d*)(?:\\.\\d+)?$" */
  "limitValue": null | number | string;
  "unit": null | string;
}

export interface VerifyEmailRequest {
  "email": string;
  /** format: "uuid" */
  "registrationId": string;
  /** pattern: "^[0-9]{6}$" */
  "otp": string;
}
