import type { FieldSpec } from './domain-ui';
export function normalizeReviewedForm(fields: FieldSpec[], form: Record<string, unknown>): Record<string, unknown> {
  const result = { ...form };
  for (const field of fields) {
    const value = form[field.key];
    if (field.kind === 'ids') result[field.key] = typeof value === 'string' ? value.split(/[\s,]+/).filter(Boolean) : value ?? [];
    else if (field.kind === 'number') result[field.key] = typeof value === 'number' ? value : value === '' ? NaN : Number(value);
    else if (field.kind === 'array') result[field.key] = (value as Record<string, unknown>[] ?? []).map((row) => normalizeReviewedForm(field.fields ?? [], row));
    else if (field.nullable && (value === '' || value === undefined)) result[field.key] = null;
  }
  return result;
}
export const textField = (key: string, vi: string, en: string, extra: Partial<FieldSpec> = {}): FieldSpec => ({ key, label: [vi, en], ...extra });
export const reviewSpecs: FieldSpec[] = [textField('id', 'ID phiên bản mới', 'New version ID', { readonly: true }),
  textField('effectiveFrom', 'Hiệu lực từ (ISO, có múi giờ) *', 'Effective from (ISO with timezone) *'), textField('effectiveTo', 'Hiệu lực đến (không bắt buộc)', 'Effective until (optional)', { nullable: true }),
  textField('supersedesId', 'ID phiên bản được thay thế', 'Superseded version ID', { nullable: true }), textField('evidenceRef', 'Tham chiếu bằng chứng thẩm định *', 'Reviewed evidence reference *'),
  textField('applicabilityStatement', 'Phạm vi áp dụng đã thẩm định *', 'Reviewed applicability statement *', { multiline: true }), textField('reviewedBy', 'Người thẩm định *', 'Reviewed by *'),
  textField('reviewAuthority', 'Cơ quan / thẩm quyền thẩm định *', 'Review authority *'), textField('reviewedAt', 'Thời điểm đã thẩm định (ISO) *', 'Completed review time (ISO) *')];
export function reviewDraft(uuid: () => string, companyId: string | null) {
  return { id: uuid(), companyId, effectiveFrom: new Date().toISOString(), effectiveTo: null, supersedesId: null, evidenceRef: '', applicabilityStatement: '', reviewedBy: '', reviewAuthority: '', reviewedAt: '' };
}
export const settingSpecs: FieldSpec[] = [textField('companyId', 'ID công ty sở hữu *', 'Owning company ID *'), textField('ruleCode', 'Mã chuỗi hồ sơ *', 'Profile series code *'),
  textField('versionNo', 'Phiên bản chính sách *', 'Setting version *', { kind: 'number' }), textField('mode', 'Cách áp dụng', 'Adoption mode', { kind: 'select', options: ['SYSTEM_DEFAULT', 'COMPANY_OVERRIDE'] }), ...reviewSpecs];
