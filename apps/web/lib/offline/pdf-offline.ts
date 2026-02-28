const PDF_CACHE_NAME = 'joubuild-pdfs-offline';
const IDB_NAME = 'joubuild-offline';
const IDB_STORE = 'offline-pdfs';
const IDB_BLOB_STORE = 'offline-pdf-blobs';

interface OfflinePdfMeta {
  sheetId: string;
  name: string;
  fileUrl: string;
  size: number;
  downloadedAt: string;
}

function isCacheApiAvailable(): boolean {
  return typeof caches !== 'undefined';
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 2);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'sheetId' });
      }
      if (!db.objectStoreNames.contains(IDB_BLOB_STORE)) {
        db.createObjectStore(IDB_BLOB_STORE, { keyPath: 'fileUrl' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function downloadPdfForOffline(sheet: {
  id: string;
  name: string;
  fileUrl: string;
}): Promise<void> {
  const response = await fetch(sheet.fileUrl);
  if (!response.ok) throw new Error('Failed to download PDF');

  const blob = await response.blob();

  // Try Cache API first, fall back to IndexedDB blob storage
  if (isCacheApiAvailable()) {
    try {
      const cache = await caches.open(PDF_CACHE_NAME);
      await cache.put(new Request(sheet.fileUrl), new Response(blob, {
        headers: { 'Content-Type': 'application/pdf' },
      }));
    } catch {
      // Cache API failed (e.g. iOS WKWebView), use IndexedDB
      await saveBlobToIdb(sheet.fileUrl, blob);
    }
  } else {
    await saveBlobToIdb(sheet.fileUrl, blob);
  }

  // Save metadata to IndexedDB
  const db = await openDb();
  const tx = db.transaction(IDB_STORE, 'readwrite');
  const store = tx.objectStore(IDB_STORE);
  const meta: OfflinePdfMeta = {
    sheetId: sheet.id,
    name: sheet.name,
    fileUrl: sheet.fileUrl,
    size: blob.size,
    downloadedAt: new Date().toISOString(),
  };
  store.put(meta);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function saveBlobToIdb(fileUrl: string, blob: Blob): Promise<void> {
  const db = await openDb();
  const arrayBuffer = await blob.arrayBuffer();
  const tx = db.transaction(IDB_BLOB_STORE, 'readwrite');
  tx.objectStore(IDB_BLOB_STORE).put({ fileUrl, data: arrayBuffer });
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function getBlobFromIdb(fileUrl: string): Promise<ArrayBuffer | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_BLOB_STORE, 'readonly');
      const req = tx.objectStore(IDB_BLOB_STORE).get(fileUrl);
      req.onsuccess = () => resolve(req.result?.data ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

export async function removeOfflinePdf(sheetId: string): Promise<void> {
  // Get metadata to find URL
  const db = await openDb();
  const meta = await new Promise<OfflinePdfMeta | undefined>((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).get(sheetId);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

  if (meta) {
    // Try Cache API
    if (isCacheApiAvailable()) {
      try {
        const cache = await caches.open(PDF_CACHE_NAME);
        await cache.delete(new Request(meta.fileUrl));
      } catch {
        // Cache API not available
      }
    }
    // Also remove from IndexedDB blob store
    try {
      const blobTx = db.transaction(IDB_BLOB_STORE, 'readwrite');
      blobTx.objectStore(IDB_BLOB_STORE).delete(meta.fileUrl);
    } catch {
      // Blob store might not exist yet
    }
  }

  // Remove from IndexedDB metadata
  const tx = db.transaction(IDB_STORE, 'readwrite');
  tx.objectStore(IDB_STORE).delete(sheetId);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function isSheetAvailableOffline(sheetId: string): Promise<boolean> {
  try {
    const db = await openDb();
    const meta = await new Promise<OfflinePdfMeta | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(sheetId);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    if (!meta) return false;

    // Check Cache API first
    if (isCacheApiAvailable()) {
      try {
        const cache = await caches.open(PDF_CACHE_NAME);
        const match = await cache.match(new Request(meta.fileUrl));
        if (match) return true;
      } catch {
        // Cache API not available
      }
    }

    // Check IndexedDB blob store
    const blob = await getBlobFromIdb(meta.fileUrl);
    return blob !== null;
  } catch {
    return false;
  }
}

/** Get offline PDF data as ArrayBuffer for direct loading into pdfjs */
export async function getOfflinePdfData(fileUrl: string): Promise<ArrayBuffer | null> {
  // Check IndexedDB blob store first (works everywhere)
  const idbBlob = await getBlobFromIdb(fileUrl);
  if (idbBlob) return idbBlob;

  // Check Cache API
  if (isCacheApiAvailable()) {
    try {
      const cache = await caches.open(PDF_CACHE_NAME);
      const match = await cache.match(new Request(fileUrl));
      if (match) {
        return await match.arrayBuffer();
      }
    } catch {
      // Cache API not available
    }
  }

  return null;
}

export async function getAllOfflinePdfs(): Promise<OfflinePdfMeta[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const req = tx.objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}
