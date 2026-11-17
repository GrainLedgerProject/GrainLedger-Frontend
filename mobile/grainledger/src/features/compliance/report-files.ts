import * as DocumentPicker from 'expo-document-picker';
import { File, Paths } from 'expo-file-system';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';
import { ApiError } from '../../services/api/errors';
import { attachmentLimit, validateAttachment, type Attachment } from './report-commands';

function cancelled(signal: AbortSignal) { if (signal.aborted) throw new ApiError('Cancelled.', 0, 'cancelled'); }
/** FileReader also works with native RN Blobs, which need not implement Blob.arrayBuffer(). */
export function blobBase64(blob: Blob, signal: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    cancelled(signal);
    const reader = new FileReader();
    const abort = () => { reader.abort(); reject(new ApiError('Cancelled.', 0, 'cancelled')); };
    const clean = () => signal.removeEventListener('abort', abort);
    reader.onload = () => { clean(); const value = reader.result;
      if (signal.aborted) reject(new ApiError('Cancelled.', 0, 'cancelled'));
      else if (typeof value !== 'string' || !value.includes(';base64,')) reject(new ApiError('Unsupported file.', 0, 'contract'));
      else resolve(value.slice(value.indexOf(';base64,') + 8)); };
    reader.onerror = () => { clean(); reject(new ApiError('Unable to read file.', 0, 'contract')); };
    reader.onabort = () => { clean(); reject(new ApiError('Cancelled.', 0, 'cancelled')); };
    signal.addEventListener('abort', abort, { once: true });
    reader.readAsDataURL(blob);
  });
}
export async function pickReportAttachment(signal: AbortSignal): Promise<Attachment | null> {
  cancelled(signal);
  const result = await DocumentPicker.getDocumentAsync({ type: '*/*', multiple: false, copyToCacheDirectory: true, base64: false });
  if (result.canceled) return null;
  const asset = result.assets[0];
  const file = Platform.OS === 'web' ? null : new File(asset.uri);
  try {
    cancelled(signal);
    const size = file?.size ?? asset.file?.size ?? asset.size ?? 0;
    if (size <= 0 || size > attachmentLimit) throw new ApiError('Choose a nonempty file up to 10 MiB.', 0, 'contract');
    const contentBase64 = file ? await file.base64() : asset.file ? await blobBase64(asset.file, signal) : '';
    cancelled(signal);
    const attachment = { fileName: asset.name, contentType: asset.mimeType || file?.type || 'application/octet-stream', contentBase64, size };
    validateAttachment(attachment); return attachment;
  } finally {
    // Only remove the copy created in this app's cache, never the user's original document.
    if (file?.uri.startsWith(Paths.cache.uri)) { try { await file.delete(); } catch { /* Best-effort temporary copy cleanup. */ } }
  }
}
export function createReportPreview() {
  const files = new Set<File>();
  let disposed = false;
  return {
    async open(blob: Blob, name: string, mime: string, signal: AbortSignal) {
      cancelled(signal);
      if (disposed) throw new ApiError('Cancelled.', 0, 'cancelled');
      if (blob.size > attachmentLimit) throw new ApiError('Preview is limited to 10 MiB on this app.', 0, 'contract');
      const safeName = name.replace(/[^\p{L}\p{N}._-]/gu, '_').slice(-120) || 'lab-report';
      if (Platform.OS === 'web') {
        const url = URL.createObjectURL(blob);
        try { const link = document.createElement('a'); link.href = url; link.download = safeName; link.click(); }
        finally { URL.revokeObjectURL(url); }
        return;
      }
      const content = await blobBase64(blob, signal);
      cancelled(signal);
      if (disposed) throw new ApiError('Cancelled.', 0, 'cancelled');
      const file = new File(Paths.cache, `lab-${randomUUID()}-${safeName}`);
      files.add(file);
      try {
        await file.write(content, { encoding: 'base64' });
        cancelled(signal);
        if (disposed) throw new ApiError('Cancelled.', 0, 'cancelled');
        if (!await file.canPreview({ mimeType: mime || blob.type })) throw new ApiError('No app is available to preview this file.', 0, 'configuration');
        cancelled(signal);
        await file.preview({ mimeType: mime || blob.type, title: safeName });
      } catch (failure) {
        files.delete(file); try { await file.delete(); } catch { /* Best effort. */ } throw failure;
      }
    },
    dispose() {
      disposed = true;
      for (const file of files) { try { file.delete(); } catch { /* Best-effort temporary preview cleanup. */ } }
      files.clear();
    },
  };
}