export function ruleSpecs(uuid: () => string): FieldSpec[] {
  const labFields: FieldSpec[] = [textField('analyticalMethod', 'Tên phương pháp chính xác *', 'Exact analytical method *'),
    textField('numericInterpretationKind', 'Diễn giải kết quả số', 'Numeric interpretation', { kind: 'select', nullable: true, options: ['NUMERIC_ABSOLUTE_UNCERTAINTY', 'NUMERIC_RELATIVE_UNCERTAINTY'] }),
    textField('relativeUncertaintyPercent', 'Độ không đảm bảo tương đối (%)', 'Relative uncertainty (%)', { nullable: true }), textField('relativeUncertaintyAtZero', 'Áp dụng tại giá trị 0', 'Apply at zero', { kind: 'bool' }),
    textField('belowLimit', 'Cho phép kết quả dưới giới hạn', 'Allow below-limit results', { kind: 'bool' }), textField('ndThresholdKind', 'Ngưỡng không phát hiện', 'Non-detect threshold', { kind: 'select', nullable: true, options: ['REPORTING_THRESHOLD', 'LOD', 'LOQ'] })];
  const stages = ['RAW_PADDY', 'DRIED_PADDY', 'HEAD_RICE', 'BROKEN_RICE', 'BRAN', 'HUSK', 'BLENDED_RICE', 'BAGGED_RICE'];
  return [textField('companyId', 'ID công ty (trống = hệ thống)', 'Company ID (empty = system scope)', { nullable: true }), textField('code', 'Mã chuỗi hồ sơ *', 'Profile series code *'),
    textField('versionNo', 'Phiên bản mới *', 'New version *', { kind: 'number' }), textField('substanceId', 'ID hoạt chất *', 'Substance ID *'), textField('commodityId', 'ID loại hàng *', 'Commodity ID *'),
    textField('residueDefinition', 'Định nghĩa dư lượng đã thẩm định *', 'Reviewed residue definition *'), textField('unit', 'Đơn vị', 'Unit', { readonly: true }),
    textField('decimalPlaces', 'Số chữ số thập phân (0–18)', 'Decimal places (0–18)', { kind: 'number' }),
    { key: 'laboratory', label: ['Phương pháp xét nghiệm', 'Laboratory methods'], kind: 'array', fields: labFields, createRow: () => ({ analyticalMethod: '', numericInterpretationKind: null, relativeUncertaintyPercent: null, relativeUncertaintyAtZero: false, belowLimit: false, ndThresholdKind: null }) },
    { key: 'steps', label: ['Công đoạn và hệ số đã thẩm định', 'Reviewed processing steps and factors'], kind: 'array', createRow: () => ({ id: uuid(), process: 'DRYING', inputStage: 'RAW_PADDY', outputStage: 'DRIED_PADDY', outputFraction: 'DRIED_PADDY', conditions: '', factorLower: '', factorUpper: '', factorSemantics: 'STEP_CONCENTRATION', anchorStage: null, homogeneousMixing: false }), fields: [
      textField('id', 'ID bước (giữ nguyên nếu cùng đường xử lý)', 'Step ID (retain for unchanged path)', { readonly: true }), textField('process', 'Công đoạn', 'Process', { kind: 'select', options: ['DRYING', 'MILLING', 'BLENDING', 'BAGGING'] }),
      ...(['inputStage', 'outputStage', 'outputFraction'] as const).map((key) => textField(key, key === 'inputStage' ? 'Giai đoạn vào' : key === 'outputStage' ? 'Giai đoạn ra' : 'Phân đoạn ra', key === 'inputStage' ? 'Input stage' : key === 'outputStage' ? 'Output stage' : 'Output fraction', { kind: 'select', options: stages })),
      textField('conditions', 'Điều kiện đã thẩm định *', 'Reviewed conditions *'), textField('factorLower', 'Hệ số dưới (thập phân chính xác) *', 'Exact lower factor *'), textField('factorUpper', 'Hệ số trên *', 'Upper factor *'),
      textField('factorSemantics', 'Ý nghĩa hệ số', 'Factor semantics', { kind: 'select', options: ['STEP_CONCENTRATION', 'CUMULATIVE_CONCENTRATION'] }), textField('anchorStage', 'Giai đoạn mốc', 'Anchor stage', { nullable: true, kind: 'select', options: stages }), textField('homogeneousMixing', 'Đã thẩm định trộn đồng nhất', 'Homogeneous mixing reviewed', { kind: 'bool' }) ] },
    textField('asReceivedConfirmed', 'Xác nhận cơ sở nồng độ ở trạng thái tiếp nhận *', 'Confirm as-received concentration basis *', { kind: 'bool' }), ...reviewSpecs];
}
export const selectionSpecs: FieldSpec[] = [textField('companyId', 'ID công ty *', 'Company ID *'), textField('sourceId', 'ID nguồn Capture (không phải lô Ledger) *', 'Capture source ID (not Ledger lot) *'),
  textField('substanceId', 'ID hoạt chất *', 'Substance ID *'), textField('selectedResultId', 'ID kết quả đã xác nhận được chọn *', 'Selected confirmed result ID *'),
  textField('supersededResultIds', 'ID kết quả được thay thế', 'Superseded result IDs', { kind: 'ids' }), textField('residueDefinition', 'Định nghĩa dư lượng *', 'Residue definition *'),
  textField('absoluteUncertainty', 'Độ không đảm bảo tuyệt đối đã thẩm định', 'Reviewed absolute uncertainty', { nullable: true }), textField('reportingThreshold', 'Ngưỡng báo cáo đã thẩm định', 'Reviewed reporting threshold', { nullable: true }),
  textField('profileCode', 'Mã hồ sơ đã áp dụng *', 'Adopted profile code *'), textField('laboratoryMethod', 'Tên phương pháp chính xác *', 'Exact laboratory method *'),
  textField('asReceivedConfirmed', 'Đã xác nhận cơ sở trạng thái tiếp nhận *', 'As-received basis confirmed *', { kind: 'bool' }), ...reviewSpecs];
