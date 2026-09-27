/**
 * File Downloader Utility
 * Supports native Capacitor file saving and sharing on Android/iOS,
 * and standard Blob URL download for desktop and web browsers.
 */
import { Capacitor } from '@capacitor/core';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Share } from '@capacitor/share';

/**
 * Downloads or shares a file with the given name, content, and mime type.
 * @param {string} filename E.g. 'backup.json' or 'export.csv'
 * @param {string} content Text/JSON/CSV file content
 * @param {string} mimeType E.g. 'application/json' or 'text/csv;charset=utf-8;'
 */
export async function downloadFile(filename, content, mimeType) {
  // 1. Native Capacitor platform (Android / iOS)
  if (Capacitor.isNativePlatform()) {
    try {
      // Write file into Cache directory
      const writeResult = await Filesystem.writeFile({
        path: filename,
        data: content,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });

      // Open Android system share sheet so user can save to Downloads, Google Drive, Files, etc.
      await Share.share({
        title: filename,
        text: filename,
        url: writeResult.uri,
        dialogTitle: filename,
      });
      return;
    } catch (err) {
      console.warn('[FileDownloader] Native file save/share failed, falling back to browser download:', err);
    }
  }

  // 2. Browser / PWA fallback
  try {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  } catch (err) {
    console.error('[FileDownloader] Browser download failed:', err);
  }
}
