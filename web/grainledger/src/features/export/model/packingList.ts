import type { ContainerDocument, ContainerDossier } from "@/api/containerExecution";
import { massLabel, sumMass } from "./exportPresentation";

export const SYSTEM_GENERATED_TAG = "[SYSTEM_GENERATED]";
export const UPLOADED_TAG = "[UPLOADED]";
export const LEGACY_TAG = "[LEGACY]";

export type DocumentOriginKind =
  | "SYSTEM_GENERATED"
  | "UPLOADED"
  | "LEGACY_UNKNOWN";

const UPLOADED_DOCS_STORAGE_KEY = "grainledger.uploadedContainerDocs.v1";

interface UploadedDocSignature {
  containerId: string;
  documentType: string;
  filename: string;
  reason: string;
  recordedAt: string;
}

function readUploadedSignatures(): UploadedDocSignature[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(UPLOADED_DOCS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function rememberUploadedDocument(input: {
  containerId: string;
  documentType: string;
  filename: string;
  reason: string;
}) {
  if (typeof localStorage === "undefined") return;
  try {
    const existing = readUploadedSignatures();
    const next: UploadedDocSignature[] = [
      { ...input, recordedAt: new Date().toISOString() },
      ...existing,
    ].slice(0, 200);
    localStorage.setItem(UPLOADED_DOCS_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors cleanly.
  }
}

export function classifyDocumentOrigin(
  doc: ContainerDocument,
  containerId?: string,
): DocumentOriginKind {
  const explicit = (doc.origin ?? doc.source ?? "").trim().toUpperCase();
  if (explicit === "UPLOADED") {
    return "UPLOADED";
  }
  if (
    explicit === "GENERATED" ||
    explicit === "SYSTEM_GENERATED" ||
    explicit === "SYSTEM"
  ) {
    return "SYSTEM_GENERATED";
  }
  if (explicit === "LEGACY_UNKNOWN" || explicit === "LEGACY") {
    return "LEGACY_UNKNOWN";
  }
  if (doc.reason.startsWith(SYSTEM_GENERATED_TAG)) {
    return "SYSTEM_GENERATED";
  }
  if (doc.reason.startsWith(LEGACY_TAG)) {
    return "LEGACY_UNKNOWN";
  }
  if (doc.reason.startsWith(UPLOADED_TAG)) {
    return "UPLOADED";
  }
  if (containerId) {
    const match = readUploadedSignatures().some(
      (item) =>
        item.containerId === containerId &&
        item.documentType === doc.documentType &&
        item.filename === doc.filename &&
        item.reason === doc.reason,
    );
    if (match) return "UPLOADED";
  }
  return "LEGACY_UNKNOWN";
}

export function displayDocumentReason(reason: string): string {
  return reason
    .replace(/^\[(SYSTEM_GENERATED|UPLOADED|LEGACY)\]\s*/u, "")
    .trim();
}

export function originBadgeProps(origin: DocumentOriginKind): {
  status: "COMPLIANT" | "PENDING" | "STALE";
  label: [string, string];
} {
  switch (origin) {
    case "SYSTEM_GENERATED":
      return {
        status: "COMPLIANT",
        label: ["Hệ thống sinh", "System-generated"],
      };
    case "UPLOADED":
      return {
        status: "PENDING",
        label: ["Tệp tải lên", "Uploaded file"],
      };
    default:
      return {
        status: "STALE",
        label: ["Bản cũ chưa rõ nguồn", "Legacy (origin unknown)"],
      };
  }
}

function escapeHtml(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function utf8ToBase64(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export interface GeneratedPackingList {
  documentType: "PACKING_LIST";
  filename: string;
  contentType: "text/html";
  contentBase64: string;
  html: string;
  reason: string;
  totalLoadedKg: string;
}

export function buildPackingListDocument({
  containerCode,
  dossier,
  locale = "vi",
}: {
  containerCode: string;
  dossier: ContainerDossier;
  locale?: "vi" | "en";
}): GeneratedPackingList {
  const totalLoadedKg = sumMass(
    dossier.lines.map((line) => String(line.quantity_kg)),
  );
  const safeCode = (containerCode || dossier.containerNumber || "container")
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-");
  const filename = `${safeCode}-packing-list.html`;
  const title =
    locale === "vi"
      ? `Phiếu đóng gói container ${containerCode}`
      : `Container Packing List ${containerCode}`;

  const lineRows = dossier.lines
    .map(
      (line, index) => `
      <tr>
        <td>${index + 1}</td>
        <td class="mono">${escapeHtml(line.lot_id)}</td>
        <td class="mono">${escapeHtml(line.location_id)}</td>
        <td class="num">${escapeHtml(massLabel(String(line.quantity_kg), locale))} kg</td>
      </tr>`,
    )
    .join("");

  const sourceRows = (dossier.sourceContributions ?? [])
    .map(
      (src) => `
      <tr>
        <td class="mono">${escapeHtml(src.sourceLotId)}</td>
        <td class="num">${escapeHtml(massLabel(src.quantityKg, locale))} kg</td>
        <td class="num">${escapeHtml(src.percentage)}%</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html>
<html lang="${locale}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #1f2421; margin: 32px; line-height: 1.5; }
    h1 { font-size: 20px; margin: 0 0 8px; }
    h2 { font-size: 14px; margin: 24px 0 8px; text-transform: uppercase; letter-spacing: 0.04em; color: #526058; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px 24px; background: #f6f7f5; border: 1px solid #d9dfd9; border-radius: 10px; padding: 16px; font-size: 13px; }
    .meta dt { color: #5f6c64; font-size: 11px; text-transform: uppercase; }
    .meta dd { margin: 2px 0 0; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; margin-top: 8px; font-size: 13px; }
    th, td { border: 1px solid #d9dfd9; padding: 8px 10px; text-align: left; }
    th { background: #f0f3ef; font-size: 11px; text-transform: uppercase; }
    .num { text-align: right; font-family: ui-monospace, monospace; }
    .mono { font-family: ui-monospace, monospace; word-break: break-all; }
    .footer { margin-top: 24px; font-size: 11px; color: #5f6c64; }
  </style>
</head>
<body>
  <h1>${escapeHtml(title)}</h1>
  <p>${locale === "vi" ? "Tài liệu do hệ thống GrainLedger sinh tự động từ hồ sơ đóng niêm container." : "System-generated Packing List derived from the sealed container closure dossier."}</p>
  <dl class="meta">
    <div><dt>${locale === "vi" ? "Mã container nội bộ" : "Internal code"}</dt><dd class="mono">${escapeHtml(containerCode)}</dd></div>
    <div><dt>${locale === "vi" ? "Số container / Seal" : "Container / Seal No."}</dt><dd class="mono">${escapeHtml(dossier.containerNumber)} / ${escapeHtml(dossier.sealNumber)}</dd></div>
    <div><dt>${locale === "vi" ? "Khối lượng mục tiêu" : "Target mass"}</dt><dd class="mono">${escapeHtml(massLabel(dossier.targetKg, locale))} kg</dd></div>
    <div><dt>${locale === "vi" ? "Tổng thực xếp" : "Total actual loaded"}</dt><dd class="mono">${escapeHtml(massLabel(totalLoadedKg, locale))} kg</dd></div>
    <div><dt>${locale === "vi" ? "Đánh giá khi đóng niêm" : "Assessment at closure"}</dt><dd>${escapeHtml(dossier.assessment.assessmentStatus)}</dd></div>
    <div><dt>${locale === "vi" ? "Thời điểm đóng niêm" : "Closed at"}</dt><dd>${escapeHtml(new Date(dossier.closedAt).toLocaleString(locale === "vi" ? "vi-VN" : "en-GB"))}</dd></div>
  </dl>
  <h2>${locale === "vi" ? "Chi tiết các dòng xếp hàng" : "Loading lines"}</h2>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>${locale === "vi" ? "Lô thành phẩm / xuất" : "Loaded Lot ID"}</th>
        <th>${locale === "vi" ? "Vị trí kho" : "Location ID"}</th>
        <th class="num">${locale === "vi" ? "Khối lượng (kg)" : "Mass (kg)"}</th>
      </tr>
    </thead>
    <tbody>${lineRows}</tbody>
  </table>
  ${
    sourceRows
      ? `<h2>${locale === "vi" ? "Đóng góp từ lô nguyên liệu gốc" : "Source lot contributions"}</h2>
  <table>
    <thead>
      <tr>
        <th>${locale === "vi" ? "Lô nguyên liệu gốc" : "Source Lot ID"}</th>
        <th class="num">${locale === "vi" ? "Khối lượng (kg)" : "Mass (kg)"}</th>
        <th class="num">${locale === "vi" ? "Tỷ lệ" : "Share"}</th>
      </tr>
    </thead>
    <tbody>${sourceRows}</tbody>
  </table>`
      : ""
  }
  <p class="footer">${locale === "vi" ? "Mã người đóng niêm" : "Closed by"}: ${escapeHtml(dossier.closedBy)} · ${escapeHtml(dossier.closedAt)}</p>
</body>
</html>`;

  return {
    documentType: "PACKING_LIST",
    filename,
    contentType: "text/html",
    contentBase64: utf8ToBase64(html),
    html,
    reason:
      locale === "vi"
        ? `${SYSTEM_GENERATED_TAG} Packing List sinh tự động từ hồ sơ đóng niêm (${massLabel(totalLoadedKg, locale)} kg)`
        : `${SYSTEM_GENERATED_TAG} System-generated Packing List from closure dossier (${massLabel(totalLoadedKg, locale)} kg)`,
    totalLoadedKg,
  };
}