export const groupSpecs: FieldSpec[] = [textField('companyId', 'ID công ty *', 'Company ID *'), textField('code', 'Mã nhóm nguồn *', 'Source group code *'), textField('versionNo', 'Phiên bản *', 'Version *', { kind: 'number' }),
  textField('substanceId', 'ID hoạt chất *', 'Substance ID *'), textField('sourceIds', 'ID nguồn Capture thành viên *', 'Member Capture source IDs *', { kind: 'ids' }), textField('supportingResultIds', 'ID kết quả xác nhận hỗ trợ', 'Supporting confirmed result IDs', { kind: 'ids' }),
  textField('residueDefinition', 'Định nghĩa dư lượng *', 'Residue definition *'), textField('lower', 'Cận dưới đã thẩm định *', 'Reviewed lower bound *'), textField('upper', 'Cận trên đã thẩm định *', 'Reviewed upper bound *'),
  textField('decimalPlaces', 'Độ chính xác (0–18)', 'Decimal places (0–18)', { kind: 'number' }), textField('profileCode', 'Mã hồ sơ đã áp dụng *', 'Adopted profile code *'),
  textField('precedence', 'Ưu tiên bằng chứng', 'Evidence precedence', { kind: 'select', options: ['DIRECT_FIRST', 'GROUP_FIRST', 'UNTESTED_ONLY'] }),
  textField('asReceivedConfirmed', 'Xác nhận cơ sở trạng thái tiếp nhận *', 'Confirm as-received basis *', { kind: 'bool' }), ...reviewSpecs];
export function reviewRequestSpecs(uuid: () => string): FieldSpec[] {
  return [textField('companyId', 'ID công ty *', 'Company ID *'), textField('effectiveFrom', 'Hiệu lực từ (trống = máy chủ xác định)', 'Effective from (empty = server determines)', { nullable: true }),
    textField('asReceivedConfirmed', 'Xác nhận cơ sở trạng thái tiếp nhận *', 'Confirm as-received basis *', { kind: 'bool' }),
    { key: 'rows', label: ['Kết quả cần đối chiếu (trống = toàn báo cáo)', 'Review rows (empty = entire report)'], kind: 'array', createRow: () => ({ id: uuid(), resultId: '', sourceId: '', absoluteUncertainty: null, reportingThreshold: null, supersededResultIds: [], supersedesId: null, note: null }), fields: [
      textField('id', 'ID lựa chọn mới', 'New selection ID', { readonly: true }), textField('resultId', 'ID kết quả *', 'Result ID *'), textField('sourceId', 'ID nguồn Capture *', 'Capture source ID *'),
      textField('absoluteUncertainty', 'Độ không đảm bảo tuyệt đối đã thẩm định', 'Reviewed absolute uncertainty', { nullable: true }), textField('reportingThreshold', 'Ngưỡng báo cáo', 'Reporting threshold', { nullable: true }),
      textField('supersededResultIds', 'ID kết quả thay thế', 'Superseded result IDs', { kind: 'ids' }), textField('supersedesId', 'ID lựa chọn trước', 'Prior selection ID', { nullable: true }), textField('note', 'Ghi chú thẩm định', 'Review note', { nullable: true }),
    ] }];
}
