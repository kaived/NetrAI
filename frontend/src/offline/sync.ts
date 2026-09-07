import { API_BASE_URL, API_REQUEST_TIMEOUTS, buildApiHeaders, fetchWithTimeout } from "../api";
import type { CaseResult, OfflineScreeningRecord } from "../types";
import { listPendingOfflineCases, markOfflineCaseSyncFailed, markOfflineCaseSynced } from "./db";

export async function syncPendingOfflineCases(): Promise<{ synced: number; failed: number }> {
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

export async function syncOfflineCaseRecord(record: OfflineScreeningRecord): Promise<CaseResult> {
  const syncedResult = await syncOfflineCase(record);
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
        case: record.result,
        images: record.image_data_urls,
        heatmaps: record.heatmap_data_urls,
      }),
    },
    API_REQUEST_TIMEOUTS.sync,
    "Cloud sync timed out. The case is still saved on this device and can be retried later.",
  );

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || "Could not sync offline case.");
  }

  return response.json();
}
