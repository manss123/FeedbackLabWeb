import { PDFDocument, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import certificateTemplateUrl from "@/assets/certificate-template.png";
import sarabunRegularUrl from "@/assets/fonts/Sarabun-Regular.ttf";
import sarabunSemiBoldUrl from "@/assets/fonts/Sarabun-SemiBold.ttf";

// Template is a landscape A4-ratio PNG (4000x2828px, ~1.414 aspect, same as
// A4's √2 ratio) — the PDF page is sized to real A4 landscape points so it
// prints at a sane physical size, with the template image scaled to fill it
// exactly (see generateCertificatePdf).
const PAGE_PT = { width: 841.89, height: 595.28 };

// Fractional anchors (0..1 of the template's own width/height, top-left
// origin like the image, not PDF's bottom-left) for the three dynamic
// fields. `x`/`y` mark where the text's own visual CENTER should land —
// increase `y` to move text down, decrease to move it up; increase `x` to
// move right, decrease to move left. `size` is the font size in points.
// Tuned by eye against the template — generate a real certificate, open the
// PDF, and nudge these (a change of 0.01 ≈ 1% of the page) until it lines
// up with the printed labels/lines.
const ANCHORS = {
  name: { x: 0.5, y: 0.475, size: 34 },
  date: { x: 0.193, y: 0.83, size: 15 },
  certificateId: { x: 0.795, y: 0.83, size: 14 },
};

const INK = rgb(0.11, 0.17, 0.38);
const GOLD = rgb(0xbb / 255, 0x96 / 255, 0x63 / 255); // #BB9663, matches the template's gold accents

export interface CertificateFields {
  fullName: string;
  issuedAt: string; // ISO
  certificateId: string;
}

async function fetchBytes(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`โหลดไฟล์ต้นแบบใบรับรองไม่สำเร็จ (${res.status})`);
  return res.arrayBuffer();
}

// `centerYPt` is where the text should visually sit, not its baseline — a
// glyph's body sits mostly ABOVE its baseline, so drawing straight at
// centerYPt makes text look shifted low relative to where it's aimed at a
// line/label. ~0.35 * size approximates half a cap-height for Sarabun.
function drawCentered(
  page: PDFPage,
  text: string,
  font: PDFFont,
  size: number,
  centerXPt: number,
  centerYPt: number,
  color = INK,
) {
  const width = font.widthOfTextAtSize(text, size);
  const baselineY = centerYPt - size * 0.35;
  page.drawText(text, { x: centerXPt - width / 2, y: baselineY, size, font, color });
}

// Fractional (0..1, image top-left origin) -> PDF points (bottom-left origin).
function toPagePt(frac: { x: number; y: number }): { x: number; y: number } {
  return { x: frac.x * PAGE_PT.width, y: PAGE_PT.height - frac.y * PAGE_PT.height };
}

export async function generateCertificatePdf(fields: CertificateFields): Promise<Uint8Array> {
  const [templateBytes, regularBytes, semiBoldBytes] = await Promise.all([
    fetchBytes(certificateTemplateUrl),
    fetchBytes(sarabunRegularUrl),
    fetchBytes(sarabunSemiBoldUrl),
  ]);

  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const [templateImage, regularFont, semiBoldFont] = await Promise.all([
    pdfDoc.embedPng(templateBytes),
    pdfDoc.embedFont(regularBytes, { subset: true }),
    pdfDoc.embedFont(semiBoldBytes, { subset: true }),
  ]);

  const page = pdfDoc.addPage([PAGE_PT.width, PAGE_PT.height]);
  page.drawImage(templateImage, { x: 0, y: 0, width: PAGE_PT.width, height: PAGE_PT.height });

  const namePt = toPagePt(ANCHORS.name);
  drawCentered(page, fields.fullName, semiBoldFont, ANCHORS.name.size, namePt.x, namePt.y, GOLD);

  const dateLabel = new Date(fields.issuedAt).toLocaleDateString("th-TH", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const datePt = toPagePt(ANCHORS.date);
  drawCentered(page, dateLabel, regularFont, ANCHORS.date.size, datePt.x, datePt.y);

  const idPt = toPagePt(ANCHORS.certificateId);
  drawCentered(page, fields.certificateId, regularFont, ANCHORS.certificateId.size, idPt.x, idPt.y);

  return pdfDoc.save();
}

export function downloadCertificatePdf(bytes: Uint8Array, filename: string) {
  // Uint8Array<ArrayBufferLike> vs BlobPart's ArrayBuffer-only typing is a
  // TS lib strictness mismatch, not a real runtime concern — bytes always
  // wraps a plain ArrayBuffer here (pdf-lib's save()).
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
