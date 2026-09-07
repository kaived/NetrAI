import React from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Cloud,
  CloudOff,
  Database,
  Eye,
  RefreshCw,
} from 'lucide-react';
import type { OfflineQueueSummary, OfflineScreeningRecord } from '../types';

type OfflineQueuePanelProps = {
  summary: OfflineQueueSummary;
  isOnline: boolean;
  isSyncing: boolean;
  syncNotice: string | null;
  queueError: string | null;
  onSyncNow: () => void;
  onViewCase: (record: OfflineScreeningRecord) => void;
  onRetryCase: (record: OfflineScreeningRecord) => void;
};

export const OfflineQueuePanel: React.FC<OfflineQueuePanelProps> = ({
  summary,
  isOnline,
  isSyncing,
  syncNotice,
  queueError,
  onSyncNow,
  onViewCase,
  onRetryCase,
}) => {
  const syncableCount = summary.pending + summary.failed;
  const records = summary.records.slice(0, 8);

  return (
    <section className="no-print rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <div className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {isOnline ? <Cloud className="h-5 w-5" /> : <CloudOff className="h-5 w-5" />}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-sm sm:text-base font-extrabold text-slate-950">Offline Queue</h3>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${isOnline ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </span>
            </div>
            <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
              {syncNotice ??
                (isOnline
                  ? 'Cloud API is available. Pending offline cases can sync now.'
                  : 'Cases completed without internet stay on this device until sync is available.')}
            </p>
            {queueError && (
              <p className="mt-2 text-xs sm:text-sm font-semibold text-rose-700">
                {queueError}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={onSyncNow}
          disabled={!isOnline || isSyncing || syncableCount === 0}
          className="inline-flex items-center justify-center gap-2 rounded-lg border border-teal-700 bg-teal-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-xs transition-colors hover:bg-teal-800 disabled:cursor-not-allowed disabled:border-slate-200 disabled:bg-slate-100 disabled:text-slate-400"
        >
          <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Syncing...' : 'Sync Now'}</span>
        </button>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <QueueMetric label="Pending" value={summary.pending} tone="amber" />
        <QueueMetric label="Synced" value={summary.synced} tone="emerald" />
        <QueueMetric label="Failed" value={summary.failed} tone="rose" />
        <QueueMetric label="Last Synced" value={formatTime(summary.last_synced_at)} tone="slate" />
      </div>

      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50">
        {records.length > 0 ? (
          <div className="divide-y divide-slate-200">
            {records.map((record) => (
              <OfflineQueueRow
                key={record.case_id}
                record={record}
                isOnline={isOnline}
                isSyncing={isSyncing}
                onViewCase={onViewCase}
                onRetryCase={onRetryCase}
              />
            ))}
          </div>
        ) : (
          <div className="flex items-center gap-3 px-4 py-4 text-sm text-slate-500">
            <Database className="h-4 w-4 shrink-0" />
            <span>No offline cases saved on this device yet.</span>
          </div>
        )}
      </div>
    </section>
  );
};

type QueueMetricProps = {
  label: string;
  value: number | string;
  tone: 'amber' | 'emerald' | 'rose' | 'slate';
};

const metricToneClass: Record<QueueMetricProps['tone'], string> = {
  amber: 'text-amber-800 bg-amber-50 border-amber-200',
  emerald: 'text-emerald-800 bg-emerald-50 border-emerald-200',
  rose: 'text-rose-800 bg-rose-50 border-rose-200',
  slate: 'text-slate-800 bg-white border-slate-200',
};

const QueueMetric: React.FC<QueueMetricProps> = ({ label, value, tone }) => (
  <div className={`rounded-lg border px-3 py-2 ${metricToneClass[tone]}`}>
    <span className="block text-[10px] sm:text-xs font-bold uppercase text-slate-400">{label}</span>
    <span className="mt-0.5 block text-sm sm:text-base font-extrabold leading-tight">{value}</span>
  </div>
);

type OfflineQueueRowProps = {
  record: OfflineScreeningRecord;
  isOnline: boolean;
  isSyncing: boolean;
  onViewCase: (record: OfflineScreeningRecord) => void;
  onRetryCase: (record: OfflineScreeningRecord) => void;
};

const OfflineQueueRow: React.FC<OfflineQueueRowProps> = ({
  record,
  isOnline,
  isSyncing,
  onViewCase,
  onRetryCase,
}) => {
  const eyeCount = record.result.completed_eyes?.length ?? 0;
  const status = record.sync_status;
  const isFailed = status === 'failed';

  return (
    <div className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-xs sm:text-sm font-bold text-slate-900">{compactCaseId(record.case_id)}</span>
          <StatusBadge status={status} />
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
          <span>{eyeCount}/2 eyes</span>
          <span>Updated {formatTime(record.updated_at)}</span>
        </div>
        {isFailed && record.last_sync_error && (
          <p className="mt-1 max-w-xl truncate text-xs font-medium text-rose-700" title={record.last_sync_error}>
            {record.last_sync_error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2 sm:justify-end">
        <button
          type="button"
          onClick={() => onViewCase(record)}
          className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs transition-colors hover:bg-slate-100"
        >
          <Eye className="h-3.5 w-3.5" />
          <span>{status === 'synced' ? 'View Synced Case' : 'View Case'}</span>
        </button>
        {isFailed && (
          <button
            type="button"
            onClick={() => onRetryCase(record)}
            disabled={!isOnline || isSyncing}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-bold text-amber-800 transition-colors hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>Retry Failed Sync</span>
          </button>
        )}
      </div>
    </div>
  );
};

const StatusBadge: React.FC<{ status: OfflineScreeningRecord['sync_status'] }> = ({ status }) => {
  if (status === 'synced') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
        <CheckCircle2 className="h-3 w-3" />
        Synced
      </span>
    );
  }

  if (status === 'failed') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-bold text-rose-800">
        <AlertTriangle className="h-3 w-3" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-800">
      <Clock3 className="h-3 w-3" />
      Pending
    </span>
  );
};

function compactCaseId(caseId: string): string {
  return caseId.length > 22 ? `...${caseId.slice(-14)}` : caseId;
}

function formatTime(value: string | null): string {
  if (!value) {
    return 'Never';
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Unknown';
  }

  return date.toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
