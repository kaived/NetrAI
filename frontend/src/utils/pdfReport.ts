import type { CaseResult, EyeCode, EyeScreeningResult } from '../types';

type PdfReportContext = {
  eyeLabel: string;
  patientAge: string;
  diabetesType: string;
  diabeticDuration: string;
  heatmapUrl: string | null;
  previewUrl: string | null;
};

type PdfLine = {
  text: string;
  size?: number;
  bold?: boolean;
  color?: [number, number, number];
  indent?: number;
  gapBefore?: number;
};

type PdfEvidenceImage = {
  width: number;
  height: number;
  dataHex: string;
};

const PAGE_WIDTH = 612;
const PAGE_HEIGHT = 792;
const MARGIN_X = 54;
const TOP_Y = 738;
const BOTTOM_Y = 54;

export async function downloadClinicalReportPdf(result: CaseResult, context: PdfReportContext) {
  const evidenceImage = context.previewUrl && context.heatmapUrl
    ? await createEvidenceImage(context.previewUrl, context.heatmapUrl)
    : null;
  const pdf = buildClinicalReportPdf(result, context, evidenceImage);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `NetrAI_${result.case_id}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildClinicalReportPdf(
  result: CaseResult,
  context: PdfReportContext,
  evidenceImage: PdfEvidenceImage | null,
): ArrayBuffer {
  const generatedAt = new Date().toLocaleString();
  const finalReport = result.final_report;
  const isFinalReport = Boolean(finalReport);
  const referableLabel = (finalReport?.referable_dr ?? result.prediction.referable_dr) ? 'Referral required' : 'Routine follow-up';
  const gradeLabel = finalReport?.worst_icdr_grade !== undefined && finalReport?.worst_icdr_grade !== null
    ? `${finalReport.worst_icdr_grade} (${finalReport.worst_label ?? 'worst eye'})`
    : result.prediction.icdr_grade === null
    ? 'N/A'
    : `${result.prediction.icdr_grade} (${result.prediction.label})`;
  const confidence = `${(result.prediction.confidence * 100).toFixed(1)}%`;
  const confidenceLevel = result.prediction.confidence_level || 'unknown';
  const eyeResults = getEyeResults(result);

  const lines: PdfLine[] = [
    {
      text: 'NetrAI - Clinical Screening Report',
      size: 18,
      bold: true,
      color: [15, 118, 110],
    },
    {
      text: 'Automated diabetic retinopathy screening and PHC triage summary',
      size: 10,
      color: [71, 85, 105],
    },
    { text: `Generated: ${generatedAt}`, size: 9, color: [100, 116, 139], gapBefore: 2 },

    section('Case Details'),
    field('Case ID', result.case_id),
    field('Eye Examined', context.eyeLabel),
    field('Patient Age', context.patientAge),
    field('Diabetes Type', context.diabetesType),
    field('Years Since Diagnosis', context.diabeticDuration),

    section('Image Quality Gate'),
    field('Status', result.quality.is_gradeable ? 'Passed - gradeable image' : 'Rejected - recapture required'),
    field('Focus Score', result.quality.focus_score.toFixed(3)),
    field('Brightness', result.quality.brightness.toFixed(3)),
    field('Contrast', result.quality.contrast.toFixed(3)),
    field('Quality Notes', result.quality.reasons.length ? result.quality.reasons.join('; ') : 'No quality rejection reasons.'),

    ...(isFinalReport ? [
      section('Per-Eye Results'),
      ...eyeResults.map((eyeResult) => field(formatEyeLabel(eyeResult.eye), formatEyeResult(eyeResult))),
    ] : []),

    section('Diagnostic Triage'),
    field('ICDR DR Grade', gradeLabel),
    field('Predicted Label', finalReport?.worst_label ?? result.prediction.label),
    field('Referable DR', (finalReport?.referable_dr ?? result.prediction.referable_dr) ? 'Yes' : 'No'),
    field('Referral Decision', referableLabel),
    field('Model Confidence', isFinalReport ? 'See per-eye confidence values.' : `${confidence} (${confidenceLevel})`),
    field('Model Version', result.prediction.model_version),

    section('Clinical Recommendation'),
    paragraph(finalReport?.summary ?? result.report.summary),
    paragraph(finalReport?.recommendation ?? result.report.recommendation),

    section('Explainability'),
    field('Method', result.explanation.method),
    field('Heatmap', evidenceImage ? 'Included on visual evidence page.' : 'Not available for this PDF.'),
    paragraph(result.explanation.text),

    section('Medical Disclaimer'),
    paragraph(`${finalReport?.disclaimer ?? result.report.disclaimer} NetrAI is a screening support tool only and does not replace examination by a certified ophthalmologist.`),
  ];

  return createPdf(lines, evidenceImage);
}

function getEyeResults(result: CaseResult): EyeScreeningResult[] {
  return (['OD', 'OS'] as EyeCode[])
    .map((eye) => result.eyes?.[eye])
    .filter((eyeResult): eyeResult is EyeScreeningResult => Boolean(eyeResult));
}

function formatEyeLabel(eye: EyeCode) {
  return eye === 'OD' ? 'OD Right Eye' : 'OS Left Eye';
}

function formatEyeResult(eyeResult: EyeScreeningResult) {
  const grade = eyeResult.prediction.icdr_grade ?? 'N/A';
  const confidence = (eyeResult.prediction.confidence * 100).toFixed(1);
  const referral = eyeResult.prediction.referable_dr ? 'Referable' : 'Routine';
  return `Grade ${grade} (${eyeResult.prediction.label}), ${confidence}% confidence, ${referral}`;
}

function section(text: string): PdfLine {
  return {
    text,
    size: 12,
    bold: true,
    color: [15, 23, 42],
    gapBefore: 16,
  };
}

function field(label: string, value: string): PdfLine {
  return {
    text: `${label}: ${value}`,
    size: 10,
    color: [30, 41, 59],
    indent: 10,
  };
}

function paragraph(text: string): PdfLine {
  return {
    text,
    size: 10,
    color: [30, 41, 59],
    indent: 10,
  };
}

function createPdf(lines: PdfLine[], evidenceImage: PdfEvidenceImage | null): ArrayBuffer {
  const pages: string[] = [];
  let currentPage = '';
  let y = TOP_Y;

  const addPage = () => {
    if (currentPage.trim()) {
      pages.push(currentPage);
    }
    currentPage = '';
    y = TOP_Y;
  };

  lines.forEach((line) => {
    const size = line.size ?? 10;
    const indent = line.indent ?? 0;
    const gapBefore = line.gapBefore ?? 0;
    const wrapped = wrapText(line.text, PAGE_WIDTH - MARGIN_X * 2 - indent, size);

    if (y - gapBefore - wrapped.length * lineHeight(size) < BOTTOM_Y) {
      addPage();
    }

    y -= gapBefore;

    wrapped.forEach((text) => {
      if (y - lineHeight(size) < BOTTOM_Y) {
        addPage();
      }

      currentPage += drawText(text, MARGIN_X + indent, y, line);
      y -= lineHeight(size);
    });
  });

  addPage();

  if (evidenceImage) {
    pages.push(drawEvidencePage(evidenceImage));
  }

  return writePdfDocument(pages, evidenceImage);
}

function drawText(text: string, x: number, y: number, line: PdfLine): string {
  const size = line.size ?? 10;
  const [r, g, b] = line.color ?? [0, 0, 0];
  const font = line.bold ? 'F2' : 'F1';

  return [
    'BT',
    `${toColor(r)} ${toColor(g)} ${toColor(b)} rg`,
    `/${font} ${size} Tf`,
    `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm`,
    `(${escapePdfText(text)}) Tj`,
    'ET',
    '',
  ].join('\n');
}

function wrapText(text: string, maxWidth: number, fontSize: number): string[] {
  const cleaned = sanitizeText(text);
  const maxChars = Math.max(24, Math.floor(maxWidth / (fontSize * 0.52)));
  const words = cleaned.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = '';

  words.forEach((word) => {
    const next = current ? `${current} ${word}` : word;
    if (next.length <= maxChars) {
      current = next;
      return;
    }

    if (current) {
      lines.push(current);
    }

    current = word.length > maxChars ? `${word.slice(0, maxChars - 3)}...` : word;
  });

  if (current) {
    lines.push(current);
  }

  return lines.length ? lines : [''];
}

function drawEvidencePage(image: PdfEvidenceImage): string {
  const title: PdfLine = {
    text: 'Visual Evidence - Fundus Attention Heatmap',
    size: 16,
    bold: true,
    color: [15, 118, 110],
  };
  const caption: PdfLine = {
    text: 'Composite view of uploaded fundus image with backend-generated lesion-attention heatmap overlay.',
    size: 10,
    color: [71, 85, 105],
  };

  let displayWidth = PAGE_WIDTH - MARGIN_X * 2;
  let displayHeight = displayWidth * (image.height / image.width);
  const maxDisplayHeight = 560;

  if (displayHeight > maxDisplayHeight) {
    displayHeight = maxDisplayHeight;
    displayWidth = displayHeight * (image.width / image.height);
  }

  const x = (PAGE_WIDTH - displayWidth) / 2;
  const y = TOP_Y - 56 - displayHeight;

  return [
    drawText(title.text, MARGIN_X, TOP_Y, title),
    drawText(caption.text, MARGIN_X, TOP_Y - 22, caption),
    `q ${displayWidth.toFixed(2)} 0 0 ${displayHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /Im1 Do Q`,
    '',
  ].join('\n');
}

async function createEvidenceImage(baseUrl: string, heatmapUrl: string): Promise<PdfEvidenceImage | null> {
  try {
    const [baseImage, heatmapImage] = await Promise.all([
      loadImage(baseUrl),
      loadImage(heatmapUrl),
    ]);
    const naturalWidth = baseImage.naturalWidth || baseImage.width;
    const naturalHeight = baseImage.naturalHeight || baseImage.height;
    const width = Math.min(1200, naturalWidth);
    const height = Math.round(width * (naturalHeight / naturalWidth));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext('2d');
    if (!context) {
      return null;
    }

    context.fillStyle = '#020617';
    context.fillRect(0, 0, width, height);
    context.drawImage(baseImage, 0, 0, width, height);
    context.globalAlpha = 0.65;
    context.globalCompositeOperation = 'screen';
    context.drawImage(heatmapImage, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.88);
    const base64 = dataUrl.split(',')[1];
    if (!base64) {
      return null;
    }

    return {
      width,
      height,
      dataHex: base64ToHex(base64),
    };
  } catch {
    return null;
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:/i.test(src)) {
      image.crossOrigin = 'anonymous';
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${src}`));
    image.src = src;
  });
}

