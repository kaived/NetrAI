import type { CaseResult, EyeCode, OfflineQueueSummary, OfflineScreeningRecord } from "../types";

const DB_NAME = "netrai-offline";
const DB_VERSION = 1;
const CASE_STORE = "cases";

let dbPromise: Promise<IDBDatabase> | null = null;

export async function saveOfflineCaseSnapshot(
  result: CaseResult,
  imageDataUrl?: string | null,
  heatmapDataUrl?: string | null,
): Promise<void> {
  const db = await openOfflineDb();
  const existing = await getOfflineCase(result.case_id);
  const eye = getResultEye(result);
  const now = new Date().toISOString();
  const imageDataUrls = { ...(existing?.image_data_urls ?? {}) };
  const heatmapDataUrls = { ...(existing?.heatmap_data_urls ?? {}) };

  if (eye && imageDataUrl) {
    imageDataUrls[eye] = imageDataUrl;
  }

  if (eye && heatmapDataUrl) {
    heatmapDataUrls[eye] = heatmapDataUrl;
  }

  const record: OfflineScreeningRecord = {
    case_id: result.case_id,
    created_at: existing?.created_at ?? now,
    updated_at: now,
    sync_status: result.sync_status ?? existing?.sync_status ?? "pending",
    result,
    image_data_urls: imageDataUrls,
    heatmap_data_urls: heatmapDataUrls,
    last_sync_error: existing?.last_sync_error ?? null,
  };

  await putRecord(db, CASE_STORE, record);
}

export async function getOfflineCase(caseId: string): Promise<OfflineScreeningRecord | null> {
  const db = await openOfflineDb();
  return getRecord<OfflineScreeningRecord>(db, CASE_STORE, caseId);
}

export async function listPendingOfflineCases(): Promise<OfflineScreeningRecord[]> {
  const records = await listOfflineCases();
  return records.filter((record) => record.sync_status === "pending" || record.sync_status === "failed");
}

export async function listOfflineCases(): Promise<OfflineScreeningRecord[]> {
  const db = await openOfflineDb();
  const records = await getAllRecords<OfflineScreeningRecord>(db, CASE_STORE);
  return records.sort((left, right) => getTime(right.updated_at) - getTime(left.updated_at));
}

export async function getOfflineQueueSummary(): Promise<OfflineQueueSummary> {
  const records = await listOfflineCases();
  const syncedRecords = records.filter((record) => record.sync_status === "synced");
  const lastSynced = syncedRecords
    .map((record) => record.updated_at)
    .sort((left, right) => getTime(right) - getTime(left))[0] ?? null;

  return {
    total: records.length,
    pending: records.filter((record) => record.sync_status === "pending").length,
    synced: syncedRecords.length,
    failed: records.filter((record) => record.sync_status === "failed").length,
    last_synced_at: lastSynced,
    records,
  };
}

export async function markOfflineCaseSynced(caseId: string, syncedResult?: CaseResult): Promise<void> {
  const existing = await getOfflineCase(caseId);
  if (!existing) return;
  const nextResult = syncedResult ?? existing.result;

  await putRecord(await openOfflineDb(), CASE_STORE, {
    ...existing,
    sync_status: "synced",
    result: {
      ...nextResult,
      sync_status: "synced",
    },
    updated_at: new Date().toISOString(),
    last_sync_error: null,
  });
}

export async function markOfflineCaseSyncFailed(caseId: string, error: string): Promise<void> {
  const existing = await getOfflineCase(caseId);
  if (!existing) return;

  await putRecord(await openOfflineDb(), CASE_STORE, {
    ...existing,
    sync_status: "failed",
    result: {
      ...existing.result,
      sync_status: "failed",
    },
    updated_at: new Date().toISOString(),
    last_sync_error: error,
  });
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Could not read image file."));
    reader.readAsDataURL(file);
  });
}

function openOfflineDb(): Promise<IDBDatabase> {
  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(CASE_STORE)) {
        const store = db.createObjectStore(CASE_STORE, { keyPath: "case_id" });
        store.createIndex("sync_status", "sync_status", { unique: false });
        store.createIndex("updated_at", "updated_at", { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline database."));
  });

  return dbPromise;
}

function getResultEye(result: CaseResult): EyeCode | null {
  const eye = result.patient?.eye;
  return eye === "OD" || eye === "OS" ? eye : null;
}

function getTime(value: string | null | undefined): number {
  const timestamp = value ? Date.parse(value) : Number.NaN;
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function putRecord<T>(db: IDBDatabase, storeName: string, value: T): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(value);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error ?? new Error("Could not save offline record."));
  });
}

function getRecord<T>(db: IDBDatabase, storeName: string, key: IDBValidKey): Promise<T | null> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(key);
    request.onsuccess = () => resolve((request.result as T | undefined) ?? null);
    request.onerror = () => reject(request.error ?? new Error("Could not read offline record."));
  });
}

function getAllRecords<T>(db: IDBDatabase, storeName: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).getAll();
    request.onsuccess = () => resolve((request.result as T[]) ?? []);
    request.onerror = () => reject(request.error ?? new Error("Could not read offline records."));
  });
}
