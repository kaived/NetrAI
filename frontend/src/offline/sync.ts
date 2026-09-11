import { API_BASE_URL, API_REQUEST_TIMEOUTS, ApiError, buildApiHeaders, fetchWithTimeout, readApiError } from "../api";
import type { CaseResult, OfflineScreeningRecord } from "../types";
import { listPendingOfflineCases, markOfflineCaseSyncFailed, markOfflineCaseSynced } from "./db";

type SyncSummary = { synced: number; failed: number };
let activeQueueSync: Promise<SyncSummary> | null = null;
const activeCaseSyncs = new Map<string, Promise<CaseResult>>();

export function syncPendingOfflineCases(): Promise<SyncSummary> {
  if (!activeQueueSync) {
    activeQueueSync = syncQueue().finally(() => { activeQueueSync = null; });
  }
  return activeQueueSync;
}

async function syncQueue(): Promise<SyncSummary> {
  const pending = await listPendingOfflineCases();
  let synced = 0;
  let failed = 0;

  for (const record of pending) {
    try {
      await syncOfflineCaseRecord(record);
      synced += 1;
    } catch (error) {
      failed += 1;
      await markOfflineCaseSyncFailed(record.case_id, error instanceof Error ? error.message : "Sync failed.");
    }
  }

  return { synced, failed };
}

export function syncOfflineCaseRecord(record: OfflineScreeningRecord): Promise<CaseResult> {
  const existing = activeCaseSyncs.get(record.case_id);
  if (existing) return existing;
  const request = syncCaseRecord(record).finally(() => { activeCaseSyncs.delete(record.case_id); });
  activeCaseSyncs.set(record.case_id, request);
  return request;
}

async function syncCaseRecord(record: OfflineScreeningRecord): Promise<CaseResult> {
  let syncedResult: CaseResult;
  try {
    syncedResult = await syncOfflineCase(record);
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error("Could not reach cloud sync. This case is still saved on your device. Retry when the connection is stable.");
    }
    throw error;
  }
  await markOfflineCaseSynced(record.case_id, syncedResult);
  return syncedResult;
}

async function syncOfflineCase(record: OfflineScreeningRecord): Promise<CaseResult> {
  const response = await fetchWithTimeout(
    `${API_BASE_URL}/sync/cases`,
    {
      method: "POST",
      headers: buildApiHeaders({
        "Content-Type": "application/json",
      }),
      body: JSON.stringify({
        case: buildSyncCaseMetadata(record.result),
        images: record.image_data_urls,
        heatmaps: record.heatmap_data_urls,
      }),
    },
    API_REQUEST_TIMEOUTS.sync,
    "Cloud sync timed out. The case is still saved on this device and can be retried later.",
  );

  if (!response.ok) {
    const fallback = response.status === 401
      ? "Cloud sync access was denied. Check that the app's API access key matches the backend. This case remains saved on your device."
      : "Could not sync this case. It remains saved on your device. Retry sync later.";
    throw new ApiError(await readApiError(response, fallback), response.status);
  }

  return response.json();
}

function buildSyncCaseMetadata(result: CaseResult): CaseResult {
  // Images are sent once in the artifact maps; the local snapshot stays intact.
  return {
    ...result,
    storage: { input_uri: null, heatmap_uri: null, report_uri: null },
    explanation: { ...result.explanation, heatmap_url: null },
    eyes: Object.fromEntries(
      Object.entries(result.eyes ?? {}).map(([eye, eyeResult]) => [eye, {
        ...eyeResult,
        storage: { input_uri: null, heatmap_uri: null, report_uri: null },
        explanation: { ...eyeResult.explanation, heatmap_url: null },
      }]),
    ),
  };
}
