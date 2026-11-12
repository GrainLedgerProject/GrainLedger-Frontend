const eventNames: Record<string, [string, string]> = {
  RECEIPT: ['Tiếp nhận lúa', 'Paddy received'],
  PROCUREMENT_COMMITTED: ['Ghi nhận thu mua', 'Procurement recorded'],
  DRYING: ['Sấy lúa', 'Paddy drying'], MILLING: ['Xay xát', 'Rice milling'],
  MERGE: ['Gộp lô hàng', 'Lots merged'], BLENDING: ['Phối trộn', 'Blending'],
  BAGGING: ['Đóng bao', 'Bagging'], HOLD: ['Tạm giữ lô hàng', 'Lot placed on hold'],
  HOLD_RESPONSE: ['Phản hồi lệnh tạm giữ', 'Hold response'],
  VARIANCE_CONFIRMATION: ['Xác nhận chênh lệch', 'Variance confirmed'],
  CORRECTION_REQUEST: ['Yêu cầu điều chỉnh', 'Correction requested'],
  CORRECTION: ['Ghi nhận điều chỉnh', 'Correction recorded'],
  CORRECTION_CANCEL_VERIFIED_ORIGINAL: ['Hủy yêu cầu điều chỉnh', 'Correction cancelled'],
  PHYSICAL_RECONCILIATION: ['Đối soát thực tế', 'Physical reconciliation'],
  RECONCILIATION_INVALIDATED: ['Hủy kết quả đối soát', 'Reconciliation invalidated'],
  CLEARANCE: ['Giải phóng vị trí lưu trữ', 'Storage location cleared'],
  POOL_INGRESS: ['Nhập vào khối lưu trữ', 'Bulk stock received'],
  POOL_WITHDRAW: ['Xuất khỏi khối lưu trữ', 'Bulk stock withdrawn'],
};

const fieldNames: Record<string, [string, string]> = {
  declaredLossKg: ['Hao hụt khai báo', 'Declared loss'], varianceKg: ['Chênh lệch khối lượng', 'Mass variance'],
  allowedVarianceKg: ['Chênh lệch cho phép', 'Allowed variance'], quantityKg: ['Khối lượng', 'Mass'],
  sourceQuantityKg: ['Khối lượng tại nguồn', 'Source mass'], onHandKg: ['Khối lượng tồn', 'On-hand mass'],
  availableKg: ['Khối lượng khả dụng', 'Available mass'], massKg: ['Khối lượng', 'Mass'],
  originalQuantity: ['Số lượng tại nguồn', 'Original quantity'], originalUnit: ['Đơn vị tại nguồn', 'Original unit'],
  arrivalQuantity: ['Số lượng khi tiếp nhận', 'Arrival quantity'], arrivalUnit: ['Đơn vị tiếp nhận', 'Arrival unit'],
  moisturePercent: ['Độ ẩm', 'Moisture'], tolerancePercent: ['Ngưỡng dung sai', 'Tolerance'],
  reason: ['Lý do', 'Reason'], declaredLossReason: ['Lý do hao hụt', 'Loss reason'],
  varianceReason: ['Lý do chênh lệch', 'Variance reason'], notes: ['Ghi chú', 'Notes'],
  description: ['Mô tả', 'Description'], evidenceRef: ['Tham chiếu bằng chứng', 'Evidence reference'],
  evidenceId: ['Mã bằng chứng', 'Evidence ID'], policyId: ['Mã chính sách', 'Policy ID'],
  lotId: ['Mã lô hàng', 'Lot ID'], sourceLotId: ['Mã lô nguồn', 'Source lot ID'],
  inputLotId: ['Mã lô đầu vào', 'Input lot ID'], outputLotId: ['Mã lô đầu ra', 'Output lot ID'],
  locationId: ['Mã vị trí lưu trữ', 'Storage location ID'], facilityId: ['Mã cơ sở', 'Facility ID'],
  ownerId: ['Mã đơn vị sở hữu', 'Owner ID'], ownerName: ['Đơn vị sở hữu', 'Owner'],
  farmerId: ['Mã nông hộ', 'Farmer ID'], plotId: ['Mã thửa ruộng', 'Plot ID'],
  seasonId: ['Mã vụ mùa', 'Season ID'], plotSeasonId: ['Mã vụ canh tác', 'Plot season ID'],
  receiptId: ['Mã phiếu tiếp nhận', 'Receipt ID'], receiptLineId: ['Mã dòng tiếp nhận', 'Receipt line ID'],
  captureEventId: ['Mã sự kiện thu mua', 'Capture event ID'], catalogCommodityId: ['Mã loại hàng', 'Commodity ID'],
  measurementSetId: ['Mã lần đo', 'Measurement ID'], managerReviewId: ['Mã lần duyệt', 'Review ID'],
  managerId: ['Mã người duyệt', 'Reviewer ID'], actorId: ['Mã người thực hiện', 'Actor ID'],
  operationId: ['Mã công đoạn', 'Operation ID'], id: ['Mã định danh', 'ID'],
  riceVariety: ['Giống lúa', 'Rice variety'], productIdentity: ['Loại sản phẩm', 'Product identity'],
  productType: ['Loại sản phẩm', 'Product type'], stage: ['Giai đoạn', 'Stage'],
  inputs: ['Đầu vào', 'Inputs'], outputs: ['Đầu ra', 'Outputs'], resolvedInputs: ['Phân bổ đầu vào', 'Resolved inputs'],
  allocations: ['Phân bổ khối lượng', 'Mass allocations'], content: ['Thông tin công đoạn', 'Operation information'],
  kind: ['Loại nghiệp vụ', 'Operation type'], operationType: ['Loại công đoạn', 'Operation type'],
  status: ['Trạng thái', 'Status'], receivingStatus: ['Trạng thái tiếp nhận', 'Receiving status'],
  occurredAt: ['Thời điểm ghi nhận', 'Recorded at'], receivedAt: ['Thời điểm tiếp nhận', 'Received at'],
  capturedAt: ['Thời điểm thu thập', 'Captured at'], effectiveFrom: ['Hiệu lực từ', 'Effective from'],
  version: ['Phiên bản', 'Version'], poolRevision: ['Phiên bản khối lưu trữ', 'Pool revision'],
  action: ['Thao tác', 'Action'], code: ['Mã', 'Code'], name: ['Tên', 'Name'], unit: ['Đơn vị', 'Unit'],
};

