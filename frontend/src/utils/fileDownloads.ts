import { Capacitor, registerPlugin } from '@capacitor/core';
import { isNativeAppBuild } from './runtime';

type NativeSavePdfResult = {
  uri?: string;
  fileName?: string;
  directory?: string;
};

type NetrAIFilePlugin = {
  savePdf(options: {
    fileName: string;
    mimeType: string;
    base64Data: string;
  }): Promise<NativeSavePdfResult>;
};

export type FileSaveResult = {
  method: 'browser' | 'native';
  fileName: string;
  uri?: string;
};

const NetrAIFile = registerPlugin<NetrAIFilePlugin>('NetrAIFile');

export async function savePdfBlob(blob: Blob, requestedFileName: string): Promise<FileSaveResult> {
  const fileName = sanitizeDownloadFileName(requestedFileName, 'NetrAI_Report.pdf');

  if (shouldUseNativeFileSave()) {
    const base64Data = await blobToBase64(blob);
    const result = await NetrAIFile.savePdf({
      fileName,
      mimeType: 'application/pdf',
      base64Data,
    });

    return {
      method: 'native',
      fileName: result.fileName || fileName,
      uri: result.uri,
    };
  }

  downloadBlobInBrowser(blob, fileName);
  return { method: 'browser', fileName };
}

function shouldUseNativeFileSave(): boolean {
  return isNativeAppBuild() || Capacitor.isNativePlatform();
}

function downloadBlobInBrowser(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(reader.error ?? new Error('Could not prepare PDF for saving.'));
    reader.readAsDataURL(blob);
  });
}

function sanitizeDownloadFileName(value: string, fallback: string): string {
  const sanitized = value
    .replace(/[\\/:*?"<>|\x00-\x1F]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');

  const fileName = sanitized || fallback;
  return fileName.toLowerCase().endsWith('.pdf') ? fileName : `${fileName}.pdf`;
}
