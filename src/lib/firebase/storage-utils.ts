import { storage } from './config';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

/**
 * Firebase Storage'a dosya yükleme utility'si
 */
export async function uploadReportToStorage(
  file: Blob, 
  fileName: string, 
  reportId: string,
  fileType: 'pdf' | 'excel'
): Promise<string> {
  try {
    // Dosya yolu oluştur: reports/{reportId}/{fileName}
    const fileExtension = fileType === 'pdf' ? 'pdf' : 'xlsx';
    const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9]/g, '_');
    const filePath = `reports/${reportId}/${sanitizedFileName}.${fileExtension}`;
    
    // Storage referansı oluştur
    const storageRef = ref(storage, filePath);
    
    // Meta data ayarla
    const metadata = {
      contentType: fileType === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      customMetadata: {
        'reportId': reportId,
        'uploadedAt': new Date().toISOString(),
        'fileType': fileType
      }
    };
    
    // Dosyayı yükle
    const snapshot = await uploadBytes(storageRef, file, metadata);
    
    // Download URL'i al
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('Dosya başarıyla yüklendi:', downloadURL);
    return downloadURL;
    
  } catch (error) {
    console.error('Storage yükleme hatası:', error);
    throw new Error('Dosya yüklenirken hata oluştu');
  }
}

/**
 * Storage'dan rapor dosyasını sil
 */
export async function deleteReportFromStorage(filePath: string): Promise<void> {
  try {
    const storageRef = ref(storage, filePath);
    await deleteObject(storageRef);
    console.log('Dosya başarıyla silindi:', filePath);
  } catch (error) {
    console.error('Storage silme hatası:', error);
    throw new Error('Dosya silinirken hata oluştu');
  }
}

/**
 * Dosya boyutunu hesapla (KB cinsinden)
 */
export function getFileSizeInKB(blob: Blob): number {
  return Math.round(blob.size / 1024);
}

/**
 * Dosya adını temizle (özel karakterleri kaldır)
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .replace(/[^a-zA-Z0-9\s]/g, '') // Özel karakterleri kaldır
    .replace(/\s+/g, '_') // Boşlukları underscore yap
    .toLowerCase(); // Küçük harfe çevir
}

/**
 * Storage path'ini parse et
 */
export function parseStoragePath(downloadURL: string): string | null {
  try {
    const url = new URL(downloadURL);
    const pathMatch = url.pathname.match(/\/o\/(.+?)\?/);
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1]);
    }
    return null;
  } catch (error) {
    console.error('Storage path parse hatası:', error);
    return null;
  }
}