const valueNames: Record<string, [string, string]> = {
  RAW_PADDY: ['Lúa tươi', 'Raw paddy'], DRIED_PADDY: ['Lúa khô', 'Dried paddy'],
  HEAD_RICE: ['Gạo nguyên', 'Head rice'], BROKEN_RICE: ['Gạo tấm', 'Broken rice'],
  BRAN: ['Cám', 'Bran'], HUSK: ['Trấu', 'Husk'], BLENDED_RICE: ['Gạo phối trộn', 'Blended rice'],
  BAGGED_RICE: ['Gạo đóng bao', 'Bagged rice'], DRAFT: ['Bản nháp', 'Draft'],
  COMMITTED: ['Đã ghi sổ', 'Recorded'], ACTIVE: ['Đang hiệu lực', 'Active'],
  CANCELLED: ['Đã hủy', 'Cancelled'], RECONCILED: ['Đã đối soát', 'Reconciled'],
  RECEIVED_MATCHED: ['Tiếp nhận khớp khối lượng', 'Received, mass matched'],
  RECEIVED_WITHIN_TOLERANCE: ['Tiếp nhận trong ngưỡng dung sai', 'Received within tolerance'],
  RECEIVED_SHORTAGE_APPROVED: ['Tiếp nhận thiếu hụt đã được duyệt', 'Shortage approved'],
};

const choose = (pair: [string, string], locale: string) => pair[locale.startsWith('en') ? 1 : 0];
export const readableKey = (key: string) => key.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/[_-]+/g, ' ').replace(/^./, c => c.toUpperCase());
export const eventLabel = (kind: string, locale: string) => eventNames[kind] ? choose(eventNames[kind], locale) : readableKey(kind);
export const detailLabel = (key: string, locale: string) => fieldNames[key] ? choose(fieldNames[key], locale) : readableKey(key);

/** Format decimal text without converting ledger quantities to floating-point numbers. */
export function readableDecimal(value: string, locale: string): string {
  if (!/^[+-]?\d+(\.\d+)?$/.test(value)) return value;
  const [whole, fraction] = value.split('.');
  const en = locale.startsWith('en');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, en ? ',' : '.');
  const decimals = fraction?.replace(/0+$/, '');
  return grouped + (decimals ? (en ? '.' : ',') + decimals : '');
}

export function detailValue(key: string, value: unknown, locale: string): string {
  if (value === null || value === undefined || value === '') return locale.startsWith('en') ? 'Not provided' : 'Chưa cung cấp';
  if (typeof value === 'boolean') return locale.startsWith('en') ? (value ? 'Yes' : 'No') : (value ? 'Có' : 'Không');
  const text = String(value);
  if (typeof value === 'number' || /(?:Kg|Percent|Quantity)$/.test(key)) {
    return readableDecimal(text, locale) + (key.endsWith('Kg') ? ' kg' : key.endsWith('Percent') ? ' %' : '');
  }
  if (/(?:At|From|On)$/.test(key) && /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(text) && Number.isFinite(Date.parse(text))) {
    return new Date(text).toLocaleString(locale.startsWith('en') ? 'en-US' : 'vi-VN');
  }
  const pair = valueNames[text] ?? eventNames[text];
  return pair ? choose(pair, locale) : text;
}

export function structuredDetails(value: unknown): unknown {
  if (typeof value !== 'string' || !/^\s*(?:\[|\{)/.test(value)) return value;
  try { return JSON.parse(value); } catch { return value; }
}
