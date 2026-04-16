import { useEffect, useState } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

interface Activity {
  id: string;
  type: 'vote' | 'candidate_added' | 'candidate_deleted' | 'settings_changed';
  timestamp: number;
  details: string;
  candidateId?: string;
  candidateName?: string;
}

export default function ActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(
      collection(db, 'activities'),
      orderBy('timestamp', 'desc'),
      limit(10)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const acts = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        } as Activity));
        setActivities(acts);
        setLoading(false);
      },
      (error) => {
        console.error('Activity feed error:', error);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const getActivityIcon = (type: string) => {
    const icons: Record<string, string> = {
      vote: '🗳️',
      candidate_added: '➕',
      candidate_deleted: '🗑️',
      settings_changed: '⚙️',
    };
    return icons[type] || '📌';
  };

  const formatTime = (timestamp: number) => {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  if (loading) return <div className="text-slate-500">Loading activity...</div>;

  return (
    <div className="rounded-4xl border border-slate-200 bg-white p-6 shadow-soft dark:border-slate-700 dark:bg-slate-900">
      <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">Recent Activity</h3>
      {activities.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No recent activity</p>
      ) : (
        <div className="space-y-3">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-center gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              <span className="text-2xl">{getActivityIcon(activity.type)}</span>
              <div className="flex-1">
                <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{activity.details}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{formatTime(activity.timestamp)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
