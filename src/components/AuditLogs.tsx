import React, { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, getDocs, where } from 'firebase/firestore';
import { db } from '../firebase';

interface AuditLog {
  id: string;
  type: 'vote' | 'candidate_added' | 'candidate_deleted' | 'settings_changed';
  timestamp: number;
  details: string;
  candidateId?: string;
  candidateName?: string;
}

export default function AuditLogs() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<string>('24h');

  useEffect(() => {
    loadAuditLogs();
  }, [filter, dateRange]);

  const loadAuditLogs = async () => {
    setLoading(true);
    try {
      const now = Date.now();
      let since = now - (24 * 60 * 60 * 1000); // Default 24 hours

      switch (dateRange) {
        case '1h':
          since = now - (60 * 60 * 1000);
          break;
        case '7d':
          since = now - (7 * 24 * 60 * 60 * 1000);
          break;
        case '30d':
          since = now - (30 * 24 * 60 * 60 * 1000);
          break;
        case 'all':
          since = 0;
          break;
      }

      let q = query(
        collection(db, 'activities'),
        orderBy('timestamp', 'desc'),
        limit(500)
      );

      if (since > 0) {
        q = query(q, where('timestamp', '>=', since));
      }

      const snapshot = await getDocs(q);
      let activities = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      } as AuditLog));

      // Filter by type
      if (filter !== 'all') {
        activities = activities.filter(log => log.type === filter);
      }

      setLogs(activities);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Timestamp', 'Type', 'Details', 'Candidate Name'];
    const csvData = logs.map(log => [
      new Date(log.timestamp).toLocaleString(),
      log.type,
      log.details,
      log.candidateName || ''
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(field => `"${field}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      vote: '🗳️',
      candidate_added: '➕',
      candidate_deleted: '🗑️',
      settings_changed: '⚙️',
    };
    return icons[type] || '📝';
  };

  const getActivityColor = (type: string) => {
    const colors: Record<string, string> = {
      vote: 'text-blue-600',
      candidate_added: 'text-green-600',
      candidate_deleted: 'text-red-600',
      settings_changed: 'text-purple-600',
    };
    return colors[type] || 'text-slate-600';
  };

  return (
    <section className="rounded-4xl border border-slate-200 bg-white p-8 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">Audit Logs</h2>
          <p className="mt-1 text-sm text-slate-500">Monitor all system activities and export audit trails.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-3xl border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="all">All Activities</option>
            <option value="vote">Votes</option>
            <option value="candidate_added">Candidates Added</option>
            <option value="candidate_deleted">Candidates Deleted</option>
            <option value="settings_changed">Settings Changed</option>
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-3xl border border-slate-300 bg-white px-4 py-2 text-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <button
            onClick={exportToCSV}
            className="rounded-3xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700"
          >
            Export CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div className="mt-6 flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-600"></div>
        </div>
      ) : logs.length === 0 ? (
        <div className="mt-6 rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-300">
          No audit logs found for the selected filters.
        </div>
      ) : (
        <div className="mt-6 space-y-3">
          {logs.map((log) => (
            <div key={log.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <div className="flex items-start gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xl dark:bg-slate-700">
                  {getActivityIcon(log.type)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-medium uppercase tracking-wide ${getActivityColor(log.type)}`}>
                      {log.type.replace('_', ' ')}
                    </span>
                    <span className="text-sm text-slate-500">
                      {new Date(log.timestamp).toLocaleString()}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-slate-900 dark:text-slate-100">{log.details}</p>
                  {log.candidateName && (
                    <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                      Candidate: {log.candidateName}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}