import { resolveApiAssetUrl } from '../api';
import type { CaseResult, EyeScreeningResult } from '../types';
import { buildGradeConsistentReportText, formatEyeLabel, getEyeResults } from './clinicalReport';
import { displayText, getTriageDisplay } from './display';

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
  const eyeResults = getEyeResults(result);
  const evidenceList: Array<{ eyeLabel: string; image: PdfEvidenceImage }> = [];
  const caseId = displayText(result.case_id, 'Generated on server');

  if (eyeResults.length > 0) {
    for (const eyeRes of eyeResults) {
      const eyeCode = eyeRes.eye;
      const eyeInputUrl =
        resolveApiAssetUrl(`/cases/${result.case_id}/eyes/${eyeCode}/input`) ||
        (result.patient?.eye === eyeCode ? context.previewUrl : null);
      const eyeHeatmapUrl =
        resolveApiAssetUrl(eyeRes.explanation.heatmap_url) ||
        resolveApiAssetUrl(`/cases/${result.case_id}/eyes/${eyeCode}/heatmap`);

      if (eyeInputUrl && eyeHeatmapUrl) {
        const img = await createEvidenceImage(eyeInputUrl, eyeHeatmapUrl);
        if (img) {
          evidenceList.push({
            eyeLabel: eyeCode === 'OD' ? 'OD (Right Eye)' : 'OS (Left Eye)',
            image: img,
          });
        }
      }
    }
  }

  if (evidenceList.length === 0 && context.previewUrl && context.heatmapUrl) {
    const singleImg = await createEvidenceImage(context.previewUrl, context.heatmapUrl);
    if (singleImg) {
      evidenceList.push({ eyeLabel: context.eyeLabel, image: singleImg });
    }
  }

  const pdf = buildClinicalReportPdf(result, context, evidenceList);
  const blob = new Blob([pdf], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = `NetrAI_${caseId}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function buildClinicalReportPdf(
  result: CaseResult,
  context: PdfReportContext,
  evidenceList: Array<{ eyeLabel: string; image: PdfEvidenceImage }>,
): ArrayBuffer {
  const generatedAt = new Date().toLocaleString();
  const finalReport = result.final_report;
  const isFinalReport = Boolean(finalReport);
  const caseId = displayText(result.case_id, 'Generated on server');
  const eyeResults = getEyeResults(result);
  const reportText = buildGradeConsistentReportText(result, eyeResults);
  const referable = reportText.referable;
  const referableLabel = referable ? 'Referral required' : 'Routine follow-up';
  const gradeLabel =
    finalReport?.worst_icdr_grade !== undefined && finalReport?.worst_icdr_grade !== null
      ? `Grade ${finalReport.worst_icdr_grade} (${displayText(finalReport.worst_label, 'screening result')})`
      : result.prediction.icdr_grade === null || result.prediction.icdr_grade === undefined
      ? 'No Grade'
      : `Grade ${result.prediction.icdr_grade} (${displayText(result.prediction.label, 'Not assessed')})`;
  const confidence = `${(result.prediction.confidence * 100).toFixed(1)}%`;
  const confidenceLevel = displayText(result.prediction.confidence_level, 'unknown');

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
    field('Case ID', caseId),
    field('Eye Examined', eyeResults.length > 1 ? 'Both Eyes (OD + OS)' : context.eyeLabel),
    field('Patient Age', context.patientAge),
    field('Diabetes Type', context.diabetesType),
    field('Years Since Diagnosis', context.diabeticDuration),

    section('Image Quality Gate'),
    field('Status', result.quality.is_gradeable ? 'Passed - gradeable image' : 'Rejected - recapture required'),
    field('Focus Score', result.quality.focus_score.toFixed(3)),
    field('Brightness', result.quality.brightness.toFixed(3)),
    field('Contrast', result.quality.contrast.toFixed(3)),
    field('Fundus Compatibility', `${Math.round((result.quality.compatibility_score ?? 1) * 100)}%`),
    field('Supported Fundus Style', result.quality.is_supported_fundus === false ? 'No' : 'Yes'),
    field(
      'Capture Advisory',
      result.quality.warnings?.length
        ? `Screening completed, but a more centered fundus image is preferred for higher reliability. ${result.quality.warnings.join('; ')}`
        : 'No capture advisory.',
    ),
    field(
      'Quality Notes',
      result.quality.reasons.length ? result.quality.reasons.join('; ') : 'No quality rejection reasons.',
    ),

    ...(eyeResults.length > 0
      ? [
          section('Per-Eye Results'),
          ...eyeResults.map((eyeResult) => field(formatEyeLabel(eyeResult.eye), formatEyeResult(eyeResult))),
        ]
      : []),

    section('Diagnostic Triage'),
    field('ICDR DR Grade', gradeLabel),
    field('Predicted Label', finalReport?.worst_label ?? result.prediction.label),
    field('Referable DR', referable ? 'Yes' : 'No'),
    field('Referral Decision', referableLabel),
    field('Model Confidence', isFinalReport ? 'See per-eye confidence values.' : `${confidence} (${confidenceLevel})`),
    field('Model Version', result.prediction.model_version),

    section('Clinical Recommendation'),
    paragraph(reportText.summary),
    paragraph(reportText.recommendation),

    section('Explainability'),
    field('Method', result.explanation.method),
    field('Heatmap', evidenceList.length > 0 ? 'Included on visual evidence page(s).' : 'Not available for this PDF.'),
    paragraph(result.explanation.text),

    section('Medical Disclaimer'),
    paragraph(
      `${reportText.disclaimer} NetrAI is an automated decision-support triage aid designed for primary healthcare screening in conjunction with certified ophthalmologist evaluations.`,
    ),
  ];

  return createPdf(lines, evidenceList);
}

function formatEyeResult(eyeResult: EyeScreeningResult) {
  const grade =
    eyeResult.prediction.icdr_grade !== null && eyeResult.prediction.icdr_grade !== undefined
      ? `Grade ${eyeResult.prediction.icdr_grade}`
      : 'No Grade';
  const confidence = (eyeResult.prediction.confidence * 100).toFixed(1);
  const triage = getTriageDisplay(eyeResult.prediction);
  return `${grade} (${displayText(eyeResult.prediction.label, 'Not assessed')}), ${confidence}% confidence, ${triage.copyLabel}`;
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

function field(label: string, value: unknown): PdfLine {
  return {
    text: `${label}: ${displayText(value)}`,
    size: 10,
    color: [30, 41, 59],
    indent: 10,
  };
}

function paragraph(text: unknown): PdfLine {
  return {
    text: displayText(text),
    size: 10,
    color: [30, 41, 59],
    indent: 10,
  };
}

function createPdf(
  lines: PdfLine[],
  evidenceList: Array<{ eyeLabel: string; image: PdfEvidenceImage }>,
): ArrayBuffer {
  const pageDefs: Array<{ stream: string; xObjectResource?: string }> = [];
  let currentPage = '';
  let y = TOP_Y;

  const addPage = () => {
    if (currentPage.trim()) {
      pageDefs.push({ stream: currentPage });
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

  const imageEntries: Array<{
    xObjectName: string;
    image: PdfEvidenceImage;
  }> = [];

  evidenceList.forEach((ev, idx) => {
    const xObjectName = `Im${idx + 1}`;
    imageEntries.push({ xObjectName, image: ev.image });
    const evidenceStream = drawEvidencePage(ev.image, ev.eyeLabel, xObjectName);
    pageDefs.push({
      stream: evidenceStream,
      xObjectResource: `/XObject << /${xObjectName} %%IMG_OBJ_ID_${idx}%% 0 R >>`,
    });
  });

  return writePdfDocument(pageDefs, imageEntries);
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

function drawEvidencePage(image: PdfEvidenceImage, eyeLabel: string, xObjectName: string): string {
  const title: PdfLine = {
    text: `Visual Evidence - ${eyeLabel} Fundus Attention Heatmap`,
    size: 16,
    bold: true,
    color: [15, 118, 110],
  };
  const caption: PdfLine = {
    text: `Composite view of ${eyeLabel} fundus image with backend-generated lesion-attention heatmap overlay.`,
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
    `q ${displayWidth.toFixed(2)} 0 0 ${displayHeight.toFixed(2)} ${x.toFixed(2)} ${y.toFixed(2)} cm /${xObjectName} Do Q`,
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

function writePdfDocument(
  pageDefs: Array<{ stream: string; xObjectResource?: string }>,
  imageEntries: Array<{ xObjectName: string; image: PdfEvidenceImage }>,
): ArrayBuffer {
  const objects: string[] = [];
  const pageObjectIds: number[] = [];
  let nextObjectId = 5;

  objects[1] = '<< /Type /Catalog /Pages 2 0 R >>';
  objects[3] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>';
  objects[4] = '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>';

  const imageObjectIds: number[] = [];

  imageEntries.forEach((entry) => {
    const imgObjId = nextObjectId++;
    imageObjectIds.push(imgObjId);
    const imageStream = `${entry.image.dataHex}>`;
    objects[imgObjId] = [
      '<< /Type /XObject',
      '/Subtype /Image',
      `/Width ${entry.image.width}`,
      `/Height ${entry.image.height}`,
      '/ColorSpace /DeviceRGB',
      '/BitsPerComponent 8',
      '/Filter [/ASCIIHexDecode /DCTDecode]',
      `/Length ${imageStream.length}`,
      `>>\nstream\n${imageStream}\nendstream`,
    ].join(' ');
  });

  pageDefs.forEach((pDef) => {
    const pageId = nextObjectId++;
    const contentId = nextObjectId++;

    let xObjectResource = pDef.xObjectResource ?? '';
    imageObjectIds.forEach((imgId, idx) => {
      xObjectResource = xObjectResource.replace(`%%IMG_OBJ_ID_${idx}%%`, String(imgId));
    });

    pageObjectIds.push(pageId);
    objects[pageId] = [
      '<< /Type /Page',
      '/Parent 2 0 R',
      `/MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}]`,
      `/Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${xObjectResource} >>`,
      `/Contents ${contentId} 0 R`,
      '>>',
    ].join(' ');
    objects[contentId] = `<< /Length ${pDef.stream.length} >>\nstream\n${pDef.stream}endstream`;
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