function base64ToHex(base64: string) {
  const binary = atob(base64);
  let hex = '';

  for (let index = 0; index < binary.length; index += 1) {
    hex += binary.charCodeAt(index).toString(16).padStart(2, '0');
  }

  return hex;
}

function writePdfDocument(pageStreams: string[], evidenceImage: PdfEvidenceImage | null): ArrayBuffer {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  let nextObjectId = 5;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  const imageObjectId = evidenceImage ? nextObjectId++ : null;
  if (evidenceImage && imageObjectId) {
    const imageStream = `${evidenceImage.dataHex}>`;
    objects[imageObjectId] = [
      '<< /Type /XObject',
      '/Subtype /Image',
      `/Width ${evidenceImage.width}`,
      `/Height ${evidenceImage.height}`,
      '/ColorSpace /DeviceRGB',
      '/BitsPerComponent 8',
      '/Filter [/ASCIIHexDecode /DCTDecode]',
      `/Length ${imageStream.length}`,
      `>>\nstream\n${imageStream}\nendstream`,
    ].join(' ');
  }

  pageStreams.forEach((stream) => {
    const pageId = nextObjectId++;
    const contentId = nextObjectId++;
    const xObjectResource = imageObjectId ? `/XObject << /Im1 ${imageObjectId} 0 R >>` : '';

    pageObjectIds.push(pageId);
    objects[pageId] = [
      '<< /Type /Page',
      '/Parent 2 0 R',
      `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]`,
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xObjectResource} >>`,
      `/Contents ${contentId} 0 R`,
      '>>',
    ].join(' ');
    objects[contentId] = `<< /Length ${stream.length} >>\nstream\n${stream}endstream`;
  });

  objects[2] = `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pageObjectIds.length} >>`;

  let body = '%PDF-1.4\n';
  const offsets = [0];

  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = body.length;
    body += `${id} 0 obj\n${objects[id]}\nendobj\n`;
  }

  const xrefOffset = body.length;
  body += `xref\n0 ${nextObjectId}\n`;
  body += '0000000000 65535 f \n';

  for (let id = 1; id < nextObjectId; id += 1) {
    body += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }

  body += [
    'trailer',
    `<< /Size ${nextObjectId} /Root 1 0 R >>`,
    'startxref',
    String(xrefOffset),
    '%%EOF',
  ].join('\n');

  const encoded = new TextEncoder().encode(body);
  const buffer = new ArrayBuffer(encoded.byteLength);
  new Uint8Array(buffer).set(encoded);
  return buffer;
}

function lineHeight(size: number) {
  return size * 1.42;
}

function toColor(value: number) {
  return (value / 255).toFixed(3);
}

function escapePdfText(text: string) {
  return sanitizeText(text).replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function sanitizeText(text: string) {
  return text
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
